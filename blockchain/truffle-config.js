module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     
      port: 7545,            
      network_id: "*",       
    },
  },
  
  compilers: {
    solc: {
      version: "0.8.20",    // Tetap pakai versi terbaru
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "paris" // <--- INI KUNCINYA! Memaksa standar lama agar Ganache paham
      }
    }
  },
};