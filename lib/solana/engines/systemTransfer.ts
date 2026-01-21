import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import type { SendPaymentParams, SendPaymentResult } from "@/lib/solana/paymentEngine";
import { connection } from "@/lib/connection";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb");

export async function sendPaymentWithSystemTransfer(
  params: SendPaymentParams,
): Promise<SendPaymentResult> {
  const { payer, toPubkey, amountLamports, encryptedMemo } = params;

  if (!payer.publicKey) {
    throw new Error("Wallet must be connected to send a payment.");
  }

  const to = new PublicKey(toPubkey);

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  });
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: to,
      lamports: amountLamports,
    }),
  );

  if (encryptedMemo) {
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: new TextEncoder().encode(encryptedMemo),
      })
    );
  }

  // Use the standard sendTransaction method from wallet adapter
  // We explicitly pass the connection and signers (none needed here as wallet signs)
  // We specify preflightCommitment to match our blockhash fetch
  const signature = await payer.sendTransaction(transaction, connection, {
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
