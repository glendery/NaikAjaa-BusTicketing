import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = () => {
    if(!nama || !email || !password) return alert("Mohon lengkapi data!");

    axios.post('https://sumut-bus-ticketing-backend.vercel.app/register', { nama, email, password })
      .then(() => {
        alert("Akun berhasil dibuat! Silakan Login.");
        navigate('/'); 
      })
      .catch(err => alert("Gagal: " + (err.response?.data?.pesan || "Error")));
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{textAlign:'center', marginBottom:'30px'}}>
           <div style={{fontSize:'50px'}}>📝</div>
           <h2 style={{color:'var(--primary)', marginTop:'10px'}}>Daftar NaikAjaa</h2>
           <p style={{color:'#666'}}>Buat akun untuk mulai berpetualang</p>
        </div>

        <div style={{textAlign:'left'}}>
            <label style={{fontSize:'12px', fontWeight:'bold', display:'block', marginBottom:'5px'}}>NAMA LENGKAP</label>
            <input 
            type="text" 
            value={nama} 
            onChange={e=>setNama(e.target.value)} 
            placeholder="Nama Anda" 
            style={{width:'100%', padding:'12px', marginBottom:'15px', borderRadius:'8px', border:'1px solid #ddd', boxSizing:'border-box'}} 
            />

            <label style={{fontSize:'12px', fontWeight:'bold', display:'block', marginBottom:'5px'}}>EMAIL</label>
            <input 
            type="email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            placeholder="user@mail.com" 
            style={{width:'100%', padding:'12px', marginBottom:'15px', borderRadius:'8px', border:'1px solid #ddd', boxSizing:'border-box'}} 
            />

            <label style={{fontSize:'12px', fontWeight:'bold', display:'block', marginBottom:'5px'}}>PASSWORD</label>
            <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            placeholder="••••••" 
            style={{width:'100%', padding:'12px', marginBottom:'20px', borderRadius:'8px', border:'1px solid #ddd', boxSizing:'border-box'}} 
            />
        </div>

        <button onClick={handleRegister} style={{width:'100%', padding:'15px', background:'var(--secondary)', color:'var(--primary)', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>DAFTAR SEKARANG</button>
        
        <div style={{textAlign:'center', marginTop:'20px', fontSize:'13px'}}>
           Sudah punya akun? <Link to="/" style={{color:'var(--primary)'}}>Login di sini</Link>
        </div>
      </div>
    </div>
  );
}
export default Register;