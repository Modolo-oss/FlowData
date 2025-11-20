# 🚀 Quick Deploy Guide

## Status: Sui CLI Installation

Sui CLI sedang diinstall via Cargo (background process). Ini bisa memakan waktu 10-30 menit.

## ⚡ Quick Alternative (Lebih Cepat!)

Jika ingin lebih cepat, gunakan binary installer:

### Windows (PowerShell):
```powershell
cd flowdata-policy
.\install-sui-cli.ps1
```

Atau download manual:
1. Visit: https://github.com/MystenLabs/sui/releases
2. Download: `sui-v1.9.2-windows-x86_64.msi` (atau versi terbaru)
3. Install MSI file
4. Restart terminal

## 📋 Setelah Sui CLI Terinstall

### 1. Setup Testnet Account
```powershell
# Buat address baru
sui client new-address ed25519

# Switch ke testnet
sui client switch --env testnet

# Cek address
sui client active-address
```

### 2. Dapatkan Testnet SUI
- Join Discord: https://discord.gg/sui
- Channel: `#testnet-faucet`
- Command: `!faucet <your-address>`
- Tunggu beberapa menit

### 3. Deploy Policy Package
```powershell
cd flowdata-policy
.\deploy.ps1
```

Script akan:
- ✅ Cek Sui CLI
- ✅ Cek environment (testnet)
- ✅ Cek balance
- ✅ Deploy package
- ✅ Extract package ID
- ✅ Update .env otomatis

### 4. Verify
```powershell
# Cek package di explorer
# https://suiexplorer.com/?network=testnet
# Search package ID dari .env
```

## 🎯 Checklist

- [ ] Sui CLI installed (`sui --version`)
- [ ] Testnet account created
- [ ] Testnet SUI obtained (faucet)
- [ ] Policy package deployed
- [ ] Package ID saved in `.env`
- [ ] Backend restarted

## ⏱️ Estimated Time

- Install Sui CLI: 10-30 min (cargo) atau 2-5 min (binary)
- Setup account: 2 min
- Get SUI from faucet: 5-10 min
- Deploy package: 1-2 min
- **Total: ~15-45 minutes**

## 🆘 Troubleshooting

### Sui CLI Not Found After Install
- Restart terminal
- Check PATH: `$env:PATH`
- Manual add: `C:\Program Files\Sui\bin`

### Insufficient Gas
- Get more SUI from faucet
- Check: `sui client gas`
- Increase budget: `--gas-budget 50000000`

### Deployment Fails
- Check network connection
- Verify testnet environment
- Check Move.toml syntax
- Try with higher gas budget

## 📞 Need Help?

- Sui Docs: https://docs.sui.io
- Discord: https://discord.gg/sui
- GitHub: https://github.com/MystenLabs/sui





