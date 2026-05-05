/**
 * Viewing Key Verification API
 * Called by Range Protocol or auditors to decrypt transaction history.
 *
 * POST /api/viewing-key/verify
 * Body: { viewingPublicKey, encryptedData, senderPublicKey }
 * Returns: { decrypted: string } or { error }
 */
import { NextRequest, NextResponse } from "next/server";
import { decryptWithViewingKey } from "@/lib/solana/viewing-keys";

interface VerifyRequest {
  viewingSecretKey: string;   // auditor's secret viewing key (base64)
  encryptedData: string;      // encrypted memo (base64)
  senderPublicKey: string;    // sender's viewing public key (base64)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<VerifyRequest>;

    if (!body.viewingSecretKey || !body.encryptedData || !body.senderPublicKey) {
      return NextResponse.json(
        { error: "Missing required fields: viewingSecretKey, encryptedData, senderPublicKey" },
        { status: 400 }
      );
    }

    const decrypted = decryptWithViewingKey(
      body.encryptedData,
      body.viewingSecretKey,
      body.senderPublicKey
    );

    if (!decrypted) {
      return NextResponse.json(
        { error: "Decryption failed — wrong key or corrupted data" },
        { status: 422 }
      );
    }

    return NextResponse.json({ decrypted });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
