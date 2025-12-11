// Script Simulasi Penumpang Membeli Tiket
const WALLET_PENUMPANG = "0x308A521003cF863cC81cF88a169e5853779Ac090";

// ^^^ PENTING: Ganti tulisan di atas dengan alamat wallet!
// Caranya: Buka Ganache, pilih akun ke-2 atau ke-3, klik icon Copy di kanannya.

console.log("⏳ Sedang memesan tiket untuk:", WALLET_PENUMPANG);

fetch('http://localhost:3000/beli', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ 
        idRute: 1, // Kita beli tiket rute Medan - Danau Toba
        walletPenumpang: WALLET_PENUMPANG 
    })
})
.then(res => res.json())
.then(data => {
    console.log("==========================================");
    console.log("🎉 STATUS:", data.status);
    console.log("🎫 RUTE:", data.detail.rute);
    console.log("🆔 NFT TOKEN ID:", data.detail.tokenId_NFT);
    console.log("🔗 HASH TRANSAKSI:", data.detail.transaksi_hash);
    console.log("==========================================");
})
.catch(err => console.error("❌ Gagal:", err));