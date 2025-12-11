flowchart LR
    User([Penumpang]) -- "Spoofing / Phishing" --> Frontend[Frontend Vercel]
    Frontend -- "XSS / Man-in-the-Middle" --> Backend[Backend Server]
    Backend -- "Injection (SQL/NoSQL)" --> DB[(Database MongoDB)]
    Backend -- "Tampering / Gas Griefing" --> Blockchain{{Blockchain Sepolia}}
    Backend -- "Fraud Transaction" --> Midtrans{{Midtrans API}}

    style User fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#bbf,stroke:#333,stroke-width:2px
    style Blockchain fill:#bfb,stroke:#333,stroke-width:2px
    style DB fill:#ff9,stroke:#333,stroke-width:2px