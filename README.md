# Cipher Pay (Privacy Layer for Solana)

Cipher Pay is a **Shielded Payment Interface** built on Solana. It brings true financial privacy to everyday users by leveraging **Zero-Knowledge Compression (Light Protocol)**. 

With Cipher Pay, you can shield your assets, send funds privately, and attach **End-to-End Encrypted (E2EE) memos** that only the intended recipient can read. It solves the "transparent ledger" problem where everyone can see your transaction history and messages.

---

## 🌟 Key Features

### 🛡️ **Shielded Transactions**
- **Go Private:** Convert public SOL into "Shielded SOL" (ZK-compressed assets).
- **Hide Your Tracks:** Transfers between shielded accounts break the on-chain link between sender and receiver.
- **Low Cost:** Powered by Solana's state compression, ensuring privacy is affordable.

### 🔐 **End-to-End Encrypted Memos**
- **Private Messaging:** Attach notes (e.g., "For Design Work", "Salary") that are encrypted client-side.
- **Secure Key Exchange:** Payment links automatically share your encryption key so senders can write messages only *you* can decode.
- **No Snooping:** Even the server cannot read your memos.

### 📒 **Contact Book**
- **Save Friends:** Store frequent addresses and their unique privacy keys.
- **Quick Pay:** Send money instantly without needing to ask for a payment link every time.
- **Syncs Locally:** Your contacts are stored securely on your device.

### 📨 **Receipt-Based Inbox**
- **Proof of Payment:** Senders generate a "Receipt Link" after paying.
- **Claim & Decrypt:** Receivers use the receipt to verify the transaction and decrypt the private memo in their Inbox.

---

## 🚀 Step-by-Step User Guide (Devnet)

### 1️⃣ Prerequisite: Wallet Setup
1. Install a Solana wallet like **Phantom**, **Solflare**, or **Backpack**.
2. **Switch to Devnet**:
   - *Phantom*: Settings > Developer Settings > Change Network > **Devnet**.
   - *Solflare*: Settings > General > Network > **Devnet**.
3. **Get Free Devnet SOL**: Visit [faucet.solana.com](https://faucet.solana.com) and airdrop 1-2 SOL to your wallet address.

### 2️⃣ How to Request Payment (Securely)
To ensure you can read the private messages people send you:
1. Connect your wallet and go to the **Dashboard**.
2. Click the **"Request Payment"** tab.
3. Click **"Create Payment Link"**.
4. **Copy the Link** and send it to the payer.
   - *Why?* This link contains your **Privacy Key**. Without it, the sender can't encrypt messages for you!

### 3️⃣ How to Send Money
1. Open a **Payment Link** sent to you (or select a Contact).
2. The app checks for encryption keys:
   - **Shielded 🛡️**: Key found! You can write a truly private memo.
   - **Warning ⚠️**: No key found. You can choose to send a **Public Memo** (readable by anyone) or a **Private Note** (readable only by you).
3. Enter the **Amount** (in SOL).
4. Click **Send Private Payment**.
5. Once successful, click **"Copy Receipt Link"** and send it to the receiver.

### 4️⃣ How to Check Your Inbox
1. Go to the **Inbox** tab.
2. If you have a Receipt Link, just open it in your browser.
3. Otherwise, paste the **Receipt JSON** into the text box.
4. Click **"Add Payment to Inbox"**.
5. Click **"Sign to Unlock Inbox"**.
   - *Note:* This is a free signature request used to derive your decryption keys securely.
6. Your private memos will be decrypted and displayed!

---

## 💻 For Developers

### Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Blockchain**: Solana Web3.js
- **Privacy Engine**: Light Protocol (ZK Compression)
- **RPC Provider**: Helius (DA & Compression Support)

### Installation
1. **Clone the repo:**
   ```bash
   git clone https://github.com/yomite47/privacy-pay.git
   cd privacy-pay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
   ```

4. **Run the app:**
   ```bash
   npm run dev
   ```

---

## ⚠️ Disclaimer
**This project is currently on Solana Devnet.**
It is a proof-of-concept built for the **Solana Renaissance Hackathon**. Do not use real funds. ZK Compression is a powerful new technology; please use responsibly.
