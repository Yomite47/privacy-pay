import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rpcUrl = process.env.HELIUS_RPC_URL;

    if (!rpcUrl) {
      console.error("RPC URL not configured");
      return NextResponse.json({ error: 'RPC configuration error' }, { status: 500 });
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `RPC provider error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("RPC proxy error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
