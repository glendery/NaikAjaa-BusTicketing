const config = {
  // Gunakan relative path "/api" di Production (Vercel) agar otomatis mengikuti domain
  // Gunakan localhost:3000 hanya saat development di komputer lokal
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || (window.location.hostname === "localhost" ? "http://localhost:3000/api" : "/api"),
};

export default config;
