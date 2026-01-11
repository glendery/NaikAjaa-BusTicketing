import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

const getLocalLogo = (operator) => {
  if (!operator) return null;
  const op = operator.toLowerCase();
  if (op.includes('als')) return '/logos/ALS.jpeg';
  if (op.includes('bintang utara')) return '/logos/Bintang Utara Putra.png';
  if (op.includes('kbt')) return '/logos/KBT.jpg';
  if (op.includes('sejahtera')) return '/logos/Sejahtera.jpg';
  if (op.includes('nice')) return '/logos/Nicetrans.jpg';
  if (op.includes('tiomaz')) return '/logos/Tiomaz.jpg';
  return null; 
};

const BusLogo = ({ src, alt, className, style }) => {
  const [error, setError] = useState(false);
  if (error || !src || src.includes('placeholder')) {
    return <div className="bus-icon-placeholder" style={{width:'80px', height:'80px', background:'#F1F5F9', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', color:'#1E3A8A'}}>🚌</div>;
  }
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

const BuyModal = ({ item, user, onClose, onSuccess }) => {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(item.harga);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedSeat, setSelectedSeat] = useState(null); // State Kursi

  const checkPromo = () => {
    if(!promoCode) return;
    setLoading(true);
    axios.post('http://localhost:3000/check-promo', { code: promoCode })
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
    if (!selectedSeat) return alert("⚠️ Harap pilih kursi terlebih dahulu!");
    setLoading(true);
    axios.post('http://localhost:3000/beli', {
      idRute: item.id, 
      emailUser: user.email, 
      tanggal: item.tanggalPergi, 
      promoCode: discount > 0 ? promoCode : null,
      seatNumber: selectedSeat
    })
    .then(() => { onSuccess(); onClose(); })
    .catch(err => { alert(err.response?.data?.pesan || err.message); setLoading(false); });
  };

  // RENDER DENAH KURSI
  const renderSeats = () => {
    const seats = [];
    for (let i = 1; i <= item.kapasitas; i++) {
        const isTaken = item.bookedSeats && item.bookedSeats.includes(i);
        const isSelected = selectedSeat === i;
        seats.push(
            <div 
                key={i}
                className={`seat-item ${isTaken ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => !isTaken && setSelectedSeat(i)}
            >
                {i}
            </div>
        );
    }
    return seats;
  };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(30, 58, 138, 0.8)', backdropFilter:'blur(5px)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center'}}>
      <div style={{background:'white', width:'450px', borderRadius:'20px', padding:'30px', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)', position:'relative', borderTop:'6px solid #FACC15', maxHeight:'90vh', overflowY:'auto'}}>
        <button onClick={onClose} style={{position:'absolute', right:'20px', top:'20px', background:'none', border:'none', fontSize:'28px', cursor:'pointer', color:'#9CA3AF'}}>×</button>
        <h2 style={{marginTop:0, color:'#1E3A8A', fontSize:'1.5rem', marginBottom:'10px'}}>Pilih Kursi</h2>
        
        <div style={{display:'flex', gap:'15px', alignItems:'center', marginBottom:'20px'}}>
           <BusLogo src={item.image} alt={item.operator} className="operator-img" style={{width:'50px', height:'50px'}} />
           <div>
             <div style={{fontWeight:'700', color:'#1E3A8A'}}>{item.operator}</div>
             <div style={{fontSize:'0.8rem', color:'#64748B'}}>{item.asal} ➝ {item.tujuan}</div>
           </div>
        </div>

        {/* DENAH KURSI */}
        <div className="seat-container">
            <div className="driver-area">SUPIR 🟢</div>
            <div className="seat-grid">
                {renderSeats()}
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginTop:'10px', color:'#64748B'}}>
                <span>⬜ Kosong</span>
                <span>🟦 Pilihanmu</span>
                <span style={{textDecoration:'line-through'}}>⬜ Terisi</span>
            </div>
        </div>

        <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
           <input className="custom-input" placeholder="Kode Promo?" value={promoCode} onChange={e=>setPromoCode(e.target.value)} style={{padding:'10px', border: '1px solid #ddd', borderRadius: '10px', width: '100%'}} />
           <button onClick={checkPromo} style={{background:'#1E3A8A', color:'#FACC15', border:'none', borderRadius:'10px', padding:'0 20px', cursor:'pointer', fontWeight:'bold'}}>Cek</button>
        </div>
        {msg && <div style={{fontSize:'0.9rem', marginBottom:'15px', color: msg.includes('✅')?'#166534':'#EF4444', fontWeight:'600'}}>{msg}</div>}
        
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'2px dashed #E5E7EB', paddingTop:'15px', marginBottom:'15px'}}>
           <div style={{color:'#64748B'}}>Kursi No: <strong>{selectedSeat || '-'}</strong></div>
           <div style={{fontSize:'1.5rem', fontWeight:'800', color:'#1E3A8A'}}>{formatRupiah(finalPrice)}</div>
        </div>
        
        <button onClick={handleBuy} disabled={loading || !selectedSeat} style={{width:'100%', padding:'15px', background: selectedSeat ? '#FACC15' : '#E5E7EB', color:'#1E3A8A', border:'none', borderRadius:'12px', fontSize:'1.1rem', fontWeight:'800', cursor: selectedSeat ? 'pointer' : 'not-allowed'}}>
          {loading ? 'Memproses...' : 'BAYAR & CETAK TIKET'}
        </button>
      </div>
    </div>
  );
};

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [rute, setRute] = useState([]);
  const [history, setHistory] = useState([]);
  const [cariAsal, setCariAsal] = useState('');
  const [cariTujuan, setCariTujuan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [filterKategori, setFilterKategori] = useState('SEMUA'); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSearchPerformed, setIsSearchPerformed] = useState(false); 

  const [newRute, setNewRute] = useState({ asal: '', tujuan: '', operator: '', tipe: '', harga: '', jam: '', kategori: 'BUS', image: '', fasilitas: '', deskripsi: '' });
  const [newPromo, setNewPromo] = useState({ code: '', discount: '', quota: '' });

  useEffect(() => {
    const dataUser = localStorage.getItem('userBus');
    if (!dataUser) { navigate('/'); return; }
    setUser(JSON.parse(dataUser));
    fetchRute();
  }, [navigate]);

  useEffect(() => { if (user && activeTab === 'history') fetchHistory(); }, [activeTab, user]);

  // FETCH RUTE DENGAN FILTER TANGGAL
  const fetchRute = () => {
    if(!tanggal) return; 
    axios.get(`http://localhost:3000/rute?tanggal=${tanggal}&asal=${cariAsal}&tujuan=${cariTujuan}`)
      .then(res => setRute(res.data))
      .catch(console.error);
  };
  
  const fetchHistory = () => { axios.get(`http://localhost:3000/orders/${user.email}`).then(res => setHistory(res.data)).catch(console.error); };
  const logout = () => { localStorage.removeItem('userBus'); navigate('/'); window.location.reload(); };
  
  const openBuyModal = (item) => { 
    setSelectedItem({ ...item, image: getLocalLogo(item.operator) || item.image, tanggalPergi: tanggal }); 
  };

  const handleSearch = () => {
    if(!tanggal) return alert("⚠️ Silakan pilih tanggal keberangkatan!");
    setIsSearchPerformed(true);
    fetchRute(); // Panggil fungsi fetch
    setTimeout(() => {
       const el = document.getElementById('hasil-pencarian');
       if(el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const tambahRuteAdmin = () => { axios.post('http://localhost:3000/admin/add-route', newRute).then(res => { alert("Sukses!"); }); };
  const tambahPromoAdmin = () => { axios.post('http://localhost:3000/admin/add-promo', newPromo).then(() => { alert("Promo dibuat!"); }); };

  const filteredRute = rute.filter(item => {
    let matchKategori = filterKategori === 'SEMUA' ? true : item.kategori === filterKategori;
    return matchKategori;
  });

  if (!user) return null;

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
           <img src="/logos/Logo.png" alt="NaikAjaa" onError={(e) => e.target.style.display='none'} />
           <span style={{marginLeft: '10px', color:'var(--primary)', fontWeight:'800', fontSize:'1.4rem', letterSpacing:'-0.5px'}}>NaikAjaa</span>
        </div>
        <div className="nav-menu">
          <span className={`nav-item ${activeTab==='home'?'active':''}`} onClick={()=>setActiveTab('home')}>Cari Tiket</span>
          <span className={`nav-item ${activeTab==='history'?'active':''}`} onClick={()=>setActiveTab('history')}>Tiket Saya</span>
          {user.role === 'admin' && <span className={`nav-item ${activeTab==='admin'?'active':''}`} style={{color:'#FACC15'}} onClick={()=>setActiveTab('admin')}>Admin Panel</span>}
          <button onClick={logout} style={{background:'transparent', border:'1px solid #EF4444', color:'#EF4444', padding:'6px 16px', borderRadius:'50px', cursor:'pointer', fontWeight:'600'}}>Keluar</button>
        </div>
      </nav>

      {activeTab === 'home' && (
        <div className="hero-wrapper">
          <h1 className="hero-title">Jelajahi Sumatera Utara <br/><span style={{color:'var(--secondary)'}}>Tanpa Ribet</span></h1>
          <p className="hero-subtitle">Platform pemesanan tiket bus & travel resmi di kawasan Danau Toba dengan keamanan Blockchain.</p>
        </div>
      )}

      <div className="main-container">

        {activeTab === 'home' && (
          <>
            {/* SEARCH BOX */}
            <div className="search-box">
              <div className="input-group"><label className="input-label">DARI MANA?</label><input className="custom-input" placeholder="Misal: Balige" value={cariAsal} onChange={e=>setCariAsal(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">MAU KE MANA?</label><input className="custom-input" placeholder="Misal: Medan" value={cariTujuan} onChange={e=>setCariTujuan(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">TANGGAL PERGI</label><input className="custom-input" type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} /></div>
              <button className="btn-search" onClick={handleSearch}>CARI TIKET 🔍</button>
            </div>

            {/* KONTEN DEFAULT: DESTINASI & PARTNER */}
            {!isSearchPerformed ? (
                <div className="dashboard-content" style={{marginTop: '60px'}}>
                    
                    {/* DESTINASI POPULER (DATA DARI FILE GAMBAR ANDA) */}
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
                                <div className="dest-info"><h4>{dest.name}</h4><p>{dest.desc}</p></div>
                            </div>
                        ))}
                    </div>

                    {/* PARTNER RESMI */}
                    <h2 className="section-title">🤝 Partner Resmi Kami</h2>
                    <div className="partner-grid">
                        {/* Menampilkan Logo Partner dari Fungsi getLocalLogo */}
                        {['ALS', 'Makmur', 'Sejahtera', 'Bintang Utara', 'KBT', 'Sampri', 'Tiomaz', 'Nice'].map((p, i) => (
                             <div key={i} className="partner-item">
                                 <BusLogo src={getLocalLogo(p)} alt={p} className="partner-img" />
                                 <p style={{fontSize:'0.8rem', color:'#64748B', marginTop:'5px', fontWeight: '600'}}>{p}</p>
                             </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* HASIL PENCARIAN */
                <div id="hasil-pencarian">
                    <div className="filter-container">
                    {['SEMUA', 'BUS', 'TRAVEL'].map(cat => (
                        <button key={cat} className={`filter-btn ${filterKategori===cat?'active':''}`} onClick={()=>setFilterKategori(cat)}>{cat}</button>
                    ))}
                    </div>

                    <h3 style={{color:'var(--text-grey)', marginBottom:'20px'}}>Hasil Pencarian: {filteredRute.length} Armada</h3>
                    
                    <div className="ticket-list">
                    {filteredRute.length === 0 ? (
                         <div style={{textAlign:'center', padding:'50px', color:'#888'}}>Tidak ada armada ditemukan untuk rute/tanggal ini.</div>
                    ) : filteredRute.map(item => (
                        <div key={item.id} className="ticket-card" style={{borderLeft: item.isFull ? '6px solid #EF4444' : '6px solid #FACC15', opacity: item.isFull ? 0.7 : 1}}>
                           <div className="ticket-left">
                              <BusLogo src={getLocalLogo(item.operator) || item.image} alt={item.operator} className="operator-img" />
                              <div className="ticket-info">
                                <h3>{item.operator} {item.isFull && <span style={{color:'red', fontSize:'0.8rem'}}>(PENUH)</span>}</h3>
                                <div className="route-text">{item.asal} ➝ {item.tujuan}</div>
                                <div className="ticket-desc">{item.deskripsi}</div>
                                <div className="meta-info">
                                   <span className="tag">🕒 {item.jam} WIB</span>
                                   <span className="tag">{item.tipe}</span>
                                   <span className="tag" style={{background: item.sisaKursi < 5 ? '#FECACA' : '#DCFCE7', color: item.sisaKursi < 5 ? '#991B1B' : '#166534'}}>💺 Sisa {item.sisaKursi}</span>
                                </div>
                              </div>
                           </div>
                           <div className="ticket-right">
                             <span className="price">{formatRupiah(item.harga)}</span>
                             <button 
                                className="btn-select" 
                                onClick={() => openBuyModal(item)} 
                                disabled={item.isFull}
                                style={{background: item.isFull ? '#ccc' : 'var(--primary)', cursor: item.isFull ? 'not-allowed' : 'pointer'}}
                             >
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

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div style={{marginTop:'50px'}}>
            <h2 className="section-title">Riwayat Pesanan</h2>
            {history.length === 0 ? <p style={{textAlign:'center', color:'#888', padding:'50px'}}>Belum ada tiket.</p> : 
              history.map(order => (
                <div key={order.id} className="history-card" style={{background:'white', padding:'20px', borderRadius:'12px', marginBottom:'15px', borderLeft:'5px solid #10B981', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <h3 style={{color:'var(--primary)', margin:'0 0 5px 0'}}>{order.operator}</h3>
                        <div style={{fontWeight:'700', fontSize:'1.1rem'}}>{order.rute}</div>
                        <div style={{color:'#64748B', fontSize:'0.9rem', marginTop:'5px'}}>{order.tanggal} • {order.jam} • Kursi: {order.seatNumber}</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                         <div style={{background:'#DCFCE7', color:'#166534', padding:'5px 15px', borderRadius:'50px', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'10px'}}>LUNAS</div>
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${order.hash}`} style={{borderRadius:'8px', border:'1px solid #E2E8F0', padding:'5px'}} />
                      </div>
                   </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ADMIN TAB */}
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
                   <div><label className="input-label">DESKRIPSI</label><input className="custom-input" value={newRute.deskripsi} onChange={e=>setNewRute({...newRute, deskripsi: e.target.value})} /></div>
                   <div><label className="input-label">FASILITAS (Pisahkan koma)</label><input className="custom-input" value={newRute.fasilitas} onChange={e=>setNewRute({...newRute, fasilitas: e.target.value})} /></div>
                   <div style={{gridColumn:'span 2'}}><label className="input-label">URL GAMBAR</label><input className="custom-input" value={newRute.image} onChange={e=>setNewRute({...newRute, image: e.target.value})} /></div>
                </div>
                <button className="btn-search" style={{marginTop:'30px', width:'100%', background:'var(--primary)', color:'var(--secondary)'}} onClick={tambahRuteAdmin}>Simpan Rute</button>
            </div>
            <div style={{background:'#F8FAFC', padding:'30px', borderRadius:'16px'}}>
                <h4 style={{marginTop:0, marginBottom:'20px', color:'var(--primary)'}}>+ Buat Promo Code</h4>
                <div style={{display:'flex', gap:'15px'}}>
                   <div style={{flex:1}}><label className="input-label">KODE</label><input className="custom-input" value={newPromo.code} onChange={e=>setNewPromo({...newPromo, code: e.target.value})} /></div>
                   <div style={{flex:1}}><label className="input-label">DISKON</label><input type="number" className="custom-input" value={newPromo.discount} onChange={e=>setNewPromo({...newPromo, discount: e.target.value})} /></div>
                   <div style={{flex:1}}><label className="input-label">KUOTA</label><input type="number" className="custom-input" value={newPromo.quota} onChange={e=>setNewPromo({...newPromo, quota: e.target.value})} /></div>
                </div>
                <button className="btn-search" style={{marginTop:'20px', width:'100%', background:'#10B981', color:'white'}} onClick={tambahPromoAdmin}>Buat Promo</button>
            </div>
          </div>
        )}

      </div>
      
      {selectedItem && <BuyModal item={selectedItem} user={user} onClose={()=>setSelectedItem(null)} onSuccess={()=>{ alert("Sukses!"); fetchRute(); setActiveTab('history'); }} />}

      <div className="footer">
        &copy; 2025 NaikAjaa. Platform Tiket Blockchain Terpercaya.
      </div>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;