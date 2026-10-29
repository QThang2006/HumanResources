# KỊCH BẢN BÁO CÁO VÀ DEMO — THÀNH VIÊN 4

> Phân hệ: Kho tri thức, Đào tạo nội bộ, Đánh giá định kỳ và Thôi việc liên phòng ban

---

## 1. Mục tiêu buổi trình bày

Sau phần trình bày, người nghe cần hiểu được bốn ý chính:

1. Thành viên 4 có **ba workflow bắt buộc** là 4.1, 4.2 và 4.3.
2. Workflow Kho tri thức là **tích hợp bổ trợ** cho giao diện TV4, không tính nhầm thành workflow bắt buộc thứ tư.
3. Backend giữ dữ liệu nghiệp vụ và quyền truy cập; n8n đảm nhiệm lịch chạy, điều phối nhiều kênh và ghi lại kết quả.
4. Mỗi demo đều có bằng chứng ở ba nơi: giao diện hoặc API, lịch sử thực thi n8n và kênh nhận thông báo.

| Phân loại | Workflow | Cách kích hoạt | Kết quả chính |
|---|---|---|---|
| Bổ trợ | Kho tri thức có dẫn nguồn | Người dùng đặt câu hỏi trên giao diện | Câu trả lời và nguồn tham khảo |
| 4.1 | Nhắc khóa học bắt buộc | 08:00 mỗi ngày hoặc chạy thủ công | Thư nhân viên, thư quản lý, Telegram, kết quả lưu về backend |
| 4.2 | Mở kỳ và nhắc đánh giá KPI | Ngày 25 và 28 hoặc chạy thủ công | Thư quản lý, Telegram, kết quả lưu về backend |
| 4.3 | Điều phối thôi việc | HR/SuperAdmin duyệt hồ sơ | Thư IT, Kế toán, nhân viên, Telegram, trạng thái hồ sơ |

---

## 2. Câu mở đầu gợi ý

> “Phần của em tập trung vào Đào tạo nội bộ, Đánh giá định kỳ và quy trình Thôi việc. Backend chịu trách nhiệm lưu dữ liệu và kiểm tra quyền; n8n chịu trách nhiệm chạy đúng thời điểm, gửi thông báo đến đúng đối tượng và ghi kết quả trở lại hệ thống. Ngoài ba workflow chính, em tích hợp thêm Kho tri thức có dẫn nguồn để người dùng tra cứu tài liệu nội bộ ngay trên giao diện.”

Không nên mở đầu bằng cách đọc tên từng node. Hãy nói vấn đề nghiệp vụ trước, sau đó mới cho thấy workflow giải quyết vấn đề đó như thế nào.

---

## 3. Chuẩn bị trước buổi demo

### 3.1. Tài khoản mẫu

| Vai trò | Tài khoản mẫu | Mục đích |
|---|---|---|
| SuperAdmin | `superadmin@company.com` | Quản lý toàn bộ phần TV4 |
| HR | `hr@company.com` | Quản lý đào tạo và duyệt thôi việc |
| Manager | `manager@company.com` | Nhận đôn đốc đánh giá và theo dõi nhân viên |
| Employee | `employee@company.com` | Xem khóa học và cập nhật tiến độ |

Mật khẩu dữ liệu mẫu hiện tại là `admin123`. Đây chỉ là tài khoản phục vụ phát triển và demo, không sử dụng cho môi trường thật.

### 3.2. Dữ liệu cần chuẩn bị

- Có ít nhất một phòng ban, một quản lý và một nhân viên đang hoạt động.
- Nhân viên có phòng ban, chức danh và email nhận thử nghiệm.
- Có ít nhất một khóa học loại `MANDATORY`.
- Nhân viên được gán khóa học với tiến độ dưới 50% và hạn hoàn thành trong 1–3 ngày tới.
- Có ít nhất một tài liệu PDF đã được lập chỉ mục trong Kho tri thức.
- Hộp thư SMTP gửi được thư và Telegram Bot đã được thêm vào nhóm thử nghiệm.
- Email thử nghiệm phải là địa chỉ thật mà người demo có thể mở để kiểm chứng.

Không đưa mật khẩu ứng dụng Gmail, Bot Token, Chat ID hoặc khóa tự động hóa vào slide, ảnh chụp hay tệp Markdown.

### 3.3. Kiểm tra dịch vụ

