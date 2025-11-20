# Deploy FlowData Policy Package to Sui Testnet
# PowerShell script for Windows

Write-Host "🚀 Deploying FlowData Policy Package to Sui Testnet..." -ForegroundColor Cyan
Write-Host ""

# Check if Sui CLI is installed
Write-Host "Checking Sui CLI installation..." -ForegroundColor Yellow
$suiInstalled = Get-Command sui -ErrorAction SilentlyContinue

if (-not $suiInstalled) {
    Write-Host "❌ Sui CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Sui CLI first:" -ForegroundColor Yellow
    Write-Host "  cargo install --locked --git https://github.com/MystenLabs/sui.git --branch main sui" -ForegroundColor White
    Write-Host ""
    Write-Host "Or visit: https://docs.sui.io/build/install" -ForegroundColor White
    exit 1
}

Write-Host "✅ Sui CLI found: $($suiInstalled.Version)" -ForegroundColor Green
Write-Host ""

# Check current environment
Write-Host "Checking Sui environment..." -ForegroundColor Yellow
$currentEnv = sui client active-env 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No active environment. Setting to testnet..." -ForegroundColor Yellow
    sui client switch --env testnet
} else {
    Write-Host "Current environment: $currentEnv" -ForegroundColor Green
    if ($currentEnv -notmatch "testnet") {
        Write-Host "⚠️  Not on testnet. Switching to testnet..." -ForegroundColor Yellow
        sui client switch --env testnet
    }
}

Write-Host ""

# Check active address
Write-Host "Checking active address..." -ForegroundColor Yellow
$activeAddress = sui client active-address 2>&1
if ($LASTEXITCODE -ne 0 -or -not $activeAddress) {
    Write-Host "❌ No active address found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a new address:" -ForegroundColor Yellow
    Write-Host "  sui client new-address ed25519" -ForegroundColor White
    Write-Host ""
    Write-Host "Then get testnet SUI from faucet:" -ForegroundColor Yellow
    Write-Host "  Discord: https://discord.com/channels/916379725201563759/971488439931392130" -ForegroundColor White
    Write-Host "  Command: !faucet $activeAddress" -ForegroundColor White
    exit 1
}

Write-Host "✅ Active address: $activeAddress" -ForegroundColor Green
Write-Host ""

# Check balance
Write-Host "Checking SUI balance..." -ForegroundColor Yellow
$balance = sui client gas 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Could not check balance. Continuing anyway..." -ForegroundColor Yellow
} else {
    Write-Host "Balance: $balance" -ForegroundColor Green
    Write-Host ""
}

# Deploy package
Write-Host "📦 Publishing policy package..." -ForegroundColor Cyan
Write-Host ""

$deployOutput = sui client publish --gas-budget 20000000 2>&1
$deployExitCode = $LASTEXITCODE

if ($deployExitCode -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error output:" -ForegroundColor Yellow
    Write-Host $deployOutput -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""

# Extract package ID from output
$packageIdMatch = $deployOutput | Select-String -Pattern "packageId.*0x[a-fA-F0-9]+" | Select-Object -First 1
if ($packageIdMatch) {
    $packageId = ($packageIdMatch -split "0x")[1] -replace "[^a-fA-F0-9]", ""
    $packageId = "0x$packageId"
    
    Write-Host "📋 Package ID: $packageId" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update your .env file:" -ForegroundColor White
    Write-Host "   SEAL_POLICY_PACKAGE_ID=$packageId" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. Restart your backend server" -ForegroundColor White
    Write-Host ""
    
    # Try to update .env automatically
    $envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
    if (Test-Path $envFile) {
        Write-Host "💾 Updating .env file automatically..." -ForegroundColor Yellow
        $envContent = Get-Content $envFile -Raw
        
        if ($envContent -match "SEAL_POLICY_PACKAGE_ID=") {
            $envContent = $envContent -replace "SEAL_POLICY_PACKAGE_ID=.*", "SEAL_POLICY_PACKAGE_ID=$packageId"
        } else {
            $envContent += "`nSEAL_POLICY_PACKAGE_ID=$packageId`n"
        }
        
        Set-Content -Path $envFile -Value $envContent -NoNewline
        Write-Host "✅ .env file updated!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env file not found. Please create it manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not extract package ID from output." -ForegroundColor Yellow
    Write-Host "Please check the output above and update .env manually." -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green





