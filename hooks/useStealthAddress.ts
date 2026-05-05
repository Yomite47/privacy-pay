"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  generateStealthKeypair,
  saveStealthKeypair,
  loadStealthKeypair,
  clearStealthKeypair,
  scanForStealthPayments,
  type StealthKeypair,
  type StealthPayment,
} from "@/lib/solana/stealth-address";

export function useStealthAddress() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [stealthKP, setStealthKP] = useState<StealthKeypair | null>(null);
  const [payments, setPayments] = useState<StealthPayment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on wallet connect
  useEffect(() => {
    if (!wallet.publicKey) { setStealthKP(null); return; }
    const saved = loadStealthKeypair(wallet.publicKey.toBase58());
    setStealthKP(saved);
  }, [wallet.publicKey]);

  const generate = useCallback(async () => {
    if (!wallet.publicKey) { setError("Connect wallet first"); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const kp = generateStealthKeypair(wallet.publicKey.toBase58());
      saveStealthKeypair(kp);
      setStealthKP(kp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate stealth keypair");
    } finally {
      setIsGenerating(false);
    }
  }, [wallet.publicKey]);

  const scan = useCallback(async () => {
    if (!stealthKP) { setError("Generate stealth address first"); return; }
    setIsScanning(true);
    setError(null);
    try {
      const found = await scanForStealthPayments({
        connection,
        stealthSecretKey: stealthKP.x25519SecretKey,
        stealthPublicKey: stealthKP.metaAddress.x25519PublicKey,
        limit: 20,
      });
      setPayments(found);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }, [connection, stealthKP]);

  const revoke = useCallback(() => {
    if (!wallet.publicKey) return;
    clearStealthKeypair(wallet.publicKey.toBase58());
    setStealthKP(null);
    setPayments([]);
  }, [wallet.publicKey]);

  return {
    stealthKP,
    payments,
    isGenerating,
    isScanning,
    error,
    generate,
    scan,
    revoke,
  };
}
