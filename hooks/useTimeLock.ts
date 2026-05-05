"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  enqueue,
  loadQueue,
  updatePayment,
  removePayment,
  getReadyPayments,
  type DelayBucket,
  type PendingPayment,
} from "@/lib/solana/time-lock";
import { connection as globalConnection } from "@/lib/connection";
import { lightRpc } from "@/lib/solana/lightProtocol";
import { compressToken, transferCompressedToken } from "@/lib/token-service";
import { USDC_DECIMALS, SOL_DECIMALS, USDC_MINT_DEVNET, USDC_MINT_MAINNET } from "@/lib/constants";

export function useTimeLock() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [queue, setQueue] = useState<PendingPayment[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setQueue(loadQueue());
  }, []);

  // Tick every 10 seconds — check for ready payments
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(() => {
      refresh();
      checkAndExecute();
    }, 10_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  const checkAndExecute = useCallback(async () => {
    if (!wallet.publicKey || !wallet.connected) return;
    const ready = getReadyPayments();
    if (ready.length === 0) return;

    for (const payment of ready) {
      if (processing) return;
      setProcessing(payment.id);
      updatePayment(payment.id, { status: "ready" });
      refresh();

      try {
        const isDevnet = /devnet|localhost/i.test(connection.rpcEndpoint);
        const usdcMint = isDevnet ? USDC_MINT_DEVNET : USDC_MINT_MAINNET;
        const mint = payment.token === "SOL" ? null : usdcMint;
        const decimals = payment.token === "SOL" ? SOL_DECIMALS : USDC_DECIMALS;
        const amountUi = payment.amountLamports / 10 ** decimals;

        let signature: string;

        if (payment.recipient === "self") {
          // Shield to self
          signature = await compressToken({
            rpc: lightRpc, connection, wallet, mint, amount: amountUi, decimals,
          });
        } else {
          // Private transfer to recipient
          const { PublicKey } = await import("@solana/web3.js");
          signature = await transferCompressedToken({
            rpc: lightRpc, connection, wallet, mint, amount: amountUi, decimals,
            recipient: new PublicKey(payment.recipient),
            encryptedMemo: payment.encryptedMemo,
          });
        }

        updatePayment(payment.id, { status: "sent", signature });
        refresh();

        // Auto-remove sent payments after 30 seconds
        setTimeout(() => { removePayment(payment.id); refresh(); }, 30_000);
      } catch (e: unknown) {
        const error = e instanceof Error ? e.message : "Execution failed";
        updatePayment(payment.id, { status: "failed", error });
        refresh();
      } finally {
        setProcessing(null);
      }
    }
  }, [connection, processing, refresh, wallet]);

  const schedule = useCallback((params: {
    recipient: string;
    amountLamports: number;
    token: "SOL" | "USDC";
    bucket: DelayBucket;
    encryptedMemo?: string;
    isStealthPayment?: boolean;
  }): PendingPayment => {
    const payment = enqueue(params);
    refresh();
    return payment;
  }, [refresh]);

  const cancel = useCallback((id: string) => {
    removePayment(id);
    refresh();
  }, [refresh]);

  return { queue, schedule, cancel, processing, refresh };
}
