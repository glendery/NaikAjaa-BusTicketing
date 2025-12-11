import React, { useState } from 'react';

// Props yang diterima:
// - bookedSeats: Array nomor kursi yang sudah laku (contoh: [2, 5, 12])
// - onSeatSelect: Fungsi untuk mengirim nomor kursi yang dipilih ke Parent
// - layoutType: 'bus' (2-2) atau 'travel' (1-2/Lainnya)
const SeatSelection = ({ bookedSeats = [], onSeatSelect, layoutType = 'bus' }) => {
  const [selectedSeat, setSelectedSeat] = useState(null);

  // Fungsi saat kursi diklik
  const handleSeatClick = (seatNum) => {
    // Cek jika kursi sudah dibooking
    if (bookedSeats.includes(seatNum)) return;

    // Toggle logic: Jika diklik lagi, batalkan pilihan. Jika belum, pilih.
    const newSeat = selectedSeat === seatNum ? null : seatNum;
    setSelectedSeat(newSeat);
    
    // Kirim data ke parent (Form Pemesanan)
    if (onSeatSelect) {
      onSeatSelect(newSeat);
    }
  };

  // Helper untuk merender kursi Bus (Format 2-2 dengan lorong)
  const renderBusLayout = () => {
    const totalSeats = 40; // Total kursi bus standar
    const seats = [];
    
    // Loop setiap baris (4 kursi per baris)
    for (let i = 1; i <= totalSeats; i += 4) {
      // Sisi Kiri (2 Kursi)
      seats.push(renderSingleSeat(i));
      seats.push(renderSingleSeat(i + 1));

      // Lorong (Spacer) - Sesuai grid-template-columns: repeat(5, 1fr)
      seats.push(<div key={`aisle-${i}`} className="aisle-spacer"></div>);

      // Sisi Kanan (2 Kursi)
      seats.push(renderSingleSeat(i + 2));
      seats.push(renderSingleSeat(i + 3));
    }
    return seats;
  };

  // Helper untuk merender kursi Travel (Format sederhana)
  const renderTravelLayout = () => {
    const totalSeats = 12; // Total kursi HiAce/L300
    const seats = [];
    for (let i = 1; i <= totalSeats; i++) {
      seats.push(renderSingleSeat(i));
    }
    return seats;
  };

  // Helper untuk merender item kursi individual
  const renderSingleSeat = (seatNum) => {
    const isBooked = bookedSeats.includes(seatNum);
    const isSelected = selectedSeat === seatNum;

    return (
      <div
        key={seatNum}
        className={`seat-item ${isBooked ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSeatClick(seatNum)}
      >
        {seatNum}
      </div>
    );
  };

  return (
    <div className="seat-layout-wrapper">
      {/* Posisi Supir */}
      <div className="driver-pos">
        <div className="steering-wheel"></div>
      </div>

      {/* Grid Kursi */}
      <div className={`seat-grid ${layoutType === 'bus' ? 'bus-layout' : 'travel-layout'}`}>
        {layoutType === 'bus' ? renderBusLayout() : renderTravelLayout()}
      </div>

      {/* Legenda/Keterangan Warna */}
      <div style={{ display: 'flex', gap: '15px', marginTop: '20px', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div className="seat-item" style={{ width: '20px', height: '20px' }}></div>
          <span>Tersedia</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div className="seat-item selected" style={{ width: '20px', height: '20px' }}></div>
          <span>Dipilih</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div className="seat-item disabled" style={{ width: '20px', height: '20px' }}></div>
          <span>Terisi</span>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;