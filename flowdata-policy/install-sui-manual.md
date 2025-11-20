# Manual Sui CLI Installation

Karena ada masalah network, silakan install Sui CLI secara manual:

## Method 1: Download MSI Installer (Recommended)

1. **Visit GitHub Releases:**
   - https://github.com/MystenLabs/sui/releases
   - Atau langsung: https://github.com/MystenLabs/sui/releases/latest

2. **Download:**
   - Cari file: `sui-vX.X.X-windows-x86_64.msi`
   - Versi terbaru (contoh: `sui-v1.9.2-windows-x86_64.msi`)

3. **Install:**
   - Double-click file `.msi` yang didownload
   - Follow installer prompts
   - Install ke default location: `C:\Program Files\Sui\`

4. **Verify:**
   ```powershell
   # Restart terminal dulu
   sui --version
   ```

## Method 2: Download ZIP (Portable)

1. **Download ZIP:**
   - Dari releases page, download: `sui-vX.X.X-windows-x86_64.zip`

2. **Extract:**
   - Extract ke folder (contoh: `C:\tools\sui\`)

3. **Add to PATH:**
   ```powershell
   # Add to user PATH
   $suiPath = "C:\tools\sui"
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$currentPath;$suiPath", "User")
   ```

4. **Restart terminal dan verify:**
   ```powershell
   sui --version
   ```

## Method 3: Use Chocolatey (if installed)

```powershell
choco install sui
```

## After Installation

Setelah Sui CLI terinstall, lanjutkan dengan:

```powershell
# 1. Setup testnet account
sui client new-address ed25519
sui client switch --env testnet

# 2. Get SUI from faucet (Discord)
# 3. Deploy policy package
cd flowdata-policy
.\deploy.ps1
```

## Troubleshooting

### Sui command not found
- Restart terminal setelah install
- Check PATH: `$env:PATH`
- Verify install location: `C:\Program Files\Sui\bin\`

### Network issues
- Gunakan VPN jika perlu
- Coba download di waktu berbeda
- Gunakan browser untuk download, bukan script





