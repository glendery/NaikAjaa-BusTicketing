const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nama: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    walletAddress: String,
    walletPrivateKey: String,
    createdAt: { type: Date, default: Date.now }
});

const RouteSchema = new mongoose.Schema({
    id: Number,
    asal: String,
    tujuan: String,
    operator: String,
    tipe: String,
    jam: String,
    harga: Number,
    kategori: String,
    image: String,
    fasilitas: [String],
    deskripsi: String,
    kapasitas: Number,
    titik_jemput: [String],
    titik_turun: [String]
});

const OrderSchema = new mongoose.Schema({
    orderId_Midtrans: { type: String, unique: true },
    snap_token: String,
    email: String,
    idRute: String,
    rute: String,
    operator: String,
    jam: String,
    tanggal: String,
    hargaAsli: Number,
    diskon: Number,
    totalBayar: Number,
    tipe: String,
    hash: String,
    tokenId_NFT: String,
    status: { type: String, default: 'PENDING' },
    kategori: String,
    seatNumber: String,
    lokasi_jemput: String,
    lokasi_turun: String,
    namaPenumpang: String,
    nikPenumpang: String,
    createdAt: { type: Date, default: Date.now }
});


const PromoSchema = new mongoose.Schema({
    code: { type: String, required: true },
    discount: Number,
    quota: Number,
    active: { type: Boolean, default: true }
});

const AuditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    email: String,
    role: String,
    details: String,
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Route = mongoose.model('Route', RouteSchema);
const Order = mongoose.model('Order', OrderSchema);
const Promo = mongoose.model('Promo', PromoSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = { User, Route, Order, Promo, AuditLog };