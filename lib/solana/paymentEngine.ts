import type { WalletContextState } from "@solana/wallet-adapter-react";
import { sendPaymentWithSystemTransfer } from "@/lib/solana/engines/systemTransfer";

export type SendPaymentParams = {
  payer: WalletContextState;
  toPubkey: string;
  amountLamports: number;
  encryptedMemo?: string;
};

export type SendPaymentResult = {
  signature: string;
};

export interface PaymentEngine {
  sendPayment(params: SendPaymentParams): Promise<SendPaymentResult>;
}

export const paymentEngine: PaymentEngine = {
  async sendPayment(params) {
    return sendPaymentWithSystemTransfer(params);
  },
};

// Phase 1: replace this engine with Light Protocol SDK private transfer path.

