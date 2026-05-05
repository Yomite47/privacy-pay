/**
 * Deploy a Token-2022 mint with the ConfidentialTransfer extension.
 * Run once — copy the mint address to NEXT_PUBLIC_CIPHER_USDC_MINT in .env.local
 *
 * Usage:
 *   npx tsx scripts/create-confidential-mint.ts
 *
 * Requires DEPLOYER_PRIVATE_KEY in .env.local (base58 encoded)
 * The deployer must have enough SOL to pay for the mint account rent.
 */

import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  ExtensionType,
  createInitializeMintInstruction,
} from "@solana/spl-token";
import { TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function main() {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl || !deployerKey) {
    console.error("Missing HELIUS_RPC_URL or DEPLOYER_PRIVATE_KEY in .env.local");
    process.exit(1);
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const deployer = Keypair.fromSecretKey(bs58.decode(deployerKey));
  const mintKeypair = Keypair.generate();

  console.log(`\nDeployer:     ${deployer.publicKey.toBase58()}`);
  console.log(`New mint:     ${mintKeypair.publicKey.toBase58()}`);

  // Mint config
  const decimals = 6; // USDC-compatible
  const extensions = [ExtensionType.ConfidentialTransferMint];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  // Optional: set an auditor ElGamal public key for compliance
  // null means no auditor (fully private). Set to your viewing key for compliance.
  const auditorElGamalPubkey = null;
  // To enable auditor: set to a 32-byte ElGamal public key (Uint8Array | null)

  const tx = new Transaction().add(
    // 1. Allocate mint account
    SystemProgram.createAccount({
      fromPubkey: deployer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // 2. Initialise ConfidentialTransfer extension via raw instruction
    // TokenInstruction::ConfidentialTransferExtension (26), InitializeMint (0)
    // data: autoApprove (1 byte) + hasAuditor (1 byte)
    new TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [{ pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true }],
      data: Buffer.from([26, 0, 1, 0]), // ext=26, variant=0 (InitializeMint), autoApprove=1, noAuditor=0
    }),
    // 3. Initialise the mint itself
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      deployer.publicKey, // mint authority
      null,               // freeze authority
      TOKEN_2022_PROGRAM_ID
    )
  );

  console.log("\nSending transaction…");
  const signature = await sendAndConfirmTransaction(connection, tx, [deployer, mintKeypair], {
    commitment: "confirmed",
  });

  console.log(`\n✅ Confidential USDC mint deployed`);
  console.log(`   Mint address: ${mintKeypair.publicKey.toBase58()}`);
  console.log(`   Tx:           ${signature}`);
  console.log(`\nNext steps:`);
  console.log(`1. Add to .env.local:  NEXT_PUBLIC_CIPHER_USDC_MINT=${mintKeypair.publicKey.toBase58()}`);
  console.log(`2. Add to Vercel env:  NEXT_PUBLIC_CIPHER_USDC_MINT=${mintKeypair.publicKey.toBase58()}`);
  console.log(`3. Fund users' accounts with this mint to enable confidential transfers\n`);

  // Save to file
  const out = {
    mintAddress: mintKeypair.publicKey.toBase58(),
    mintSecretKey: bs58.encode(mintKeypair.secretKey),
    decimals,
    signature,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(__dirname, "confidential-mint.json"), JSON.stringify(out, null, 2));
  console.log(`📄 Mint details saved to scripts/confidential-mint.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
