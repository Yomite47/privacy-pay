"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  deriveViewingKeypair,
  getViewingKeyMessage,
  saveViewingKey,
  loadViewingKey,
  clearViewingKey,
  type ViewingKeyPair,
} from "@/lib/solana/viewing-keys";

export function useViewingKey() {
  const wallet = useWallet();
  const [viewingKey, setViewingKey] = useState<ViewingKeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on wallet connect
  useEffect(() => {
    if (!wallet.publicKey) { setViewingKey(null); return; }
    const saved = loadViewingKey(wallet.publicKey.toBase58());
    setViewingKey(saved);
  }, [wallet.publicKey]);

  const generate = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError("Wallet does not support message signing");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const message = getViewingKeyMessage();
      const signature = await wallet.signMessage(message);
      const keypair = deriveViewingKeypair(signature, wallet.publicKey.toBase58());
      saveViewingKey(keypair);
      setViewingKey(keypair);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate viewing key");
    } finally {
      setIsGenerating(false);
    }
  }, [wallet]);

  const revoke = useCallback(() => {
    if (!wallet.publicKey) return;
    clearViewingKey(wallet.publicKey.toBase58());
    setViewingKey(null);
  }, [wallet.publicKey]);

  return { viewingKey, isGenerating, error, generate, revoke };
}
