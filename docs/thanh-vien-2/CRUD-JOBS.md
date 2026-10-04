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
| GET /api/jobs | Public | Chỉ OPEN; q/phòng/địa điểm; không page trả array, có page+pageSize trả page envelope |
| GET /api/jobs/filters | Public | departments: id/name; locations: chuỗi địa điểm duy nhất từ tin OPEN |
| GET /api/jobs/:id | Public | Tin CLOSED hoặc thiếu trả404 |
| GET /api/jobs/admin | HR/SuperAdmin/Manager | q/phòng/địa điểm/phân trang; Manager chỉ phòng mình |
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

## Đợt 4 - Q02: Lọc tin tuyển dụng theo phòng ban

Ngày công bố: 03/10/2026. Một chức năng: chọn phòng ban trên Careers, kết hợp với tìm tên công việc đã có.

- Select phòng ban lấy từ `GET /api/jobs/filters`, chỉ trả `{ departments: [{ id, name }] }` của phòng có tin OPEN, không lặp phòng và không lộ metadata nội bộ. Phòng hết tin mở biến mất ở lần tải lookup tiếp theo.
- `departmentId` trên `/jobs` và `/jobs/admin` là tham số tùy chọn, chấp nhận chuỗi chữ số biểu diễn số nguyên từ1 đến2147483647. Rỗng, số âm/thập phân, mảng/object và giá trị vượt giới hạn trả400. ID hợp lệ nhưng không có tin phù hợp trả array rỗng.
- Kết hợp phòng ban với q và điều kiện OPEN/quyền nội bộ. Manager yêu cầu phòng khác nhận array rỗng; không thể ghi đè scope bằng query. Response list vẫn là `Job[]`.
- Chọn `Tất cả phòng ban` bỏ riêng bộ lọc phòng; xóa từ khóa giữ phòng đang chọn. Có trạng thái tải/rỗng/lỗi và thử lại riêng cho lookup. Tìm tên công việc vẫn dùng được khi lookup lỗi.
- Giữ debounce250ms, AbortSignal và chặn response cũ; thử lại danh sách giữ cả từ khóa lẫn phòng ban. Chưa đưa bộ lọc địa điểm hoặc phân trang vào đợt này.

### Kiểm tra đợt 4

- Backend build, frontend TypeScript/Vite production build, oxlint hai file frontend thay đổi và `git diff --check`: đạt.
- `node --test test/jobs-crud.test.cjs`: **18/18 PASS** (17 bài con +1 nhóm), JWT/password thật và MySQL9.6.0 local tại13316, datadir tạm riêng; database ngẫu nhiên được dọn sau test. Docker không khởi động được trong lượt này nên dùng bản MySQL cài sẵn; chưa chạy lại Q02 trên MySQL8.0.
- Test mới kiểm kết hợp q/phòng/OPEN, bỏ lọc, ID không có tin, DTO sai, scope Manager, lookup chỉ id/name không trùng và thay đổi khi mở/đóng tin cuối cùng.
- Chromium chạy bản production với API fixture: **8 nhóm PASS**, gồm lookup tải/lỗi/thử lại/rỗng; kết hợp q/phòng/bỏ lọc; giữ phòng khi xóa từ khóa; response trễ; lỗi danh sách/thử lại; link chi tiết đúng ID; desktop1366px/mobile390px không tràn nội dung Careers và không có pageerror. Đã xem ảnh hai kích thước. UI dùng fixture, test backend dùng database thật.

Demo: tạo tin OPEN ở hai phòng, mở Careers, chọn một phòng rồi nhập một phần title. Chọn tất cả phòng để mở rộng kết quả; xóa từ khóa để xem lại tin trong phòng đang chọn. Đóng tin cuối của một phòng, tải lại Careers: phòng đó không còn trong select.

## Đợt 5 - Q03: Lọc tin tuyển dụng theo địa điểm

Ngày công bố: 03/10/2026, thêm một commit theo yêu cầu mới sau Q02 cùng ngày.

- Careers có select `Địa điểm`, dùng danh sách `locations` bổ sung trong `/jobs/filters`. Lookup chỉ lấy địa điểm không rỗng của tin OPEN, loại trùng và sắp xếp theo collation MySQL; giữ nguyên departments. Đóng tin cuối hoặc sửa địa điểm sẽ cập nhật lookup ở lần tải tiếp theo.
- `/jobs` và `/jobs/admin` nhận `location` tùy chọn: trim như API tạo/sửa tin, tối đa150 ký tự; mảng/object hoặc quá dài trả400. Rỗng hoặc chỉ khoảng trắng bỏ lọc địa điểm.
- So khớp toàn bộ địa điểm bằng tham số SQL, theo collation của database; không tìm chuỗi con hay diễn giải `%`/`_` thành wildcard. Kết hợp AND với q, departmentId và điều kiện OPEN/scope Manager. Response list vẫn là `Job[]`.
- Chọn tất cả địa điểm giữ nguyên từ khóa/phòng; bỏ phòng giữ địa điểm; xóa từ khóa giữ cả hai select. Có trạng thái rỗng phù hợp, lookup loading/error/retry dùng chung và thử lại danh sách giữ cả ba điều kiện.
- Giữ AbortSignal/debounce và chặn response cũ khi đổi địa điểm. Chưa thêm phân trang trong đợt này.

### Kiểm tra đợt 5

