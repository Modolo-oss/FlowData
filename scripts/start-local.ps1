Write-Host "Starting FlowData Studio Local Setup..." -ForegroundColor Cyan

# Start coordinator
Write-Host "Starting Coordinator (Port 3002)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; npm --prefix backend run dev:coordinator" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting Frontend (Port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; npm --prefix frontend run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "`nAll services started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Coordinator: http://localhost:3002" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
