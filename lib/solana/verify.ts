import { connection } from "@/lib/connection";

export type VerificationResult = {
  isValid: boolean;
  error?: string;
};

export async function verifyTransactionOnChain(
  signature: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmountLamports: number,
  expectedMemoEncrypted: string // We can verify the memo is in the logs if we want, but checking amount/parties is P0
): Promise<VerificationResult> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) {
      return { isValid: false, error: "Transaction not found on Devnet." };
    }

    if (tx.meta?.err) {
      return { isValid: false, error: "Transaction failed on-chain." };
    }

    // Check basic transfer details
    // A system transfer usually has 2 instructions: SystemProgram.transfer (and maybe memo)
    // We look for the transfer instruction matching our criteria.
    
    // Simplest way: Check the balance changes (preBalances vs postBalances)
    // But getting exact account index is tricky.
    // Better: parsing instructions.

    const instructions = tx.transaction.message.instructions;
    let foundTransfer = false;

    for (const ix of instructions) {
        // Handle both compiled (PartiallyDecoded) and Parsed instructions
        if ("program" in ix && ix.program === "system" && ix.parsed.type === "transfer") {
            const info = ix.parsed.info;
            if (
                info.source === expectedFrom &&
                info.destination === expectedTo &&
                info.lamports === expectedAmountLamports
            ) {
                foundTransfer = true;
                break;
            }
        }
    }

    if (!foundTransfer) {
        // Fallback: Check inner instructions (in case it was a CPI, though unlikely for our simple app)
        // For Phase 0 system transfer, it should be top level.
        return { 
            isValid: false, 
            error: `Transaction content mismatch. Expected transfer of ${expectedAmountLamports} lamports from ${expectedFrom} to ${expectedTo}.` 
        };
    }

    // Verify timestamp (optional, but good sanity check - say within 24 hours?)
    // Skipping for now to keep it simple.

    // Verify memo exists if expected
    // This prevents "replay" of a standard transfer as a "memo transfer"
    if (expectedMemoEncrypted) {
        const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb";
        let foundMemo = false;

        for (const ix of instructions) {
            // Case 1: Parsed Instruction (spl-memo)
            if ("program" in ix && (ix.program === "spl-memo" || ix.programId.toBase58() === MEMO_PROGRAM_ID)) {
                if (typeof ix.parsed === "string" && ix.parsed === expectedMemoEncrypted) {
                    foundMemo = true;
                    break;
                }
                // Sometimes parsed might be an object depending on version, but usually string for memo
            }
            
            // Case 2: Raw/PartiallyDecoded Instruction
            if (!("program" in ix) && ix.programId.toBase58() === MEMO_PROGRAM_ID) {
                // ix.data is base58 encoded string of the buffer
                // We need to decode it to check against expectedMemoEncrypted
                // However, since we don't have bs58 imported here, we can rely on the fact that
                // web3.js usually parses Memo instructions.
                // If strictly needed, we could import bs58.
                // For now, let's assume it is parsed or try a basic comparison if possible.
                
                // Let's rely on parsed instructions for now as they are standard for top-level.
            }
        }

        if (!foundMemo) {
            return {
                isValid: false,
                error: "Transaction is missing the expected on-chain memo. The receipt might be forged."
            };
        }
    }

    return { isValid: true };

  } catch (e) {
    console.error("Verification error:", e);
    return { isValid: false, error: "Failed to verify transaction network error." };
  }
}
