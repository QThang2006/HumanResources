# Chạy và kiểm thử phần thành viên 2

Cập nhật **07/10/2026**. Hướng dẫn dành cho bản tích hợp đã push tại `HumanResources`, nhánh `feature/recruitment-ats` (code8f7212a, main9733233). Bản nguồn cũ `HumanResources-full` giữ local, không phải source vận hành hiện hành. Lịch sử công bố ở [DAILY-PUBLISH.md](DAILY-PUBLISH.md).

## 1. Những gì đã triển khai

- Tin tuyển dụng: tạo, sửa, mở/đóng; public chỉ xem OPEN; tìm kiếm/lọc/phân trang.
- Careers và chi tiết việc làm lấy API thật; nộp contact + PDF, nhận mã hồ sơ sau khi DB lưu.
- CV riêng tư: PDF tối đa 5 MiB, 40 trang, 60.000 ký tự; parser chạy worker giới hạn bộ nhớ/thời gian; file scan chuyển sang xem thủ công.
- Bàn HR ba cột; OFFERED thuộc cột phỏng vấn, REJECTED có bộ lọc riêng; tìm ứng viên/lọc điểm/paging/counts. Kéo thẻ APPLIED sang phỏng vấn mở form lịch, hủy không đổi dữ liệu; có phương án bấm thẻ/bàn phím.
- Lịch phỏng vấn lưu DB; Manager cùng phòng ban; ghi điểm/feedback/result chỉ bởi Manager được giao.
- Caller AI có validator, timeout, kiểm dữ liệu cũ, phân biệt LIVE/MOCK. Nút phụ thuộc SDK tắt khi chưa có method.
- Hire có kiểm điều kiện và trả 503 rõ khi chưa có contract provisioning; chưa tạo User/task.

Giao diện dùng auth gate trong recruitment để đăng nhập API bằng email/password thật. AuthContext và LoginPage chung vẫn là demo của nền: nếu bị chuyển đến /login, chọn góc nhìn HR/Manager rồi đăng nhập lại tại /admin/recruitment. Role switch trên Navbar không cấp quyền API; nó làm mất phiên thật và recruitment yêu cầu đăng nhập lại.

## 2. Cài đặt và build

Yêu cầu: Node tương thích dependencies (đã kiểm Node 24.14.1), npm, MySQL 8; Docker Desktop nếu dùng DB tạm. Mở terminal tại repo.

Nếu dependencies chưa cài, chạy `npm ci` lần lượt trong backend và frontend; giữ nguyên lockfile. Binary bcrypt cần install script. Nếu trước đó đã dùng `--ignore-scripts`, từ backend/node_modules/bcrypt chạy:

```powershell
node ../@mapbox/node-pre-gyp/bin/node-pre-gyp install --fallback-to-build
```

Các lệnh trực tiếp dưới đây tránh vấn đề npm shim khi đường dẫn Windows chứa ký tự &.

Terminal backend:

```powershell
Set-Location backend
node ./node_modules/@nestjs/cli/bin/nest.js build
```

Terminal frontend:

```powershell
Set-Location frontend
node ./node_modules/typescript/bin/tsc -b
node ./node_modules/vite/bin/vite.js build
node ./node_modules/oxlint/bin/oxlint src
```

## 3. Chạy demo độc lập, không đụng DB nhóm

Demo tạo database ngẫu nhiên `hr_ats_test_<16 hex>` trong MySQL local, seed Department.code và tài khoản đầy đủ, dùng JWT/bcrypt thật. AI chưa có method; n8n là stub, không gửi email/Meet. Thư mục CV dùng thư mục tạm riêng. Ctrl+C dọn database/file của demo.

Terminal backend, chọn mật khẩu chỉ dùng cho container test:

```powershell
$env:ATS_TEST_DB_PASSWORD = 'MAT_KHAU_MYSQL_TEST'
docker run --rm -d --name hr-ats-tv2-test -p 127.0.0.1:13316:3306 -e "MYSQL_ROOT_PASSWORD=$env:ATS_TEST_DB_PASSWORD" mysql:8.0
# Đợi MySQL sẵn sàng trong docker logs hr-ats-tv2-test.
node test/recruitment-demo.cjs
```

Nếu container test đã tồn tại, dùng lại cùng cổng/mật khẩu; không chạy thêm container cùng tên. Cổng mặc định MySQL test 13316, API demo 3001; có thể đổi bằng ATS_TEST_DB_PORT / ATS_TEST_API_PORT. Port phải còn trống.

Terminal frontend:

```powershell
node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
```

Mở http://127.0.0.1:5173/careers hoặc /admin/recruitment.

| Tài khoản fixture | Quyền |
| --- | --- |
| hr@example.test | HR toàn công ty |
| manager@example.test | Manager Engineering, dùng để xếp lịch |
| peer@example.test | Manager cùng phòng, kiểm tra không được chấm vòng giao cho người khác |
| other@example.test | Manager Finance, kiểm tra không nhìn thấy hồ sơ Engineering |
| employee@example.test | Employee, không vào API tuyển dụng nội bộ |
| admin@example.test | SuperAdmin |

