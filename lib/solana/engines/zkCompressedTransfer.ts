import { LightSystemProgram, createRpc, selectStateTreeInfo, selectMinCompressedSolAccountsForTransfer, bn } from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { connection } from "@/lib/connection";
import { lightRpc } from "@/lib/solana/lightProtocol";
import BN from "bn.js";

// Define the shape of our ZK Transfer params
export interface ZkSendParams {
  payer: any; // Wallet Adapter Context State
  toPubkey: string;
  amountLamports: number;
  encryptedMemo?: string;
}

export async function shieldFunds(params: ZkSendParams) {
  console.log("Initializing Light Protocol Shield...");
  const { payer, amountLamports } = params;

  if (!payer.publicKey) {
    throw new Error("Wallet not connected");
  }

  // 1. Setup Light Protocol RPC
  // We need an RPC that supports ZK compression (Helius or specific Devnet nodes)
  // Uses singleton from lightProtocol.ts

  // 2. Get State Tree Information
  // This fetches the valid Merkle Trees where we can store our compressed assets
  console.log("Fetching state tree info...");
  const infos = await lightRpc.getStateTreeInfos();
  const outputStateTreeInfo = selectStateTreeInfo(infos);

  // 3. Prepare the Shield Instruction (Compress)
  // "Shielding" means moving from Public SOL -> Compressed SOL
  const { blockhash } = await connection.getLatestBlockhash();
  
  // Generate the Compress instruction
  // This moves SOL from the user's public account into a compressed UTXO owned by them
  const shieldIx = await LightSystemProgram.compress({
    payer: payer.publicKey,
    toAddress: payer.publicKey, // We are shielding to ourselves
    lamports: amountLamports,
    outputStateTreeInfo,
  });

  // 4. Build Transaction
  const transaction = new Transaction();
  
  // Add Compute Budget (ZK ops are heavy)
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
  );

  transaction.add(shieldIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;

  // 5. Sign and Send
  console.log("Requesting wallet signature...");
  const signature = await payer.sendTransaction(transaction, connection, {
    skipPreflight: true, // ZK simulation often fails on standard nodes
  });

  console.log("Transaction sent:", signature);
  
  // 6. Confirm
  await connection.confirmTransaction(signature, "confirmed");
  
  return signature;
}

export async function getCompressedBalance(ownerPubkey: string) {
    console.log("Using RPC Endpoint:", connection.rpcEndpoint);
    // Uses singleton lightRpc
    const owner = new PublicKey(ownerPubkey);
    
    // Fetch all compressed accounts for this owner
    console.log("Fetching accounts for owner:", ownerPubkey);
    const accounts = await lightRpc.getCompressedAccountsByOwner(owner);
    
    console.log("Raw Accounts Response:", accounts);

    let totalLamports = 0;
    
    for (const account of accounts.items) {
        // Log each account to see structure
        console.log("Found Compressed Account:", account);
        
        // We only care about SOL (which has no 'token' data usually, or specific discriminator)
        // For now, let's sum up everything that looks like SOL (System Program owner)
        if (account.lamports) {
             const amount = Number(account.lamports);
             console.log(`Adding ${amount} lamports`);
             totalLamports += amount;
        }
    }

    return totalLamports;
}

