const { ethers } = require("ethers");
require('dotenv').config(); 

// --- DATA KONFIGURASI ---
const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// --- KODE FIX UNTUK BYPASS ABI: Human-Readable ABI ---
// Kita hanya mendefinisikan fungsi yang dibutuhkan (batchMintTicket) dalam format string.
const BATCH_MINT_ABI = [
    "function batchMintTicket(address[] recipients, string tokenURI)"
];


async function mintTicketsAutomatically(recipients, tokenURI) {
    if (!OWNER_PRIVATE_KEY || !RPC_ENDPOINT_URL) {
        console.error("❌ ERROR: Kunci belum lengkap.");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_ENDPOINT_URL);
        // Hapus getFeeData agar lebih cepat (biarkan default/auto)
        
        const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
        const busTicketContract = new ethers.Contract(CONTRACT_ADDRESS, BATCH_MINT_ABI, wallet);

        console.log(`[CEPAT] Mengirim Transaksi Batch Minting...`);

        // Panggil fungsi tanpa menunggu 'gas estimation' yang lama
        const tx = await busTicketContract.batchMintTicket(
            recipients,
            tokenURI,
            { gasLimit: 500000 } // Tambah gas limit manual untuk mencegah error estimasi
        );

        console.log(`Transaksi Terkirim! Hash: ${tx.hash}`);
        
        // ⚠️ PERUBAHAN PENTING:
        // KITA HAPUS BARIS INI: await tx.wait(); 
        // Agar Vercel tidak timeout menunggu blockchain.
        
        return tx.hash; // Langsung kembalikan Hash saat itu juga

    } catch (error) {
        console.error("\n❌ GAGAL MINTING:", error.message);
        // Kembalikan null agar server tidak crash
        return null; 
    }
}
module.exports = { mintTicketsAutomatically };