# TV2 — Tích hợp Tuyển ứng viên và Đã nhận việc

Cập nhật **07/10/2026**, evidence **E023/E024**. Đã nhận main lead `764bf37` (hire engine `c914f6f`) bằng merge `74dbd50`. Tính năng đã push trong `67624af8f1ec8ac51909d8da63325170d18b1be1` lên `feature/recruitment-ats`; remote xác nhận SHA khớp. Tài liệu đi cùng đợt công bố; mail chào mừng LIVE/recovery và TV3 Workspace còn REVIEW.

## Cách sử dụng

1. Đăng nhập HR hoặc SUPERADMIN, mở **Quản lý tuyển dụng → Bảng ứng viên**.
2. Chọn hồ sơ **Đang phỏng vấn** hoặc **Đề xuất nhận việc** có vòng mới nhất **Đạt**.
3. Bấm **Tuyển ứng viên → Xác nhận tuyển**. **Hủy tuyển** không đổi dữ liệu.
4. Sau API thành công, hồ sơ chuyển sang **Đã nhận việc**, hiện mã nhân viên và số nhiệm vụ đã tạo; bảng tải lại dữ liệu server.
5. Mở lại hồ sơ hoặc tải lại trang vẫn đọc được trạng thái HIRED và `hiredUserId`.

Kéo hồ sơ INTERVIEWING/OFFERED sang cột Đã nhận việc chỉ mở chi tiết/xác nhận. Chi tiết tải vòng mới nhất rồi mới cho tuyển; thao tác kéo không tự đổi trạng thái. Nút mở hồ sơ dùng được bằng bàn phím. Lượt E023 đã kiểm nút/xác nhận/hủy/tải lại trên trình duyệt; kéo thả sau sửa guard đã build nhưng chưa có evidence browser riêng.

## Luồng backend và trách nhiệm

`POST /api/applications/:id/hire` → `ApplicationsService.hire` → `hireCandidate` theo service mới của lead, được tích hợp với authorization và state machine ATS hiện có.

- Chỉ HR/SUPERADMIN. Manager/Employee không có quyền tuyển; PATCH status chung không cho vượt qua nghiệp vụ Hire.
- Chỉ INTERVIEWING/OFFERED và vòng có round cao nhất PASSED. Backend kiểm lại trong transaction.
- Khóa Application rồi tạo User EMPLOYEE, 5 OnboardingTask và ghi HIRED/hiredUserId trong **một transaction MySQL**. Bất kỳ ghi DB nào lỗi sẽ rollback toàn bộ.
- User nhận phòng ban/chức danh từ Job, tên/email/phone từ hồ sơ. Mật khẩu được sinh bằng randomBytes và lưu bcrypt hash.
- Email đã có User trả409 để HR đối soát. Không gắn nhầm tài khoản, không đổi role hoặc mật khẩu của người đã có.
- Bấm lặp/đồng thời cùng hồ sơ trả lại receipt đã tuyển; giữ một User và một bộ 5 task, không dispatch lại thư.
- Hai hồ sơ khác nhau cùng email: unique email của User giữ một tài khoản; hồ sơ thua trả409, không để lại task/User dở dang.
- Sau DB commit mới gọi `N8nService.triggerEmployeeHired` với userId/contact/job và mật khẩu tạm. ATS response/detail/list không chứa password/hash.

Lead cung cấp mẫu provisioning và 5 task. TV2 nối endpoint/UI, quyền/trạng thái, transaction/dedupe và kiểm thử. TV3 đọc OnboardingTask theo userId trong Workspace; lượt này kiểm dữ liệu bàn giao trong DB, chưa nghiệm thu UI Workspace hoặc phân công quản lý trực tiếp.

## 5 nhiệm vụ theo mẫu của lead

| Mốc ngày | Nhiệm vụ | Category |
| ---: | --- | --- |
| 1 | Nộp hồ sơ nhân sự & Ký hợp đồng lao động | PAPERWORK |
| 2 | Nhận máy tính làm việc & Cài đặt môi trường dự án | EQUIPMENT |
| 3 | Gặp gỡ Quản lý trực tiếp & Phân công Buddy hướng dẫn | MEETING |
| 7 | Hoàn thành khóa học hội nhập văn hóa & An toàn thông tin | TRAINING |
| 30 | Đánh giá tổng kết thử việc 30 ngày cùng Manager | MEETING |

