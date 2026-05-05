/**
 * Stealth Send — wire stealth addressing into the payment flow.
 * Called when the sender enters a stealth meta-address instead of a wallet address.
 */

import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { SystemProgram, Transaction, ComputeBudgetProgram, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "@/lib/memo-sdk/types";
import {
  deriveStealthAddress,
  type StealthMetaAddress,
  type StealthPaymentMemo,
} from "@/lib/solana/stealth-address";
import { simulateBeforeSend, throwWithOnChainLogs } from "@/lib/solana/simulate";

/**
 * Send SOL to a stealth address.
 * The recipient's real wallet address never appears on-chain.
 *
 * @param recipientMetaAddress - recipient's published stealth meta-address
 * @param lamports - amount in lamports
 */
export async function sendToStealthAddress(params: {
  wallet: WalletContextState;
  connection: Connection;
  recipientMetaAddress: StealthMetaAddress;
  lamports: number;
}): Promise<{ signature: string; stealthAddress: string }> {
  const { wallet, connection, recipientMetaAddress, lamports } = params;

  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  // 1. Derive a one-time stealth address for this payment
  const { stealthAddress, memoPayload } = await deriveStealthAddress(recipientMetaAddress);

  // 2. Build transaction: SOL transfer + stealth memo
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const memoData = JSON.stringify(memoPayload satisfies StealthPaymentMemo);

  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: stealthAddress,
      lamports,
    }),
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(memoData, "utf-8"),
    })
  );

  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = wallet.publicKey;

  // 3. Simulate first
  const sim = await simulateBeforeSend(connection, tx);
  if (sim.action === "abort") {
    throw new Error(`Stealth send would fail: ${sim.reason}`);
  }

  // 4. Sign and send
  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
  });

  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  if (confirmation.value.err) {
    await throwWithOnChainLogs(connection, signature, confirmation.value.err);
  }

  return { signature, stealthAddress: stealthAddress.toBase58() };
}

/**
 * Detect if an input string is a stealth meta-address (base64 x25519 key)
 * vs a regular Solana address.
 */
export function isStealthMetaAddress(input: string): boolean {
  // Base64 x25519 keys are exactly 44 characters
  // Regular Solana addresses are 32-44 chars base58
  // We look for base64 padding characters or length mismatch
  if (!input || input.length < 40) return false;
  try {
    // Try to parse as base64 — if it decodes to exactly 32 bytes it's an x25519 key
    const decoded = Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Parse a stealth meta-address string into a StealthMetaAddress object.
 */
export function parseStealthMetaAddress(
  input: string,
  walletAddress = "unknown"
): StealthMetaAddress {
  return {
    x25519PublicKey: input,
    walletAddress,
    createdAt: 0,
  };
}