Mở ba cửa sổ PowerShell riêng.

**Cửa sổ 1 — Backend:**

```powershell
cd "D:\Nam 3\CD2\HumanResources\backend"
npm.cmd run start:dev
```

Kết quả mong đợi: backend chạy tại `http://localhost:3001` và không xuất hiện lỗi `EADDRINUSE`.

**Cửa sổ 2 — Frontend:**

```powershell
cd "D:\Nam 3\CD2\HumanResources\frontend"
npm.cmd run dev
```

Kết quả mong đợi: Vite cung cấp địa chỉ giao diện, thông thường là `http://localhost:5173`.

**Cửa sổ 3 — n8n:**

```powershell
npx n8n
```

Kết quả mong đợi: mở được n8n tại `http://localhost:5678`.

Địa chỉ backend trong các node cấu hình phụ thuộc cách chạy n8n:

- Chạy n8n trực tiếp bằng `npx n8n`: dùng `http://localhost:3001/api`.
- Chạy n8n bằng Docker: dùng `http://host.docker.internal:3001/api`.

Các file JSON đang để sẵn địa chỉ phù hợp với Docker. Nếu demo bằng `npx n8n`, phải đổi `apiBaseUrl` sang `localhost` trong node cấu hình của từng workflow.

Nếu cổng 3001 đã được dùng, không chạy thêm một backend thứ hai. Kiểm tra tiến trình đang lắng nghe bằng:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

### 3.4. Danh sách kiểm tra nhanh

- [ ] MySQL đang chạy và backend kết nối được cơ sở dữ liệu.
- [ ] Backend, frontend và n8n đều mở được.
- [ ] Bốn workflow TV4 đã được nhập vào n8n.
- [ ] Workflow dùng lịch hoặc webhook đã chuyển sang trạng thái `Active` khi demo tự động.
- [ ] Hai node gửi thư đã dùng đúng thông tin kết nối SMTP.
- [ ] Node Telegram đã dùng đúng Bot và Chat ID của nhóm thử nghiệm.
- [ ] `apiBaseUrl` trỏ đến backend mà n8n truy cập được.
- [ ] Khóa tự động hóa trong n8n trùng với backend nhưng không bị trình chiếu.
- [ ] Hộp thư và nhóm Telegram thử nghiệm đang mở sẵn.

---

## 4. Sơ đồ trình bày tổng thể

```text
Người dùng / Lịch chạy / Sự kiện HR
                 │
                 ▼
        Giao diện hoặc n8n
                 │
                 ▼
       Backend xác thực và lấy dữ liệu
                 │
                 ▼
     n8n điều phối Email + Telegram
                 │
                 ▼
 Backend lưu kết quả để truy vết và thử lại
```

Câu chuyển ý:

> “Điểm quan trọng là n8n không thay thế Service của backend. Backend vẫn quyết định ai cần nhắc và dữ liệu nào hợp lệ; n8n lấy kết quả đó để thực hiện tác vụ theo lịch và điều phối ra bên ngoài.”

---

## 5. Demo giao diện Đào tạo và AI phân tích năng lực

### 5.1. Vai trò SuperAdmin hoặc HR

1. Đăng nhập bằng tài khoản SuperAdmin hoặc HR.
2. Mở phân hệ **Đào tạo & Phát triển**.
3. Giới thiệu nhanh các chỉ số tổng quan và ba khu vực nghiệp vụ:
   - Kho khóa học.
   - Gán khóa học và AI phân tích.
   - Theo dõi tiến độ.
4. Chọn một nhân viên đã có đánh giá hiệu suất để minh họa **phân tích đầy đủ**.
5. Chọn một nhân viên mới chưa có KPI nhưng đã có phòng ban và chức danh để minh họa **phân tích sơ bộ**.

Lời nói gợi ý:

> “AI có hai mức phân tích. Khi có KPI và đánh giá hiệu suất, hệ thống phân tích đầy đủ. Khi nhân viên mới chưa có KPI, hệ thống vẫn phân tích sơ bộ dựa trên chức danh, phòng ban, lịch sử đào tạo và kỹ năng. Giao diện ghi rõ đây là kết quả gợi ý, tránh tạo cảm giác dữ liệu sơ bộ có độ tin cậy như một kỳ đánh giá thật.”

### 5.2. Vai trò Employee

