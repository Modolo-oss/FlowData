# 🚀 Install Sui CLI - Quick Guide

## ⚠️ Network Issues Detected

Karena ada masalah network dengan cargo install, gunakan salah satu metode berikut:

## ✅ Method 1: Download Binary (FASTEST - Recommended)

### Windows:

1. **Visit GitHub Releases:**
   ```
   https://github.com/MystenLabs/sui/releases
   ```

2. **Download MSI Installer:**
   - Cari: `sui-v1.9.2-windows-x86_64.msi` (atau versi terbaru)
   - Atau langsung: https://github.com/MystenLabs/sui/releases/latest

3. **Install:**
   - Double-click file `.msi`
   - Follow installer
   - Default location: `C:\Program Files\Sui\`

4. **Restart Terminal & Verify:**
   ```powershell
   sui --version
   ```

## ✅ Method 2: Chocolatey (if installed)

```powershell
choco install sui
```

## ✅ Method 3: Manual ZIP

1. Download: `sui-vX.X.X-windows-x86_64.zip`
2. Extract ke: `C:\tools\sui\`
3. Add to PATH:
   ```powershell
   $env:Path += ";C:\tools\sui"
   ```

## 📋 After Installation

Setelah Sui CLI terinstall:

```powershell
# 1. Setup testnet account
sui client new-address ed25519
sui client switch --env testnet
sui client active-address

# 2. Get testnet SUI (Discord faucet)
# Join: https://discord.gg/sui
# Channel: #testnet-faucet
# Command: !faucet <your-address>

# 3. Deploy policy package
cd flowdata-policy
.\deploy.ps1
```

## 🔗 Quick Links

- **Releases**: https://github.com/MystenLabs/sui/releases
- **Latest**: https://github.com/MystenLabs/sui/releases/latest
- **Docs**: https://docs.sui.io/build/install
- **Discord**: https://discord.gg/sui

## ⏱️ Time Estimate

- Download binary: **2-5 minutes**
- Install: **1 minute**
- Setup account: **2 minutes**
- Get SUI: **5-10 minutes**
- Deploy: **1-2 minutes**

**Total: ~10-20 minutes**

---

**Note**: Cargo install sedang dicoba dari testnet branch di background, tapi download binary lebih cepat dan reliable!





