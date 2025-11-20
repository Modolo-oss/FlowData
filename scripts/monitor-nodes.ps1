param(
	[string]$Api = "http://localhost:3000",
	[string]$W1 = "http://localhost:3001",
	[string]$W2 = "http://localhost:3002"
)

Write-Host "Monitoring coordinator and workers (Ctrl+C to stop)..." -ForegroundColor Cyan

while ($true) {
	(Get-Date).ToString("u")
	try {
		$ch = Invoke-WebRequest -Uri "$Api/api/health" -UseBasicParsing -TimeoutSec 3 | Select-Object -ExpandProperty Content
		Write-Host ("Coordinator: " + $ch)
	} catch {
		Write-Host "Coordinator: down" -ForegroundColor Red
	}

	try {
		$w1h = Invoke-WebRequest -Uri "$W1/health" -UseBasicParsing -TimeoutSec 3 | Select-Object -ExpandProperty Content
		Write-Host ("Worker1:    " + $w1h)
	} catch {
		Write-Host "Worker1:    down" -ForegroundColor Red
	}

	try {
		$w2h = Invoke-WebRequest -Uri "$W2/health" -UseBasicParsing -TimeoutSec 3 | Select-Object -ExpandProperty Content
		Write-Host ("Worker2:    " + $w2h)
	} catch {
		Write-Host "Worker2:    down" -ForegroundColor Red
	}

	Write-Host "----"
	Start-Sleep -Seconds 5
}

