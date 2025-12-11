import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SeatSelection from './SeatSelection';

const BookingPage = () => {
  // [1] --- SEMUA HOOKS HARUS DI BAGIAN PALING ATAS (Unconditional) ---
  const [searchParams] = useSearchParams(); 
  const [nomorKursi, setNomorKursi] = useState(null);
  const [kursiTerisi, setKursiTerisi] = useState([]);
  const [loading, setLoading] = useState(false);

  // [2] --- AMBIL PARAMETER DINAMIS ---
  const selectedRoute = searchParams.get('route'); 
  const selectedDate = searchParams.get('date'); 

  // [3] --- USE EFFECT (UNCONDITIONAL) ---
  useEffect(() => {
    // KODE FETCH HANYA BOLEH DIJALANKAN JIKA PARAMETER LENGKAP
    if (!selectedRoute || !selectedDate) {
      // Jika missing params, jangan fetch, hanya set loading ke false jika perlu
      setLoading(false); 
      return; 
    }

    const fetchBookedSeats = async () => {
      try {
        setLoading(true);
        const backendUrl = "https://sumut-bus-ticketing-backend.vercel.app";
        
        // Fetch API menggunakan data dinamis yang sudah divalidasi
        const response = await fetch(`${backendUrl}/api/seats?date=${selectedDate}&destination=${selectedRoute}`);
        const data = await response.json();

        if (data.success) {
          // parseInt() untuk memastikan nomor kursi adalah angka, bukan string
          const seatNumbers = data.bookedSeats.map(seat => parseInt(seat));
          setKursiTerisi(seatNumbers); 
        } else {
          console.error("API Gagal:", data.error);
        }
      } catch (error) {
        console.error("Gagal mengambil data kursi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookedSeats();
  }, [selectedRoute, selectedDate]); 

  // [4] --- EARLY RETURN (Conditional - Setelah Semua Hooks) ---
  if (!selectedRoute || !selectedDate) {
      return (
        <div className="main-container">
            <h2 className="section-title" style={{textAlign:'center', marginTop:'80px'}}>
                ❌ Mohon pilih rute dan tanggal keberangkatan terlebih dahulu.
            </h2>
        </div>
      );
  }

  return (
    <div className="main-container">
      <h2 className="section-title">Pilih Kursi ({selectedRoute}, {selectedDate})</h2>
      
      {/* ... SISA KODE RENDER ... */}
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* BAGIAN KIRI: Layout Kursi */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {loading ? (
            <p>Memuat ketersediaan kursi...</p>
          ) : (
            <SeatSelection 
              layoutType="bus" 
              bookedSeats={kursiTerisi} 
              onSeatSelect={(nomor) => setNomorKursi(nomor)} 
            />
          )}
        </div>

        {/* BAGIAN KANAN: Ringkasan */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {/* ... KODE RINGKASAN ... */}
           <div className="ticket-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <h3>Ringkasan Pesanan</h3>
            
            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Nomor Kursi</label>
              <input 
                type="text" 
                className="input-box" 
                value={nomorKursi ? `Kursi No. ${nomorKursi}` : "Belum dipilih"} 
                readOnly 
                style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#1E3A8A' }}
              />
            </div>
            
            <p className="ticket-desc">
              Silakan selesaikan pembayaran setelah memilih kursi.
            </p>
            
            <button 
              className="btn-select" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={!nomorKursi} 
            >
              Lanjut ke Pembayaran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;