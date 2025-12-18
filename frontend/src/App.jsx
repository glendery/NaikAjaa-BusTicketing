import './App.css';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import BookingPage from './BookingPage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};
// --- HELPER LOGO ---
const getLocalLogo = (operator) => {
  if (!operator) return null;
  const op = String(operator).toLowerCase(); 
  if (op.includes('bintang utara')) return '/logos/Bintang Utara Putra.png';
  if (op.includes('kbt')) return '/logos/KBT.jpg';
  if (op.includes('sejahtera')) return '/logos/Sejahtera.jpg';
  if (op.includes('nice')) return '/logos/Nicetrans.jpg';
  if (op.includes('tiomaz')) return '/logos/Tiomaz.jpg';
  if (op.includes('makmur')) return '/logos/Makmur.jpg';
  if (op.includes('paradep')) return '/logos/Paradep.jpg';
  if (op.includes('sampri')) return '/logos/Sampri.jpg';
  if (op.includes('als')) return '/logos/ALS.jpeg';
  return null; 
};

const BusLogo = ({ src, alt, className, style }) => {
  const [error, setError] = useState(false);
  if (error || !src || src.includes('placeholder')) {
    return <div className="bus-icon-placeholder" style={{width:'80px', height:'80px', background:'#F1F5F9', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', color:'#1E3A8A'}}>🚌</div>;
  }
  return <img src={src} alt={alt} className={className} style={style} onError={() => setError(true)} />;
};

// --- MODAL BELI PROFESIONAL (DENGAN MIDTRANS SNAP) ---
const BuyModal = ({ item, user, userPickup, userDropOff, onClose, onSuccess }) => {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(item.harga);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedSeat, setSelectedSeat] = useState(null); 
  
  // State Lokasi
  const [selectedPickup, setSelectedPickup] = useState(userPickup !== 'SEMUA' ? userPickup : (item.titik_jemput ? item.titik_jemput[0] : ''));
  const [selectedDropOff, setSelectedDropOff] = useState(userDropOff !== 'SEMUA' ? userDropOff : (item.titik_turun ? item.titik_turun[0] : ''));
  
  // STATE FORM PEMESAN (PROFESIONAL)
  const [title, setTitle] = useState('Tuan');
  const [fullName, setFullName] = useState(user.nama || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user.email || '');

  const checkPromo = () => {
    if(!promoCode) return;
    setLoading(true);
    axios.post('https://sumut-bus-ticketing-backend.vercel.app/check-promo', { code: promoCode })
      .then(res => {
        if(res.data.valid) {
          setDiscount(res.data.discount);
          setFinalPrice(Math.max(0, item.harga - res.data.discount));
          setMsg(`✅ Hemat ${formatRupiah(res.data.discount)}`);
        }
      })
      .catch(() => { setDiscount(0); setFinalPrice(item.harga); setMsg('❌ Kode invalid'); })
      .finally(() => setLoading(false));
  };

  const handleBuy = () => {
    if (!selectedSeat) return alert("⚠️ Harap pilih nomor kursi terlebih dahulu!");
    if (!fullName || !phone || !email) return alert("⚠️ Mohon lengkapi data pemesan!");

    setLoading(true);
    
    // Request Token Transaksi ke Backend
    axios.post('https://sumut-bus-ticketing-backend.vercel.app/beli', {
      idRute: item.id, 
      emailUser: user.email, 
      tanggal: item.tanggalPergi, 
      promoCode: discount > 0 ? promoCode : null,
      seatNumber: selectedSeat,
      lokasiJemput: selectedPickup,
      lokasiTurun: selectedDropOff,
      namaPenumpang: `${title}. ${fullName}`,
      nikPenumpang: phone
    })
    .then((res) => {
        // Jika berhasil dapat token, panggil SNAP
        if (res.data.token && window.snap) {
            window.snap.pay(res.data.token, {
                onSuccess: function(){ // Hapus 'result'
                alert("✅ Pembayaran Berhasil! Tiket diterbitkan.");
                onSuccess(); 
                onClose();
                },
                onPending: function(){ // Hapus 'result'
                alert("⏳ Menunggu pembayaran...");
                onSuccess(); 
                onClose();
                },
                onError: function(){   // Hapus 'result'
                    alert("❌ Pembayaran Gagal!");
                    setLoading(false);
                },
                        });
                    } else {
                        alert("Gagal memuat sistem pembayaran.");
                        setLoading(false);
                    }
                })
                .catch(err => { 
                    alert(err.response?.data?.pesan || err.message); 
                    setLoading(false); 
                });
                };

  const renderSeatLayout = () => {
    const seats = [];
    const isBus = item.kategori === 'BUS';
    const totalSeats = item.kapasitas;
    for (let i = 1; i <= totalSeats; i++) {
        const isTaken = item.bookedSeats && item.bookedSeats.includes(i);
        const isSelected = selectedSeat === i;
        seats.push(<div key={i} className={`seat-item ${isTaken ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => !isTaken && setSelectedSeat(i)}>{i}</div>);
        if (isBus && i % 2 === 0 && i % 4 !== 0 && i < totalSeats) seats.push(<div key={`aisle-${i}`} className="aisle-spacer" style={{width:'20px'}}></div>);
    }
    return seats;
  };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(30, 58, 138, 0.8)', backdropFilter:'blur(5px)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center'}}>
      <div style={{background:'white', width:'600px', borderRadius:'16px', padding:'0', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)', position:'relative', maxHeight:'95vh', overflowY:'auto'}}>
        
        {/* HEADER MODAL */}
        <div style={{padding:'20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', position:'sticky', top:0, zIndex:10}}>
            <h2 style={{margin:0, color:'#1E3A8A', fontSize:'1.2rem'}}>Formulir Pemesanan</h2>
            <button onClick={onClose} style={{border:'none', background:'none', fontSize:'24px', cursor:'pointer', color:'#94a3b8'}}>×</button>
        </div>

        <div style={{padding:'25px'}}>
            {/* INFO RUTE SINGKAT */}
            <div style={{background:'#F0F9FF', padding:'15px', borderRadius:'10px', marginBottom:'25px', border:'1px solid #BAE6FD', display:'flex', gap:'15px', alignItems:'center'}}>
               <BusLogo src={item.image} className="operator-img" style={{width:'60px', height:'60px'}} />
               <div>
                   <div style={{fontWeight:'800', color:'#0C4A6E', fontSize:'1.1rem'}}>{item.operator}</div>
                   <div style={{fontSize:'0.9rem', color:'#0369A1'}}>{item.asal} ➝ {item.tujuan} • {item.jam} WIB</div>
               </div>
            </div>

            {/* --- DATA PEMESAN --- */}
            <div className="booking-form-wrapper">
                <div className="form-section-title">
                    <span>Data Pemesan</span>
                    <span className="save-link">Simpan</span>
                </div>

                <div className="form-row">
                    <div className="form-group" style={{flex: 1}}>
                        <label className="form-label">Titel<span>*</span></label>
                        <select className="input-box" value={title} onChange={e=>setTitle(e.target.value)}>
                            <option value="Tuan">Tuan</option>
                            <option value="Nyonya">Nyonya</option>
                            <option value="Nona">Nona</option>
                        </select>
                    </div>
                    <div className="form-group" style={{flex: 3}}>
                        <label className="form-label">Nama Lengkap<span>*</span></label>
                        <input className="input-box" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Sesuai KTP/Paspor/SIM" />
                        <div className="form-note">Tanpa tanda baca atau gelar</div>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group" style={{flex: 1}}>
                        <label className="form-label">No. Handphone<span>*</span></label>
                        <div className="phone-group">
                            <div className="country-code">🇮🇩 +62</div>
                            <input className="phone-input" type="number" placeholder="812345678" value={phone} onChange={e=>setPhone(e.target.value)} />
                        </div>
                        <div className="form-note">Contoh: 812345678</div>
                    </div>
                    <div className="form-group" style={{flex: 1}}>
                        <label className="form-label">Email<span>*</span></label>
                        <input className="input-box" type="email" placeholder="email@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
                        <div className="form-note">E-tiket akan dikirim ke sini</div>
                    </div>
                </div>
            </div>

            <hr style={{border:'0', borderTop:'1px dashed #cbd5e1', margin:'25px 0'}} />

            {/* PILIH KURSI & LOKASI */}
            <h4 style={{margin:'0 0 15px 0', color:'#1E3A8A'}}>Detail Perjalanan</h4>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'20px'}}>
                <div>
                    <label className="form-label">Naik Dari</label>
                    <select className="input-box" value={selectedPickup} onChange={e=>setSelectedPickup(e.target.value)}>
                        {item.titik_jemput && item.titik_jemput.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Turun Di</label>
                    <select className="input-box" value={selectedDropOff} onChange={e=>setSelectedDropOff(e.target.value)}>
                        {item.titik_turun && item.titik_turun.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div className="seat-layout-wrapper" style={{marginBottom:'20px'}}>
                <div className="driver-pos"><div className="steering-wheel"></div></div>
                <div className={`seat-grid ${item.kategori === 'BUS' ? 'bus-layout' : 'travel-layout'}`} style={{gridTemplateColumns: item.kategori === 'BUS' ? 'repeat(5, 1fr)' : 'repeat(3, 1fr)'}}>
                    {renderSeatLayout()}
                </div>
                <div style={{textAlign:'center', marginTop:'10px', fontSize:'0.8rem', color:'#64748B'}}>
                    Nomor Kursi Dipilih: <strong style={{color:'#1E3A8A', fontSize:'1rem'}}>{selectedSeat || '-'}</strong>
                </div>
            </div>

            {/* PROMO & TOTAL */}
            <div style={{background:'#F8FAFC', padding:'20px', borderRadius:'12px', border:'1px solid #E2E8F0'}}>
                <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                    <input className="input-box" placeholder="Punya Kode Promo?" value={promoCode} onChange={e=>setPromoCode(e.target.value)} />
                    <button onClick={checkPromo} style={{background:'#1E3A8A', color:'#fff', border:'none', borderRadius:'8px', padding:'0 20px', cursor:'pointer', fontWeight:'bold'}}>Gunakan</button>
                </div>
                {msg && <div style={{fontSize:'0.9rem', marginBottom:'15px', color: msg.includes('✅')?'#166534':'#EF4444', fontWeight:'600'}}>{msg}</div>}

                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'1.1rem'}}>
                    <span style={{color:'#64748B'}}>Total Bayar</span>
                    <span style={{fontWeight:'800', color:'#EF4444', fontSize:'1.4rem'}}>{formatRupiah(finalPrice)}</span>
                </div>
            </div>
        </div>

        {/* TOMBOL BAYAR STICKY BOTTOM */}
        <div style={{padding:'20px', borderTop:'1px solid #e2e8f0', background:'white', position:'sticky', bottom:0}}>
            <button onClick={handleBuy} disabled={loading || !selectedSeat} style={{width:'100%', padding:'15px', background: (selectedSeat && fullName) ? '#F59E0B' : '#E2E8F0', color: (selectedSeat && fullName) ? '#1E3A8A' : '#94A3B8', border:'none', borderRadius:'10px', fontSize:'1.1rem', fontWeight:'800', cursor: (selectedSeat && fullName) ? 'pointer' : 'not-allowed', boxShadow: (selectedSeat && fullName) ? '0 10px 20px -5px rgba(245, 158, 11, 0.4)' : 'none'}}>
                {loading ? 'Memproses Pesanan...' : 'LANJUTKAN KE PEMBAYARAN'}
            </button>
        </div>

      </div>
    </div>
  );
};

// --- DASHBOARD UTAMA ---
function Dashboard() {
  const navigate = useNavigate();
  
  const [user] = useState(() => { 
    const dataUser = localStorage.getItem('userBus');
    return dataUser ? JSON.parse(dataUser) : null;
});

  const [activeTab, setActiveTab] = useState('home'); 
  const [rute, setRute] = useState([]);
  const [history, setHistory] = useState([]);
  
  // STATES PENCARIAN
  const [cariAsal, setCariAsal] = useState('Medan'); 
  const [cariTujuan, setCariTujuan] = useState('Sibolga'); 
  const [tanggal, setTanggal] = useState('');
  
  const [daftarKota, setDaftarKota] = useState([]); 

  const [loketOptions, setLoketOptions] = useState([]); 
  const [cariLokasi, setCariLokasi] = useState('SEMUA'); 
  const [turunOptions, setTurunOptions] = useState([]);
  const [cariTurun, setCariTurun] = useState('SEMUA');
  
  const [sortOption, setSortOption] = useState('DEFAULT');
  const [isSearchPerformed, setIsSearchPerformed] = useState(false); 
  const [newRute, setNewRute] = useState({ asal: '', tujuan: '', operator: '', tipe: '', harga: '', jam: '', kategori: 'BUS', image: '', fasilitas: '', deskripsi: '' });
  const [filterKategori, setFilterKategori] = useState('SEMUA');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/'); }
  }, [user, navigate]);

  useEffect(() => {
      axios.get('https://sumut-bus-ticketing-backend.vercel.app/kota')
        .then(res => setDaftarKota(res.data))
        .catch(err => console.error("Gagal ambil kota", err));
  }, []);

  const fetchHistory = useCallback(() => {
    if (!user) return;
    axios.get(`https://sumut-bus-ticketing-backend.vercel.app/orders/${user.email}`)
      .then(res => setHistory(res.data))
      .catch(console.error);
  }, [user]);

  useEffect(() => { 
    if (user && activeTab === 'history') fetchHistory(); 
  }, [activeTab, user, fetchHistory]);

  useEffect(() => {
      const kotaValid = daftarKota.find(k => k.toLowerCase() === cariAsal.toLowerCase());
      if(kotaValid) {
          axios.get(`https://sumut-bus-ticketing-backend.vercel.app/info-lokasi?kota=${cariAsal}&tipe=loket`)
            .then(res => { setLoketOptions(res.data); setCariLokasi('SEMUA'); })
            .catch(() => setLoketOptions([]));
      }
  }, [cariAsal, daftarKota]);

  useEffect(() => {
      const kotaValid = daftarKota.find(k => k.toLowerCase() === cariTujuan.toLowerCase());
      if(kotaValid) {
          axios.get(`https://sumut-bus-ticketing-backend.vercel.app/info-lokasi?kota=${cariTujuan}&tipe=turun`)
            .then(res => { setTurunOptions(res.data); setCariTurun('SEMUA'); })
            .catch(() => setTurunOptions([]));
      }
  }, [cariTujuan, daftarKota]);

  const fetchRute = () => {
    if(!tanggal) return alert("Pilih tanggal dulu!");
    setIsSearchPerformed(true);
    const url = `https://sumut-bus-ticketing-backend.vercel.app/rute?tanggal=${tanggal}&asal=${cariAsal}&tujuan=${cariTujuan}&lokasi=${cariLokasi}&turun=${cariTurun}`;
    axios.get(url).then(res => setRute(res.data)).catch(console.error);
  };
  
  const logout = () => { localStorage.removeItem('userBus'); navigate('/'); window.location.reload(); };
  
  const openBuyModal = (item) => { 
    setSelectedItem({ ...item, image: getLocalLogo(item.operator) || item.image, tanggalPergi: tanggal }); 
  };

  const handleSearch = () => {
    if(!tanggal) return alert("⚠️ Silakan pilih tanggal keberangkatan!");
    setIsSearchPerformed(true);
    fetchRute(); 
    setTimeout(() => {
       const el = document.getElementById('hasil-pencarian');
       if(el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const filteredRute = rute.filter(item => {
    let matchKategori = filterKategori === 'SEMUA' ? true : item.kategori === filterKategori;
    return matchKategori;
  }).sort((a, b) => {
      if (sortOption === 'TERMURAH') return a.harga - b.harga;
      if (sortOption === 'TERMAHAL') return b.harga - a.harga;
      if (sortOption === 'PAGI') return parseInt(a.jam.replace(':','')) - parseInt(b.jam.replace(':',''));
      if (sortOption === 'MALAM') return parseInt(b.jam.replace(':','')) - parseInt(a.jam.replace(':',''));
      return 0; 
  });

  const tambahRuteAdmin = () => { 
    axios.post('https://sumut-bus-ticketing-backend.vercel.app/admin/add-route', { adminEmail: user.email, ...newRute })
      .then(() => { alert("Sukses!"); })
      .catch(err => alert(err.response?.data?.pesan || "Gagal menyimpan rute"));
  };

  if (!user) return null;

  return (
    <>
      <nav className="navbar">
        {/* Hapus <span>NaikAjaa</span> agar tidak double */}
        <div className="logo">
            <img src="/logos/Logo.png" alt="NaikAjaa" style={{height: '50px', objectFit: 'contain'}} />
        </div>
        <div className="nav-menu">
            {/* ... biarkan menu lain tetap sama ... */}
            <span className={`nav-item ${activeTab==='home'?'active':''}`} onClick={()=>setActiveTab('home')}>Cari Tiket</span>
            <span className={`nav-item ${activeTab==='history'?'active':''}`} onClick={()=>setActiveTab('history')}>Tiket Saya</span>
            {user.role === 'admin' && <span className={`nav-item ${activeTab==='admin'?'active':''}`} style={{color:'#FACC15'}} onClick={()=>setActiveTab('admin')}>Admin Panel</span>}
            <button onClick={logout} style={{background:'transparent', border:'1px solid #EF4444', color:'#EF4444', padding:'6px 16px', borderRadius:'50px', cursor:'pointer', fontWeight:'600'}}>Keluar</button>
        </div>
        </nav>

      {activeTab === 'home' && (
        <div className="hero-wrapper">
          <h1 className="hero-title">Jelajahi Sumatera Utara <br/><span style={{color:'var(--secondary)'}}>Tanpa Ribet</span></h1>
          <p className="hero-subtitle">Platform pemesanan tiket bus & travel resmi dengan teknologi Blockchain.</p>
        </div>
      )}

      <div className="main-container">
        {activeTab === 'home' && (
          <>
            <div className="search-box" style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', alignItems: 'end', padding: '25px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)'}}>
              
              <div className="input-group" style={{marginBottom:0}}>
                  <label className="input-label">DARI MANA?</label>
                  <input 
                    className="custom-input" 
                    placeholder="Ketik nama kota..." 
                    value={cariAsal} 
                    onChange={e=>setCariAsal(e.target.value)} 
                    style={{width:'100%'}} 
                    list="kota-asal-list"
                  />
                  <datalist id="kota-asal-list">
                      {daftarKota.map(kota => <option key={kota} value={kota} />)}
                  </datalist>
              </div>

              <div className="input-group" style={{marginBottom:0}}>
                  <label className="input-label">MAU KE MANA?</label>
                  <input 
                    className="custom-input" 
                    placeholder="Ketik nama kota..." 
                    value={cariTujuan} 
                    onChange={e=>setCariTujuan(e.target.value)} 
                    style={{width:'100%'}}
                    list="kota-tujuan-list" 
                  />
                  <datalist id="kota-tujuan-list">
                      {daftarKota.map(kota => <option key={kota} value={kota} />)}
                  </datalist>
              </div>

              <div className="input-group" style={{marginBottom:0}}>
                  <label className="input-label">TANGGAL PERGI</label>
                  <input className="custom-input" type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} style={{width:'100%'}} />
              </div>
              <div className="input-group" style={{marginBottom:0}}>
                  <label className="input-label">PILIH LOKET (OPSIONAL)</label>
                  <select className="custom-input" value={cariLokasi} onChange={e=>setCariLokasi(e.target.value)} disabled={loketOptions.length === 0} style={{width:'100%', cursor: loketOptions.length > 0 ? 'pointer' : 'not-allowed', background: loketOptions.length > 0 ? 'white' : '#f3f4f6'}}>
                      <option value="SEMUA">Semua Loket</option>
                      {loketOptions.map(lok => <option key={lok} value={lok}>{lok}</option>)}
                  </select>
              </div>
              <div className="input-group" style={{marginBottom:0}}>
                  <label className="input-label">TURUN DI (OPSIONAL)</label>
                  <select className="custom-input" value={cariTurun} onChange={e=>setCariTurun(e.target.value)} disabled={turunOptions.length === 0} style={{width:'100%', cursor: turunOptions.length > 0 ? 'pointer' : 'not-allowed', background: turunOptions.length > 0 ? 'white' : '#f3f4f6'}}>
                      <option value="SEMUA">Bebas / Terminal Pusat</option>
                      {turunOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
              </div>
              <button className="btn-search" onClick={handleSearch} style={{width:'100%', height:'48px', display:'flex', alignItems:'center', justifyContent:'center'}}>CARI TIKET 🔍</button>
            </div>
            
            {!isSearchPerformed ? (
                <div className="dashboard-content" style={{marginTop: '60px'}}>
                    <h2 className="section-title">🏝️ Destinasi Populer Sumatera Utara</h2>
                    <div className="destination-grid">
                        {[
                            {img: '/logos/Danautoba.png', name: 'Danau Toba', desc: 'Danau vulkanik terbesar di dunia, kebanggaan Indonesia. Nikmati keindahan alam yang menakjubkan dan budaya Batak yang kaya.'},
                            {img: '/logos/Berastagi.jpg', name: 'Berastagi', desc: 'Kota sejuk dengan pemandangan Gunung Sinabung & Sibayak. Terkenal dengan pasar buah dan sayur segar.'},
                            {img: '/logos/Terjun-Sipiso-piso.jpg', name: 'Air Terjun Sipiso-piso', desc: 'Air terjun megah setinggi 120 meter yang jatuh langsung ke bibir Danau Toba. Pemandangan yang spektakuler!'},
                            {img: '/logos/Bukitlawang.jpg', name: 'Bukit Lawang', desc: 'Pintu gerbang Taman Nasional Gunung Leuser. Habitat asli Orangutan Sumatera dan wisata tubing sungai.'},
                            {img: '/logos/Salibkasih.jpeg', name: 'Salib Kasih', desc: 'Wisata rohani di Tarutung dengan pemandangan indah Rura Silindung dari ketinggian.'},
                            {img: '/logos/Bukitholbung.jpg', name: 'Bukit Holbung', desc: 'Dikenal sebagai Bukit Teletubbies, menawarkan panorama Danau Toba yang memukau dari ketinggian.'},
                            {img: '/logos/bukitsimarjarunjung.jpg', name: 'Bukit Simarjarunjung', desc: 'Spot foto instagramable dengan latar belakang danau Toba yang luas dan indah.'},
                            {img: '/logos/Pantaibulbul.jpg', name: 'Pantai Bulbul', desc: 'Pantai pasir putih air tawar yang unik di Balige, Toba. Cocok untuk liburan keluarga.'},
                        ].map((dest, idx) => (
                            <div key={idx} className="destination-card">
                                <img src={dest.img} alt={dest.name} className="dest-img" onError={(e)=>{e.target.src='https://via.placeholder.com/300x200?text=Image+Error'}} />
                                <div className="dest-info">
                                    <h4>{dest.name}</h4>
                                    <p>{dest.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <h2 className="section-title">🤝 Partner Resmi Kami</h2>
                    <div className="partner-grid">
                        {['ALS', 'Makmur', 'Sejahtera', 'Bintang Utara', 'KBT', 'Sampri', 'Tiomaz', 'Nice'].map((p, i) => (
                             <div key={i} className="partner-item"><BusLogo src={getLocalLogo(p)} alt={p} className="partner-img" /><p style={{fontSize:'0.8rem', color:'#64748B', marginTop:'5px', fontWeight: '600'}}>{p}</p></div>
                        ))}
                    </div>
                </div>
            ) : (
                <div id="hasil-pencarian">
                    <div className="filter-container" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={{display:'flex', gap:'10px'}}>
                            {['SEMUA', 'BUS', 'TRAVEL'].map(cat => (
                                <button key={cat} className={`filter-btn ${filterKategori===cat?'active':''}`} onClick={()=>setFilterKategori(cat)}>{cat}</button>
                            ))}
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <span style={{color:'#64748B', fontWeight:'600'}}>Urutkan:</span>
                            <select className="custom-input" value={sortOption} onChange={(e)=>setSortOption(e.target.value)} style={{padding:'8px 15px'}}>
                                <option value="DEFAULT">Rekomendasi</option>
                                <option value="TERMURAH">Harga Terendah</option>
                                <option value="TERMAHAL">Harga Tertinggi</option>
                                <option value="PAGI">Berangkat Paling Pagi</option>
                                <option value="MALAM">Berangkat Paling Malam</option>
                            </select>
                        </div>
                    </div>

                    <h3 style={{color:'var(--text-grey)', marginBottom:'20px'}}>Hasil Pencarian: {filteredRute.length} Armada</h3>
                    
                    <div className="ticket-list">
                    {filteredRute.length === 0 ? (
                         <div style={{textAlign:'center', padding:'50px', color:'#888'}}>
                             Tidak ada armada ditemukan.<br/>
                             {(cariTurun !== 'SEMUA' || cariLokasi !== 'SEMUA') && <span style={{fontSize:'0.9rem', color:'#F59E0B'}}>Coba ubah filter lokasi menjadi "Semua"</span>}
                         </div>
                    ) : filteredRute.map(item => (
                        <div key={item.id} className="ticket-card" style={{borderLeft: item.isFull ? '6px solid #EF4444' : '6px solid #FACC15', opacity: item.isFull ? 0.7 : 1}}>
                           <div className="ticket-left">
                              <BusLogo src={getLocalLogo(item.operator) || item.image} alt={item.operator} className="operator-img" />
                              <div className="ticket-info">
                                <h3>{item.operator} {item.isFull && <span style={{color:'red', fontSize:'0.8rem'}}>(PENUH)</span>}</h3>
                                <div className="route-text">{item.asal} ➝ {item.tujuan}</div>
                                <div style={{display:'flex', flexDirection:'column', gap:'5px', marginTop:'5px'}}>
                                    <div style={{fontSize:'0.8rem', color:'#2563EB', fontWeight:'600'}}>
                                        📍 Naik: {cariLokasi !== 'SEMUA' ? cariLokasi : 'Semua Titik (Cek Detail)'}
                                    </div>
                                    <div style={{fontSize:'0.75rem', color:'#059669', background:'#ECFDF5', padding:'4px', borderRadius:'4px'}}>
                                        🏁 Turun: {cariTurun !== 'SEMUA' ? cariTurun : 'Bebas / Terminal Pusat'}
                                    </div>
                                </div>
                                <div className="meta-info" style={{marginTop:'10px'}}>
                                   <span className="tag">🕒 {item.jam} WIB</span>
                                   <span className="tag">{item.tipe}</span>
                                   <span className="tag" style={{background: item.sisaKursi < 5 ? '#FECACA' : '#DCFCE7', color: item.sisaKursi < 5 ? '#991B1B' : '#166534'}}>💺 Sisa {item.sisaKursi}</span>
                                </div>
                              </div>
                           </div>
                           <div className="ticket-right">
                             <span className="price">{formatRupiah(item.harga)}</span>
                             <button className="btn-select" onClick={() => openBuyModal(item)} disabled={item.isFull} style={{background: item.isFull ? '#ccc' : 'var(--primary)', cursor: item.isFull ? 'not-allowed' : 'pointer'}}>
                                {item.isFull ? 'HABIS' : 'Pilih'}
                             </button>
                           </div>
                        </div>
                    ))}
                    </div>
                    <div style={{textAlign:'center', marginTop:'40px'}}>
                        <button onClick={() => setIsSearchPerformed(false)} style={{background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', textDecoration: 'underline', fontSize:'1rem'}}>← Kembali ke Beranda</button>
                    </div>
                </div>
            )}
          </>
        )}
        
        {/* --- HISTORY TAB (FIXED FINAL) --- */}
        {activeTab === 'history' && (
          <div style={{marginTop:'40px', maxWidth:'800px', margin:'40px auto'}}>
            <h2 className="section-title" style={{textAlign:'center', marginBottom:'30px'}}>🎫 E-Ticket Saya</h2>
            
            {history.length === 0 ? (
                <div style={{textAlign:'center', padding:'50px', background:'white', borderRadius:'20px'}}>
                    <p style={{color:'#888', marginBottom:'20px'}}>Belum ada riwayat perjalanan.</p>
                    <button onClick={()=>setActiveTab('home')} className="btn-search" style={{width:'auto', padding:'10px 30px'}}>Cari Tiket Sekarang</button>
                </div>
            ) : (
                history.map((order, index) => (
                    <div key={order._id || index} style={{marginBottom:'30px'}}>
                        <div id={`ticket-${index}`} className="ticket-premium">
                            <div className="tp-left">
                                <div className="tp-header">
                                    <img 
                                        src="/logos/Logo.png" 
                                        alt="NaikAjaa" 
                                        style={{height:'40px', objectFit:'contain'}} 
                                    />
                                    <span style={{background: order.kategori==='BUS'?'#dbeafe':'#fef3c7', color: order.kategori==='BUS'?'#1e40af':'#92400e', padding:'4px 12px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'800'}}>
                                        {order.operator}
                                    </span>
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px'}}>
                                    <div>
                                        <div className="tp-label">DARI</div>
                                        <div className="tp-route">{order.rute.split('-')[0]}</div>
                                        <div style={{fontSize:'0.8rem', color:'#64748b'}}>{order.lokasi_jemput_pilihan || order.lokasi_loket}</div>
                                    </div>
                                    <div style={{fontSize:'1.5rem', color:'#cbd5e1'}}>➝</div>
                                    <div>
                                        <div className="tp-label">KE</div>
                                        <div className="tp-route">{order.rute.split('-')[1]}</div>
                                        <div style={{fontSize:'0.8rem', color:'#64748b'}}>{order.lokasi_turun_pilihan || 'Terminal Pusat'}</div>
                                    </div>
                                </div>
                                <div className="tp-details">
                                    <div><div className="tp-label">TANGGAL & JAM</div><div className="tp-value">{order.tanggal} <span style={{color:'#cbd5e1'}}>|</span> {order.jam} WIB</div></div>
                                    <div><div className="tp-label">PENUMPANG</div><div className="tp-value">{order.namaPenumpang}</div><div style={{fontSize:'0.7rem', color:'#94a3b8'}}>ID: {order.nikPenumpang}</div></div>
                                    <div><div className="tp-label">NO. KURSI</div><div className="tp-value" style={{fontSize:'1.2rem', color:'#e11d48'}}>{order.seatNumber}</div></div>
                                    <div><div className="tp-label">HARGA</div><div className="tp-value">{formatRupiah(order.totalBayar)}</div></div>
                                </div>
                            </div>
                            
                            <div className="tp-right" style={{display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
                                {order.status === 'PENDING' ? (
                                    <div style={{textAlign:'center'}}>
                                        <p style={{color:'#F59E0B', fontWeight:'bold', marginBottom:'10px'}}>Menunggu Pembayaran</p>
                                        <button 
                                            onClick={() => window.snap && window.snap.pay(order.snap_token)} 
                                            style={{background:'#F59E0B', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 12px rgba(245, 158, 11, 0.4)'}}
                                        >
                                            💳 Bayar Sekarang
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{background:'white', padding:'8px', borderRadius:'10px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${order.hash || 'PENDING'}`} alt="QR" style={{display:'block'}} />
                                        </div>
                                        <div style={{fontSize:'0.6rem', color:'#94a3b8', margin:'10px 0', wordBreak:'break-all', fontFamily:'monospace'}}>
                                            HASH: {(order.hash || 'PENDING').substring(0, 15)}...
                                        </div>
                                        <div className="blockchain-badge"><span>🔒</span> Verified on Blockchain</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{textAlign:'right', marginTop:'10px'}}>
                            <button className="btn-download" style={{width:'auto', display:'inline-flex', alignItems:'center', gap:'5px', background:'#334155'}}
                                onClick={async () => {
                                    try {
                                        const input = document.getElementById(`ticket-${index}`);
                                        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
                                        const imgData = canvas.toDataURL('image/png');
                                        const pdf = new jsPDF('p', 'mm', 'a4');
                                        const pdfWidth = pdf.internal.pageSize.getWidth();
                                        
                                        try {
                                            const logoImg = await loadImage('/logos/Logo.png');
                                            pdf.addImage(logoImg, 'PNG', 10, 10, 20, 20); 
                                            pdf.setFontSize(16);
                                            pdf.setFont("helvetica", "bold");
                                            pdf.text("E-Ticket NaikAjaa (Official)", 35, 18);
                                            pdf.setFontSize(10);
                                            pdf.setFont("helvetica", "normal");
                                            pdf.text("Bukti perjalanan resmi & terverifikasi Blockchain", 35, 24);
                                        } catch (err) {
                                            console.error("Gagal load logo", err);
                                            pdf.text("E-Ticket NaikAjaa (Official)", 10, 15);
                                        }

                                        const imgProps = pdf.getImageProperties(imgData);
                                        const contentWidth = pdfWidth - 20; 
                                        const contentHeight = (imgProps.height * contentWidth) / imgProps.width;
                                        
                                        pdf.addImage(imgData, 'PNG', 10, 35, contentWidth, contentHeight);
                                        pdf.save(`Tiket-${order.operator}-${order.tanggal}.pdf`);
                                        
                                    } catch (error) {
                                        console.error("Gagal download PDF:", error);
                                        alert("Gagal mendownload tiket.");
                                    }
                                }}
                            >📥 Download PDF</button>
                        </div>
                    </div>
                ))
            )}
          </div>
        )}
        
        {activeTab === 'admin' && (
          <div className="admin-card">
            <h2 className="section-title">⚙️ Admin Dashboard</h2>
            <div style={{background:'#F8FAFC', padding:'30px', borderRadius:'16px', marginBottom:'30px'}}>
                <h4 style={{marginTop:0, marginBottom:'20px', color:'var(--primary)'}}>+ Tambah Rute Baru</h4>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                   <div><label className="input-label">ASAL</label><input className="custom-input" value={newRute.asal} onChange={e=>setNewRute({...newRute, asal: e.target.value})} /></div>
                   <div><label className="input-label">TUJUAN</label><input className="custom-input" value={newRute.tujuan} onChange={e=>setNewRute({...newRute, tujuan: e.target.value})} /></div>
                   <div><label className="input-label">OPERATOR</label><input className="custom-input" value={newRute.operator} onChange={e=>setNewRute({...newRute, operator: e.target.value})} /></div>
                   <div><label className="input-label">HARGA</label><input type="number" className="custom-input" value={newRute.harga} onChange={e=>setNewRute({...newRute, harga: e.target.value})} /></div>
                   <div><label className="input-label">JAM</label><input type="time" className="custom-input" value={newRute.jam} onChange={e=>setNewRute({...newRute, jam: e.target.value})} /></div>
                   <div><label className="input-label">KATEGORI</label>
                       <select className="custom-input" value={newRute.kategori} onChange={e=>setNewRute({...newRute, kategori: e.target.value})}>
                           <option value="BUS">Bus Besar</option>
                           <option value="TRAVEL">Travel</option>
                       </select>
                   </div>
                   <div style={{gridColumn:'span 2'}}><label className="input-label">URL GAMBAR</label><input className="custom-input" value={newRute.image} onChange={e=>setNewRute({...newRute, image: e.target.value})} /></div>
                </div>
                <button className="btn-search" style={{marginTop:'30px', width:'100%', background:'var(--primary)', color:'var(--secondary)'}} onClick={tambahRuteAdmin}>Simpan Rute</button>
            </div>
          </div>
        )}
      </div>
      {selectedItem && <BuyModal item={selectedItem} user={user} userPickup={cariLokasi} userDropOff={cariTurun} onClose={()=>setSelectedItem(null)} onSuccess={()=>{ alert("Sukses! Tiket Anda Telah Terbit."); fetchRute(); setActiveTab('history'); }} />}
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/booking" element={<BookingPage />} /> // Tambahkan rute ini
    </Routes>
  );
}

export default App;