Mật khẩu các tài khoản fixture: `Test-only-password-2026`. Chỉ tồn tại trong database test do harness tạo.

Dùng PDF tổng hợp ở `backend/test/fixtures/`. Demo: HR tạo tin → mở Careers nộp CV → HR mở hồ sơ/xếp lịch → đăng nhập Manager chấm → HR tải lại hồ sơ/đề xuất nhận việc. Hire tắt có giải thích. Không có khóa API/SMTP thật trong demo.

Sau khi Ctrl+C các tiến trình do mình mở, dừng đúng container test:

```powershell
docker stop hr-ats-tv2-test
```

## 4. Kết nối môi trường nhóm

Tạo backend/.env từ mẫu hiện có, điền DB_HOST/PORT/USERNAME/PASSWORD/DATABASE, JWT_SECRET; dùng DB development được lead bàn giao. AppModule hiện bật synchronize: không trỏ vào database production.

```powershell
# Tại backend, sau build
node dist/main.js
```

Frontend dùng VITE_API_BASE_URL, mặc định http://localhost:3001/api. Backend hiện cho CORS localhost/127.0.0.1 cổng 5173.

Thiết lập `ATS_UPLOAD_DIR` thành thư mục riêng chỉ tiến trình backend được truy cập; mặc định backend/.ats-private/cv. Không đặt bên trong frontend/public hoặc mount static. Trên Windows cần ACL filesystem phù hợp; mode POSIX 0600 không thay thế Windows ACL. Backup DB và thư mục CV cùng nhau.

Seed nền đang thiếu Department.code và tài khoản tài liệu khác source. Demo/test đã có fixture riêng; không gọi seed chung để né lỗi. Lead cần bàn giao seed/Auth hoàn chỉnh trước nghiệm thu tích hợp.

## 5. Chạy test

Trong backend, MySQL test đã sẵn sàng và ATS_TEST_DB_PASSWORD đã đặt:

```powershell
node ./node_modules/@nestjs/cli/bin/nest.js build
node --test test/jobs-crud.test.cjs test/recruitment.test.cjs
```

Mỗi lần chạy tạo database có tên ngẫu nhiên, chỉ xóa database/thư mục do chính harness tạo. Test dùng các module Jobs/Applications/Auth thật, guard thật, ValidationPipe và wrapper/filter thật. Không gọi workflow hay Gemini bên ngoài. Không dùng database HR nhóm.

Browser smoke cần Playwright và Chromium đã cài trong môi trường test. Script ưu tiên module ở ATS_PLAYWRIGHT_MODULE, nếu bỏ biến thì dùng package playwright thông thường. Không thêm dependency vào package/lockfile nhóm trong đợt này.

```powershell
# Vite phải chạy trước ở cổng 5173; script tự mở API test cổng ngẫu nhiên.
$env:ATS_PLAYWRIGHT_MODULE = 'DUONG_DAN_DEN_PACKAGE_PLAYWRIGHT'
node test/recruitment.browser.cjs
```

Trên máy đã kiểm, dùng Playwright có sẵn ở runtime Codex. Script chuyển request API từ browser sang API test cổng ngẫu nhiên; nội dung response và DB đều thật, không thay response nghiệp vụ bằng mock (ngoại trừ bài kiểm tra lỗi 503 có chủ đích).

## 6. Bằng chứng ngày 01/10/2026

- Backend build: PASS.
- TypeScript frontend + Vite production build: PASS.
- Backend `node --test`: **33/33 PASS** (31 bài kiểm tra con + 2 nhóm tổng hợp).
- Browser: **6 nhóm smoke PASS**, desktop 1440px, mobile 375/390px và tablet 768px; không pageerror.
- Fixture 100 jobs/500 hồ sơ: phân trang cuối/counts đúng; 2 HTTP list request tổng 19 ms trong một lần đo local. Đây không phải benchmark production.
- Lint frontend: exit 0, còn 6 warning (1 AuthContext có sẵn, 1 Fast Refresh utility export và 4 cảnh báo setState khi effect khởi động fetch/reset). Không có lint error.
- Kiểm tra diff: không sửa core/entities/schema/auth/package/lockfile. Navbar có một thay đổi class để hết tràn ngang mobile.
- Ảnh: [ATS desktop](evidence/ats-desktop.png), [Careers mobile](evidence/careers-mobile.png), [Manager mobile](evidence/manager-mobile.png).

AI envelope LIVE trong test chỉ là stub kiểm contract. Chưa chứng minh Gemini, mail, Google Meet hoặc Hire/User/5 task live.

## 7. Kiểm tra lại ngày 02/10/2026

