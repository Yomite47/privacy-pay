"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletStatus() {
  const { publicKey } = useWallet();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* WalletMultiButton handles the selection modal and connection logic automatically */}
      <WalletMultiButton />
      <div className="text-sm font-medium">
        {publicKey ? (
          <span className="flex items-center gap-2 text-solana-green">
            <span className="w-2 h-2 rounded-full bg-solana-green animate-pulse" />
            Connected
          </span>
        ) : (
          <span className="text-slate-400">Select wallet to continue</span>
        )}
      </div>
    </div>
  );
}
