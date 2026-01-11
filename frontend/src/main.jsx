import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom' // Tambahkan ini

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* Bungkus App dengan ini */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)