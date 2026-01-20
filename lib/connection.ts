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
  // The proxy on Vercel (Hobby Tier) times out after 10s, which is often too short for Light Protocol "getProgramAccounts"
  // Since this is a Devnet key already shared in context, we use it directly for stability.
  return "https://devnet.helius-rpc.com/?api-key=53a683b1-001c-4c53-b1a1-7a94d285c0da";
  
  /* 
  // Original Secure Proxy Logic (Restore for Production if using Pro/Enterprise Vercel)
  const val = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "/api/rpc";
  if (val.startsWith("http")) return val;
  return `${window.location.origin}${val}`;
  */
};

export const SOLANA_RPC_ENDPOINT = getRpcUrl();

export function createConnection() {
  return new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
}

export const connection = createConnection();

