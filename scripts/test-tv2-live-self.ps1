param()
$ErrorActionPreference = 'Stop'
$testDirectory = Join-Path $PSScriptRoot '../.temp/n8n-import'
$payloadPath = Join-Path $testDirectory 'tv2-live-self-test-payload.json'
$testPayload = Get-Content -LiteralPath $payloadPath -Raw | ConvertFrom-Json
if ($testPayload.testOnly -ne $true -or $testPayload.candidateEmail -ne $testPayload.fromEmail -or $testPayload.candidateName -ne 'TV2 TEST - Ung vien gia') {
  throw 'Only the prepared self-addressed TV2 test is supported.'
}
$body = $testPayload | ConvertTo-Json -Depth 10
try {
  $result = Invoke-RestMethod -Uri 'http://127.0.0.1:5678/webhook-test/hr-tv2-live-self-test/interview-schedule' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 60
} catch {
  throw 'Test response failed or timed out. Inspect the n8n execution before sending again; a Calendar event or email may already exist.'
}
if ($result.success -ne $true -or $result.mode -ne 'TV2_LIVE_SELF_TEST' -or $result.testReference -ne $testPayload.testReference -or $result.calendar.readback -ne 'VERIFIED' -or $result.email.status -ne 'SMTP_ACCEPTED' -or $result.telegram -ne 'NOT_REQUESTED') {
  throw 'The live TV2 verification did not pass. Inspect this execution; do not blindly retry.'
}
$result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $testDirectory 'tv2-live-self-test-result.json') -Encoding utf8
$result | ConvertTo-Json -Depth 10
Write-Output 'Calendar/Meet readback and SMTP acceptance verified. Inbox delivery must still be checked in Gmail.'
