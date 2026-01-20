import { Connection } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet";
// Using Helius RPC for better reliability and ZK compression support
export const SOLANA_RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function createConnection() {
  return new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
}

export const connection = createConnection();

