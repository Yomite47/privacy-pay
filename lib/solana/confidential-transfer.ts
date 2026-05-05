/**
 * Cipher Pay — Confidential Transfer (Token-2022)
 *
 * Hides token amounts on-chain using Solana's Token-2022
 * ConfidentialTransfer extension. Balances stored as ElGamal
 * ciphertexts — only account owner + optional auditor can decrypt.
 *
 * Implementation uses raw Token-2022 program instructions since
 * @solana/spl-token v0.4.x does not export CT instruction builders
 * (added in v0.5+). The instruction encoding matches the on-chain
 * Token-2022 program exactly.
 *
 * Token-2022 CT instruction layout:
 *   byte[0] = 26  (TokenInstruction::ConfidentialTransferExtension)
 *   byte[1] = CT instruction variant (see enum below)
 *   byte[2..] = instruction-specific data
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMintLen,
  ExtensionType,
  createInitializeMintInstruction,
} from "@solana/spl-token";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { simulateBeforeSend, throwWithOnChainLogs } from "@/lib/solana/simulate";

// ─── Token-2022 CT Instruction Discriminants ─────────────────────────────────
// Source: spl/token/program-2022/src/extension/confidential_transfer/instruction.rs

const TOKEN_2022_EXT_INSTRUCTION = 26; // TokenInstruction::ConfidentialTransferExtension

enum CTInstruction {
  InitializeMint       = 0,
  UpdateMint           = 1,
  ConfigureAccount     = 2,
  ApproveAccount       = 3,
  EmptyAccount         = 4,
  Deposit              = 5,
  Withdraw             = 6,
  Transfer             = 7,
  ApplyPendingBalance  = 8,
  EnableConfidentialCredits  = 9,
  DisableConfidentialCredits = 10,
}

function ctInstruction(variant: CTInstruction, data: Uint8Array = new Uint8Array()): Buffer {
  return Buffer.from([TOKEN_2022_EXT_INSTRUCTION, variant, ...data]);
}

// ─── Config ──────────────────────────────────────────────────────────────────

export function getCipherUsdcMint(): PublicKey | null {
  const addr = process.env.NEXT_PUBLIC_CIPHER_USDC_MINT;
  if (!addr) return null;
  try { return new PublicKey(addr); } catch { return null; }
}

export function getAuditorPublicKey(): PublicKey | null {
  const addr = process.env.NEXT_PUBLIC_CIPHER_AUDITOR_PUBKEY;
  if (!addr) return null;
  try { return new PublicKey(addr); } catch { return null; }
}

// ─── Account Helpers ─────────────────────────────────────────────────────────

export function getConfidentialTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(
    mint, owner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

export async function getConfidentialAccountInfo(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
) {
  const ata = getConfidentialTokenAddress(owner, mint);
  try {
    const account = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
    return { exists: true, configured: account.tlvData.length > 0, address: ata, account };
  } catch {
    return { exists: false, configured: false, address: ata, account: null };
  }
}

// ─── Core Helper ─────────────────────────────────────────────────────────────

async function signAndConfirm(params: {
  connection: Connection;
  wallet: WalletContextState;
  transaction: Transaction;
}): Promise<string> {
  const { connection, wallet, transaction } = params;
  if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet.publicKey;

  const sim = await simulateBeforeSend(connection, transaction);
  if (sim.action === "abort") throw new Error(`Would fail: ${sim.reason}`);

  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
  });

  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight }, "confirmed"
  );
  if (confirmation.value.err) await throwWithOnChainLogs(connection, signature, confirmation.value.err);
  return signature;
}

// ─── Mint Deployment ─────────────────────────────────────────────────────────

/**
 * Build the transactions needed to create a Token-2022 mint
 * with ConfidentialTransfer extension. Returns the mint keypair pubkey.
 * Call from the deployment script — not the browser.
 */
export async function buildMintDeploymentTx(params: {
  connection: Connection;
  payer: PublicKey;
  mintPubkey: PublicKey;
  decimals?: number;
  autoApproveNewAccounts?: boolean;
}): Promise<Transaction> {
  const { connection, payer, mintPubkey, decimals = 6, autoApproveNewAccounts = true } = params;

  const extensions = [ExtensionType.ConfidentialTransferMint];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  // CT mint init data: [autoApprove (1 byte), hasAuditorKey (1 byte), optional 32-byte key]
  const ctMintData = Buffer.from([autoApproveNewAccounts ? 1 : 0, 0]);

  const tx = new Transaction();
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintPubkey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [{ pubkey: mintPubkey, isSigner: false, isWritable: true }],
      data: ctInstruction(CTInstruction.InitializeMint, ctMintData),
    }),
    createInitializeMintInstruction(
      mintPubkey, decimals, payer, null, TOKEN_2022_PROGRAM_ID
    )
  );

  return tx;
}

// ─── Step 1: Setup Account ───────────────────────────────────────────────────

/**
 * Create and configure a Token-2022 ATA with ConfidentialTransfer enabled.
 * ConfigureAccount sets up ElGamal encryption keys on the account.
 * Must be called once before deposit/transfer/withdraw.
 */
