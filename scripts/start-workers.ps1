# Start Worker Nodes
$rootDir = Split-Path -Parent $PSScriptRoot
Write-Host "Starting Worker Nodes from: $rootDir" -ForegroundColor Green

# Load environment variables from .env file if exists
$envFile = Join-Path $rootDir ".env"
$envVars = @{}
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
}

# Build environment variable string for workers
$envString = "`$env:WORKER1_PORT='8001';"
if ($envVars.ContainsKey("WORKER1_PRIVATE_KEY")) {
    $envString += " `$env:WORKER1_PRIVATE_KEY='$($envVars['WORKER1_PRIVATE_KEY'])';"
}
if ($envVars.ContainsKey("COORDINATOR_URL")) {
    $envString += " `$env:COORDINATOR_URL='$($envVars['COORDINATOR_URL'])';"
}

$envString2 = "`$env:WORKER2_PORT='8002';"
if ($envVars.ContainsKey("WORKER2_PRIVATE_KEY")) {
    $envString2 += " `$env:WORKER2_PRIVATE_KEY='$($envVars['WORKER2_PRIVATE_KEY'])';"
}
if ($envVars.ContainsKey("COORDINATOR_URL")) {
    $envString2 += " `$env:COORDINATOR_URL='$($envVars['COORDINATOR_URL'])';"
}

# Worker 1 - Run from root directory so imports work
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; $envString python -m worker_nodes.worker_1.main" -WindowStyle Minimized

# Worker 2 - Run from root directory so imports work
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; $envString2 python -m worker_nodes.worker_2.main" -WindowStyle Minimized

Write-Host "✅ Workers started in separate windows" -ForegroundColor Green
Write-Host "Worker 1: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Worker 2: http://localhost:8002" -ForegroundColor Cyan
