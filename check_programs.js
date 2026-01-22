
const { Connection, PublicKey } = require("@solana/web3.js");

async function check() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    const progs = [
        "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
        "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb",
        "Memo1UhkJRfHyvLelZZ1i0yZNqOzVR5yq9QTYX3uad4"
    ];

    for (const p of progs) {
        try {
            const acc = await connection.getAccountInfo(new PublicKey(p));
            console.log(`${p}: ${acc ? (acc.executable ? "Executable" : "Not Executable") : "Not Found"}`);
        } catch (e) {
            console.log(`${p}: Error ${e.message}`);
        }
    }
}

check();
