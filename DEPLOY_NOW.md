# 🚀 Deploy Sekarang - Instruksi Langsung

Karena ada masalah dengan path yang mengandung spasi, jalankan langsung dari **WSL Ubuntu terminal**:

## ⚡ Quick Deploy (Copy-Paste)

**Buka WSL Ubuntu terminal** dan jalankan:

```bash
# 1. Navigate ke directory (dari dalam WSL)
cd "/mnt/c/Users/Antidump/Walrus Hackathon/flowdata-policy"

# 2. Setup Sui (jika belum)
export PATH=$PATH:$HOME/.local/bin

# 3. Setup testnet account (jika belum)
sui client new-address ed25519
sui client switch --env testnet

# 4. Cek address dan balance
sui client active-address
sui client gas

# 5. Deploy policy package
sui client publish --gas-budget 20000000
```

## 📋 Setelah Deploy

1. **Copy Package ID** dari output (contoh: `0x8d3a4a8c8340a1ab45c9dc06ad...`)

2. **Update .env file** (dari Windows atau WSL):
   ```bash
   # Dari WSL, edit .env
   nano "/mnt/c/Users/Antidump/Walrus Hackathon/.env"
   
   # Tambahkan atau update:
   SEAL_POLICY_PACKAGE_ID=0x...  # Package ID dari deploy
   ```

3. **Restart backend** untuk load config baru

## 🎯 Atau Gunakan Script

Jika ingin pakai script, dari **dalam WSL terminal**:

```bash
cd "/mnt/c/Users/Antidump/Walrus Hackathon/flowdata-policy"
chmod +x deploy-wsl.sh
./deploy-wsl.sh
```

Script akan otomatis:
- ✅ Find Sui CLI
- ✅ Check environment
- ✅ Deploy package
- ✅ Extract package ID
- ✅ Update .env file

## ⚠️ Jika Belum Setup Account

```bash
# Di WSL Ubuntu
export PATH=$PATH:$HOME/.local/bin

# Create address
sui client new-address ed25519

# Switch to testnet
sui client switch --env testnet

# Get SUI from faucet
# Discord: https://discord.gg/sui
# Channel: #testnet-faucet
# Command: !faucet <your-address>
```

## ✅ Verify

Setelah deploy, verify di Sui Explorer:
- https://suiexplorer.com/?network=testnet
- Search package ID
- Verify package is published

---

**TL;DR**: Buka WSL Ubuntu terminal → `cd` ke flowdata-policy → `sui client publish --gas-budget 20000000` → Copy package ID → Update .env





