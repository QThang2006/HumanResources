param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$n8nEditorUrl = 'http://localhost:5678/workflow/hrTv2IntakeV2'
$n8nReadinessUrl = 'http://127.0.0.1:5678/healthz/readiness'

function Test-N8nReady {
  try {
    $n8nResponse = Invoke-WebRequest -Uri $n8nReadinessUrl -UseBasicParsing -TimeoutSec 5
    return $n8nResponse.StatusCode -eq 200
  } catch { return $false }
}

if (-not (Test-N8nReady)) {
  if ($CheckOnly) { throw 'n8n chua san sang tai localhost:5678.' }
  $n8nExistingSocket = [System.Net.Sockets.TcpClient]::new()
  try {
    $n8nConnectTask = $n8nExistingSocket.ConnectAsync('127.0.0.1', 5678)
    if ($n8nConnectTask.Wait(1000) -and $n8nExistingSocket.Connected) {
      throw 'Port5678 da co dich vu nhung readiness chua dat. Kiem tra dich vu dang chay truoc khi khoi dong them.'
    }
  } catch [System.AggregateException] {
    # No service is accepting this local connection; startup may proceed.
  } finally { $n8nExistingSocket.Dispose() }
  $n8nRuntimeDirectory = 'C:\Users\tienc\AppData\Local\Temp\hr-n8n-runtime-20261007'
  $n8nCliPath = Join-Path $n8nRuntimeDirectory 'node_modules/n8n/bin/n8n'
  $n8nDataDirectory = 'C:\Users\tienc\AppData\Local\Temp\hr-n8n-data-20261007'
  if (-not (Test-Path -LiteralPath $n8nCliPath) -or -not (Test-Path -LiteralPath (Join-Path $n8nDataDirectory '.n8n/database.sqlite'))) {
    throw 'Khong tim thay runtime/data n8n da cau hinh. Xem docs/thanh-vien-2/LIVE-ACCEPTANCE.md de khoi phuc dung profile.'
  }
  $n8nEnvironment = @{
    N8N_USER_FOLDER = $n8nDataDirectory
    N8N_LISTEN_ADDRESS = '127.0.0.1'
    N8N_HOST = 'localhost'
    N8N_PORT = '5678'
    N8N_PROTOCOL = 'http'
    N8N_EDITOR_BASE_URL = 'http://localhost:5678/'
    WEBHOOK_URL = 'http://localhost:5678/'
    N8N_SECURE_COOKIE = 'false'
    N8N_DIAGNOSTICS_ENABLED = 'false'
    N8N_VERSION_NOTIFICATIONS_ENABLED = 'false'
  }
  # Reuse local Backend settings for the job-to-Google-Form sync workflow.
  $backendEnvPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend/.env'
  if (Test-Path -LiteralPath $backendEnvPath) {
    $backendValues = @{}
    foreach ($line in Get-Content -LiteralPath $backendEnvPath) {
      if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $backendValues[$Matches[1]] = $Matches[2].Trim().Trim("'").Trim('"')
      }
    }
    foreach ($name in @('GOOGLE_FORM_SYNC_URL', 'GOOGLE_FORM_SYNC_TOKEN')) {
      if ($backendValues.ContainsKey($name) -and $backendValues[$name]) {
        $n8nEnvironment[$name] = $backendValues[$name]
      }
    }
  }
  $n8nPreviousEnvironment = @{}
  try {
    foreach ($n8nEnvironmentName in $n8nEnvironment.Keys) {
      $n8nPreviousEnvironment[$n8nEnvironmentName] = [Environment]::GetEnvironmentVariable($n8nEnvironmentName, 'Process')
      [Environment]::SetEnvironmentVariable($n8nEnvironmentName, $n8nEnvironment[$n8nEnvironmentName], 'Process')
    }
    $n8nNodeExecutable = (Get-Command node -ErrorAction Stop).Source
    $n8nChildProcess = Start-Process -FilePath $n8nNodeExecutable -ArgumentList @(('"{0}"' -f $n8nCliPath), 'start') -WorkingDirectory $n8nRuntimeDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $n8nRuntimeDirectory 'tv2-n8n.stdout.log') -RedirectStandardError (Join-Path $n8nRuntimeDirectory 'tv2-n8n.stderr.log') -PassThru
  } finally {
    foreach ($n8nEnvironmentName in $n8nPreviousEnvironment.Keys) {
      [Environment]::SetEnvironmentVariable($n8nEnvironmentName, $n8nPreviousEnvironment[$n8nEnvironmentName], 'Process')
    }
  }
  $n8nReady = $false
  $n8nStartDeadline = [DateTime]::UtcNow.AddSeconds(180)
  for ($n8nAttempt = 0; $n8nAttempt -lt 180 -and [DateTime]::UtcNow -lt $n8nStartDeadline; $n8nAttempt++) {
    Start-Sleep -Seconds 1
    if (Test-N8nReady) { $n8nReady = $true; break }
    $n8nChildProcess.Refresh()
    if ($n8nChildProcess.HasExited) { break }
  }
  if (-not $n8nReady) { throw "n8n chua san sang. Xem log tai $n8nRuntimeDirectory." }
}

Write-Output 'n8n ready: HTTP 200. Workflow TV2:'
Write-Output $n8nEditorUrl
Write-Output 'OAuth: dan URL duoi day vao Authorized redirect URIs tren Google Cloud.'
Write-Output 'http://localhost:5678/rest/oauth2-credential/callback'
Write-Output 'Sau do ket noi tu nut Sign in with Google trong credential n8n. Callback can code/state do Google tao.'
