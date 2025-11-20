# 🚀 Deploy dari WSL Ubuntu

Karena Sui CLI sudah terinstall di WSL Ubuntu, kita bisa deploy langsung dari sana!

## Cara 1: Dari WSL Terminal (Recommended)

1. **Buka WSL Ubuntu terminal:**
   ```bash
   wsl -d Ubuntu
   # atau langsung buka Ubuntu dari Start Menu
   ```

2. **Navigate ke project directory:**
   ```bash
   cd "/mnt/c/Users/Antidump/Walrus Hackathon/flowdata-policy"
   ```

3. **Jalankan deploy script:**
   ```bash
   chmod +x deploy-wsl.sh
   ./deploy-wsl.sh
   ```

## Cara 2: Dari PowerShell (Auto)

Saya sudah buat script yang bisa dijalankan dari PowerShell dan akan otomatis akses WSL:

```powershell
# Dari PowerShell di project root
wsl -d Ubuntu bash -c "cd '/mnt/c/Users/Antidump/Walrus Hackathon/flowdata-policy' && chmod +x deploy-wsl.sh && ./deploy-wsl.sh"
```

## Setup Sebelum Deploy

Jika belum setup Sui account:

```bash
# Di WSL Ubuntu
cd "/mnt/c/Users/Antidump/Walrus Hackathon/flowdata-policy"

# Setup testnet account
~/.local/bin/sui client new-address ed25519
~/.local/bin/sui client switch --env testnet

# Get SUI from faucet (Discord)
# Join: https://discord.gg/sui
# Channel: #testnet-faucet
# Command: !faucet <your-address>
```

## Script yang Tersedia

- `deploy-wsl.sh` - Script untuk dijalankan dari dalam WSL
- `deploy.sh` - Script umum (bisa digunakan juga)
- `deploy.ps1` - Script untuk Windows PowerShell (jika Sui di Windows)

## Troubleshooting

### Sui command not found
```bash
# Add to PATH
export PATH=$PATH:$HOME/.local/bin
# atau gunakan full path
~/.local/bin/sui --version
```

### Permission denied
```bash
chmod +x deploy-wsl.sh
```

### Path dengan spasi
Gunakan quotes:
```bash
cd "/mnt/c/Users/Antidump/Walrus Hackathon/flowdata-policy"
```