1. Đăng xuất và đăng nhập bằng tài khoản Employee.
2. Mở phần khóa học cá nhân.
3. Cho thấy khóa được gán, hạn hoàn thành và tiến độ.
4. Cập nhật tiến độ nếu cần, sau đó quay lại màn hình quản trị để cho thấy dữ liệu đã đồng bộ.

Điểm cần nhấn mạnh: cùng một dữ liệu đào tạo nhưng giao diện hiển thị theo đúng vai trò; nhân viên không nhìn thấy chức năng quản trị của HR/SuperAdmin.

---

## 6. Demo bổ trợ — Kho tri thức có dẫn nguồn

### 6.1. Mục tiêu

Chứng minh câu hỏi trên giao diện thật sự kích hoạt workflow và câu trả lời được đối chiếu với tài liệu nội bộ.

### 6.2. Các bước demo

1. Đăng nhập bằng SuperAdmin hoặc HR.
2. Mở **Kho tri thức**.
3. Cho thấy danh sách tài liệu đã tải lên và trạng thái lập chỉ mục.
4. Nhập một câu hỏi có nội dung xuất hiện rõ trong PDF.
5. Bấm hỏi.
6. Mở n8n để cho thấy workflow `TV4 - 01 Trả lời Kho tri thức có dẫn nguồn` vừa chạy qua tám node.
7. Quay lại giao diện, chỉ vào câu trả lời và danh sách nguồn.
8. Hỏi thêm một câu ngoài nội dung tài liệu để chứng minh nhánh “chưa đủ dữ liệu”.

Lời nói gợi ý:

> “Workflow này dùng Webhook nên không chạy chỉ bằng việc mở màn hình. Khi người dùng bấm hỏi, frontend gửi câu hỏi và JWT vào Webhook. n8n nhờ backend tìm nội dung liên quan, tạo câu trả lời dựa trên ngữ cảnh đó, kiểm tra nguồn rồi mới trả về giao diện. Nếu không có nội dung phù hợp, hệ thống nói rõ chưa đủ dữ liệu thay vì tự đoán.”

### 6.3. Bằng chứng cần chỉ ra

- Execution mới trong n8n có trạng thái thành công.
- Node `Tìm nội dung liên quan` trả về các nội dung phù hợp.
- Câu trả lời trên giao diện có nguồn tương ứng.
- Câu ngoài tài liệu đi qua node `Thông báo chưa đủ dữ liệu`.

---

## 7. Demo workflow 4.1 — Nhắc hoàn thành khóa học bắt buộc

### 7.1. Bối cảnh nghiệp vụ

> “Mỗi sáng, hệ thống cần tìm các khóa bắt buộc sắp đến hạn nhưng nhân viên học chưa đạt 50%. Nếu chỉ dựa vào HR kiểm tra thủ công thì rất dễ bỏ sót. Workflow 4.1 tự động nhắc nhân viên, báo quản lý và cập nhật kênh đào tạo.”

### 7.2. Điều kiện để có `count = 1`

Một lượt đào tạo chỉ được trả về khi thỏa các điều kiện chính:

- Nhân viên đang hoạt động.
- Khóa học thuộc loại bắt buộc.
- Chưa hoàn thành.
- Tiến độ dưới 50%.
- Đã quá hạn hoặc còn tối đa ba ngày.
- Không vừa được nhắc trong khoảng chống gửi lặp.

### 7.3. Các bước demo

1. Trên giao diện, gán một khóa bắt buộc cho nhân viên thử nghiệm.
2. Đặt hạn hoàn thành vào ngày kia và giữ tiến độ ở 0%.
3. Trong n8n, mở workflow 4.1.
4. Đặt email nhận thử nghiệm nếu không muốn gửi vào dữ liệu người dùng thật.
5. Chạy workflow thủ công bằng **Execute workflow**.
6. Mở node `Lấy danh sách cần nhắc`, cho thấy `count = 1`.
7. Chỉ lần lượt các node gửi thư nhân viên, kiểm tra quản lý, Telegram và callback.
8. Mở hộp thư để cho thấy tiêu đề, tên nhân viên, tên khóa, số ngày còn lại và tiến độ.
9. Mở Telegram để cho thấy thông báo tổng hợp.

Lời nói gợi ý:

> “Backend chịu trách nhiệm lọc đúng người cần nhắc. n8n không tự suy đoán từ toàn bộ cơ sở dữ liệu. Sau khi lấy được danh sách, workflow tách từng lượt đào tạo, soạn nội dung tiếng Việt, gửi nhân viên, gửi quản lý nếu có, thông báo Telegram và lưu trạng thái gửi về backend.”

### 7.4. Nếu không có thư quản lý

Kiểm tra theo thứ tự:

1. Nhân viên có `managerId` hoặc có quản lý cùng phòng ban hay chưa.
2. Email quản lý có tồn tại và có đúng định dạng hay chưa.
3. Có đang đặt email thử nghiệm ở node cấu hình hay không.
4. Node `Có quản lý trực tiếp?` đi nhánh `true` hay `false`.
5. Node gửi thư quản lý có lỗi SMTP hay không.

Việc email quản lý là địa chỉ giả không làm workflow n8n luôn báo lỗi ngay, nhưng thư sẽ không thể đến hộp thư thật. Khi kiểm thử, dùng một hộp thư thật do nhóm kiểm soát.

---

## 8. Demo workflow 4.2 — Mở kỳ và đôn đốc đánh giá KPI

### 8.1. Bối cảnh nghiệp vụ

> “Ngày 25 hằng tháng, hệ thống mở đợt đánh giá và nhắc quản lý thực hiện. Đến ngày 28, hệ thống chỉ tiếp tục đôn đốc các trường hợp chưa hoàn thành. Đây là tác vụ theo thời gian nên phù hợp để n8n đảm nhiệm.”

### 8.2. Cách demo không cần chờ đúng ngày

Trong node `Nạp cấu hình an toàn`, chỉ dùng giá trị thử nghiệm trong buổi demo:

- `testPhase = OPENING`
- `testAsOf = 2026-10-25T01:00:00.000Z`

Sau khi demo xong, xóa hai giá trị thử nghiệm để lịch thật quyết định giai đoạn.

### 8.3. Các bước demo giai đoạn ngày 25

1. Mở workflow 4.2.
2. Điền hai giá trị thử nghiệm nêu trên.
3. Chạy workflow thủ công.
4. Mở node `Xác định đợt thông báo`, chỉ ra giai đoạn `OPENING`.
5. Mở node `Lấy danh sách quản lý cần nhắc`, chỉ ra số quản lý và nhân viên phụ trách.
6. Mở email quản lý để cho thấy danh sách cần đánh giá và đường dẫn vào hệ thống.
7. Mở Telegram để cho thấy thông báo toàn đợt.
8. Mở node callback để chứng minh kết quả đã được lưu về backend.

### 8.4. Demo nhanh giai đoạn ngày 28

Đổi cấu hình thử nghiệm thành:

- `testPhase = SECOND_REMINDER`
- `testAsOf = 2026-10-28T01:00:00.000Z`

Chạy lại và giải thích rằng backend chỉ trả về các trường hợp chưa nộp hoặc chưa hoàn tất đánh giá.

Lời nói gợi ý:

> “Hai Schedule Trigger dùng chung phần xử lý phía sau. Node xác định giai đoạn giúp nội dung ngày 25 và ngày 28 khác nhau. Backend gom nhân viên theo quản lý trực tiếp; nếu thiếu, hệ thống dùng quản lý phòng ban, sau đó mới dùng đầu mối HR làm phương án dự phòng.”

### 8.5. Việc bắt buộc sau demo

- Xóa `testPhase`.
- Xóa `testAsOf`.
- Lưu workflow.
- Kiểm tra lại hai lịch ngày 25 và 28.

Nếu để lại giá trị thử nghiệm, workflow có thể gửi sai giai đoạn trong lần chạy thật.

---

## 9. Demo workflow 4.3 — Thôi việc liên phòng ban

### 9.1. Bối cảnh nghiệp vụ

> “Khi HR duyệt một hồ sơ nghỉ việc, công việc không kết thúc ở việc đổi trạng thái nhân viên. IT cần thu hồi thiết bị và tài khoản, Kế toán cần quyết toán, nhân viên cần nhận thư cảm ơn và khảo sát. Workflow 4.3 điều phối các bên đó từ một sự kiện duy nhất.”

### 9.2. Lưu ý về cách kích hoạt

Workflow 4.3 dùng Webhook và phải ở trạng thái `Active`. Backend gọi Webhook ngay sau khi lưu hồ sơ đã duyệt. Nếu workflow chưa Active, backend vẫn lưu hồ sơ nhưng phần điều phối có thể chuyển sang trạng thái chờ hoặc lỗi và cần thử lại.

