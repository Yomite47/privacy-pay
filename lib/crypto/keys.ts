import nacl from "tweetnacl";
import bs58 from "bs58";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

// These keys are separate from any Solana wallet keys.
// They are used only for encrypting and decrypting private memos.
// The secret key must never be sent to any server.

const PUBLIC_KEY_STORAGE_KEY = "pp_inbox_publicKey";
const SECRET_KEY_STORAGE_KEY = "pp_inbox_secretKey";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function encodeKeyToBase58(key: Uint8Array) {
  return bs58.encode(key);
}

function decodeKeyFromBase58(encoded: string) {
  return bs58.decode(encoded);
}

function getStoredKeypair() {
  if (!isBrowser()) {
    return null;
  }

  const storedPublicKey = window.localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
  const storedSecretKey = window.localStorage.getItem(SECRET_KEY_STORAGE_KEY);

  if (!storedPublicKey || !storedSecretKey) {
    return null;
  }

  try {
    const publicKey = decodeKeyFromBase58(storedPublicKey);
    const secretKey = decodeKeyFromBase58(storedSecretKey);

    if (
      publicKey.length !== nacl.box.publicKeyLength ||
      secretKey.length !== nacl.box.secretKeyLength
    ) {
      return null;
    }

    return { publicKey, secretKey };
  } catch {
    return null;
  }
}

function storeKeypair(publicKey: Uint8Array, secretKey: Uint8Array) {
  if (!isBrowser()) {
    return;
  }

  const publicKeyEncoded = encodeKeyToBase58(publicKey);
  const secretKeyEncoded = encodeKeyToBase58(secretKey);

  window.localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKeyEncoded);
  window.localStorage.setItem(SECRET_KEY_STORAGE_KEY, secretKeyEncoded);
}

export function getOrCreateInboxKeypair() {
  const existing = getStoredKeypair();
  if (existing) {
    return existing;
  }

  const keypair = nacl.box.keyPair();
  storeKeypair(keypair.publicKey, keypair.secretKey);

  return keypair;
}

export function getInboxPublicKeyBase58() {
  const keypair = getOrCreateInboxKeypair();
  return encodeKeyToBase58(keypair.publicKey);
}

export function exportInboxKeys() {
  const keypair = getOrCreateInboxKeypair();

  const publicKeyBase64 = encodeBase64(keypair.publicKey);
  const secretKeyBase64 = encodeBase64(keypair.secretKey);

  const payload = {
    publicKey: publicKeyBase64,
    secretKey: secretKeyBase64,
  };

  return JSON.stringify(payload, null, 2);
}

// In-memory keypair storage (cleared on refresh)
let memoryKeypair: nacl.BoxKeyPair | null = null;

export function getMemoryKeypair() {
  return memoryKeypair;
}

export function setMemoryKeypair(keypair: nacl.BoxKeyPair) {
  memoryKeypair = keypair;
}

export function deriveKeysFromSignature(signature: Uint8Array): nacl.BoxKeyPair {
  // Use SHA-512 to hash the signature (64 bytes) -> 64 bytes
  const hash = nacl.hash(signature);
  // Use first 32 bytes as the secret key
  const secretKey = hash.slice(0, nacl.box.secretKeyLength);
  // Derive keypair
  const keypair = nacl.box.keyPair.fromSecretKey(secretKey);
  return keypair;
}

export function importInboxKeys(exported: string) {
  if (!isBrowser()) {
    throw new Error("Inbox keys can only be imported in a browser environment.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(exported);
  } catch {
    throw new Error("Invalid key export format. Expected JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("publicKey" in parsed) ||
    !("secretKey" in parsed)
  ) {
    throw new Error("Invalid key export format. Missing fields.");
  }

  const { publicKey, secretKey } = parsed as {
    publicKey: string;
    secretKey: string;
  };

  if (typeof publicKey !== "string" || typeof secretKey !== "string") {
    throw new Error("Invalid key export format. Fields must be strings.");
  }

  try {
    const publicKeyBytes = new Uint8Array(decodeBase64(publicKey));
    const secretKeyBytes = new Uint8Array(decodeBase64(secretKey));

    if (
      publicKeyBytes.length !== nacl.box.publicKeyLength ||
      secretKeyBytes.length !== nacl.box.secretKeyLength
    ) {
      throw new Error("Invalid key lengths in imported data.");
    }

    storeKeypair(publicKeyBytes, secretKeyBytes);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import inbox keys: ${error.message}`);
    }
    throw new Error("Failed to import inbox keys.");
  }
}

export function clearInboxKeys() {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
  window.localStorage.removeItem(SECRET_KEY_STORAGE_KEY);
}

export async function restoreKeysFromSignature(signature: Uint8Array) {
  if (!isBrowser()) {
    throw new Error("Keys can only be restored in a browser environment.");
  }

  // Hash the signature to get a 32-byte seed
  // Cast to any to avoid TS error about ArrayBufferLike vs ArrayBuffer in Vercel build
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", signature as any);
  const seed = new Uint8Array(hashBuffer);

  // Generate keypair from the seed (using it as the secret key)
  const keypair = nacl.box.keyPair.fromSecretKey(seed);

  storeKeypair(keypair.publicKey, keypair.secretKey);
  return keypair;
}
