"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  getCipherUsdcMint,
  getConfidentialAccountInfo,
  setupConfidentialAccount,
  depositToConfidential,
  applyPendingBalance,
  withdrawFromConfidential,
} from "@/lib/solana/confidential-transfer";

type Step = "idle" | "pending" | "success" | "error";
interface TxState { step: Step; message: string; sig?: string }

const INIT: TxState = { step: "idle", message: "" };

export function ConfidentialBalancePanel() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const mint = getCipherUsdcMint();

  const [accountInfo, setAccountInfo] = useState<{
    exists: boolean;
    configured: boolean;
    address: string;
  } | null>(null);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [setupTx,   setSetupTx]   = useState<TxState>(INIT);
  const [depositTx, setDepositTx] = useState<TxState>(INIT);
  const [applyTx,   setApplyTx]   = useState<TxState>(INIT);
  const [withdrawTx,setWithdrawTx]= useState<TxState>(INIT);

  const refresh = useCallback(async () => {
    if (!wallet.publicKey || !mint) return;
    const info = await getConfidentialAccountInfo(connection, wallet.publicKey, mint);
    setAccountInfo({
      exists: info.exists,
      configured: info.configured,
      address: info.address.toBase58(),
    });
  }, [connection, mint, wallet.publicKey]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!mint) {
    return (
      <div className="cipher-card space-y-3">
        <div className="cipher-label">CONFIDENTIAL USDC</div>
        <div className="text-[13px] text-[color:var(--color-text-muted)]">
          Confidential USDC mint not configured.
          Deploy the mint with <code className="text-[11px] bg-[color:var(--color-bg)] px-1 rounded">npx tsx scripts/create-confidential-mint.ts</code> then
          set <code className="text-[11px] bg-[color:var(--color-bg)] px-1 rounded">NEXT_PUBLIC_CIPHER_USDC_MINT</code> in your environment.
        </div>
      </div>
    );
  }

  async function handleSetup() {
    if (!mint) return;
    setSetupTx({ step: "pending", message: "Setting up confidential account…" });
    try {
      const sig = await setupConfidentialAccount({ connection, wallet, mint });
      setSetupTx({ step: "success", message: "Account configured", sig });
      await refresh();
    } catch (e: unknown) {
      setSetupTx({ step: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleDeposit() {
    if (!mint || !depositAmount) return;
    const amount = BigInt(Math.floor(Number(depositAmount) * 1_000_000));
    setDepositTx({ step: "pending", message: "Depositing into confidential balance…" });
    try {
      const sig = await depositToConfidential({ connection, wallet, mint, amount, decimals: 6 });
      setDepositTx({ step: "success", message: "Deposited — now apply pending balance", sig });
    } catch (e: unknown) {
      setDepositTx({ step: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleApplyPending() {
    if (!mint) return;
    setApplyTx({ step: "pending", message: "Applying pending balance…" });
    try {
      const sig = await applyPendingBalance({
        connection, wallet, mint,
        pendingBalanceCounterValue: 0,
        expectedDecryptedAvailableBalance: BigInt(0),
      });
      setApplyTx({ step: "success", message: "Balance is now spendable confidentially", sig });
      await refresh();
    } catch (e: unknown) {
      setApplyTx({ step: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleWithdraw() {
    if (!mint || !withdrawAmount) return;
    const amount = BigInt(Math.floor(Number(withdrawAmount) * 1_000_000));
    setWithdrawTx({ step: "pending", message: "Withdrawing from confidential balance…" });
    try {
      const sig = await withdrawFromConfidential({
        connection, wallet, mint, amount, decimals: 6, decryptableAvailableBalance: amount,
      });
      setWithdrawTx({ step: "success", message: "Withdrawn to visible balance", sig });
    } catch (e: unknown) {
      setWithdrawTx({ step: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  const isConnected = wallet.connected && !!wallet.publicKey;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[15px] font-medium text-[color:var(--color-text-primary)]">
          Confidential USDC
        </div>
        <div className="mt-1 text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed">
          Token-2022 ConfidentialTransfer — balances stored as ElGamal ciphertexts.
          Amounts are hidden on-chain. Only you and the auditor key can decrypt.
        </div>
      </div>

      {/* Account status */}
      <div className="cipher-card space-y-3">
        <div className="cipher-label">ACCOUNT STATUS</div>
        {!accountInfo ? (
          <div className="text-[13px] text-[color:var(--color-text-muted)]">Loading…</div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[13px]">
              <span className={accountInfo.exists ? "text-[color:var(--color-emerald)]" : "text-[color:var(--color-text-muted)]"}>
                {accountInfo.exists ? "✓" : "○"} Token account
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className={accountInfo.configured ? "text-[color:var(--color-emerald)]" : "text-[color:var(--color-text-muted)]"}>
                {accountInfo.configured ? "✓" : "○"} CT extension configured
              </span>
            </div>
            {!accountInfo.configured && (
              <>
                <button
                  type="button"
                  onClick={() => void handleSetup()}
                  disabled={!isConnected || setupTx.step === "pending"}
                  className="cipher-btn-primary w-full mt-2 disabled:opacity-50"
                >
                  {setupTx.step === "pending"
                    ? <span className="inline-flex items-center gap-2"><span className="animate-spin">↻</span> Setting up…</span>
                    : "Set up confidential account"}
                </button>
                {setupTx.step === "error" && (
                  <div className="text-[12px] text-[color:var(--color-amber)]">{setupTx.message}</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {accountInfo?.configured && (
        <>
          {/* Deposit */}
          <div className="cipher-card space-y-3">
            <div className="cipher-label">DEPOSIT (visible → confidential)</div>
            <div className="cipher-input flex items-center gap-2 px-3 py-2">
              <input
                type="number" min={0} step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none text-[color:var(--color-text-primary)]"
              />
              <span className="text-[12px] text-[color:var(--color-text-muted)]">USDC</span>
            </div>
            <button
              type="button"
              onClick={() => void handleDeposit()}
              disabled={!isConnected || !depositAmount || depositTx.step === "pending"}
              className="cipher-btn-primary w-full disabled:opacity-50"
            >
              {depositTx.step === "pending"
                ? <span className="inline-flex items-center gap-2"><span className="animate-spin">↻</span> Depositing…</span>
                : "Deposit to confidential"}
            </button>
            {depositTx.step === "success" && (
              <div className="text-[12px] text-[color:var(--color-emerald)]">✓ {depositTx.message}</div>
            )}
            {depositTx.step === "error" && (
              <div className="text-[12px] text-[color:var(--color-amber)]">{depositTx.message}</div>
            )}

            {depositTx.step === "success" && (
              <button
                type="button"
                onClick={() => void handleApplyPending()}
                disabled={applyTx.step === "pending"}
                className="cipher-btn-ghost w-full text-[13px]"
              >
                {applyTx.step === "pending"
                  ? <span className="inline-flex items-center gap-2"><span className="animate-spin">↻</span></span>
                  : "Apply pending balance →"}
              </button>
            )}
            {applyTx.step === "success" && (
              <div className="text-[12px] text-[color:var(--color-emerald)]">✓ {applyTx.message}</div>
            )}
          </div>

          {/* Withdraw */}
          <div className="cipher-card space-y-3">
            <div className="cipher-label">WITHDRAW (confidential → visible)</div>
            <div className="cipher-input flex items-center gap-2 px-3 py-2">
              <input
                type="number" min={0} step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none text-[color:var(--color-text-primary)]"
              />
              <span className="text-[12px] text-[color:var(--color-text-muted)]">USDC</span>
            </div>
            <button
              type="button"
              onClick={() => void handleWithdraw()}
              disabled={!isConnected || !withdrawAmount || withdrawTx.step === "pending"}
              className="cipher-btn-ghost w-full disabled:opacity-50"
            >
              {withdrawTx.step === "pending"
                ? <span className="inline-flex items-center gap-2"><span className="animate-spin">↻</span> Withdrawing…</span>
                : "Withdraw to visible"}
            </button>
            {withdrawTx.step === "success" && (
              <div className="text-[12px] text-[color:var(--color-emerald)]">✓ {withdrawTx.message}</div>
            )}
            {withdrawTx.step === "error" && (
              <div className="text-[12px] text-[color:var(--color-amber)]">{withdrawTx.message}</div>
            )}
          </div>

          {/* Transfer info */}
          <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-4 py-3 text-[12px] text-[color:var(--color-text-muted)]">
            <span className="font-medium text-[color:var(--color-text-primary)]">Confidential transfers</span>{" "}
            between accounts require the ZK proof generation WASM module. Use the
            main Send panel in the dashboard for private transfers via ZK compression
            while this is being integrated.
          </div>
        </>
      )}
    </div>
  );
}
