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
  // TEMPORARY: Use direct Helius URL to prevent Proxy Timeouts during ZK Proof generation
  // We use an environment variable so the key is NOT exposed in Git code.
  // Note: This variable must be defined in Vercel as "NEXT_PUBLIC_HELIUS_RPC_URL"
  const directUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  
  if (directUrl) return directUrl;

  // Fallback to proxy if direct URL is not set (might timeout on heavy ZK ops)
  // If running locally without env vars, default to public devnet to avoid "Unexpected error"
  const val = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (val) {
      if (val.startsWith("http")) return val;
      return `${window.location.origin}${val}`;
  }
  
  // Default to public devnet if nothing is configured
  return "https://api.devnet.solana.com";
};

export const SOLANA_RPC_ENDPOINT = getRpcUrl();

export function createConnection() {
  return new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
}

export const connection = createConnection();

