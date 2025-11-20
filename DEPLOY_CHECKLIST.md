# Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Policy Package
- [x] `flowdata-policy/Move.toml` created
- [x] `flowdata-policy/sources/policy.move` created
- [x] Policy functions implemented (`seal_approve`, `seal_approve_entry`)

### 2. Backend
- [x] Backend builds successfully
- [x] Config supports `SEAL_POLICY_PACKAGE_ID`
- [x] Seal encrypt uses policy package ID
- [x] Seal decrypt uses sessionKey

### 3. Frontend
- [x] Frontend builds successfully
- [x] SessionKey generation implemented
- [x] Wallet integration ready

### 4. Environment
- [ ] Sui CLI installed
- [ ] Sui testnet account created
- [ ] Testnet SUI tokens obtained (from faucet)
- [ ] `.env` file created

## 🚀 Deployment Steps

### Step 1: Install Sui CLI (if not installed)

**Windows (PowerShell):**
```powershell
# Install Rust first if needed
# Then install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch main sui
```

**Or download binary:**
- Visit: https://github.com/MystenLabs/sui/releases
- Download for your platform

### Step 2: Setup Sui Testnet Account

```bash
# Create new address
sui client new-address ed25519

# Switch to testnet
sui client switch --env testnet

# Check active address
sui client active-address
```

### Step 3: Get Testnet SUI Tokens

1. Join Sui Discord: https://discord.gg/sui
2. Go to #testnet-faucet channel
3. Run: `!faucet <your-address>`
4. Wait a few minutes for tokens to arrive
5. Check balance: `sui client gas`

### Step 4: Deploy Policy Package

**Option A: Using PowerShell Script (Windows)**
```powershell
cd flowdata-policy
.\deploy.ps1
```

**Option B: Manual Deploy**
```bash
cd flowdata-policy
sui client publish --gas-budget 20000000
```

**Save the package ID from output:**
```
Published package:
{
  packageId: 0x8d3a4a8c8340a1ab45c9dc06ad...
}
```

### Step 5: Update Environment Variables

Create or update `.env` file in project root:

```env
# Coordinator (backend)
COORDINATOR_PORT=3000
WORKER_NODES=http://localhost:3001,http://localhost:3002
MAX_UPLOAD_MB=200

# Sui network
SUI_NETWORK=testnet

# Seal Policy Package (REQUIRED - set after deployment)
SEAL_POLICY_PACKAGE_ID=0x8d3a4a8c8340a1ab45c9dc06ad...  # From Step 4
SEAL_POLICY_MODULE=policy
SEAL_POLICY_FUNCTION=seal_approve_entry

# Frontend
VITE_COORDINATOR_URL=http://localhost:3000
```

### Step 6: Verify Deployment

1. **Check Policy Package on Explorer:**
   - Visit: https://suiexplorer.com/?network=testnet
   - Search for your package ID
   - Verify package is published

2. **Test Backend:**
   ```bash
   npm --prefix backend run build
   npm --prefix backend run dev:coordinator
   ```

3. **Test Frontend:**
   ```bash
   npm --prefix frontend run dev
   ```

4. **Test Full Flow:**
   - Open http://localhost:5173
   - Upload a CSV file
   - Check that encryption/decryption works

## 🔍 Troubleshooting

### Sui CLI Not Found
- Install Rust: https://rustup.rs/
- Install Sui CLI: `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch main sui`
- Or use pre-built binaries from GitHub releases

### Insufficient Gas
- Get more testnet SUI from faucet
- Check balance: `sui client gas`
- Increase gas budget if needed: `--gas-budget 50000000`

### Deployment Fails
- Check Move.toml syntax
- Verify Sui framework dependency
- Check network connection
- Try with higher gas budget

### Policy Package Not Found
- Verify package ID is correct in `.env`
- Check package on Sui Explorer
- Ensure you're on testnet: `sui client active-env`

### Seal Decrypt Fails
- Verify `SEAL_POLICY_PACKAGE_ID` is set
- Check sessionKey is generated correctly
- Verify policy package is deployed
- Check Seal key servers are accessible

## 📝 Post-Deployment

After successful deployment:

1. ✅ Policy package deployed to testnet
2. ✅ Package ID saved in `.env`
3. ✅ Backend configured with policy package
4. ✅ Frontend generates sessionKey
5. ✅ Seal encrypt/decrypt ready to use

## 🎯 Next Steps

1. Test encryption/decryption flow
2. Verify policy function works
3. Customize policy logic if needed
4. Deploy to mainnet (when ready)





