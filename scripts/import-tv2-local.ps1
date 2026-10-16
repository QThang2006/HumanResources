param(
  [string]$Runtime = 'C:\Users\tienc\AppData\Local\Temp\hr-n8n-runtime-20261007',
  [string]$Data = 'C:\Users\tienc\AppData\Local\Temp\hr-n8n-data-20261007'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$cli = Join-Path $Runtime 'node_modules/n8n/bin/n8n'
if (-not (Test-Path -LiteralPath $cli)) { throw 'Khong tim thay runtime n8n.' }
$previousFolder = $env:N8N_USER_FOLDER
$previousData = $env:N8N_LOCAL_DATA
$previousDiagnostics = $env:N8N_DIAGNOSTICS_ENABLED
try {
  $env:N8N_USER_FOLDER = $Data
  $env:N8N_LOCAL_DATA = $Data
  $env:N8N_DIAGNOSTICS_ENABLED = 'false'
  node (Join-Path $PSScriptRoot 'prepare-tv2-local.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Chuan bi import that bai.' }
  $credentialFile = Join-Path $projectRoot '.temp/tv2-local-import/intake-credential.json'
  node $cli import:credentials "--input=$credentialFile"
  if ($LASTEXITCODE -ne 0) { throw 'Import credential that bai.' }
  # Remove only the generated plaintext credential, even if workflow import fails.
  Remove-Item -LiteralPath $credentialFile -Force
  $syncCredentialFile = Join-Path $projectRoot '.temp/tv2-local-import/form-sync-credential.json'
  if (Test-Path -LiteralPath $syncCredentialFile) {
    node $cli import:credentials "--input=$syncCredentialFile"
    if ($LASTEXITCODE -ne 0) { throw 'Import Form sync credential that bai.' }
    Remove-Item -LiteralPath $syncCredentialFile -Force
  }
  node $cli import:workflow "--input=$(Join-Path $projectRoot '.temp/tv2-local-import/workflows.json')"
  if ($LASTEXITCODE -ne 0) { throw 'Import workflow that bai.' }
  Write-Output 'Da import 4 workflow o trang thai chua Publish:'
  foreach ($workflowId in @('hrTv2IntakeV2','hrTv2InterviewV2','hrTv2OfferV2','hrTv2JobSyncV2')) { Write-Output "http://localhost:5678/workflow/$workflowId" }
} finally {
  if ($credentialFile -and (Test-Path -LiteralPath $credentialFile)) { Remove-Item -LiteralPath $credentialFile -Force }
  if ($syncCredentialFile -and (Test-Path -LiteralPath $syncCredentialFile)) { Remove-Item -LiteralPath $syncCredentialFile -Force }
  $env:N8N_USER_FOLDER = $previousFolder
  $env:N8N_LOCAL_DATA = $previousData
  $env:N8N_DIAGNOSTICS_ENABLED = $previousDiagnostics
}
