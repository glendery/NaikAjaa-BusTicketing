import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!email || !password) return alert("Mohon isi email dan password!");
    
    axios.post('https://sumut-bus-ticketing-backend.vercel.app/login', { email, password })
      .then(res => {
        localStorage.setItem('userBus', JSON.stringify(res.data.user));
        navigate('/dashboard');
      })
      .catch(err => alert("Gagal: " + (err.response?.data?.pesan || "Error")));
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{textAlign:'center', marginBottom:'30px'}}>
           <div style={{fontSize:'50px'}}>🚌</div>
           <h2 style={{color:'var(--primary)'}}>NaikAjaa</h2>
           <p style={{color:'#666'}}>Login untuk memesan tiket</p>
        </div>

        <div style={{textAlign:'left'}}>
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

        <button onClick={handleLogin} style={{width:'100%', padding:'15px', background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>MASUK</button>
        
        <div style={{textAlign:'center', marginTop:'20px', fontSize:'13px'}}>
           Belum punya akun? <Link to="/register" style={{color:'var(--secondary)'}}>Daftar Sekarang</Link>
        </div>
      </div>
    </div>
  );
}
export default Login;