- Backend build, frontend TypeScript/Vite production build, oxlint hai file frontend thay đổi và `git diff --check`: đạt.
- `node --test test/jobs-crud.test.cjs`: **22/22 PASS** (21 bài con +1 nhóm), MySQL9.6.0 và JWT/password thật, datadir test riêng tại localhost13316. Kiểm cả bộ Q01/Q02 và bốn nhóm mới: kết hợp/bỏ lọc/OPEN, quyền/scope, DTO/ký tự đặc biệt, lookup khi mở/đóng/sửa. Database ngẫu nhiên được dọn sau test. Docker chưa hoạt động; chưa chạy Q03 trên MySQL8.0.
- Chromium production với API fixture: **9 nhóm PASS**; loading/options, cả ba bộ lọc và bỏ từng bộ lọc, rỗng/khôi phục, ký tự đặc biệt, response trễ, retry giữ điều kiện/link đúng ID, lookup lỗi/retry, lookup rỗng, desktop1366px/mobile390px. Không pageerror; đã xem ảnh, nội dung Careers không tràn ngang. Kiểm thử UI dùng fixture, backend dùng database thật; chưa phải E2E trình duyệt với MySQL.

Demo: tạo các tin ở Đà Nẵng và Remote thuộc hai phòng. Chọn địa điểm, phòng và một phần title; bỏ từng điều kiện để xem kết quả mở rộng. Đóng tin cuối ở Remote rồi tải lại Careers: Remote biến mất khỏi select. Thử tắt API và bấm thử lại sau khi bật lại.

## Đợt 6 - Q04: Phân trang Careers có tổng kết quả

Ngày công bố: 04/10/2026. Một chức năng: chia danh sách Careers thành các trang, hiển thị tổng kết quả và giữ tương thích API cũ.

- `GET /api/jobs` và `/jobs/admin` chỉ bật phân trang khi gửi đồng thời `page` và `pageSize`. Khi có phân trang, response là `{ items, total, page, pageSize }`; request cũ không có hai tham số vẫn nhận `Job[]` như Q01-Q03.
- `page` là số nguyên1..100000, `pageSize` là số nguyên1..100. Thiếu một trong hai, mảng/object, số âm/thập phân/ký hiệu hoặc vượt giới hạn trả400. `total` được tính sau q/phòng/địa điểm/quyền, trước khi cắt trang.
- Thứ tự ổn định theo `createdAt DESC, id DESC`; các tin cùng thời điểm không bị lặp hoặc mất giữa trang. Public chỉ OPEN; danh sách nội bộ giữ auth và Manager scope, kể cả khi query yêu cầu phòng khác.
- Careers dùng6 tin/trang, hiển thị tổng vị trí và trang hiện tại. Nút trước/sau disable ở biên; đổi từ khóa, phòng hoặc địa điểm đưa về trang1. Retry giữ trang và các bộ lọc; khi tổng giảm làm trang hiện tại vượt giới hạn, UI tự quay về trang cuối hợp lệ.
- Request trang cũ bị hủy và không thể ghi đè trang/bộ lọc mới. Link chi tiết tiếp tục dùng ID thật. Chưa triển khai trang quản trị tuyển dụng hoặc form ứng tuyển trong đợt này.

### Kiểm tra đợt 6

- Backend build, frontend TypeScript/Vite production build, oxlint hai file frontend thay đổi và `git diff --check`: đạt.
- `node --test test/jobs-crud.test.cjs`: **27/27 PASS** (26 bài con +1 nhóm), MySQL9.6.0 và JWT/password thật, database ngẫu nhiên tại localhost13316. Năm nhóm mới kiểm array tương thích/page envelope, tổng sau lọc và trang ổn định, auth/Manager scope, DTO sai/giới hạn, đóng tin làm giảm tổng/trang cuối. Server và datadir test được dọn sau lượt chạy. Docker chưa hoạt động; chưa chạy Q04 trên MySQL8.0.
- Chromium production với API fixture: **6 nhóm PASS**: trang đầu/biên, trước-sau và trang cuối; reset trang khi lọc; response trang cũ; lỗi/retry và tổng giảm; desktop1366px/mobile390px. Không pageerror; đã xem ảnh, nội dung Careers và điều khiển phân trang không tràn ngang. Thanh menu dùng chung vẫn có giới hạn mobile đã ghi từ đợt2. UI dùng fixture; backend test dùng database thật, chưa phải browser E2E với MySQL.

Demo: tạo hơn6 tin OPEN, mở Careers và chuyển trang; kết hợp q/phòng/địa điểm để xem tổng thay đổi và tự về trang1. Đóng các tin ở trang cuối rồi thử lại: giao diện quay về trang hợp lệ. Gọi `/api/jobs` không page để kiểm response vẫn là array.

## Tiếp theo

1. Nối giao diện quản lý Job với API thật.
2. Careers Q01-Q04 đã có tìm kiếm, hai bộ lọc và phân trang; tiếp theo nối đăng nhập thật cho phân hệ tuyển dụng (Q05).
3. Nộp CV/Applications.
4. Kanban, phỏng vấn và caller SDK theo từng đợt review.

Mỗi đợt mới có thay đổi thực tế, test và commit ngày thực tế. Bản đầy đủ trước khi chia đợt được giữ ở nhánh local backup/recruitment-ats-full-2026-10-01. Commit3429b99 không còn ở lịch sử feature/recruitment-ats sau khi thay nhánh; nhánh backup không được push.
