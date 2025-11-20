Write-Host "Starting FlowData Studio Local Setup..." -ForegroundColor Cyan

# Start coordinator (prod build assumed)
Write-Host "Starting Coordinator (Port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "npm --prefix backend run start:coordinator" -WindowStyle Minimized

Start-Sleep -Seconds 1

# Start Python Worker 1
Write-Host "Starting Worker 1 (Port 3001)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "$env:WORKER1_PORT=3001; python -m worker_nodes.worker_1.main" -WindowStyle Minimized

# Start Python Worker 2
Write-Host "Starting Worker 2 (Port 3002)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "$env:WORKER2_PORT=3002; python -m worker_nodes.worker_2.main" -WindowStyle Minimized

# Start frontend (prod preview)
Write-Host "Starting Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "npm --prefix frontend run preview -- --port 5173" -WindowStyle Minimized

Write-Host "All services started!"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Coordinator: http://localhost:3000"
Write-Host "Workers: http://localhost:3001, http://localhost:3002"

