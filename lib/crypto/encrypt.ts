import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from "tweetnacl-util";

export function encryptMemo(memoText: string, receiverBoxPublicKey: Uint8Array) {
  if (!memoText) {
    return "";
  }

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ephem = nacl.box.keyPair();
  const messageBytes = decodeUTF8(memoText);

  const cipher = nacl.box(messageBytes, nonce, receiverBoxPublicKey, ephem.secretKey);

  const payload = {
    cipher: encodeBase64(cipher),
    nonce: encodeBase64(nonce),
    ephemPub: encodeBase64(ephem.publicKey),
  };

  return JSON.stringify(payload);
}

export function decryptMemo(encryptedMemoBlob: string, receiverBoxSecretKey: Uint8Array) {
  if (!encryptedMemoBlob) {
    return "";
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(encryptedMemoBlob);
  } catch {
    throw new Error("Invalid encrypted memo format (not JSON).");
  }

  // Check for Plaintext Fallback
  if (typeof parsed === "object" && parsed !== null && "plaintext" in parsed) {
    const p = parsed as { plaintext: string };
    if (typeof p.plaintext === "string") {
      return p.plaintext;
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("cipher" in parsed) ||
    !("nonce" in parsed) ||
    !("ephemPub" in parsed)
  ) {
    throw new Error("Invalid encrypted memo format (missing fields).");
  }

  const { cipher, nonce, ephemPub } = parsed as {
    cipher: string;
    nonce: string;
    ephemPub: string;
  };

  if (typeof cipher !== "string" || typeof nonce !== "string" || typeof ephemPub !== "string") {
    throw new Error("Invalid encrypted memo format (fields must be strings).");
  }

  try {
    const cipherBytes = new Uint8Array(decodeBase64(cipher));
    const nonceBytes = new Uint8Array(decodeBase64(nonce));
    const ephemPubBytes = new Uint8Array(decodeBase64(ephemPub));

    const plainBytes = nacl.box.open(cipherBytes, nonceBytes, ephemPubBytes, receiverBoxSecretKey);

    if (!plainBytes) {
      throw new Error("Unable to decrypt memo (wrong key or corrupted data).");
    }

    return encodeUTF8(plainBytes);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unable to decrypt memo (wrong key or corrupted data).") {
        throw error;
      }
      throw new Error(`Unable to decrypt memo (wrong key or corrupted data).`);
    }
    throw new Error("Unable to decrypt memo (wrong key or corrupted data).");
  }
}