Đây là `dueDay` theo schema hiện tại, chưa phải ngày lịch tuyệt đối. Không tạo thêm task ở workflow n8n; workflow employee-hired hiện dùng payload để gửi thông báo.

## Receipt và giới hạn thư chào mừng

Receipt: `success, alreadyHired, hiredUserId, email, fullName, onboardingTasksCount, welcomeEmailStatus`.

| welcomeEmailStatus | Ý nghĩa |
| --- | --- |
| DISPATCHED_UNVERIFIED | Helper khởi chạy bất đồng bộ; chưa chứng minh webhook, SMTP hoặc Inbox đã nhận |
| FAILED | Helper false/throw; User/task/HIRED đã commit vẫn giữ nguyên |
| NOT_RETRIED | Hồ sơ đã tuyển; không phát lại thông báo hay mật khẩu |

Boolean true của helper lead trả sớm trước khi fetch hoàn tất. Website không báo “đã gửi” dựa trên giá trị này. Trạng thái thư trong receipt chưa được lưu/readback bền; sau reload chỉ biết liên kết nhân viên, không suy ra mail đã gửi.

**Còn REVIEW:** mail LIVE, callback/đối soát và recovery nếu tiến trình chết sau commit hoặc mất thông báo. Chưa có outbox/activation/reset flow trong phạm vi TV2; không tự bấm tuyển lại để gửi mật khẩu lần nữa. Lead cần xử lý luồng cấp truy cập khi thư thất bại. Không coi Q24/M5/E2E hoàn tất chỉ bằng provisioning local.

## Kiểm thử và demo

- Backend build PASS. Frontend TypeScript + Vite production PASS. Lint E023 phạm vi hẹp có2 warning set-state-in-effect ở RecruitmentAdminPage; lượt công bố E024 kiểm cả phân hệ có3 warning có trước, exit0.
- `node scripts/test-tv2-hire.cjs`: **99/99 PASS**. HTTP/MySQL/JWT/password thật; AI/n8n/Google/SMTP dùng stub hoặc workflow fixture, không gọi provider.
- Bộ Hire kiểm quyền, latest-round/state, User/password/tasks/link/persistence/login, duplicate/concurrent, email có sẵn, hai hồ sơ cùng email, rollback khi tạo task lỗi và dispatcher false/throw/replay.
- Auth update của lead đã chặn login thiếu password hoặc role-only trong regression. Điều này không thay cho audit toàn bộ Auth/frontend chung.
- Browser: HR mở Nguyễn Ngọc Mai (synthetic), hủy rồi xác nhận tuyển, UI hiện employee #7/5 task; board HIRED; reload và mở lại vẫn HIRED/user7. Control read-only xác nhận 5 task, 1 dispatch stub.

Runner dùng MySQL9.6 riêng cổng13317, DB/CV tạm và tự dọn, không dùng DB nhóm. Vì đường dẫn repo có ký tự &, Windows có thể lỗi shim npm; có thể chạy trực tiếp:

```powershell
# Root repository
node scripts/test-tv2-hire.cjs
# Frontend
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

Website demo đang chạy tại http://localhost:5173/admin/recruitment → API3005, MySQL13320. AI/n8n là stub; dữ liệu demo không phải nhân sự thật. PID files, logs và ảnh private ở `.temp/hire-integration/`, được Git ignore. Khởi động lại harness tạo database thử nghiệm mới; đây không phải dữ liệu đã triển khai lên server nhóm.

## Theo dõi trước bàn giao

- [x] Nhận main/service Hire mới của lead, giữ ATS/readback local.
- [x] Nối Hire endpoint và UI Tuyển → Đã nhận việc.
- [x] User + 5 task + HIRED atomic; duplicate/concurrent/email collision/rollback có test.
- [x] Build, 99 regression và browser persistence.
- [x] Cập nhật CONTRACTS/PLAN/PROGRESS/DAILY-PUBLISH.
- [ ] Nghiệm thu thư chào mừng LIVE và recovery/cấp lại truy cập với lead.
- [ ] TV3 xác nhận Workspace đọc/cập nhật đúng task của user được tuyển.
- [x] Code đã commit/push67624af theo yêu cầu và xác nhận SHA remote; tài liệu đi cùng đợt.
