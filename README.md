<div align="center">
  <a href="./">
    <img src="frontend/public/logos/Logo.png" alt="Logo NaikAjaa" width="180">
  </a>

  <h1 align="center">NaikAjaa - Secure Blockchain E-Ticketing</h1>

  <p align="center">
    <strong>Platform Pemesanan Tiket Bus Antarkota Berbasis Web3 & DevSecOps</strong>
    <br />
    Integrasi Hybrid: Web2 (Database) + Web3 (Ethereum Blockchain)
    <br />
    <br />
    <a href="https://github.com/glendery/NaikAjaa-BusTicketing/issues">
      <img src="https://img.shields.io/github/issues/glendery/NaikAjaa-BusTicketing?style=flat-square&logo=github&logoColor=white" alt="Issues">
    </a>
    <img src="https://img.shields.io/badge/security-OWASP%20ZAP%20Checked-blue?style=flat-square&logo=owasp&logoColor=white" alt="Security ZAP">
    <img src="https://img.shields.io/badge/blockchain-Ethereum%20Sepolia-purple?style=flat-square&logo=ethereum&logoColor=white" alt="Ethereum Sepolia">
    <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License">
  </p>
</div>

---

## 📖 Tentang Proyek

**NaikAjaa** adalah solusi modern untuk masalah percaloan dan transparansi tiket bus. Sistem ini menerapkan arsitektur **Hybrid Web3**, di mana data pengguna disimpan di Database (MongoDB) untuk performa, sementara aset tiket dicatat di **Blockchain Ethereum (ERC-721)** untuk keamanan dan validitas anti-palsu.

Proyek ini dikembangkan dengan metodologi **DevSecOps**, memastikan keamanan aplikasi dijaga ketat mulai dari tahap Perencanaan (*Plan*) hingga Perilisan (*Release*).

---

## 🛡️ Implementasi DevSecOps

Proyek ini memenuhi standar keamanan siklus pengembangan perangkat lunak (*SDLC*) dengan rincian sebagai berikut:

| Tahap | Aktivitas Keamanan | Tools / Bukti |
| :--- | :--- | :--- |
| **1. PLAN** | Analisis Ancaman & Mitigasi Risiko | **Threat Modeling (STRIDE)** |
| **2. DEV** | Analisis Kode Statis (SAST) | **ESLint & Prettier** |
| **3. BUILD** | Audit Dependensi & Library | **npm audit** (0 Vulnerabilities) |
| **4. TEST** | Pengujian Keamanan Aplikasi (DAST) | **OWASP ZAP** |
| **5. RELEASE** | Otomasi CI/CD Pipeline | **GitHub Actions & Vercel** |
| **6. DEPLOY** | Arsitektur Cloud Serverless | **Vercel Infrastructure** |

---

## 📸 Dokumentasi & Bukti Teknis

Berikut adalah dokumentasi visual implementasi sistem dan keamanan.

### 1. Threat Modeling (Tahap PLAN)
Diagram alur serangan (*attack vectors*) yang dipetakan menggunakan pendekatan STRIDE untuk mengidentifikasi celah keamanan sejak dini.
<br/>
<div align="center">
  <img src="frontend/public/logos/threat-model.png" alt="Threat Model Diagram" width="85%">
</div>

### 2. Security Scanning (Tahap TEST)
Hasil pemindaian kerentanan dinamis menggunakan **OWASP ZAP** pada lingkungan produksi.
<br/>
<div align="center">
  <img src="frontend/public/logos/zap-scan.png" alt="Hasil Scan OWASP ZAP" width="90%">
</div>

### 3. Antarmuka Aplikasi (UI/UX)

| Halaman Utama (Pencarian) | E-Ticket NFT (Verified) |
| :---: | :---: |
| <img src="frontend/public/logos/ui-home.png" alt="Home UI" width="100%"> | <img src="frontend/public/logos/ui-ticket.png" alt="Ticket NFT UI" width="100%"> |
| *Fitur pencarian rute & jadwal* | *Tiket dengan Hash Blockchain & QR Code* |

---

## 🛠️ Teknologi (Tech Stack)

<div align="center">

| Kategori | Teknologi |
| :--- | :--- |
| **Frontend** | React.js, Vite, Bootstrap 5, SweetAlert2 |
| **Backend** | Node.js, Express.js, Helmet.js (Security Headers) |
| **Database** | MongoDB Atlas (Cloud) |
| **Blockchain** | Solidity (Smart Contract), Web3.js, Ethers.js |
| **Network** | Ethereum Sepolia Testnet |
| **Payment** | Midtrans Snap Gateway |
| **DevOps** | Vercel, GitHub Actions |

</div>

---

## 📦 Cara Menjalankan (Local Installation)

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di komputer lokal Anda:

### Prasyarat
- Node.js (v18+)
- MongoDB (Local atau Atlas URI)
- Akun Midtrans (Server Key)
- Wallet Metamask (Private Key & Sepolia ETH)

### 1. Clone Repository
```bash
git clone [https://github.com/glendery/NaikAjaa-BusTicketing.git](https://github.com/glendery/NaikAjaa-BusTicketing.git)
cd NaikAjaa-BusTicketing