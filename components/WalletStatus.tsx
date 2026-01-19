"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletStatus() {
  const { publicKey } = useWallet();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* WalletMultiButton handles the selection modal and connection logic automatically */}
      <WalletMultiButton />
      <div className="text-sm text-slate-400">
        {publicKey ? (
          <span>Connected</span>
        ) : (
          <span>Select wallet</span>
        )}
      </div>
    </div>
  );
}
