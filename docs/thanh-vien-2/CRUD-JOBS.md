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
| GET /api/jobs | Public | Chỉ OPEN; all=false tương thích, all=true trả400 |
| GET /api/jobs/:id | Public | Tin CLOSED hoặc thiếu trả404 |
| GET /api/jobs/admin | HR/SuperAdmin/Manager | Manager chỉ phòng mình |
| GET /api/jobs/admin/:id | HR/SuperAdmin/Manager | Tin nội bộ trong scope |
| POST /api/jobs | HR/SuperAdmin | title, departmentId, description, requirements, location?, salaryRange? |
| PATCH /api/jobs/:id | HR/SuperAdmin | Như create + expectedUpdatedAt ISO |
| PATCH /api/jobs/:id/status | HR/SuperAdmin | status OPEN/CLOSED + expectedUpdatedAt ISO |

Endpoint AI từ starter vẫn là skeleton, chưa nghiệm thu. Đợt này chưa đưa code mới cho CV, AI, Kanban hoặc phỏng vấn. Các page frontend hiện vẫn dùng mock của starter; chưa có nghiệm thu UI dữ liệu thật.

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

## Tiếp theo

1. Nối giao diện quản lý Job với API thật.
2. Careers: tìm kiếm/lọc/phân trang và chi tiết.
3. Nộp CV/Applications.
4. Kanban, phỏng vấn và caller SDK theo từng đợt review.

Mỗi đợt mới có thay đổi thực tế, test và commit ngày thực tế. Bản đầy đủ trước khi chia đợt được giữ ở nhánh local backup/recruitment-ats-full-2026-10-01. Commit3429b99 không còn ở lịch sử feature/recruitment-ats sau khi thay nhánh; nhánh backup không được push.
