import { Connection } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet";

// Helper to determine the best endpoint
// Fixes "Endpoint URL must start with http" error during Vercel build
const getRpcUrl = () => {
  if (typeof window === "undefined") {
    // Server-side (Build time or SSR)
    // We CANNOT use relative paths like '/api/rpc' here.
    // We must use an absolute URL.
    // Prefer the secret HELIUS_RPC_URL if available, otherwise fallback to public devnet.
    return process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  }
  
  // Client-side
  const val = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "/api/rpc";
  
  // If it's already absolute (e.g. direct Helius URL), use it
  if (val.startsWith("http")) {
    return val;
  }
  
  // If it's relative (e.g. "/api/rpc"), prepend the window origin
  // @solana/web3.js Connection requires an absolute URL
  return `${window.location.origin}${val}`;
};

export const SOLANA_RPC_ENDPOINT = getRpcUrl();

export function createConnection() {
  return new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
}

export const connection = createConnection();

