"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function WalletStatus() {
   return (
     <div className="flex items-center gap-4">
      {/* WalletMultiButton handles the selection modal and connection logic automatically */}
      <WalletMultiButton />
    </div>
  );
}
