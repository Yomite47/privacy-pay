## What this is

Link-based Solana devnet payments with encrypted memos and a simple inbox UX.

- Create a payment link that anyone on devnet can open
- Attach an optional private memo, encrypted client-side
- Let the receiver collect payments and decrypt memos in their inbox

## What’s private vs public (Phase 0)

- Private: payment memo / intent (encrypted in the browser)
- Public: sender address, receiver address, amount, and transaction signature
- Network: all transfers use normal SystemProgram transfers on Solana devnet

## User Guide (Simple)

### 1. Get Ready
- Install a Solana wallet (Phantom, Solflare, or Backpack).
- **Important**: Switch your wallet settings to **Devnet**.
- Get free test SOL from [faucet.solana.com](https://faucet.solana.com).

### 2. Receive Money
- Go to the **Home** page.
- Connect your wallet.
- Enter the amount and an optional secret message (memo).
- Click "Generate Link" and copy it.
- Send this link to the person paying you.

### 3. Send Money
- Open the payment link.
- Connect your wallet (make sure you are on Devnet).
- Click **Send**.
- **Important**: When done, click **Copy Receipt**. You must send this receipt text to the receiver!

### 4. Check Inbox
- Receiver goes to the **Inbox** page.
- Paste the receipt text into the box.
- Click **Add**.
- If a secret message is attached, click **Decrypt** to read it.

## How to demo (5 steps)

1. **Receiver creates link**
   - Receiver connects their wallet on the Home page
   - Receiver creates a payment link with an optional private memo
2. **Payer opens link and sends devnet SOL**
   - Payer opens the link, connects their wallet, and sends SOL on devnet
3. **Payer copies receipt**
   - After sending, the Pay page shows a JSON receipt
   - Payer copies the receipt to clipboard
4. **Receiver pastes receipt into inbox**
   - Receiver goes to the Inbox page
   - Receiver pastes the receipt JSON and adds it to the inbox
5. **Receiver decrypts memo**
   - Receiver decrypts the memo using their inbox encryption keys
   - If keys were lost or not imported, memo decryption will fail

## Known limitations (Phase 0)

- Amounts are public on-chain
- Wallets and transactions are linkable on-chain
- Inbox syncing is manual: payer must send the receipt to the receiver
- There is no backend; all state for inbox keys and receipts is in the browser
- Only the memo is encrypted; routing and balances remain public on Solana

## Light Protocol integration plan (Phase 1)

Phase 1 focuses on integrating Light Protocol for stronger privacy, without
changing the user-facing UX.

- Only the payment engine under `lib/solana/engines/` is swapped out
- The UI, payment links, and inbox flow stay the same
- Light Protocol adds more private routing and compressed state on Solana
- Phase 1 aims to improve privacy, not to promise full or untraceable privacy

### Technical Requirements for Phase 1
To activate Light Protocol transfers, you need:

1. **Special RPC Provider**:
   - A Helius or Triton API key is required.
   - Standard Devnet nodes (`api.devnet.solana.com`) do not support ZK Compression.

2. **WASM Support**:
   - The `@lightprotocol/stateless.js` SDK uses WebAssembly (WASM).
   - `next.config.js` must be updated to support `asyncWebAssembly`.

3. **New Payment Engine**:
   - Create `lib/solana/engines/lightTransfer.ts`.
   - Implement "Shielding" (Public SOL → Private Compressed SOL).
   - Implement "Transfer" (Private Compressed SOL → Private Compressed SOL).

## Hackathon positioning

This project focuses on making privacy on Solana usable.
Phase 0 proves the UX and protects payment intent via encrypted memos.
Phase 1 plugs in the Light Protocol SDK for stronger privacy routing.
The goal is a simple, receipt-based inbox that feels familiar to users.
We stay honest about on-chain visibility and do not claim full privacy.