Hiện giao diện TV4 chưa có màn hình chuyên biệt để lập hồ sơ thôi việc. Vì vậy, demo đúng và trung thực nhất là gọi API bằng tài khoản HR/SuperAdmin hoặc chuẩn bị trước một hồ sơ thử nghiệm.

### 9.3. Cấu hình an toàn trước khi chạy

Trong node `Nạp cấu hình liên phòng ban`:

- Đặt `testEmployeeEmail` thành hộp thư thử nghiệm.
- Đặt `testInternalEmail` thành hộp thư thử nghiệm.
- Giữ khóa tự động hóa ở chế độ Fixed nhưng không trình chiếu giá trị.
- Kiểm tra Telegram Chat ID của nhóm liên phòng ban.

### 9.4. Gọi API tạo hồ sơ thử nghiệm bằng PowerShell

Đổi `YOUR_TEST_INBOX@example.com` thành hộp thư thật do nhóm kiểm soát:

```powershell
$apiBase = 'http://localhost:3001/api'

$loginBody = @{
  email = 'hr@company.com'
  password = 'admin123'
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiBase/auth/login" `
  -ContentType 'application/json' `
  -Body $loginBody

$token = $login.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

$usersResponse = Invoke-RestMethod `
  -Method Get `
  -Uri "$apiBase/users" `
  -Headers $headers

$employee = $usersResponse.data |
  Where-Object { $_.role -eq 'EMPLOYEE' -and $_.isActive } |
  Select-Object -First 1

