const config = {
  // Gunakan Environment Variable untuk fleksibilitas (Vercel vs Local)
  // Fallback ke hardcoded localhost jika env var tidak ditemukan (untuk dev local)
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "https://naikajaa-busticketing.vercel.app/api",
  
  // Client Key (Public) - Hardcoded fallback agar jalan di Vercel tanpa setting env manual
  MIDTRANS_CLIENT_KEY: import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "Mid-client-z10o2wit4ZVTLc2Q"
};

export default config;