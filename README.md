# Cipher Pay (Privacy Layer for Solana)

Cipher Pay is a **Shielded Payment Interface** that brings on-chain privacy to everyday Solana users using **Zero-Knowledge Compression (Light Protocol)**. It allows users to store, transfer, and receive funds privately on Solana, with end-to-end encrypted memos.

---

## 🚀 Key Features

### 🛡️ Shielded Accounts (The "Shadow Wallet")
- **Go Private:** Convert public SOL into private, ZK-compressed SOL ("Shielding").
- **Go Public:** Withdraw back to standard SOL whenever you need it ("Unshielding").
- **Balance Privacy:** Your shielded balance is stored in a compressed state tree, visible only to you.

### 💸 Private Transfers
- **Send Anonymously:** Send Shielded SOL to any Solana address.
- **No Trace:** The transaction is validated via ZK proofs, hiding the specific history of the funds.
- **Low Cost:** Uses Solana's state compression technology for minimal rent fees.

### 🔒 Encrypted Memos (Inbox)
- **Secret Messages:** Attach private notes to your payments (e.g., "Salary for March").
- **End-to-End Encryption:** Memos are encrypted client-side using a key derived from your wallet signature. Only the recipient can decrypt and read them.

### ⚡ Technical Highlights
- **ZK Compression:** Built on **Light Protocol (v3)** and **Helius** RPCs.
- **Client-Side Logic:** No centralized database. Your keys and data live in your browser/wallet.
- **Secure RPC:** Uses a secure proxy to protect API keys while allowing high-performance direct connections for ZK proof generation.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- A Solana Wallet (Phantom, Solflare, or Backpack)
- **Devnet SOL** (Get it from [faucet.solana.com](https://faucet.solana.com))

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

## 📖 User Guide

### 1. Shielding Funds (Deposit)
1. Go to the **Shielded Balance** section on the Home page.
2. Enter an amount (e.g., `1 SOL`).
3. Click **"Shield Funds"**.
4. **Outcome:** Your Public SOL decreases, and your Shielded SOL increases. You are now in the private pool.

### 2. Sending Shielded SOL
1. Select **"Send Shielded"**.
2. Enter the Recipient's Solana Address.
3. Enter the Amount.
4. Click **"Send Shielded"**.
5. **Outcome:** The recipient receives the funds into their Shielded Balance. The public ledger shows a compressed transaction but obscures the link between your specific notes.

### 3. Unshielding Funds (Withdraw)
1. Select **"Unshield (Withdraw)"**.
2. Enter the amount to withdraw.
3. Click **"Unshield Funds"**.
4. **Outcome:** The funds return to your Public Wallet balance.

---

## ⚠️ Privacy Model (Important)

Cipher Pay provides **Pseudonymity** and **Asset Graph Obfuscation**.

- **What is Private:**
  - The link between specific "notes" (UTXOs) is broken via ZK Proofs.
  - The content of encrypted memos is visible only to the recipient.
  - Your Shielded Balance is not directly visible on standard block explorers.

- **What is Public:**
  - **Entry/Exit:** Shielding and Unshielding actions are visible on-chain.
  - **Amounts:** In this V1 implementation (Stateless), transfer amounts may be inferred.
  - **Timing:** If you shield and immediately unshield to a new wallet, observers can correlate the timing.

**Recommendation:** For better privacy, keep funds shielded for longer periods and avoid immediate round-trip transactions.

---

## 🏆 Hackathon Context

This project was built to demonstrate that **Privacy on Solana is possible and usable today**.
We leverage **Light Protocol's ZK Compression** to create a seamless experience where users can choose when to be public and when to be private.

**Roadmap:**
- [x] Phase 1: Shield/Unshield & Private Transfers (Done)
- [x] Phase 2: Encrypted Inbox (Done)
- [ ] Phase 3: Relayer Integration (Gasless, untraceable withdrawals)
- [ ] Phase 4: Confidential Transfers (Hiding amounts completely)