$offboardingBody = @{
  userId = $employee.id
  lastWorkingDate = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
  personalEmail = 'YOUR_TEST_INBOX@example.com'
  reason = 'Hoàn tất hợp đồng thử nghiệm'
  assetNotes = 'Laptop và thẻ nhân viên'
  exitSurveyUrl = 'https://example.com/exit-survey'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$apiBase/offboarding" `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $offboardingBody
```

Không chạy lặp với cùng một nhân viên nếu hồ sơ đang còn hiệu lực. Nếu backend báo đã tồn tại hồ sơ, chọn nhân viên thử nghiệm khác hoặc dùng chức năng thử lại trên hồ sơ cũ.

### 9.5. Các bước trình bày sau khi gửi API

1. Mở n8n và chỉ execution mới của workflow 4.3.
2. Chỉ node xác thực yêu cầu từ backend.
3. Chỉ node lấy lại hồ sơ đã duyệt từ backend; đây là nguồn dữ liệu đáng tin cậy.
4. Cho thấy lần lượt thư IT, Kế toán và nhân viên.
5. Mở Telegram để cho thấy thông báo liên phòng ban.
6. Chỉ node `Tổng hợp kết quả liên phòng ban` và trạng thái `SENT`, `PARTIAL` hoặc `FAILED`.
7. Chỉ node callback ghi kết quả về backend.

Lời nói gợi ý:

> “Webhook chỉ mang định danh và khóa xác thực. Workflow không tin hoàn toàn dữ liệu đầu vào mà gọi lại backend để lấy hồ sơ đã duyệt. Các bước gửi hiện nối tuần tự để thu thập đủ kết quả từng kênh. Sau cùng, n8n ghi trạng thái tổng hợp về backend để HR biết cần thử lại hay không.”

---

## 10. Trình tự demo đề xuất trong 6–8 phút

| Thời gian | Nội dung | Bằng chứng |
|---:|---|---|
| 0:00–0:40 | Giới thiệu phạm vi và kiến trúc | Sơ đồ tổng thể |
| 0:40–2:00 | Giao diện Đào tạo và AI | Hai chế độ phân tích, gán khóa, tiến độ |
| 2:00–2:50 | Kho tri thức | Câu trả lời có nguồn và execution n8n |
| 2:50–4:10 | Workflow 4.1 | `count = 1`, email, Telegram, callback |
| 4:10–5:20 | Workflow 4.2 | Giai đoạn ngày 25/28, email quản lý |
| 5:20–6:40 | Workflow 4.3 | Execution, ba email, Telegram, trạng thái |
| 6:40–7:20 | An toàn, xử lý lỗi và kết luận | Secret, thử lại, truy vết |

Nếu thời lượng chỉ còn năm phút, demo trực tiếp Kho tri thức và 4.1; với 4.2 và 4.3 dùng execution đã chạy thành công nhưng vẫn giải thích rõ dữ liệu đầu vào và đầu ra.

---

## 11. Ma trận bằng chứng khi kiểm thử

| Chức năng | Bằng chứng 1 | Bằng chứng 2 | Bằng chứng 3 |
|---|---|---|---|
| Kho tri thức | Giao diện có câu trả lời | Nguồn tài liệu được hiển thị | Execution n8n thành công |
| 4.1 | API trả `count > 0` | Email/Telegram nhận được | Callback ghi kết quả |
| 4.2 | Giai đoạn đúng ngày 25 hoặc 28 | Email quản lý/Telegram | Callback ghi số người được nhắc |
| 4.3 | Hồ sơ được backend lưu | IT/Kế toán/nhân viên nhận thư | Trạng thái `SENT/PARTIAL/FAILED` |

Không nên kết luận “workflow chạy đúng” chỉ vì các node trên canvas chuyển màu xanh. Phải kiểm tra cả nội dung nhận được và kết quả lưu về hệ thống.

---

## 12. Câu hỏi phản biện và câu trả lời ngắn

### 12.1. Vì sao không viết toàn bộ bằng backend?

Backend phù hợp với xử lý request, dữ liệu và phân quyền. n8n phù hợp với lịch chạy, Webhook, điều phối Email/Telegram, theo dõi từng bước và thử lại khi một kênh lỗi. Hai phần bổ sung cho nhau.

### 12.2. Thành viên 4 có ba hay bốn workflow?

Ba workflow bắt buộc là 4.1, 4.2, 4.3. Kho tri thức RAG là workflow tích hợp bổ trợ cho phân hệ TV4.

### 12.3. Nhân viên chưa có KPI thì AI phân tích bằng gì?

Hệ thống dùng chế độ phân tích sơ bộ dựa trên chức danh, phòng ban, lịch sử đào tạo và kỹ năng. Giao diện ghi rõ tính chất gợi ý; khi có KPI, hệ thống chuyển sang phân tích đầy đủ.

### 12.4. Làm sao hạn chế AI trả lời sai trong Kho tri thức?

n8n lấy nội dung liên quan từ backend trước, yêu cầu mô hình trả lời trong phạm vi ngữ cảnh, kiểm tra nguồn và trả thông báo chưa đủ dữ liệu nếu không tìm thấy bằng chứng phù hợp.

### 12.5. Vì sao 4.1 không nhắc mọi khóa chưa hoàn thành?

Workflow chỉ nhắc khóa bắt buộc có rủi ro trễ hạn: tiến độ dưới 50% và hạn còn tối đa ba ngày hoặc đã quá hạn. Cách này giảm thư rác và tập trung vào trường hợp cần can thiệp.

### 12.6. Nếu nhân viên không có quản lý trực tiếp thì sao?

Backend tìm quản lý theo phòng ban. Nếu vẫn không có, workflow bỏ qua riêng thư quản lý nhưng vẫn nhắc nhân viên và thông báo kênh đào tạo; kết quả được ghi rõ khi tổng hợp.

### 12.7. Vì sao workflow 4.2 chạy ngày 25 và 28?

Ngày 25 dùng để mở đợt và thông báo lần đầu. Ngày 28 dùng để đôn đốc các trường hợp chưa hoàn tất trước hạn chót.

### 12.8. Nếu Telegram lỗi nhưng email gửi thành công thì sao?

Workflow tổng hợp theo từng kênh và lưu trạng thái một phần thay vì coi mọi thứ đều thành công. Người quản trị có thể xem lỗi và thử lại đúng hồ sơ hoặc đợt gửi.

### 12.9. Webhook 4.3 được bảo vệ như thế nào?

Backend gửi khóa tự động hóa qua header. n8n xác thực khóa, sau đó dùng cùng cơ chế để gọi API tự động hóa. Giá trị thật nằm trong cấu hình môi trường hoặc credential, không ghi vào mã nguồn hay tài liệu.

### 12.10. Có bắt buộc dùng email thật không?

Trong dữ liệu thật, mỗi người nên có email nhận được thư. Trong demo, có thể định tuyến nhiều vai trò về một hộp thư thử nghiệm thật để dễ kiểm chứng. Email giả có thể giúp tạo dữ liệu nhưng không chứng minh việc giao thư thành công.

### 12.11. Làm sao tránh gửi lặp?

Backend có cửa sổ chống gửi lại đối với nhắc đào tạo, workflow ghi `runId` và kết quả callback. Với thôi việc, backend lưu hồ sơ và trạng thái riêng để kiểm tra, thử lại có kiểm soát.

---

## 13. Xử lý sự cố trong lúc demo

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý nhanh |
|---|---|---|
| Backend báo `EADDRINUSE: 3001` | Một backend khác đang chạy | Dùng tiến trình hiện tại hoặc dừng đúng PID, không mở thêm lần nữa |
| Workflow 4.1 trả `count = 0` | Hạn quá xa, tiến độ ≥50%, khóa không bắt buộc hoặc vừa được nhắc | Chỉnh dữ liệu thử nghiệm rồi gọi lại API |
| Nhân viên có thư nhưng quản lý không có | Thiếu quản lý/email hoặc nhánh điều kiện đi `false` | Kiểm tra quan hệ quản lý và output node điều kiện |
| Node Email đỏ | SMTP sai tài khoản, mật khẩu ứng dụng, cổng hoặc SSL | Mở credential SMTP và thử riêng node |
| Telegram không có tin | Sai Bot Token, Chat ID hoặc Bot chưa ở trong nhóm | Gửi tin trong nhóm, lấy lại Chat ID và chạy thử node |
| `$env` báo không truy cập được từ giao diện n8n | n8n chặn biến môi trường trong trình chỉnh sửa | Dùng giá trị Fixed an toàn hoặc credential phù hợp |
| 4.2 chạy sai giai đoạn | Còn `testPhase/testAsOf` hoặc ngày hệ thống không đúng | Xóa giá trị thử và kiểm tra múi giờ |
| 4.3 không tạo execution | Workflow chưa Active hoặc URL webhook sai | Kích hoạt workflow và kiểm tra `N8N_WEBHOOK_BASE_URL` |
| Kho tri thức không có nguồn | PDF chưa lập chỉ mục hoặc câu hỏi không khớp | Kiểm tra trạng thái tài liệu và hỏi lại đúng phạm vi |
| AI báo thiếu dữ liệu | Nhân viên thiếu phòng ban/chức danh và chưa có KPI | Bổ sung dữ liệu hồ sơ hoặc tạo đánh giá hiệu suất |

---

## 14. Phương án dự phòng nếu mạng hoặc dịch vụ ngoài lỗi

Trước buổi báo cáo, nên lưu sẵn:

- Một execution thành công của mỗi workflow.
- Ảnh email nhân viên, quản lý, IT và Kế toán.
- Ảnh thông báo Telegram.
- Một câu hỏi Kho tri thức có câu trả lời và nguồn.
- Một trường hợp AI phân tích đầy đủ và một trường hợp phân tích sơ bộ.

Khi phải dùng bằng chứng dự phòng, nói rõ đó là kết quả của lần chạy chuẩn bị trước; không nên giả vờ đó là execution vừa chạy trực tiếp.

---

## 15. Câu kết thúc gợi ý

> “Phần Thành viên 4 đã khép kín vòng nghiệp vụ từ đào tạo, phân tích năng lực, nhắc đánh giá đến thôi việc. Backend vẫn là nguồn dữ liệu và lớp phân quyền; n8n bổ sung khả năng chạy theo lịch, điều phối nhiều kênh và truy vết kết quả. Nhờ đó, hệ thống không chỉ lưu thông tin mà còn chủ động thúc đẩy quy trình và hỗ trợ phối hợp giữa nhân viên, quản lý, HR, IT và Kế toán.”

---

## 16. Việc cần làm ngay sau buổi demo

- Xóa `testPhase` và `testAsOf` khỏi workflow 4.2.
- Xóa hoặc vô hiệu hóa các email thử nghiệm nếu chuyển sang dữ liệu thật.
- Không commit credential, token hoặc khóa tự động hóa.
- Kiểm tra lại lịch `Active` của 4.1 và 4.2.
- Kiểm tra workflow 4.3 vẫn dùng đúng URL production/test tương ứng.
- Lưu ảnh bằng chứng vào thư mục báo cáo của nhóm nếu giảng viên yêu cầu.

Tài liệu giải thích đi kèm: `GIAI_THICH.md`.
