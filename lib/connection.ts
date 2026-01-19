import { Connection } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet";
export const SOLANA_RPC_ENDPOINT = "https://api.devnet.solana.com";

export function createConnection() {
  return new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
}

export const connection = createConnection();

