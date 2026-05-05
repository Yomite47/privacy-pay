/**
 * Generates a new Solana keypair for the Cipher Pay relayer.
 * The relayer pays gas fees on behalf of users — their wallet is
 * never the on-chain fee payer.
 *
 * Run: node scripts/gen-relayer.js
 */

const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
const fs = require("fs");
const path = require("path");

const keypair = Keypair.generate();
const privateKeyBase58 = bs58.default
  ? bs58.default.encode(keypair.secretKey)
  : bs58.encode(keypair.secretKey);

const publicKey = keypair.publicKey.toBase58();

console.log("\n✅ Relayer keypair generated");
console.log("─────────────────────────────────────────────────");
console.log(`Public key (fund this):  ${publicKey}`);
console.log(`Private key (base58):    ${privateKeyBase58}`);
console.log("─────────────────────────────────────────────────");
console.log("\nNext steps:");
console.log(`1. Add to .env.local: RELAYER_PRIVATE_KEY=${privateKeyBase58}`);
console.log(`2. Add to Vercel env: RELAYER_PRIVATE_KEY=${privateKeyBase58}`);
console.log(`3. Fund the relayer: send at least 0.1 SOL to ${publicKey}`);
console.log("4. The relayer will pay gas for all user transactions\n");

// Write public key to a safe reference file (never commit private key)
const refPath = path.join(__dirname, "relayer-pubkey.txt");
fs.writeFileSync(refPath, `RELAYER_PUBLIC_KEY=${publicKey}\n`);
console.log(`📄 Public key saved to scripts/relayer-pubkey.txt`);
console.log("⚠️  NEVER commit the private key — only add it to .env.local and Vercel\n");
