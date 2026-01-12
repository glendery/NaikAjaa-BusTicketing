require('dotenv').config();
const express = require('express');
const Web3 = require('web3');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // Rate Limiting
const midtransClient = require('midtrans-client');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
// --- IMPORT SERVICE MINTING OTOMATIS ---
const { mintTicketsAutomatically } = require('./mintingService');

// Import Model Database
const { User, Route, Order, Promo, AuditLog } = require('./models');

const app = express();
// app.set('trust proxy', 1); // Hapus karena hanya untuk Vercel/Proxy
app.disable('x-powered-by')
app.use(express.json());
app.use(cors({
    origin: true, // Izinkan semua origin (untuk publik)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 3. Helmet: Konfigurasi "Paranoid" (Supaya ZAP Tidak Komplain)
app.use(helmet({
    // Paksa browser matikan fitur sniffing (Mencegah X-Content-Type-Options Missing)
    xContentTypeOptions: true,
    
    // Cegah DNS Prefetching
    dnsPrefetchControl: { allow: false },
    
    // Cegah Clickjacking (Deny all iframe) - ZAP suka komplain ini
    frameguard: { action: 'deny' },
    
    // HSTS: Paksa HTTPS setahun - ZAP suka komplain ini
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    
    // Content Security Policy (CSP) Paling Ketat
    // Kita buat API ini "bisu" dari script eksternal
    contentSecurityPolicy: {
        directives: {
            // Tolak semua sumber by default
            defaultSrc: ["'none'"],
            
            // Hanya izinkan script dari domain sendiri (HAPUS 'unsafe-inline'!)
            scriptSrc: ["'self'"],
            
            // Hanya izinkan koneksi ke diri sendiri & Midtrans API (Sandbox & Production)
            connectSrc: [
                "'self'", 
                "https://app.sandbox.midtrans.com", 
                "https://api.sandbox.midtrans.com",
                "https://app.midtrans.com", 
                "https://api.midtrans.com"
            ],
            
            // Gambar hanya dari diri sendiri (HAPUS data: dan wildcard)
            imgSrc: ["'self'"],
            
            // CSS hanya dari diri sendiri
            styleSrc: ["'self'"],
            
            // Jangan izinkan object/embed
            objectSrc: ["'none'"],
            
            // Cegah form action ke luar
            formAction: ["'self'"],
            
            upgradeInsecureRequests: [],
        }
    },
    // Referrer Policy yang ketat
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// --- RATE LIMITING (SECURITY) ---
// 1. Global Limiter: Mencegah DDoS ringan
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 300, // 300 request per IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

// 2. Strict Login Limiter: Mencegah Brute Force
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 5, // Maksimal 5x percobaan login per menit
    message: { pesan: "Terlalu banyak percobaan login, tunggu 1 menit!" }
});
app.use('/login', loginLimiter);

// --- AUDIT LOGGING HELPER ---
const logActivity = async (action, req, details, email = null, role = null) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        const newLog = new AuditLog({
            action,
            email,
            role,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            ip,
            userAgent
        });
        await newLog.save();
        console.log(`📝 Audit Log: ${action} - ${email || 'Anon'} - ${ip}`);
    } catch (e) {
        console.error("❌ Gagal simpan Audit Log:", e.message);
    }
};

// --- [PENTING] KONFIGURASI EMAIL PENGIRIM ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- KONEKSI MONGODB (SERVERLESS FRIENDLY) ---
const MONGO_URI = process.env.MONGO_URI;

async function connectToDatabase() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!MONGO_URI) {
        throw new Error("FATAL: MONGO_URI tidak ditemukan di Environment Variables!");
    }

    try {
        console.log("🔄 Mencoba koneksi ke MongoDB...");
        const db = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout 5 detik agar tidak hanging
        });
        console.log("✅ Terkoneksi ke MongoDB Atlas");

        // AUTO-SEEDING: Cek jika database kosong
        try {
            const routeCount = await Route.countDocuments();
            if (routeCount === 0) {
                console.log("📭 Database Kosong. Memulai Seeding Otomatis...");
                await seedRoutes();
            }
        } catch (seedErr) {
            console.error("⚠️ Gagal Auto-Seed:", seedErr);
        }

        return db;
    } catch (err) {
        console.error("❌ Gagal koneksi Database:", err);
        throw err;
    }
}

// Inisialisasi awal (Optional, tapi bagus untuk log start)
connectToDatabase().catch(err => console.error("⚠️ Init DB Error:", err.message));

// --- KONFIGURASI MIDTRANS ---
// Ambil Server Key dari .env
const serverKey = process.env.MIDTRANS_SERVER_KEY;

