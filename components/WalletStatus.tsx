"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
 
 export function WalletStatus() {
   return (
     <div className="flex items-center gap-4">
      {/* WalletMultiButton handles the selection modal and connection logic automatically */}
      <WalletMultiButton />
    </div>
  );
}
