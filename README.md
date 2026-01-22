# Cipher Pay (Privacy Layer for Solana)

Cipher Pay is a **Shielded Payment Interface** that brings on-chain privacy to everyday Solana users using **Zero-Knowledge Compression (Light Protocol)**. It allows users to store, transfer, and receive funds privately on Solana, with end-to-end encrypted memos.

---

## 🚀 Key Features

### 🛡️ Private ZK Transfers
- **Go Private:** Send funds using Light Protocol's Zero-Knowledge compression.
- **Low Cost:** Uses Solana's state compression technology for minimal rent fees.

### 🔗 Secure Payment Links
- **Smart Links:** Generate payment requests that include your **Privacy Key**.
- **End-to-End Encryption (E2EE):** Memos sent via these links are encrypted specifically for you.

### 📒 Contact Book
- **Save Contacts:** Store frequent addresses with their encryption keys.
- **One-Click Pay:** Send money to friends instantly without copy-pasting keys.

### 📨 Encrypted Inbox
- **Secret Messages:** Receive private notes (e.g., "Consulting Fee").
- **Smart Decryption:** Auto-detects whether a memo is private (E2EE) or public (Plaintext).
- **Client-Side Privacy:** Keys are derived from your wallet signature; nothing is stored on a server.

---

## 🏁 Quick Start Guide (Devnet)

### 1. Prerequisite: Wallet Setup
1. Install **Phantom**, **Solflare**, or **Backpack** wallet.
2. Switch network to **Devnet** (Settings > Developer Settings > Change Network).
3. Get **Devnet SOL** from [faucet.solana.com](https://faucet.solana.com).

### 2. Requesting Payment (The Secure Way)
To ensure you can read the encrypted memos people send you:
1. Go to the **Dashboard**.
2. Click **"Create Payment Link"**.
3. Copy the link (e.g., `.../pay?to=YourAddr&pk=YourKey...`).
4. Share this link with the payer. It contains your **Public Key** so they can encrypt messages for you.

### 3. Sending a Private Payment
1. Open a **Payment Link** (or click "Pay" in your Contact Book).
2. The app automatically checks if the receiver has an encryption key:
   - **Shielded 🛡️**: Key found. Message is End-to-End Encrypted.
   - **Warning ⚠️**: No key found. You can choose to send a **Public Memo** (readable by receiver) or a **Private Note** (readable only by you).
3. Enter Amount and Memo.
4. Click **Send**.
5. Copy the **Receipt Link** and send it to the receiver.

### 4. Managing Contacts
1. When you pay someone, click **"Save Contact"** on the confirmation screen.
2. Go to **Dashboard > Contacts** to view your saved addresses.
3. Click the **Send Icon** to pay them instantly with the correct encryption settings.

### 5. Checking Your Inbox
1. Go to **Inbox**.
2. Paste the **Receipt JSON** or open the **Receipt Link** sent by the payer.
3. Click **"Add Payment to Inbox"**.
4. Sign the "Unlock Inbox" request (no gas fee) to derive your decryption keys.
5. Read your private memos!

---

## 🛠️ Setup & Installation (For Developers)

### 1. Clone & Install
```bash
git clone https://github.com/yomite47/privacy-pay.git
cd privacy-pay
npm install
```

### 2. Configure Environment
Create a `.env.local` file in the root directory:
```env
# Helius RPC Key (Required for ZK Compression)
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Backend Proxy Config
NEXT_PUBLIC_SOLANA_RPC_URL=/api/rpc
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚠️ Privacy Model

Cipher Pay provides **Pseudonymity** and **Asset Graph Obfuscation**.
- **Private:** Link between sender/receiver notes, memo content, shielded balance.
- **Public:** Shielding/Unshielding actions, amounts (in V1), transaction timing.
