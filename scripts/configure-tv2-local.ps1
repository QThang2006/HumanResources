param(
  [Parameter(Mandatory=$true)][string]$FromEmail,
  [Parameter(Mandatory=$true)][string]$HrEmail,
  [string]$PublicWebUrl = 'http://localhost:5173'
)
$ErrorActionPreference = 'Stop'
foreach ($address in @($FromEmail,$HrEmail)) {
  if ($address -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { throw 'Email khong hop le.' }
}
if ($PublicWebUrl -notmatch '^https?://[^\s]+$' -or $PublicWebUrl.Contains('`')) { throw 'URL giao dien khong hop le.' }
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend/.env'
$content = [IO.File]::ReadAllText($envFile)
$values = @{
  MAIL_FROM = $FromEmail
  HR_EMAIL = $HrEmail
  PUBLIC_WEB_BASE_URL = $PublicWebUrl.TrimEnd('/')
  RECRUITMENT_CALLBACK_BASE_URL = 'http://localhost:3001/api'
}
foreach ($name in $values.Keys) {
  $pattern = '(?m)^' + [regex]::Escape($name) + '=.*$'
  $replacement = $name + '=' + $values[$name]
  if ([regex]::IsMatch($content,$pattern)) { $content = [regex]::Replace($content,$pattern,[System.Text.RegularExpressions.MatchEvaluator]{param($m) $replacement}) }
  else { $content += "`n$replacement`n" }
}
[IO.File]::WriteAllText($envFile,$content,[Text.UTF8Encoding]::new($false))
Write-Output 'Da cap nhat cau hinh TV2. Khoi dong lai Backend de ap dung.'
