# Dữ liệu demo tuyển dụng — Thành viên 2

Bộ seed `tv2-recruitment-v1` giúp trình bày Jobs, Careers, ATS, CV và phỏng vấn bằng dữ liệu phong phú, có thể chạy lại. Seed chỉ ghi vào `jobs`, `applications`, `interviews` và thư mục CV riêng tư. Không tạo/sửa tài khoản, phòng ban hay dữ liệu onboarding, chấm công, mood và Copilot.

## 1. Có những gì?

| Nội dung | Số lượng | Dùng để demo |
| --- | ---: | --- |
| Vị trí tuyển dụng | 12 | JD, yêu cầu, địa điểm, mức lương, tìm kiếm và lọc |
| Vị trí OPEN / CLOSED | 10 / 2 | Careers chỉ hiển thị vị trí mở; HR thấy cả vị trí đóng |
| Ứng viên | 108 | 108 tên khác nhau, email thuộc miền thử nghiệm `example.test` |
| APPLIED | 36 | Tiếp nhận hồ sơ, CV chưa chấm / đã có điểm mẫu |
| INTERVIEWING | 36 | Phỏng vấn một vòng hoặc hai vòng |
| OFFERED / REJECTED | 18 / 18 | Kết quả đạt / chưa đạt và nhận xét mẫu |
| CV PDF | 108 | File thật một trang, có văn bản, lưu riêng tư và tải qua API có phân quyền |
| Lượt phỏng vấn | 90 | 36 lịch sắp tới, 54 vòng đã có kết quả mẫu |

12 vị trí: Backend NestJS, Frontend React, Fullstack, QA Automation, DevOps/SRE, Data Engineer, AI Engineer, BA HR Tech, Product Designer, Flutter, Backend Intern và QA Manual. Hai vị trí cuối ở trạng thái CLOSED.

Vị trí Backend NestJS có **42 hồ sơ** để kiểm tra phân trang. Mỗi vị trí còn lại có 6 hồ sơ. ATS mặc định ẩn REJECTED, nên Backend có 35 hồ sơ trong bảng mặc định; chọn bộ lọc REJECTED để xem 7 hồ sơ còn lại.

Điểm 42–97, kỹ năng, tóm tắt và câu hỏi/nhận xét đều là dữ liệu mô phỏng, có nhãn `[DEMO TV2]`. PDF ghi `SYNTHETIC CV`. Seed không gọi Gemini, n8n, Google Calendar hay gửi email. Không tạo trạng thái HIRED, tài khoản nhân viên hoặc link Meet giả. Trường `meetingLink` và `googleCalendarEventId` để trống.

## 2. Thêm vào database backend của nhóm

Thực hiện từ thư mục `backend`. Cần cài dependencies, MySQL đang chạy và schema của backend đã khởi tạo. CLI đọc `backend/.env`, không tự tạo database, không synchronize schema và từ chối `NODE_ENV=production`.

Database cần có:

- Ít nhất một HR hoặc SUPERADMIN đang hoạt động.
- Một MANAGER đang hoạt động có phòng ban tồn tại.
- Thư mục CV có quyền ghi; đường dẫn phải trùng với API backend.

```powershell
cd backend
npm ci
npm run build
npm run seed:recruitment -- --dry-run
npm run seed:recruitment
```

`--dry-run` chỉ đọc dữ liệu và trả báo cáo. Các số trong `created` khi `mode=DRY_RUN` là **số dự kiến thêm**, chưa có row hoặc file nào được tạo. Khi chạy thật, `mode=DEMO`, số trong `created` là số đã thêm thành công.

Mặc định chọn HR/SUPERADMIN và MANAGER hợp lệ có ID nhỏ nhất. Nếu có nhiều phòng ban, nên chỉ định ID thật của nhóm. Ví dụ sau minh họa cú pháp; thay các ID bằng tài khoản/phòng ban hiện có:

```powershell
npm run seed:recruitment -- --dry-run --creator-id=1 --manager-id=2 --department-id=1
npm run seed:recruitment -- --creator-id=1 --manager-id=2 --department-id=1
```

Có thể tra ID bằng truy vấn chỉ đọc:

```sql
SELECT id, full_name, role, department_id, is_active
FROM users
WHERE role IN ('HR', 'SUPERADMIN', 'MANAGER')
ORDER BY id;
SELECT id, name FROM departments ORDER BY id;
```

`ATS_UPLOAD_DIR` mặc định là `backend/.ats-private/cv`. Với đường dẫn tương đối, CLI lấy thư mục `backend` làm gốc. Chạy API từ thư mục `backend`, hoặc đặt `ATS_UPLOAD_DIR` thành đường dẫn tuyệt đối giống nhau cho API và seed. CV, `.env`, database và log không đưa lên Git. Lead pull code rồi chạy seed trong database của lead để có dữ liệu; Git chỉ chứa mã tạo dữ liệu.

## 3. Cách chạy lại

