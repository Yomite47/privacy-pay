export type EncryptedMemoBlob = string;

export const MEMO_STORAGE_KEY_PREFIX = "pp_encrypted_memo_";

export function saveEncryptedMemoBlob(id: string, blob: EncryptedMemoBlob) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  const storageKey = `${MEMO_STORAGE_KEY_PREFIX}${id}`;

  window.localStorage.setItem(storageKey, blob);
}

