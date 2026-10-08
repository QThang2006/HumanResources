param([string]$ScheduledAt = (Get-Date).Date.AddDays(1).AddHours(12).ToString("yyyy-MM-dd'T'HH:mm:sszzz"))
$ErrorActionPreference = 'Stop'
if ([DateTimeOffset]::Parse($ScheduledAt) -le [DateTimeOffset]::Now) { throw 'Use a future schedule with timezone for the disposable TV2 test.' }
$tv2Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tv2Runtime = Join-Path $tv2Root '.temp/tv2-web-test'
$tv2ControlUrl = 'http://127.0.0.1:3012/status'
try {
  $tv2Existing = Invoke-RestMethod -Uri $tv2ControlUrl -TimeoutSec 3
  if ($tv2Existing.ready -eq $true) {
    Write-Output 'TV2 web test already running.'
    Write-Output $tv2Existing.frontend
    exit 0
  }
} catch {}
foreach ($tv2Port in @(13316,3011,3012,5173)) {
  $tv2Socket = [Net.Sockets.TcpClient]::new()
  try {
    if ($tv2Socket.ConnectAsync('127.0.0.1', $tv2Port).Wait(500) -and $tv2Socket.Connected) {
      throw "TV2 test port $tv2Port is occupied. Do not start another instance."
    }
  } catch [AggregateException] {} finally { $tv2Socket.Dispose() }
}
$tv2MysqlBase = 'C:\Program Files\MySQL\MySQL Server 9.6'
$tv2Mysqld = Join-Path $tv2MysqlBase 'bin/mysqld.exe'
if (-not (Test-Path -LiteralPath $tv2Mysqld)) { throw 'The installed MySQL 9.6 binary was not found.' }
New-Item -ItemType Directory -Path $tv2Runtime -Force | Out-Null
$tv2OwnedDirectory = Join-Path ([IO.Path]::GetTempPath()) ('hr-tv2-web-' + [Guid]::NewGuid().ToString('N'))
$tv2DataDirectory = Join-Path $tv2OwnedDirectory 'data'
New-Item -ItemType Directory -Path $tv2DataDirectory -Force | Out-Null
# MySQL can re-exec itself; an ASCII Temp working directory avoids Windows267.
Push-Location -LiteralPath $tv2OwnedDirectory
try {
  & $tv2Mysqld --no-defaults --initialize-insecure ("--basedir=$tv2MysqlBase") ("--datadir=$tv2DataDirectory") --console 2>&1 | Out-File -LiteralPath (Join-Path $tv2Runtime 'mysql-initialize.log') -Encoding utf8
  $tv2InitializeExitCode = $LASTEXITCODE
} finally { Pop-Location }
if ($tv2InitializeExitCode -ne 0) { throw 'Isolated MySQL initialization failed. Inspect mysql-initialize.log.' }
$tv2MysqlArguments = @('--no-defaults', ('--basedir="{0}"' -f $tv2MysqlBase), ('--datadir="{0}"' -f $tv2DataDirectory), '--port=13316', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--console', '--innodb-buffer-pool-size=64M', '--max-connections=30')
$tv2MysqlProcess = Start-Process -FilePath $tv2Mysqld -ArgumentList $tv2MysqlArguments -WorkingDirectory $tv2OwnedDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $tv2Runtime 'mysql.stdout.log') -RedirectStandardError (Join-Path $tv2Runtime 'mysql.stderr.log')
$tv2MysqlReady = $false
for ($tv2Attempt = 0; $tv2Attempt -lt 25; $tv2Attempt++) {
  $tv2Socket = [Net.Sockets.TcpClient]::new()
  try {
    if ($tv2Socket.ConnectAsync('127.0.0.1',13316).Wait(300) -and $tv2Socket.Connected) { $tv2MysqlReady = $true; break }
  } catch [AggregateException] {} finally { $tv2Socket.Dispose() }
  Start-Sleep -Seconds 1
  $tv2MysqlProcess.Refresh()
  if ($tv2MysqlProcess.HasExited) { break }
}
if (-not $tv2MysqlReady) { throw 'Isolated MySQL is not ready; inspect mysql.stderr.log.' }
@{ port = 13316; dataDirectory = $tv2DataDirectory; ownedDirectory = $tv2OwnedDirectory; processId = $tv2MysqlProcess.Id; scheduledAt = $ScheduledAt } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $tv2Runtime 'mysql-runtime.json') -Encoding utf8NoBOM
$tv2Node = (Get-Command node -ErrorAction Stop).Source
$tv2BackendScript = Join-Path $tv2Root 'backend/test/recruitment-web-live-server.cjs'
$tv2BackendProcess = Start-Process -FilePath $tv2Node -ArgumentList @('"{0}"' -f $tv2BackendScript) -WorkingDirectory (Join-Path $tv2Root 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $tv2Runtime 'backend.stdout.log') -RedirectStandardError (Join-Path $tv2Runtime 'backend.stderr.log')
$tv2BackendReady = $false
for ($tv2Attempt = 0; $tv2Attempt -lt 35; $tv2Attempt++) {
  try {
    $tv2Status = Invoke-RestMethod -Uri $tv2ControlUrl -TimeoutSec 2
    if ($tv2Status.ready -eq $true) { $tv2BackendReady = $true; break }
  } catch {}
  Start-Sleep -Seconds 1
  $tv2BackendProcess.Refresh()
  if ($tv2BackendProcess.HasExited) { break }
}
if (-not $tv2BackendReady) { throw 'TV2 backend is not ready; inspect backend.stderr.log.' }
$tv2PreviousApi = $env:VITE_API_BASE_URL
try {
  $env:VITE_API_BASE_URL = 'http://127.0.0.1:3011/api'
  $tv2Vite = Join-Path $tv2Root 'frontend/node_modules/vite/bin/vite.js'
  $tv2FrontendProcess = Start-Process -FilePath $tv2Node -ArgumentList @(('"{0}"' -f $tv2Vite),'--host','127.0.0.1','--port','5173','--strictPort') -WorkingDirectory (Join-Path $tv2Root 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $tv2Runtime 'frontend.stdout.log') -RedirectStandardError (Join-Path $tv2Runtime 'frontend.stderr.log')
} finally { $env:VITE_API_BASE_URL = $tv2PreviousApi }
$tv2FrontendReady = $false
for ($tv2Attempt = 0; $tv2Attempt -lt 15; $tv2Attempt++) {
  try {
    $tv2Http = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/admin/recruitment' -UseBasicParsing -TimeoutSec 2
    if ($tv2Http.StatusCode -eq 200) { $tv2FrontendReady = $true; break }
  } catch {}
  Start-Sleep -Seconds 1
}
if (-not $tv2FrontendReady) { throw 'Frontend is not ready; inspect frontend.stderr.log.' }
@{ backend = $tv2BackendProcess.Id; frontend = $tv2FrontendProcess.Id; mysql = $tv2MysqlProcess.Id } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $tv2Runtime 'processes.json') -Encoding utf8NoBOM
Write-Output 'TV2 website ready. Real Auth/MySQL/N8nService; synthetic isolated database.'
Write-Output 'http://localhost:5173/admin/recruitment'
Write-Output 'Test account: hr@example.test / Test-only-password-2026'
Write-Output 'n8n test workflow must be listening before saving the prepared schedule.'
