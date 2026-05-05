/**
 * Cipher Pay — Viewing Keys
 *
 * Every wallet gets a viewing key derived from their wallet signature.
 * The viewing key can decrypt all transaction history for that wallet.
 *
 * Share with: auditors, regulators, Range Protocol
 * Cannot spend: only decrypts, never signs transactions
 *
 * Architecture:
 *  - Wallet signs a deterministic message → produces 64-byte seed
 *  - Seed derives a NaCl box keypair (viewing keypair)
 *  - Public viewing key: share with anyone you want to grant read access
 *  - Secret viewing key: kept locally, used to decrypt
 *  - All encrypted memos are also encrypted to the viewing public key
 *    so auditors can decrypt them independently
 */

import nacl from "tweetnacl";
import { toBase64, fromBase64 } from "@/lib/memo-sdk/encrypt";

export interface ViewingKeyPair {
  publicKey: string;  // base64 — share with auditors
  secretKey: string;  // base64 — never share, stored locally
  walletAddress: string;
  derivedAt: number;
}

// The deterministic message signed to derive the viewing key.
// Changing this invalidates all existing viewing keys.
const VIEWING_KEY_MESSAGE =
  "CipherPay viewing key derivation v1 — grants read-only access to transaction history. Does not authorize spending.";

/**
 * Derive a viewing keypair from a wallet signature.
 * The signature is deterministic — signing the same message with the
 * same wallet always produces the same viewing keypair.
 */
export function deriveViewingKeypair(
  signatureBytes: Uint8Array,
  walletAddress: string
): ViewingKeyPair {
  // Use the first 32 bytes of the signature as the NaCl box secret key seed
  // NaCl box keypairs are derived from a 32-byte seed
  const seed = signatureBytes.slice(0, 32);
  const keypair = nacl.box.keyPair.fromSecretKey(seed);

  return {
    publicKey: toBase64(keypair.publicKey),
    secretKey: toBase64(keypair.secretKey),
    walletAddress,
    derivedAt: Date.now(),
  };
}

/**
 * Message to sign for viewing key derivation.
 * Returned as Uint8Array for passing to wallet.signMessage().
 */
export function getViewingKeyMessage(): Uint8Array {
  return new TextEncoder().encode(VIEWING_KEY_MESSAGE);
}

/**
 * Encrypt data so an auditor with the viewing public key can decrypt it.
 * Used to double-encrypt memos — recipient can decrypt AND auditor can decrypt.
 */
export function encryptForAuditor(
  plaintext: string,
  auditorPublicKeyBase64: string,
  senderSecretKey: Uint8Array
): string {
  const message = new TextEncoder().encode(plaintext);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const auditorPublicKey = fromBase64(auditorPublicKeyBase64);
  const cipher = nacl.box(message, nonce, auditorPublicKey, senderSecretKey);

  return toBase64(new Uint8Array([...nonce, ...cipher]));
}

/**
 * Decrypt data using the auditor's secret viewing key.
 */
export function decryptWithViewingKey(
  encryptedBase64: string,
  auditorSecretKeyBase64: string,
  senderPublicKeyBase64: string
): string | null {
  try {
    const combined = fromBase64(encryptedBase64);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const cipher = combined.slice(nacl.box.nonceLength);
    const secretKey = fromBase64(auditorSecretKeyBase64);
    const senderPublicKey = fromBase64(senderPublicKeyBase64);

    const plain = nacl.box.open(cipher, nonce, senderPublicKey, secretKey);
    if (!plain) return null;
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ─── Local Storage ───────────────────────────────────────────────────────────

const STORAGE_KEY = "cipherpay:viewing-key";

export function saveViewingKey(keypair: ViewingKeyPair): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${STORAGE_KEY}:${keypair.walletAddress}`,
    JSON.stringify(keypair)
  );
}

export function loadViewingKey(walletAddress: string): ViewingKeyPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${walletAddress}`);
    if (!raw) return null;
    return JSON.parse(raw) as ViewingKeyPair;
  } catch {
    return null;
  }
}

export function clearViewingKey(walletAddress: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEY}:${walletAddress}`);
}