export async function sendZkPayment(params: ZkSendParams) {
    console.log("Initializing Light Protocol Transfer...");
    const { payer, toPubkey, amountLamports } = params;

    if (!payer.publicKey) {
        throw new Error("Wallet not connected");
    }

    // Uses singleton lightRpc
    
    // 1. Fetch Input UTXOs (My Compressed Accounts)
    console.log("Fetching compressed accounts for payer...");
    const accounts = await lightRpc.getCompressedAccountsByOwner(payer.publicKey);
    
    // 2. Select minimal accounts to cover the amount
    // selectMinCompressedSolAccountsForTransfer returns [selectedAccounts, totalAmount]
    const [selectedAccounts, totalInput] = selectMinCompressedSolAccountsForTransfer(
        accounts.items,
        amountLamports
    );

    if (totalInput.lt(bn(amountLamports))) {
        throw new Error(`Insufficient compressed balance. Have: ${totalInput.toNumber()} lamports, Need: ${amountLamports} lamports`);
    }

    console.log("Selected UTXOs:", selectedAccounts.length, "Total Input:", totalInput.toString());

    // 3. Fetch Validity Proof
    console.log("Fetching validity proof for hashes:", selectedAccounts.map(a => a.hash.toString()));
    const inputHashes = selectedAccounts.map(acc => acc.hash);
    const proofResult = await lightRpc.getValidityProof(inputHashes);
    
    // Detailed logging for debugging
    console.log("Proof Result:", JSON.stringify(proofResult, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
    , 2));

    const { compressedProof, rootIndices } = proofResult as any; 

    if (!compressedProof || !rootIndices) {
        throw new Error(`Failed to get validity proof or root indices. Proof: ${!!compressedProof}, Indices: ${!!rootIndices}`);
    }
    
    if (rootIndices.length === 0) {
        throw new Error("Root indices are empty. Cannot verify proof.");
    }

    // 4. Handle Memo (Separate Transaction)
    // The Light Protocol Devnet program (0x4e25) fails with error 20005 if extra instructions 
    // are present in the same transaction. We send the memo separately first.
    if (params.encryptedMemo) {
        console.log("Sending separate Memo transaction...");
        const memoTx = new Transaction();
        memoTx.add(
            new TransactionInstruction({
                keys: [],
                programId: new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"),
                data: Buffer.from(params.encryptedMemo, "utf-8"),
            })
        );
        
        try {
             const memoSig = await payer.sendTransaction(memoTx, connection, { skipPreflight: true });
             console.log("Memo sent:", memoSig);
             await connection.confirmTransaction(memoSig, "confirmed");
        } catch (e) {
            console.warn("Failed to send memo (non-fatal):", e);
            // We continue with the payment even if memo fails, or we could throw.
            // For now, logging it is safer than blocking the payment.
        }
    }

    // 5. Create Transfer Instruction
    // Note: LightSystemProgram.transfer handles output state creation automatically.
    // It creates a new compressed account for the recipient and a change account if needed.
    console.log("Building Transfer Instruction...");
    const transferIx = await LightSystemProgram.transfer({
        payer: payer.publicKey,
        inputCompressedAccounts: selectedAccounts,
        toAddress: new PublicKey(toPubkey),
        lamports: new BN(amountLamports), // Ensure BN
        recentInputStateRootIndices: rootIndices,
        recentValidityProof: compressedProof,
    });

    // 5. Build Transaction
    const transaction = new Transaction();
    transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), // Reduced from 1.4M to standard high limit
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    console.log("Adding Transfer Instruction...");
    transaction.add(transferIx);

    // Log instruction keys for debugging
    console.log("Transfer Instruction Keys:", transferIx.keys.map(k => ({ 
        pubkey: k.pubkey.toBase58(), 
        isSigner: k.isSigner, 
        isWritable: k.isWritable 
    })));
    
    // Log Proof and Roots for debugging 20005
    console.log("Root Indices:", rootIndices);
    console.log("Input Accounts (Safe Log):", selectedAccounts.map(a => ({
        address: a.address,
        hash: a.hash.toString(),
        // safely access nested props or omit if unknown structure
        tree: (a as any).merkleContext?.merkleTree?.toBase58() || "No Merkle Context"
    })));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Log instruction order for debugging
    transaction.instructions.forEach((ix, i) => {
        console.log(`Ix [${i}]: ProgramId: ${ix.programId.toBase58()}`);
    });

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payer.publicKey;

    // 6. Sign and Send
    // We use sendRawTransaction to handle the signature manually so we can fetch logs on error
    // If payer is a Wallet Adapter object, it might not have signTransaction exposed directly in all cases,
    // but usually it does. If not, we use sendTransaction.
    
    // If we use payer.sendTransaction, it handles signing and sending.
    // We set skipPreflight: true to ensure it goes to chain even if simulation fails (though here we want to debug).
    
    let signature: string;
    try {
        signature = await payer.sendTransaction(transaction, connection, {
            skipPreflight: true, 
        });
    } catch (e: any) {
        // If simulation fails (if skipPreflight was false), we catch it here
        console.error("SendTransaction failed:", e);
        if (e.logs) {
            console.error("Preflight Logs:", e.logs);
            throw new Error(`Transaction failed preflight: ${e.logs.join('\n')}`);
        }
        throw e;
    }
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
    }, "confirmed");

    if (confirmation.value.err) {
        console.error("Transaction failed:", confirmation.value.err);
        
        // Fetch detailed logs
        try {
            const txLogs = await connection.getTransaction(signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0
            });
            if (txLogs?.meta?.logMessages) {
                console.error("On-chain Logs:", txLogs.meta.logMessages);
                throw new Error(`Transaction failed on-chain (Error 20005). Logs: \n${txLogs.meta.logMessages.join('\n')}`);
            }
        } catch (fetchErr) {
            console.error("Failed to fetch logs:", fetchErr);
        }

        throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
}

