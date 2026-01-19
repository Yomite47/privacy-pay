import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import type { SendPaymentParams, SendPaymentResult } from "@/lib/solana/paymentEngine";
import { connection } from "@/lib/connection";

export async function sendPaymentWithSystemTransfer(
  params: SendPaymentParams,
): Promise<SendPaymentResult> {
  const { payer, toPubkey, amountLamports } = params;

  if (!payer.publicKey) {
    throw new Error("Wallet must be connected to send a payment.");
  }

  const to = new PublicKey(toPubkey);

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    recentBlockhash: latestBlockhash.blockhash,
    feePayer: payer.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: to,
      lamports: amountLamports,
    }),
  );

  if (!payer.signTransaction) {
    throw new Error("Wallet does not support transaction signing.");
  }

  const signed = await payer.signTransaction(transaction);
  const raw = signed.serialize();

  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  return { signature };
}
