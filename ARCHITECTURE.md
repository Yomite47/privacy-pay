# Cipher Pay Architecture

Cipher Pay is designed to enable **privacy-preserving payment links** on Solana. The project evolves in two distinct phases, moving from cryptographic privacy (Phase 0) to zero-knowledge privacy (Phase 1).

## Phase 0: Client-Side Privacy (Current)
*Implemented for the Hackathon MVP.*

In this phase, we use standard Solana transfers but leverage **client-side encryption** to protect the "intent" and "content" of the payment (the memo) from public view.

### Workflow
1.  **Sender** generates a payment link with an *encrypted memo* (AES-GCM).
2.  **Sender** funds the link via a standard `SystemProgram.transfer` to the receiver.
3.  **Receiver** uses the link to decrypt the memo locally.
4.  **Inbox** validates the transaction on-chain and stores the decrypted receipt in local storage.

### Privacy Guarantees
*   **Content Privacy:** The memo content is encrypted and unreadable on-chain.
*   **Anonymity:** None. Sender and Receiver addresses are visible on-chain.

---

## Phase 1: ZK Shielded Privacy (Roadmap)
*Leveraging Light Protocol & ZK Compression.*

In this phase, we transition to **true shielded transfers** by building on top of [Light Protocol](https://www.lightprotocol.com/). We use Light Protocol as the infrastructure layer for state compression and nullifiers, while Cipher Pay provides the application logic for shielded links.

### Architecture
We do not use a pre-made "shielded transfer" function. Instead, we compose Light Protocol primitives to build a **Private Payment Link Protocol**:

1.  **Private Funding (The UTXO)**
    *   Instead of a system transfer, the Sender creates a **Compressed UTXO** (Unspent Transaction Output).
    *   This UTXO contains the `amount` and a `secret` derived from the link.
    *   We use Light Protocol to store the **Hash** of this UTXO in a State Merkle Tree on Solana.
    *   *Result:* The funds are "shielded" because only the hash is visible on-chain.

2.  **Private Claiming (The Nullifier)**
    *   The Receiver (with the link) possesses the `secret`.
    *   Receiver generates a **Zero-Knowledge Proof (ZKP)** locally.
    *   The proof asserts: *"I know the secret for a valid UTXO in the Merkle Tree, and I am authorized to spend it."*
    *   We submit this proof to Light Protocol.
    *   Light Protocol verifies the proof and records a **Nullifier** to prevent double-spending.
    *   The funds are then "unshielded" to the Receiver's wallet (or re-shielded to their private balance).

### Why This Matters
*   **Infrastructure (Light Protocol):** Handles the hard math—Merkle Trees, Validity Proofs, Nullifier Sets.
*   **Application (Cipher Pay):** Handles the user intent—Link generation, Secret management, Proof coordination.

### Integration Status
*   `@lightprotocol/compressed-token` and `@lightprotocol/stateless.js` are installed in `package.json`.
*   The application structure (`lib/solana/engines`) is modular to support swapping the `SystemTransfer` engine with a `ZkCompressedTransfer` engine in the future.
