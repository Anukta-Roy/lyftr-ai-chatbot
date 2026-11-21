$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8000"
$runId = Get-Date -Format "yyyyMMdd-HHmmss"

function Show-Result($title, $result) {
    Write-Host ""
    Write-Host "========== $title ==========" -ForegroundColor Cyan
    $result | ConvertTo-Json -Depth 8
}

Write-Host "LYFTR AI CHATBOT - FAILOVER DEMO" -ForegroundColor Green
Write-Host "Backend: $baseUrl"
Write-Host "Run ID: $runId"

$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Show-Result "HEALTH CHECK" $health

$simulation = docker compose exec backend printenv ENABLE_FAILURE_SIMULATION
if (($simulation | Out-String).Trim() -ne "true") {
    throw "ENABLE_FAILURE_SIMULATION is not true inside the backend container. Enable it in .env and recreate the backend."
}
Write-Host "Failure simulation: ENABLED" -ForegroundColor Green

$session429 = "demo-429-$runId"
$body429 = @{
    session_id = $session429
    message = "Failover demo 429 $runId - explain artificial intelligence briefly."
} | ConvertTo-Json
$result429 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -ContentType "application/json" -Headers @{"X-Simulate-Failure" = "key_1=429"} -Body $body429
Show-Result "TEST 1 - key_1 simulated 429; key_2 should answer" $result429
if ($result429.metadata.key_id -eq "key_2" -and $result429.metadata.fallback_attempts -ge 1) {
    Write-Host "PASS: recovered using key_2." -ForegroundColor Green
} else {
    Write-Host "CHECK FAILED: expected key_2 and fallback_attempts >= 1." -ForegroundColor Red
}

$session500 = "demo-500-$runId"
$body500 = @{
    session_id = $session500
    message = "Failover demo 500 $runId - explain machine learning briefly."
} | ConvertTo-Json
$result500 = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -ContentType "application/json" -Headers @{"X-Simulate-Failure" = "key_1=500"} -Body $body500
Show-Result "TEST 2 - key_1 simulated 500; key_2 should answer" $result500
if ($result500.metadata.key_id -eq "key_2" -and $result500.metadata.fallback_attempts -ge 1) {
    Write-Host "PASS: recovered using key_2." -ForegroundColor Green
} else {
    Write-Host "CHECK FAILED: expected key_2 and fallback_attempts >= 1." -ForegroundColor Red
}

$sessionAllFail = "demo-all-fail-$runId"
$bodyAllFail = @{
    session_id = $sessionAllFail
    message = "Failover demo all keys fail $runId - this request should not be stored."
} | ConvertTo-Json

Write-Host ""
Write-Host "========== TEST 3 - all keys simulated 429; expect HTTP 503 ==========" -ForegroundColor Cyan
$allFailStatus = $null
$allFailBody = $null
try {
    Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -ContentType "application/json" -Headers @{"X-Simulate-Failure" = "*=429"} -Body $bodyAllFail | ConvertTo-Json -Depth 8
    Write-Host "CHECK FAILED: expected HTTP 503, but request succeeded." -ForegroundColor Red
} catch {
    # PowerShell commonly places the JSON response body in ErrorDetails.Message.
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $allFailBody = $_.ErrorDetails.Message
    }

    $response = $_.Exception.Response
    if ($response) {
        try { $allFailStatus = [int]$response.StatusCode } catch {}
        if (-not $allFailBody) {
            try {
                if ($response -is [System.Net.Http.HttpResponseMessage]) {
                    $allFailBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                } else {
                    $stream = $response.GetResponseStream()
                    if ($stream) {
                        $reader = New-Object System.IO.StreamReader($stream)
                        $allFailBody = $reader.ReadToEnd()
                        $reader.Close()
                    }
                }
            } catch {}
        }
    }

    Write-Host "HTTP status: $allFailStatus"
    Write-Host "Response body: $allFailBody"
    if ($allFailStatus -eq 503 -and $allFailBody -match "all providers unavailable") {
        Write-Host "PASS: required 503 response received." -ForegroundColor Green
    } else {
        Write-Host "CHECK FAILED: expected 503 with detail 'all providers unavailable'." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========== TEST 3 - verify failed request was not stored ==========" -ForegroundColor Cyan
try {
    $history = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionAllFail/messages" -Method Get
    Show-Result "FAILED SESSION HISTORY" $history
    if (-not $history.messages -or $history.messages.Count -eq 0) {
        Write-Host "PASS: failed request was not stored." -ForegroundColor Green
    } else {
        Write-Host "CHECK FAILED: messages found in failed session." -ForegroundColor Red
    }
} catch {
    $historyStatus = $null
    try { $historyStatus = [int]$_.Exception.Response.StatusCode } catch {}
    if ($historyStatus -eq 404) {
        Write-Host "PASS: history endpoint returned 404; the failed request did not create a session." -ForegroundColor Green
    } else {
        Write-Host "Could not verify history. HTTP status: $historyStatus. $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "DEMO COMPLETE - Review each PASS/CHECK FAILED line above." -ForegroundColor Green
