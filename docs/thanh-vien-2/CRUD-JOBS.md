# Đợt 1 — CRUD tin tuyển dụng

Ngày triển khai/commit: 01/10/2026. Nhánh: feature/recruitment-ats.

Phần được đưa lên nhánh đợt này:

- Tạo tin với trim, giới hạn độ dài, phòng ban hợp lệ; createdBy từ JWT.
- Public chỉ đọc tin OPEN; danh sách nội bộ có guard và scope phòng ban của Manager.
- Sửa tin và đóng/mở tuyển dụng với expectedUpdatedAt, transaction lock và lỗi409 khi dữ liệu đã đổi.
- Không chuyển phòng ban khi tin đã có ứng viên. Đóng tuyển là cách ẩn tin mà vẫn giữ hồ sơ.
- Helper frontend Jobs có create/update/changeStatus; GET list vẫn trả array để giữ contract đợt đầu.

## Endpoint

| Endpoint | Quyền | Ghi chú |
| --- | --- | --- |
| GET /api/jobs | Public | Chỉ OPEN; q tìm theo title; all=false tương thích, all=true trả400 |
| GET /api/jobs/:id | Public | Tin CLOSED hoặc thiếu trả404 |
| GET /api/jobs/admin | HR/SuperAdmin/Manager | q tìm theo title; Manager chỉ phòng mình |
| GET /api/jobs/admin/:id | HR/SuperAdmin/Manager | Tin nội bộ trong scope |
| POST /api/jobs | HR/SuperAdmin | title, departmentId, description, requirements, location?, salaryRange? |
| PATCH /api/jobs/:id | HR/SuperAdmin | Như create + expectedUpdatedAt ISO |
| PATCH /api/jobs/:id/status | HR/SuperAdmin | status OPEN/CLOSED + expectedUpdatedAt ISO |

Endpoint AI từ starter vẫn là skeleton, chưa nghiệm thu. Đợt này chưa đưa code mới cho CV, AI, Kanban hoặc phỏng vấn. Tại thời điểm kết thúc đợt 1, các page frontend vẫn dùng mock của starter; phần nối Careers với API được ghi ở đợt 2 bên dưới.

## Kiểm thử

Backend build và frontend TypeScript build đạt. Bộ test CRUD: 10/10 PASS (9 tình huống + 1 nhóm tổng hợp), gồm quyền/scope, DTO, tạo/sửa/đóng/mở, dữ liệu cũ và hai cập nhật đồng thời. Test dùng MySQL8 riêng, seed tổng hợp có Department.code, đăng nhập password/JWT thật. AI provider trong test chỉ bị thay bằng isAvailable=false; không gọi dịch vụ bên ngoài.

Terminal backend:

```powershell
$env:ATS_TEST_DB_PASSWORD = 'MAT_KHAU_MYSQL_TEST'
docker run --rm -d --name hr-ats-tv2-test -p 127.0.0.1:13316:3306 -e "MYSQL_ROOT_PASSWORD=$env:ATS_TEST_DB_PASSWORD" mysql:8.0
# Đợi MySQL sẵn sàng.
node ./node_modules/@nestjs/cli/bin/nest.js build
node --test test/jobs-crud.test.cjs
# Sau test:
docker stop hr-ats-tv2-test
```

Mỗi test run tạo và dọn một database ngẫu nhiên hr_jobs_test_<16 hex>, không dùng database nhóm. ATS_TEST_DB_PORT mặc định13316.

## Đợt 2 - Xem tin tuyển dụng trên Careers

Ngày triển khai/commit: 02/10/2026. Một chức năng: xem danh sách và chi tiết tin công khai từ API Jobs có sẵn.

- `/careers` gọi `GET /api/jobs`, hiển thị tin OPEN do backend trả về, bỏ danh sách mẫu và số ứng viên giả.
- Bấm một tin mở `/careers/:id`, gọi `GET /api/jobs/:id` và hiển thị đúng nội dung, mô tả, yêu cầu.
- Có trạng thái tải, danh sách rỗng, lỗi và nút thử lại. Tin đóng/không tồn tại hiển thị lỗi, không lấy tin mẫu thay thế.
- Mã tin sai bị chặn trước khi gọi API; request được hủy khi rời trang để tránh dữ liệu cũ.
- Thay form nộp hồ sơ giả bằng thông báo chưa mở nhận hồ sơ trực tuyến. Chưa triển khai CV, tìm kiếm, bộ lọc hoặc phân trang trong đợt này.

