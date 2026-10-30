[CmdletBinding()]
param(
    [string]$EmployeeEmail = 'offboarding.demo@company.com',
    [string]$ApiBase = 'http://localhost:3001/api',
    [string]$HrEmail = 'hr@company.com',
    [string]$HrPassword = 'admin123',
    [string]$PersonalEmail = 'maivanluong1806@gmail.com',
    [int]$LastWorkingDays = 7,
    [string]$ExitSurveyUrl = 'https://forms.google.com',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function ConvertTo-Utf8JsonBytes {
    param([Parameter(Mandatory = $true)]$Value)

    $json = $Value | ConvertTo-Json -Depth 10
    return [System.Text.Encoding]::UTF8.GetBytes($json)
}

function Get-ResponseData {
    param([Parameter(Mandatory = $true)]$Response)

    if ($null -ne $Response.data) {
        return $Response.data
    }

    return $Response
}

if (-not $Execute) {
    Write-Host 'Chưa gửi hồ sơ thôi việc.' -ForegroundColor Yellow
    Write-Host 'Để chạy thật và kích hoạt Email/Telegram, thêm tham số -Execute.'
    Write-Host "Ví dụ: .\scripts\demo-tv4-offboarding.ps1 -EmployeeEmail '$EmployeeEmail' -Execute"
    exit 0
}

try {
    Write-Host '1/4 Đăng nhập bằng tài khoản HR...'
    $loginBody = ConvertTo-Utf8JsonBytes -Value @{
        email = $HrEmail
        password = $HrPassword
    }

    $loginResponse = Invoke-RestMethod `
        -Method Post `
        -Uri "$ApiBase/auth/login" `
        -ContentType 'application/json; charset=utf-8' `
        -Body $loginBody

    $loginData = Get-ResponseData -Response $loginResponse
    $token = $loginData.accessToken
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw 'Backend không trả về accessToken.'
    }

    $headers = @{ Authorization = "Bearer $token" }

    Write-Host "2/4 Tìm nhân viên $EmployeeEmail..."
    $usersResponse = Invoke-RestMethod `
        -Method Get `
        -Uri "$ApiBase/users" `
        -Headers $headers

    $users = @(Get-ResponseData -Response $usersResponse)
    $employee = $users |
        Where-Object { $_.email -ieq $EmployeeEmail } |
        Select-Object -First 1

    if ($null -eq $employee) {
        throw "Không tìm thấy người dùng có email $EmployeeEmail."
    }
    if ($employee.role -ne 'EMPLOYEE') {
        throw "Người dùng $EmployeeEmail không có vai trò EMPLOYEE."
    }
    if (-not $employee.isActive) {
        throw "Nhân viên $EmployeeEmail đang không hoạt động."
    }

    $lastWorkingDate = (Get-Date).AddDays($LastWorkingDays).ToString('yyyy-MM-dd')
    Write-Host "3/4 Tạo hồ sơ thôi việc cho $($employee.fullName), ngày cuối $lastWorkingDate..."

    $offboardingBody = ConvertTo-Utf8JsonBytes -Value @{
        userId = [int]$employee.id
        lastWorkingDate = $lastWorkingDate
        personalEmail = $PersonalEmail
        reason = 'Hoàn tất hợp đồng thử nghiệm'
        assetNotes = 'Thu hồi laptop, thẻ nhân viên và quyền truy cập hệ thống'
        exitSurveyUrl = $ExitSurveyUrl
    }

    $result = Invoke-RestMethod `
        -Method Post `
        -Uri "$ApiBase/offboarding" `
        -Headers $headers `
        -ContentType 'application/json; charset=utf-8' `
        -Body $offboardingBody

    $resultData = Get-ResponseData -Response $result
    Write-Host '4/4 Hoàn tất.' -ForegroundColor Green
    Write-Host "Thông báo: $($resultData.message)"
    Write-Host "Đã chuyển sang n8n: $($resultData.automationQueued)"
    Write-Host "Mã hồ sơ: $($resultData.offboarding.id)"
    Write-Host "Trạng thái: $($resultData.offboarding.status)"
    Write-Host "IT: $($resultData.offboarding.delivery.itNotified)"
    Write-Host "Kế toán: $($resultData.offboarding.delivery.financeNotified)"
    Write-Host "Nhân viên: $($resultData.offboarding.delivery.employeeNotified)"
    Write-Host "Telegram: $($resultData.offboarding.delivery.telegramNotified)"
}
catch {
    Write-Host "Demo thất bại: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Kiểm tra backend cổng 3001, workflow 4.3 đã Published và email nhân viên.'
    exit 1
}
