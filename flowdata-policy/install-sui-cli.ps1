# Quick Install Sui CLI (Windows) - Download Binary
# Faster alternative to building from source

Write-Host "🚀 Installing Sui CLI (Quick Method - Download Binary)..." -ForegroundColor Cyan
Write-Host ""

$suiVersion = "v1.9.2"  # Latest stable version
$downloadUrl = "https://github.com/MystenLabs/sui/releases/download/$suiVersion/sui-$suiVersion-windows-x86_64.msi"
$installerPath = "$env:TEMP\sui-installer.msi"

Write-Host "Downloading Sui CLI installer..." -ForegroundColor Yellow
Write-Host "URL: $downloadUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Download installer
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Download complete!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Installing Sui CLI..." -ForegroundColor Yellow
    Write-Host "Please follow the installer prompts..." -ForegroundColor Gray
    Write-Host ""
    
    # Run installer
    Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /quiet /norestart" -Wait
    
    Write-Host "✅ Installation complete!" -ForegroundColor Green
    Write-Host ""
    
    # Add to PATH (if not already added by installer)
    $suiPath = "C:\Program Files\Sui\bin"
    if (Test-Path $suiPath) {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$suiPath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$suiPath", "User")
            Write-Host "✅ Added Sui to PATH" -ForegroundColor Green
            Write-Host "⚠️  Please restart your terminal for PATH changes to take effect" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🎉 Sui CLI installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your terminal" -ForegroundColor White
    Write-Host "2. Run: sui --version" -ForegroundColor White
    Write-Host "3. Run: .\deploy.ps1" -ForegroundColor White
    
} catch {
    Write-Host "❌ Installation failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Install manually from:" -ForegroundColor Yellow
    Write-Host "https://github.com/MystenLabs/sui/releases" -ForegroundColor White
    exit 1
} finally {
    # Cleanup
    if (Test-Path $installerPath) {
        Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
    }
}