### Kiểm tra đợt 2

- TypeScript (`tsc -b`), Vite production build, oxlint cho ba file frontend thay đổi và `git diff --check`: đạt.
- Chromium chạy bản production trên localhost với phản hồi API mô phỏng theo envelope hiện tại: đạt 8 nhóm kiểm tra (tải/danh sách/link đúng ID; chi tiết và văn bản an toàn; danh sách rỗng; lỗi/thử lại; 404 không có dữ liệu thay thế; mã sai không gọi API; rời trang khi request đang chờ; nội dung Careers trên mobile).
- Đã xem giao diện ở 1366px và 390px. Nội dung Careers không tràn chiều ngang; thanh menu demo dùng chung còn tràn trên mobile và nằm ngoài phạm vi đợt này.
- Kiểm tra trình duyệt dùng dữ liệu kiểm thử, chưa chạy lại luồng xuyên suốt với MySQL trong đợt 2. Kết quả test backend ở đợt 1 vẫn là kết quả của đợt 1.

### Demo với backend thật

1. Chạy backend cùng MySQL theo README; frontend dùng `VITE_API_BASE_URL` hoặc mặc định `http://localhost:3001/api`.
2. Tạo một tin OPEN bằng API Jobs đã có ở đợt 1, mở `/careers`, kiểm tra tiêu đề/phòng ban rồi bấm `Xem chi tiết`.
3. Đóng tin bằng API, tải lại danh sách: tin biến mất. Mở lại URL chi tiết của tin đó: hiển thị lỗi.
4. Tắt backend rồi tải lại trang: có thông báo lỗi. Bật backend và bấm `Thử lại`: dữ liệu tải lại được.

## Đợt 3 - Q01: Tìm tin tuyển dụng theo từ khóa

Ngày công bố: 02/10/2026, thêm một commit theo yêu cầu mới sau đợt Careers đọc tin.

- Careers có ô tìm theo tên công việc, giới hạn150 ký tự, chờ250ms sau khi ngừng nhập và nút xóa tìm kiếm. Từ khóa rỗng trả lại danh sách; không có kết quả và lỗi API có thông báo riêng.
- `GET /api/jobs?q=...` và `/api/jobs/admin?q=...` trim/validate từ khóa và tìm chuỗi con trong title. Response vẫn là array trong wrapper hiện có; public chỉ OPEN và admin giữ nguyên role/scope.
- Bind từ khóa bằng tham số SQL; các ký tự `%`, `_`, `!` và dấu gạch chéo ngược được tìm như ký tự thông thường. Query mảng/object hoặc dài quá150 ký tự bị400.
- Hủy request khi từ khóa đổi hoặc rời trang; response cũ không được thay kết quả mới. Thử lại giữ nguyên từ khóa.

Kiểm thử trên nhánh công bố: backend build, frontend TypeScript/Vite build, lint các file frontend thay đổi và kiểm tra diff đều đạt. Bộ `jobs-crud.test.cjs`: **14/14 PASS** (13 bài con + 1 nhóm) với MySQL8/JWT thật; có test public OPEN, Manager scope, từ khóa đặc biệt, query sai và tương thích array/all=false.

Smoke Chromium local với phản hồi API kiểm thử: **6 nhóm PASS** (trim/tìm theo title; rỗng/xóa/whitespace; debounce; response đến chậm; lỗi/thử lại/link chi tiết; nội dung mobile390px). Kiểm thử UI này dùng API fixture; kiểm thử backend dùng database thật. Thanh menu demo dùng chung vẫn có giới hạn mobile nêu ở đợt2.

Demo: tạo hai tin có title khác nhau, mở Careers và nhập một phần title, xóa từ khóa để xem lại tất cả, thử từ khóa không khớp. Đóng một tin rồi tìm lại title của tin đó: không hiện ở public.

## Tiếp theo

1. Nối giao diện quản lý Job với API thật.
2. Careers: lọc phòng ban (Q02), địa điểm và phân trang; tìm theo từ khóa đã có ở Q01.
3. Nộp CV/Applications.
4. Kanban, phỏng vấn và caller SDK theo từng đợt review.

Mỗi đợt mới có thay đổi thực tế, test và commit ngày thực tế. Bản đầy đủ trước khi chia đợt được giữ ở nhánh local backup/recruitment-ats-full-2026-10-01. Commit3429b99 không còn ở lịch sử feature/recruitment-ats sau khi thay nhánh; nhánh backup không được push.