if (!serverKey) {
    console.error("❌ MIDTRANS_SERVER_KEY tidak ditemukan di .env!");
}

// DETEKSI MODE BERDASARKAN ENV VAR ATAU KEY PREFIX
const envFlag = (process.env.MIDTRANS_ENV || '').toLowerCase();

// Prioritas:
// 1. Key dengan prefix "Mid-" -> PRODUCTION (Hard rule dari Midtrans)
// 2. Key dengan prefix "SB-" -> SANDBOX (Hard rule dari Midtrans)
// 3. Env Var "production" -> PRODUCTION
// 4. Default -> SANDBOX

const isKeyProduction = serverKey && serverKey.startsWith("Mid-");
const isKeySandbox = serverKey && serverKey.startsWith("SB-");

let isProduction = false;
if (isKeyProduction) {
    isProduction = true;
} else if (isKeySandbox) {
    isProduction = false;
} else {
    isProduction = envFlag === 'production';
}

const snap = new midtransClient.Snap({
    isProduction: isProduction,
    serverKey: serverKey
});

console.log(`---------------------------------------------------`);
console.log(`💳 Midtrans Configuration`);
console.log(`   Mode: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
console.log(`   Key Used: ${serverKey ? serverKey.substring(0, 5) + '...' + serverKey.substring(serverKey.length - 5) : 'MISSING'}`);
console.log(`   URL Target: ${isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'}`);
console.log(`---------------------------------------------------`);

app.get('/api', (req, res) => {
    res.send('Backend NaikAjaa is running!');
});

// --- DATA STATIS ---
const locationData = {
    "Medan": {
        loket: ["Loket Amplas (Jl. SM Raja KM 6,5)", "Loket Pinang Baris", "Pool ALS Pusat", "Pool Makmur", "Loket Ringroad"],
        turun: ["Terminal Terpadu Amplas", "Simpang Pos", "Ringroad City Walk", "Terminal Pinang Baris", "Lapangan Merdeka"]
    },
    "Pematang Siantar": { loket: ["Terminal Tanjung Pinggir", "Loket Parluasan"], turun: ["Terminal Tanjung Pinggir", "Simpang Dua", "Ramayana"] },
    "Parapat": { loket: ["Loket Pelabuhan Ajibata"], turun: ["Pelabuhan Tiga Raja", "Hotel Niagara", "Pantai Bebas"] },
    "Balige": { loket: ["Loket Bundaran", "Loket Soposurung"], turun: ["Pasar Balige", "Simpang Siborong-borong", "Pantai Bulbul"] },
    "Tarutung": { loket: ["Terminal Madya Tarutung"], turun: ["Simpang 4 Hutabarat", "Pemandian Air Soda"] },
    "Sibolga": { loket: ["Terminal Tipe A Sibolga"], turun: ["Pelabuhan Sambas", "Pantai Pandan", "Pusat Kota"] },
    "Berastagi": { loket: ["Loket Tugu Jeruk"], turun: ["Tugu Perjuangan", "Pasar Buah", "Hillpark Sibolangit"] },
    "Kualanamu": { loket: ["Shelter Bus Bandara"], turun: ["Drop-off Keberangkatan"] },
    "Silangit": { loket: ["Shelter Damri"], turun: ["Gerbang Kedatangan"] }
};

const armadas = [
    { name: "ALS", type: "Executive AC", seats: 40, price: 180000, cat: "BUS", img: "/logos/ALS.jpeg", fasilitas: ["Toilet", "Selimut"], deskripsi: "Raja jalanan lintas Sumatera." },
    { name: "Makmur", type: "Super Executive", seats: 28, price: 230000, cat: "BUS", img: "/logos/Makmur.jpg", fasilitas: ["Leg Rest", "Snack"], deskripsi: "Kenyamanan maksimal." },
    { name: "Sejahtera", type: "Patas AC", seats: 45, price: 50000, cat: "BUS", img: "/logos/Sejahtera.jpg", fasilitas: ["AC"], deskripsi: "Cepat dan Murah." },
    { name: "KBT Travel", type: "Hiace", seats: 10, price: 160000, cat: "TRAVEL", img: "/logos/KBT.jpg", fasilitas: ["Captain Seat"], deskripsi: "Travel Premium." },
    { name: "Sampri", type: "Innova", seats: 7, price: 180000, cat: "TRAVEL", img: "/logos/Sampri.jpg", fasilitas: ["Private"], deskripsi: "Serasa mobil pribadi." }
];

// --- SEEDING DATA RUTE OTOMATIS (DIPERBAIKI) ---
async function seedRoutes() {
    try {
        console.log("⚙️ Mengecek kelengkapan rute di Database...");
        
        const routePairs = [
            { asal: "Medan", tujuan: "Pematang Siantar", jarak: "Dekat" },
            { asal: "Medan", tujuan: "Parapat", jarak: "Sedang" },
            { asal: "Medan", tujuan: "Balige", jarak: "Jauh" },
            { asal: "Medan", tujuan: "Berastagi", jarak: "Dekat" },
            { asal: "Medan", tujuan: "Sibolga", jarak: "Sangat Jauh" },
            { asal: "Silangit", tujuan: "Parapat", jarak: "Dekat" }
        ];
        const jamKeberangkatan = ["08:00", "10:00", "14:00", "20:00"];
        
        let totalAdded = 0;
        
        for (const pair of routePairs) {
            // Cek apakah sudah ada rute untuk pasangan ini
            const exists = await Route.findOne({ asal: pair.asal, tujuan: pair.tujuan });
            if (exists) continue; // Skip jika sudah ada

            console.log(`➕ Menambahkan rute baru: ${pair.asal} - ${pair.tujuan}`);
            
            const newRoutes = [];
            // Gunakan armadas (global variable)
            armadas.forEach(op => {
                jamKeberangkatan.forEach(jam => {
                    const pickupPoints = locationData[pair.asal]?.loket || ["Terminal Pusat"];
                    const dropPoints = locationData[pair.tujuan]?.turun || ["Terminal Pusat"];
                    let realPrice = op.price;
                    if (pair.jarak === "Dekat") realPrice = op.price * 0.4;
                    if (pair.jarak === "Sedang") realPrice = op.price * 0.6;
                    realPrice = Math.ceil(realPrice / 5000) * 5000;

                    newRoutes.push({
                        id: Math.floor(Math.random() * 1000000), // Random ID
                        asal: pair.asal, tujuan: pair.tujuan,
                        operator: op.name, tipe: op.type, jam: jam,
                        harga: realPrice, kategori: op.cat, image: op.img,
                        fasilitas: op.fasilitas, kapasitas: op.seats, deskripsi: op.deskripsi,
                        titik_jemput: pickupPoints, titik_turun: dropPoints
                    });
                });
            });
            
            if (newRoutes.length > 0) {
                await Route.insertMany(newRoutes);
                totalAdded += newRoutes.length;
            }
        }
        
        console.log(`✅ Seeding selesai. Menambahkan ${totalAdded} rute baru.`);
    } catch (e) { console.log("Gagal Seed:", e); }
};

// Endpoint Manual untuk memaksa seeding (bisa dipanggil dari browser)
app.get('/api/debug/seed', async (req, res) => {
    await seedRoutes();
    res.json({ status: "Seeding selesai, coba refresh halaman pencarian." });
});
 

// Web3 Provider (Opsional/Lokal)
const web3 = new Web3(process.env.RPC_ENDPOINT_URL || 'http://127.0.0.1:7545'); 
async function seedDefaultAdmin() {
    try {
        const exists = await User.findOne({ email: 'admin' });
        if (exists) return;
        const newWallet = web3.eth.accounts.create();
        const admin = new User({
            nama: 'Super Admin',
            email: 'admin',
            password: 'admin1234',
            walletAddress: newWallet.address,
            walletPrivateKey: newWallet.privateKey,
            role: 'admin'
        });
        await admin.save();
    } catch {
        // Abaikan jika admin sudah ada
    }
}
setTimeout(seedDefaultAdmin, 3000);

// --- API ENDPOINTS ---

app.post('/api/register', async (req, res) => {
    try {
        await connectToDatabase();
        const { nama, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ pesan: "Email sudah terdaftar!" });

        const newWallet = web3.eth.accounts.create();
        const newUser = new User({
            nama, email, password,
            walletAddress: newWallet.address,
            walletPrivateKey: newWallet.privateKey,
            role: email.includes('admin') ? 'admin' : 'user'
        });
        
        await newUser.save();
        res.json({ status: "OK", pesan: "Registrasi Berhasil" });
    } catch (err) { res.status(500).json({ pesan: err.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        await connectToDatabase();
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            // logActivity('LOGIN_FAILED', req, `Gagal login: ${email}`, email, 'guest');
            return res.status(401).json({ pesan: "Email atau Password salah" });
        }
        
        // logActivity('LOGIN_SUCCESS', req, 'User berhasil login', user.email, user.role);
        
        const uData = user.toObject();
        delete uData.password; delete uData.walletPrivateKey;
        res.json({ status: "OK", user: uData });
    } catch (err) { 
        console.error("Login Error:", err);
        res.status(500).json({ pesan: "Server Error: " + err.message }); 
    }
});

app.get('/api/rute', async (req, res) => {
    try {
        await connectToDatabase();
        const { tanggal, asal, tujuan, lokasi, turun } = req.query;
        let query = {};
        if (asal) query.asal = { $regex: asal, $options: 'i' };
        if (tujuan) query.tujuan = { $regex: tujuan, $options: 'i' };
        if (lokasi && lokasi !== "SEMUA") query.titik_jemput = lokasi;
        if (turun && turun !== "SEMUA") query.titik_turun = turun;

        const rutes = await Route.find(query).limit(50);
        const targetDate = tanggal || "DEFAULT";
        
        const results = await Promise.all(rutes.map(async (r) => {
            const orders = await Order.find({ 
                rute: `${r.asal} - ${r.tujuan}`, operator: r.operator,
                jam: r.jam, tanggal: targetDate, status: { $ne: 'CANCEL' } 
            });
            const sisa = r.kapasitas - orders.length;
            return { ...r.toObject(), sisaKursi: sisa, bookedSeats: orders.map(o=>o.seatNumber), isFull: sisa <= 0 };
        }));

        res.json(results);
    } catch { res.status(500).json([]); }
});

app.get('/api/info-lokasi', (req, res) => {
    const { kota, tipe } = req.query; 
    if (!kota || !tipe) return res.json([]);
    const mappedTipe = tipe === 'jemput' ? 'loket' : tipe; 
    const dataKota = locationData[Object.keys(locationData).find(k => k.toLowerCase() === kota.toLowerCase())];
    if (dataKota && dataKota[mappedTipe]) res.json(dataKota[mappedTipe]); else res.json([]);
});
app.get('/api/kota', (req, res) => { res.json(Object.keys(locationData)); });

app.post('/api/beli', async (req, res) => {
    try {
        // Pastikan Database Terkoneksi sebelum lanjut
        await connectToDatabase();

        console.log("📩 Menerima pesanan:", req.body);
        const { idRute, emailUser, tanggal, promoCode, seatNumber, lokasiTurun, lokasiJemput, namaPenumpang, nikPenumpang } = req.body;
        const user = await User.findOne({ email: emailUser });
        
        let rute = await Route.findOne({ id: idRute }); 
        if (!rute && mongoose.isValidObjectId(idRute)) rute = await Route.findById(idRute);

        if (!user || !rute) return res.status(404).json({ pesan: "Data tidak valid" });

        const isTaken = await Order.findOne({
            rute: `${rute.asal} - ${rute.tujuan}`, operator: rute.operator,
            jam: rute.jam, tanggal: tanggal, seatNumber: seatNumber, status: { $ne: 'CANCEL' }
        });
        if (isTaken) return res.status(400).json({ pesan: `Kursi No. ${seatNumber} sudah dipesan!` });

        let finalPrice = rute.harga;
        let discountAmount = 0;
        if (promoCode) {
            const promo = await Promo.findOne({ code: promoCode, active: true, quota: { $gt: 0 } });
            if (promo) { discountAmount = promo.discount; finalPrice = Math.max(0, rute.harga - discountAmount); }
        }

        const orderId = `TIKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        let parameter = {
            transaction_details: { order_id: orderId, gross_amount: finalPrice },
            credit_card: { secure: true },
            customer_details: { first_name: namaPenumpang, email: emailUser, phone: nikPenumpang },
            item_details: [{ id: rute.id ? rute.id.toString() : "RUTE-001", price: finalPrice, quantity: 1, name: `${rute.operator} Trip` }]
        };

        // --- SMART RETRY MECHANISM DIHAPUS (HANYA LOCALHOST) ---
        // Kita gunakan kunci langsung dari .env
        
        console.log(`🔄 Memulai Percobaan Transaksi ke Midtrans...`);
        console.log(`ℹ️ Debug Info: ServerKey Available? ${!!serverKey}, isProduction: ${isProduction}, Gross Amount: ${finalPrice}`);

        // Validasi Minimum Amount Midtrans (Min 1 Rupiah)
        if (finalPrice < 1) {
            return res.status(400).json({ pesan: "Total bayar tidak valid (0 rupiah)" });
        }

        try {
            const transaction = await snap.createTransaction(parameter);
            console.log("✅ Snap Token Berhasil:", transaction.token);
            
             // ----------------------------------------------------

            const newOrder = new Order({
                orderId_Midtrans: orderId,
                snap_token: transaction.token, // Simpan token
                email: user.email, idRute: rute.id,
                rute: `${rute.asal} - ${rute.tujuan}`, operator: rute.operator,
                jam: rute.jam, tanggal, hargaAsli: rute.harga, diskon: discountAmount, totalBayar: finalPrice,
                tipe: rute.tipe, status: "PENDING", kategori: rute.kategori, seatNumber,
                lokasi_jemput: lokasiJemput, lokasi_turun: lokasiTurun,
                namaPenumpang, nikPenumpang
            });
            await newOrder.save();

            if (discountAmount > 0) await Promo.updateOne({ code: promoCode }, { $inc: { quota: -1 } });

        res.json({ status: "OK", token: transaction.token, redirect_url: transaction.redirect_url, orderId: orderId });

    } catch (err) {
            console.error("❌ Error Midtrans:", err.message);
            if (err.ApiResponse) {
                console.error("Midtrans API Response:", JSON.stringify(err.ApiResponse));
            }
            res.status(500).json({ 
                pesan: "Gagal memproses pesanan ke Midtrans", 
                error: err.message,
                detail: err.ApiResponse 
            });
        }

    } catch (err) {
        console.error("❌ Error Beli:", err);
        res.status(500).json({ pesan: "Gagal memproses pesanan", error: err.message, stack: err.stack });
    }
});

app.get('/api/orders/:email', async (req, res) => {
    try {
        await connectToDatabase();
        const orders = await Order.find({ email: req.params.email }).sort({ createdAt: -1 });
        res.json(orders);
    } 
    catch { res.status(500).json([]); }
});

app.post('/api/admin/add-route', async (req, res) => {
    try {
        const { adminEmail, ...payload } = req.body;
        const adminUser = await User.findOne({ email: adminEmail, role: 'admin' });
        if (!adminUser) return res.status(403).json({ pesan: 'Akses ditolak: hanya admin' });
        
        const newRoute = new Route({ id: Date.now(), ...payload, harga: parseInt(payload.harga), kapasitas: 10 });
        await newRoute.save();

        logActivity('CREATE_ROUTE', req, `Rute Baru: ${payload.asal} -> ${payload.tujuan}`, adminEmail, 'admin');
        
        res.json({ status: "OK" });
    } catch (err) { res.status(500).json({ pesan: err.message }); }
});

// --- [ENDPOINT PENTING] WEBHOOK + EMAIL OTOMATIS ---
app.post('/api/midtrans-notification', async (req, res) => {
    try {
        await connectToDatabase();
        // Debug: Log payload yang masuk
        console.log("🔔 Webhook Payload:", JSON.stringify(req.body).substring(0, 200) + "...");

        // 1. Cek Validitas Payload Dasar
        // Jika tidak ada order_id, ini mungkin notifikasi Subscription atau Test yang salah tipe
        if (!req.body.order_id && !req.body.transaction_status) {
            console.log("⚠️ Mengabaikan notifikasi invalid (Tanpa order_id/status). Mungkin Test Notification tipe Subscription?");
            return res.status(200).send('OK (Ignored)');
        }

        const statusResponse = await snap.transaction.notification(req.body);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`🔔 Notifikasi Masuk: Order ${orderId} statusnya ${transactionStatus}`);
        let orderStatus = 'PENDING';

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') { orderStatus = 'CHALLENGE'; } 
            else if (fraudStatus == 'accept') { orderStatus = 'LUNAS'; }
        } else if (transactionStatus == 'settlement') { orderStatus = 'LUNAS'; } 
        else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') { orderStatus = 'GAGAL'; } 
        else if (transactionStatus == 'pending') { orderStatus = 'PENDING'; }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId_Midtrans: orderId },
            { status: orderStatus },
            { new: true }
        );
        
        let finalTxHash = null;

        if (updatedOrder) {
            console.log(`✅ Database Updated: ${orderId} jadi ${orderStatus}`);
            
            // --- BLOCKCHAIN MINTING OTOMATIS JIKA STATUS LUNAS ---
            if (orderStatus === 'LUNAS') {
                let currentStatus = 'LUNAS'; 
                
                try {
                    // 1. Ambil walletAddress dari database User
                    const userForMint = await User.findOne({ email: updatedOrder.email });
                    const recipientWalletAddress = userForMint ? userForMint.walletAddress : null;

                    if (recipientWalletAddress) {
                        const recipients = [recipientWalletAddress];
                        // GUNAKAN BASE URL DARI REQUEST UNTUK METADATA
                        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `${req.protocol}://${req.get('host')}`;
                        const tokenURI = `${baseUrl}/api/tickets/metadata/${updatedOrder.orderId_Midtrans}`;
                        
                        console.log(`[BLOCKCHAIN] Memulai Minting Otomatis untuk Order ID: ${updatedOrder.orderId_Midtrans}`);
                        const hash = await mintTicketsAutomatically(recipients, tokenURI);
                        
                        finalTxHash = hash; 
                        currentStatus = 'MINTED'; 
                        
                        await Order.updateOne(
                            { orderId_Midtrans: updatedOrder.orderId_Midtrans },
                            { $set: { status: currentStatus, hash: hash } }
                        );
                        console.log(`[BLOCKCHAIN] Minting Sukses! Hash: ${hash}. Status DB diubah ke MINTED.`);

                    } else {
                        console.error(`[BLOCKCHAIN ERROR] Alamat wallet tidak ditemukan untuk user: ${updatedOrder.email}. Minting dilewati.`);
                    }
                } catch (e) {
                    finalTxHash = 'TRANSACTION_FAILED';
                    currentStatus = 'LUNAS_MINT_FAILED';
                    await Order.updateOne(
                        { orderId_Midtrans: updatedOrder.orderId_Midtrans },
                        { $set: { status: currentStatus, hash: finalTxHash } }
                    );
                    console.error(`[BLOCKCHAIN FATAL ERROR] Minting gagal: ${e.message}. Status diubah ke ${currentStatus}.`);
                }
                
                // --- KIRIM EMAIL ---
                console.log("📧 Mengirim E-Ticket ke:", updatedOrder.email);

                const mailOptions = {
                    from: '"NaikAjaa Official" <naikajaa@gmail.com>',
                    to: updatedOrder.email, 
                    subject: `E-Ticket Terbit: ${updatedOrder.orderId_Midtrans}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                            <div style="background: #1E3A8A; padding: 20px; text-align: center; color: white;">
                                <h2 style="margin: 0;">NaikAjaa</h2>
                                <p style="margin: 5px 0 0; font-size: 14px;">E-Ticket Perjalanan Anda</p>
                            </div>
                            
                            <div style="padding: 20px;">
                                <p>Halo <b>${updatedOrder.namaPenumpang}</b>,</p>
                                <p>Pembayaran berhasil! Berikut adalah detail tiket Anda:</p>
                                
                                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <table style="width: 100%;">
                                        <tr>
                                            <td style="color: #64748b; font-size: 12px;">Rute</td>
                                            <td style="font-weight: bold; text-align: right;">${updatedOrder.rute}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 12px;">Operator</td>
                                            <td style="font-weight: bold; text-align: right;">${updatedOrder.operator}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 12px;">Jadwal</td>
                                            <td style="font-weight: bold; text-align: right;">${updatedOrder.tanggal} | ${updatedOrder.jam} WIB</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 12px;">Kursi</td>
                                            <td style="font-weight: bold; text-align: right; color: #E11D48;">No. ${updatedOrder.seatNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b; font-size: 12px;">Hash Tiket (Blockchain)</td>
                                            <td style="font-weight: bold; text-align: right; font-size: 10px;">${finalTxHash || 'PENDING_MINT'}</td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${finalTxHash || 'VALID'}" style="border: 5px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" />
                                    <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Scan QR Code ini saat naik bus/travel</p>
                                </div>
                            </div>
                            
                            <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                                &copy; 2025 NaikAjaa. Butuh bantuan? Balas email ini.
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error("❌ Gagal kirim email:", err.message);
                    } else {
                        console.log("✅ Email terkirim sukses:", info.response);
                    }
                });
            }

        } else {
            console.log(`❌ Order tidak ditemukan: ${orderId}`);
        }
        res.status(200).send('OK');

    } catch (err) {
        console.error("❌ Webhook Error (Handled):", err.message);
        // Tetap kirim 200 OK agar Midtrans tidak menganggap failed (terutama saat Test)
        res.status(200).send('OK (Error logged)');
    }
});
// --- ENDPOINT MANUAL CHECK STATUS (SOLUSI LOCALHOST) ---
app.post('/api/check-status', async (req, res) => {
    try {
        await connectToDatabase();
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ pesan: "Order ID diperlukan" });

        const order = await Order.findOne({ orderId_Midtrans: orderId });
        if (!order) return res.status(404).json({ pesan: "Order tidak ditemukan" });

        // Cek status ke Midtrans
        let transactionStatus, fraudStatus;
        try {
            const statusResponse = await snap.transaction.status(orderId);
            transactionStatus = statusResponse.transaction_status;
            fraudStatus = statusResponse.fraud_status;
        } catch (e) {
            return res.status(500).json({ pesan: "Gagal cek status Midtrans: " + e.message });
        }

        console.log(`🔎 Manual Check: Order ${orderId} statusnya ${transactionStatus}`);
        let orderStatus = order.status;

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') { orderStatus = 'CHALLENGE'; } 
            else if (fraudStatus == 'accept') { orderStatus = 'LUNAS'; }
        } else if (transactionStatus == 'settlement') { orderStatus = 'LUNAS'; } 
        else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') { orderStatus = 'GAGAL'; } 
        else if (transactionStatus == 'pending') { orderStatus = 'PENDING'; }

        // Jika status berubah jadi LUNAS (dan sebelumnya belum LUNAS/MINTED)
        if (orderStatus === 'LUNAS' && order.status !== 'LUNAS' && order.status !== 'MINTED') {
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId_Midtrans: orderId },
                { status: 'LUNAS' },
                { new: true }
            );

            // --- LOGIC MINTING & EMAIL ---
            let finalTxHash = null;
            let currentStatus = 'LUNAS';
            let mintingError = null;

            try {
                const userForMint = await User.findOne({ email: updatedOrder.email });
                const recipientWalletAddress = userForMint ? userForMint.walletAddress : null;

                if (recipientWalletAddress) {
                    const recipients = [recipientWalletAddress];
                    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `${req.protocol}://${req.get('host')}`;
                    const tokenURI = `${baseUrl}/api/tickets/metadata/${updatedOrder.orderId_Midtrans}`;
                    
                    console.log(`[BLOCKCHAIN] Minting Manual untuk: ${updatedOrder.orderId_Midtrans}`);
                    const hash = await mintTicketsAutomatically(recipients, tokenURI);
                    
                    if (hash) {
                        finalTxHash = hash; 
                        currentStatus = 'MINTED'; 
                        
                        await Order.updateOne(
                            { orderId_Midtrans: updatedOrder.orderId_Midtrans },
                            { $set: { status: currentStatus, hash: hash } }
                        );
                        console.log(`[BLOCKCHAIN] Minting Sukses! Hash: ${hash}`);
                    } else {
                        mintingError = "Gagal mendapatkan Hash (Cek Server Log)";
                    }
                } else {
                    mintingError = "Wallet Address User Tidak Ditemukan";
                }
            } catch (e) {
                console.error(`[BLOCKCHAIN ERROR] Minting gagal: ${e.message}`);
                mintingError = e.message;
            }

            // Kirim Email (Tetap kirim meski minting gagal)
            const mailOptions = {
                from: '"NaikAjaa Official" <naikajaa@gmail.com>',
                to: updatedOrder.email, 
                subject: `E-Ticket Terbit: ${updatedOrder.orderId_Midtrans}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <div style="background: #1E3A8A; padding: 20px; text-align: center; color: white;">
                            <h2 style="margin: 0;">NaikAjaa</h2>
                            <p style="margin: 5px 0 0; font-size: 14px;">E-Ticket Perjalanan Anda</p>
                        </div>
                        <div style="padding: 20px;">
                            <p>Halo <b>${updatedOrder.namaPenumpang}</b>,</p>
                            <p>Pembayaran berhasil! Berikut adalah detail tiket Anda:</p>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <table style="width: 100%;">
                                    <tr><td style="color: #64748b; font-size: 12px;">Rute</td><td style="font-weight: bold; text-align: right;">${updatedOrder.rute}</td></tr>
                                    <tr><td style="color: #64748b; font-size: 12px;">Operator</td><td style="font-weight: bold; text-align: right;">${updatedOrder.operator}</td></tr>
                                    <tr><td style="color: #64748b; font-size: 12px;">Jadwal</td><td style="font-weight: bold; text-align: right;">${updatedOrder.tanggal} | ${updatedOrder.jam} WIB</td></tr>
                                    <tr><td style="color: #64748b; font-size: 12px;">Kursi</td><td style="font-weight: bold; text-align: right; color: #E11D48;">No. ${updatedOrder.seatNumber}</td></tr>
                                    <tr><td style="color: #64748b; font-size: 12px;">Hash Tiket</td><td style="font-weight: bold; text-align: right; font-size: 10px;">${finalTxHash || 'PENDING/FAILED'}</td></tr>
                                </table>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${finalTxHash || 'VALID'}" style="border: 5px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" />
                                <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Scan QR Code ini saat naik bus/travel</p>
                            </div>
                        </div>
                    </div>
                `
            };
            transporter.sendMail(mailOptions, (err) => {
                if (err) console.error("❌ Gagal kirim email:", err.message);
                else console.log("✅ Email terkirim.");
            });

            return res.json({ status: "OK", orderStatus: currentStatus, updated: true, mintingError });
        }

        res.json({ status: "OK", orderStatus, updated: false });

    } catch (err) {
        console.error("Check Status Error:", err);
        res.status(500).json({ pesan: err.message });
    }
});