export async function unshieldFunds(params: ZkSendParams) {
    console.log("Initializing Light Protocol Unshield (Decompress)...");
    const { payer, toPubkey, amountLamports } = params;

    if (!payer.publicKey) {
        throw new Error("Wallet not connected");
    }

    // Uses singleton lightRpc

    // 1. Fetch Input UTXOs (My Compressed Accounts)
    console.log("Fetching compressed accounts for payer...");
    const accounts = await lightRpc.getCompressedAccountsByOwner(payer.publicKey);
    let inputAccounts = accounts.items;

    if (inputAccounts.length === 0) {
        throw new Error("No compressed funds found.");
    }

    // Filter out accounts with 0 lamports
    inputAccounts = inputAccounts.filter(acc => {
        return acc.lamports && acc.lamports.gt(new BN(0));
    });

    // UTXO Selection
    const targetAmount = new BN(amountLamports);
    let selectedAccounts: typeof inputAccounts = [];
    let selectedAmount = new BN(0);

    for (const acc of inputAccounts) {
        selectedAccounts.push(acc);
        selectedAmount = selectedAmount.add(acc.lamports);
        if (selectedAmount.gte(targetAmount)) {
            break;
        }
    }

    if (selectedAmount.lt(targetAmount)) {
        throw new Error(`Insufficient compressed balance. Have: ${selectedAmount.toString()} lamports, Need: ${targetAmount.toString()} lamports`);
    }

    console.log(`Selected ${selectedAccounts.length} UTXOs for unshielding`);

    // 2. Fetch Validity Proof
    const inputHashes = selectedAccounts.map(acc => acc.hash);
    const proofResult = await lightRpc.getValidityProof(inputHashes);
    const { compressedProof, rootIndices } = proofResult as any; 

    if (!compressedProof) {
        throw new Error("Failed to get validity proof");
    }

    // 3. Create Decompress Instruction
    const { blockhash } = await connection.getLatestBlockhash();

    const decompressIx = await LightSystemProgram.decompress({
        payer: payer.publicKey,
        toAddress: new PublicKey(toPubkey),
        lamports: amountLamports,
        inputCompressedAccounts: selectedAccounts,
        recentInputStateRootIndices: rootIndices,
        recentValidityProof: compressedProof,
    });

    // 4. Build Transaction
    const transaction = new Transaction();
    transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );
    transaction.add(decompressIx);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // 5. Sign and Send
    const signature = await payer.sendTransaction(transaction, connection, {
        skipPreflight: true,
    });

    console.log("Unshield Transaction sent:", signature);
    await connection.confirmTransaction(signature, "confirmed");

    return signature;
}
