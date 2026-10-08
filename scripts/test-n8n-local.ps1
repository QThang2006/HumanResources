param([switch]$Production)

$ErrorActionPreference = 'Stop'
$route = if ($Production) { 'webhook' } else { 'webhook-test' }
$testUrl = "http://localhost:5678/$route/hr-tv2-local-test/interview-schedule"
$payload = @{
  candidateName = 'Demo Thanh vien 2'
  candidateEmail = 'candidate@example.invalid'
  interviewerName = 'HR Demo'
  interviewerEmail = 'hr@example.invalid'
  fromEmail = 'hr@example.invalid'
  scheduledAt = (Get-Date).ToUniversalTime().AddDays(1).ToString('o')
  round = 1
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri $testUrl -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 30
} catch {
  Write-Host 'Mo workflow TV2 - LOCAL TEST trong n8n va bam Execute workflow truoc khi chay lenh nay.'
  throw
}
if ($response.mode -ne 'LOCAL_TEST' -or $response.delivery -ne 'NOT_SENT' -or $response.success -ne $true) {
  throw 'Unexpected response from local test workflow.'
}
$response | ConvertTo-Json
Write-Host 'Webhook da nhan du lieu. Kiem tra execution: hai node cuoi phai co result=PASS, delivery=NOT_SENT.'
Write-Host 'Google Meet la du lieu mau; email va Telegram khong duoc gui. Day chua phai kiem thu tich hop LIVE.'