- Backend build, frontend TypeScript/Vite production build: PASS.
- Backend: 34/34 PASS (32 bài con + 2 nhóm), MySQL8 thật, có test trùng request tạo câu hỏi và giải phóng khóa khi SDK lỗi.
- Browser: 10 nhóm PASS, giữ các viewport trên; bổ sung department/Manager lookup retry, detail retry/invalid ID, empty selection, kéo thả/hủy/chặn Hire, JD MOCK preview/chỉnh sửa/lưu. AI/n8n vẫn là stub; không gửi email hoặc tạo Meet thật.
- Lint tuyển dụng: exit0, 5 warning cũ (4 setState-in-effect, 1 Fast Refresh), không error. Lint toàn frontend có thêm warning AuthContext của nền như đợt trước.
- Ảnh mới nằm tại `tmp/verification-2026-10-02/` của worktree local; ảnh trong `evidence/` vẫn là bằng chứng lịch sử01/10.
- Worktree trên máy hiện dùng junction tới node_modules đã cài ở repo công bố; bản checkout mới vẫn cài bằng npm ci như mục2. Không chép junction vào Git.
- Nhánh công bố vẫn ecc1e8b; không push thêm trong lượt hoàn thiện này.

## 8. Bằng chứng tích hợp ngày07/10/2026

- Nhận main9733233 qua merge54cb79a, giữ core/entities/auth/workflows của lead. Toàn bộ implementation TV2 hiện có đã push8f7212a; tài liệu công bố riêng sau khi xác nhận SHA.
- Backend build, frontend TypeScript/Vite production build: PASS. Lint toàn frontend exit0, **5 warning**, không error (AuthContext/ui Fast Refresh; JobDetailPage/RecruitmentAdminPage set-state-in-effect).
- Jobs **27/27**, recruitment **37/37**, tổng **64/64 PASS**. MySQL9.6.0 test riêng ở13316, database ngẫu nhiên và CV tạm, JWT/password thật; fixture100 Jobs/500 hồ sơ. Đợt này chưa kiểm lại MySQL8.0.
- Browser **10 nhóm PASS** với API/MySQL thật, AI/n8n contract stub; desktop1440px/mobile375–390px/tablet768px, không pageerror. [ATS desktop](evidence/2026-10-07/ats-desktop.png), [Ứng tuyển mobile](evidence/2026-10-07/careers-mobile.png), [Manager mobile](evidence/2026-10-07/manager-mobile.png). Ảnh thư mục evidence gốc là lịch sử01/10.
- Kiểm3 method SDK lead thực tế không cấu hình key: đều trả MOCK hợp lệ. Adapter dùng aiGenerated, JD arrays/question objects. Có method không có nghĩa provider LIVE đã được xác minh.
- Q23 chưa readback mail/Meet bền; workflow templates mới đã nhận từ lead nhưng chưa chạy nghiệm thu. Q24 chưa User/5 task, endpoint503/UI khóa. Không gửi mail hoặc gọi Gemini ngoài trong bộ test.
- Jobs giữ array khi khôngpage/pageSize; thiếu một bị400, có cả hai trả envelope. Careers6/sidebar10/candidates30 mỗi trang.
- Môi trường test dùng native MySQL cài sẵn vì Docker không hoạt động; datadir riêng trong Windows Temp, không DB nhóm. Harness chỉ xóa database/CV do chính nó tạo.

## 9. Giới hạn vận hành cần bàn giao

- Rate limit nộp hồ sơ và khóa AI đang xử lý là bộ nhớ mỗi process; triển khai nhiều replica cần shared limiter/queue của nền.
- Timeout AI không hủy tác vụ bên provider nếu SDK không hỗ trợ cancellation.
- Dedupe lịch dựa trên khóa hàng Application qua module này; writer khác phải tuân theo cùng contract.
- SDK n8n hiện trả boolean trước khi HTTP hoàn tất: không có durable outbox, retry hay trạng thái gửi mail bền. Không tự gửi lại một request mơ hồ.
- File mới được dọn khi transaction thất bại. Nếu process bị kill giữa ghi file/DB sẽ có thể còn orphan. Chính sách hiện tại: không xóa tự động; đối soát UUID file với Application.cvFileUrl, chỉ quản trị viên dọn file không được tham chiếu sau backup và khoảng đệm 24 giờ. Chưa có job cleanup tự động.
- Kết quả score cũ không có version JD/mode lưu trong schema. New MOCK không persist, nhưng sửa JD sau khi chấm không tự đánh dấu toàn bộ điểm lịch sử là cũ; HR cần chấm lại. Cần lead bàn giao metadata nếu muốn theo dõi bền.
- Core auth còn quickDemoLogin theo role và frontend LoginPage demo; cần lead khắc phục trước triển khai thật. Auth gate recruitment không sửa bảo mật của core.
- Shared exception filter có thể trả message lỗi nội bộ; adapter AI đã che lỗi provider trong phạm vi TV2. Lead cần review filter/log ở nền.

Các contract và endpoint thực tế nằm trong [CONTRACTS.md](CONTRACTS.md). Checklist còn mở nằm trong [PROGRESS.md](PROGRESS.md).