app.get('/api/seats', async (req, res) => {
  try {
    await connectToDatabase(); // Pastikan DB terkoneksi
    const { date, destination } = req.query; 
    
    // Validasi input
    if (!date || !destination) {
      return res.status(400).json({ error: 'Tanggal dan tujuan harus diisi' });
    }

    // Dekode destination jika perlu (meskipun express biasanya auto-decode query params)
    const ruteTujuan = decodeURIComponent(destination);

    // Cari di tabel 'Order' (bukan Ticket)
    // Filter status: Jangan ambil yang 'CANCEL' atau 'GAGAL'
    const bookedOrders = await Order.find({
      rute: { $regex: new RegExp(ruteTujuan, 'i') }, // Pencarian case-insensitive & partial match agar lebih robust
      tanggal: date,            
      status: { $nin: ['CANCEL', 'GAGAL'] } 
    });

    // Ambil nomor kursinya saja (biarkan String agar support 1A, 1B, dll)
    const bookedSeats = bookedOrders.map(order => order.seatNumber);

    res.json({ 
      success: true, 
      bookedSeats: bookedSeats 
    });

  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ error: 'Gagal mengambil data kursi' });
  }
});

app.post('/api/check-promo', async (req, res) => {
    try {
        const { code } = req.body;
        const promo = await Promo.findOne({ code, active: true, quota: { $gt: 0 } });
        if (promo) {
            res.json({ valid: true, discount: promo.discount });
        } else {
            res.json({ valid: false });
        }
    } catch {
        res.status(500).json({ valid: false });
    }
});