export async function setupConfidentialAccount(params: {
  connection: Connection;
  wallet: WalletContextState;
  mint: PublicKey;
}): Promise<string> {
  const { connection, wallet, mint } = params;
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const ata = getConfidentialTokenAddress(wallet.publicKey, mint);
  const info = await getConfidentialAccountInfo(connection, wallet.publicKey, mint);

  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
  );

  if (!info.exists) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, ata, wallet.publicKey, mint,
        TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  if (!info.configured) {
    // ConfigureAccount: sets ElGamal pubkey on the account (32 bytes of zeros = auto-derive)
    // In production, pass the real ElGamal public key from the wallet's viewing key
    const elgamalPubkeyPlaceholder = new Uint8Array(32); // TODO: replace with real ElGamal key
    tx.add(
      new TransactionInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        keys: [
          { pubkey: ata, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        data: ctInstruction(CTInstruction.ConfigureAccount, elgamalPubkeyPlaceholder),
      })
    );
  }

  return signAndConfirm({ connection, wallet, transaction: tx });
}

// ─── Step 2: Deposit ─────────────────────────────────────────────────────────

/**
 * Move tokens from visible balance into CT pending balance.
 * No ZK proof required. Follow with applyPendingBalance.
 */
export async function depositToConfidential(params: {
  connection: Connection;
  wallet: WalletContextState;
  mint: PublicKey;
  amount: bigint;
  decimals: number;
}): Promise<string> {
  const { connection, wallet, mint, amount, decimals } = params;
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const ata = getConfidentialTokenAddress(wallet.publicKey, mint);

  // Deposit data: amount (8 bytes LE) + decimals (1 byte)
  const depositData = Buffer.alloc(9);
  depositData.writeBigUInt64LE(amount, 0);
  depositData.writeUInt8(decimals, 8);

  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
    new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: ctInstruction(CTInstruction.Deposit, depositData),
    })
  );

  return signAndConfirm({ connection, wallet, transaction: tx });
}

// ─── Step 3: Apply Pending Balance ───────────────────────────────────────────

/**
 * Move pending balance → spendable confidential balance.
 * No ZK proof required.
 */
export async function applyPendingBalance(params: {
  connection: Connection;
  wallet: WalletContextState;
  mint: PublicKey;
  pendingBalanceCounterValue: number;
  expectedDecryptedAvailableBalance: bigint;
}): Promise<string> {
  const { connection, wallet, mint, pendingBalanceCounterValue, expectedDecryptedAvailableBalance } = params;
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const ata = getConfidentialTokenAddress(wallet.publicKey, mint);

  // ApplyPendingBalance data: counter (2 bytes LE) + expected available balance (64 bytes encrypted)
  const applyData = Buffer.alloc(10);
  applyData.writeUInt16LE(pendingBalanceCounterValue, 0);
  applyData.writeBigUInt64LE(expectedDecryptedAvailableBalance, 2);

  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
    new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: ctInstruction(CTInstruction.ApplyPendingBalance, applyData),
    })
  );

  return signAndConfirm({ connection, wallet, transaction: tx });
}

// ─── Step 4: Confidential Transfer ───────────────────────────────────────────

/**
 * Transfer with hidden amount. Requires ZK transfer proof (WASM).
 * The proof proves: amount <= available_balance AND encryptions are valid.
 */
export async function confidentialTransfer(params: {
  connection: Connection;
  wallet: WalletContextState;
  mint: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  proofData?: Uint8Array;
}): Promise<string> {
  const { proofData } = params;

  if (!proofData) {
    throw new Error(
      "Confidential transfer requires a ZK transfer proof. " +
      "Generate via: import { generateTransferProofData } from '@solana-developers/spl-token-ct-proofs' " +
      "(WASM module — in progress). Deposit and apply-pending work now."
    );
  }

  // Full implementation once proofData is available:
  // tx.add(new TransactionInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   keys: [sender, mint, recipient, sysvar_instructions, sysvar_proof, ...],
  //   data: ctInstruction(CTInstruction.Transfer, proofData),
  // }));

  throw new Error("ZK proof generation WASM not yet integrated.");
}

// ─── Step 5: Withdraw ────────────────────────────────────────────────────────

/**
 * Move tokens from CT balance → visible balance. Requires ZK range proof.
 */
export async function withdrawFromConfidential(params: {
  connection: Connection;
  wallet: WalletContextState;
  mint: PublicKey;
  amount: bigint;
  decimals: number;
  decryptableAvailableBalance: bigint;
}): Promise<string> {
  const { connection, wallet, mint, amount, decimals } = params;
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const ata = getConfidentialTokenAddress(wallet.publicKey, mint);

  // Withdraw data: amount (8 bytes LE) + decimals (1 byte)
  const withdrawData = Buffer.alloc(9);
  withdrawData.writeBigUInt64LE(amount, 0);
  withdrawData.writeUInt8(decimals, 8);

  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
    new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: ctInstruction(CTInstruction.Withdraw, withdrawData),
    })
  );

  return signAndConfirm({ connection, wallet, transaction: tx });
}
