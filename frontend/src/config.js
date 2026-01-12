const config = {
  // Gunakan Environment Variable untuk fleksibilitas (Vercel vs Local)
  // Fallback ke hardcoded localhost jika env var tidak ditemukan (untuk dev local)
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
};

export default config;