// Export untuk Vercel (HAPUS ATAU COMMENT)
// module.exports = app;

// Route Root untuk Cek Server
app.get('/', (req, res) => {
    res.send('Backend API Service NaikAjaa is Running. Access Frontend at Root URL.');
});

// --- ADMIN STATS & VERIFICATION ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        await connectToDatabase();
        const totalTiket = await Order.countDocuments({ status: { $in: ['LUNAS', 'MINTED'] } });
        const orders = await Order.find({ status: { $in: ['LUNAS', 'MINTED'] } });
        const totalPendapatan = orders.reduce((acc, curr) => acc + curr.totalBayar, 0);
        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

        res.json({
            totalTiket,
            totalPendapatan,
            recentOrders
        });
    } catch (err) {
        res.status(500).json({ pesan: err.message });
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ pesan: err.message });
    }
});

app.post('/api/verify-ticket', async (req, res) => {
    try {
        const { hash } = req.body;
        if (!hash) return res.status(400).json({ valid: false, pesan: "Hash tidak boleh kosong" });

        const order = await Order.findOne({ hash: hash });
        
        if (order) {
            logActivity('VERIFY_TICKET_VALID', req, `Validasi Sukses: ${hash}`, order.email, 'system');
            return res.json({ 
                valid: true, 
                data: {
                    nama: order.namaPenumpang,
                    rute: order.rute,
                    tanggal: order.tanggal,
                    jam: order.jam,
                    seat: order.seatNumber,
                    status: order.status
                } 
            });
        } else {
            logActivity('VERIFY_TICKET_INVALID', req, `Validasi Gagal (Hash Invalid): ${hash}`, 'unknown', 'system');
            return res.json({ valid: false, pesan: "Tiket Tidak Ditemukan di Sistem!" });
        }
    } catch (err) {
        res.status(500).json({ valid: false, pesan: err.message });
    }
});

// --- METADATA NFT ENDPOINT ---
app.get('/api/tickets/metadata/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId_Midtrans: req.params.orderId });
        if (!order) return res.status(404).json({ error: 'Ticket not found' });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const metadata = {
            name: `Tiket Bus ${order.rute}`,
            description: `Tiket perjalanan ${order.rute} untuk ${order.namaPenumpang} pada ${order.tanggal}`,
            image: `${baseUrl}/logos/Logo.png`, 
            attributes: [
                { trait_type: "Passenger", value: order.namaPenumpang },
                { trait_type: "Route", value: order.rute },
                { trait_type: "Date", value: order.tanggal },
                { trait_type: "Seat", value: order.seatNumber.toString() }
            ]
        };
        res.json(metadata);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server MongoDB + Midtrans Ready di Port ${PORT}`));