- Mỗi job có mã `[TV2-SEED:<key>]` trong mô tả; mỗi hồ sơ có email ổn định theo vị trí và số thứ tự.
- Chạy lần đầu dự kiến thêm 12 job, 108 hồ sơ, 90 vòng và 108 CV.
- Chạy lại giữ nguyên bản ghi đã có, kể cả tiêu đề, điểm, trạng thái và nhận xét HR đã sửa. Báo cáo `existing` dự kiến là 12 job / 108 hồ sơ; `created` bằng 0.
- Không xóa dữ liệu cũ. Nếu một hồ sơ demo bị xóa, seed bổ sung hồ sơ đó cùng CV và các vòng mẫu của nó. Seed không sửa vòng bị xóa riêng lẻ hoặc file bị mất của hồ sơ vẫn tồn tại.
- Nếu các mã job bị trùng hoặc bộ demo thuộc phòng ban khác, seed dừng trước khi ghi dữ liệu. Không chuyển bộ demo sang phòng ban khác bằng cách chạy lại với ID khác.
- Một lượt seed dùng transaction và khóa MySQL; lỗi sẽ rollback row và xóa các CV vừa tạo trong lượt đó. CV có sẵn được giữ nguyên.
- Lịch tương lai bắt đầu 09:00 ngày hôm sau, theo `Asia/Ho_Chi_Minh`, chia các khung 09:00, 10:30, 14:00, 15:30. Lịch mẫu của cùng Manager không trùng nhau. Rerun giữ lịch cũ nên các lịch sắp tới có thể trở thành lịch quá khứ theo thời gian.

## 4. Demo tách biệt với database của nhóm

Có thể dùng harness sẵn có để tạo API và database tạm, dùng MySQL dành riêng cho test. Truyền `ATS_TEST_DB_PORT` và `ATS_TEST_DB_PASSWORD` bằng biến môi trường riêng, không ghi mật khẩu vào source/Git. Harness cần quyền tạo/xóa database **tạm** tên ngẫu nhiên `hr_ats_test_*`.

```powershell
cd backend
npm run build
npm run demo:recruitment
```

API mặc định ở `http://127.0.0.1:3001/api`. Frontend cần `VITE_API_URL=http://127.0.0.1:3001/api` và chạy cổng 5173. Tài khoản fixture: `hr@example.test`, `manager@example.test`; mật khẩu fixture: `Test-only-password-2026`. Đây là tài khoản dùng riêng cho harness, không phải tài khoản hệ thống của nhóm.

Harness tự tạo dữ liệu phòng ban/tài khoản tạm; seed chính ở mục 2 không tạo các dữ liệu này. AI/n8n bị thay bằng stub; không dùng chế độ này để chứng minh Google Meet/email hoặc AI LIVE đã chạy. Ctrl+C dọn database và CV của lần demo đó. Khởi động lại tạo một bộ mới.

## 5. Kịch bản trình bày khoảng 5 phút

1. Mở Careers: xem 10 vị trí, tìm `React`, lọc Hà Nội và xem JD/mức lương.
2. Đăng nhập HR, mở quản lý vị trí: thấy 12 job, có OPEN và CLOSED.
3. Mở ATS của Backend NestJS: xem 35 hồ sơ mặc định, chuyển trang để trình bày phân trang.
4. Lọc theo điểm hoặc tên; xem các cột APPLIED, INTERVIEWING và OFFERED. Chọn REJECTED để xem 7 hồ sơ bị loại.
5. Mở một hồ sơ INTERVIEWING có hai vòng: xem kỹ năng, điểm mẫu, câu hỏi, vòng trước đạt và vòng sau đang chờ.
6. Tải CV PDF để chứng minh file được lưu và tải qua backend có phân quyền.
7. Đăng nhập Manager: xem lịch và nhận xét trong phòng ban được phân công.

Trước buổi trình bày chính, kiểm tra seed đã chạy trên đúng database mà API đang sử dụng và thư mục CV vẫn còn. Các hành động chấm AI hoặc xếp lịch mới trên backend thật tuân theo cấu hình API/n8n của dự án; việc chạy seed không kích hoạt chúng.

## 6. Kiểm thử

Trên MySQL test riêng đã cấu hình bằng biến môi trường ở mục 4:

```powershell
cd backend
npm run build
npm run test:recruitment-seed
```

Bộ kiểm thử kiểm tra số lượng/trạng thái, dữ liệu chỉ thuộc tuyển dụng, ngày Việt Nam, PDF tải được/đọc được, API phân quyền/phân trang, dry-run, rerun đồng thời, giữ dữ liệu HR đã sửa, khôi phục hồ sơ thiếu và rollback CV khi lỗi ghi file.

Kiểm ngày 07/10/2026: backend build đạt; 8/8 bài kiểm thử đạt trên MySQL 9.6 tạm, cả bản local và bản dựng từ commit đã công bố cộng riêng thay đổi demo. API/website demo hiển thị 12 vị trí, ATS Backend có 42 hồ sơ (35 mặc định), hồ sơ có hai vòng và điểm/nhận xét mẫu. Đã render CV đại diện, kiểm tra lề văn bản trên cả 12 loại CV và tải/parse PDF qua API. Đây là kiểm thử dữ liệu demo, không phải nghiệm thu AI/Meet/email LIVE.
