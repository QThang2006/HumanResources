# Tiến độ Thành viên 2 — Tuyển dụng ATS và phỏng vấn

Phiên bản **2.13**, cập nhật **07/10/2026**. Toàn bộ code TV2 hiện có đã **push lên `feature/recruitment-ats` tại `67624af`**, SHA remote đã xác nhận (E024). Bao gồm readback phỏng vấn và Hire tích hợp service lead; main `764bf37` đã nhận qua merge `74dbd50`. Seed E021 `27fbd3f` và lịch/danh sách E022 `1b841ea` cũng đã công bố. Lịch sử: [DAILY-PUBLISH.md](DAILY-PUBLISH.md).
Kế hoạch hiện hành: [PLAN.md](PLAN.md). Lịch sử: [PROGRESS 30/09](archive/PROGRESS-2026-09-30.md).

Mới nhất E024: chạy lại **99/99 regression PASS**, backend/frontend build PASS, calendar-date1/1 PASS; lint phân hệ exit0 còn3 warning. Code đã push `67624af`. E023 kiểm HTTP/MySQL/JWT thật, provider stub; User + 5 task + HIRED atomic, duplicate/concurrent/email collision/rollback/dispatch failure đã kiểm. Browser xác nhận tuyển/hủy và reload giữ HIRED/userId. Auth mới của lead chặn thiếu password/role-only trong regression; chưa coi toàn bộ Auth/frontend/log đã audit. Mail chào mừng LIVE/recovery và Workspace TV3 còn REVIEW. Chi tiết: [HIRE-INTEGRATION.md](HIRE-INTEGRATION.md).

Audit lịch sử E020: 74/74 regression, thêm27 assertion API và12 tình huống workflow fixture; PDF/ATS/Manager/Meet readback đạt. Strict Gemini mới nhất fail503/429/MOCK; chưa gọi lại provider trong E023. Lỗi login không password E020 đã được lead sửa và kiểm lại E023. Báo cáo: [REMAINING-TESTS.md](REMAINING-TESTS.md).

Lịch sử runtime07/10: E017/E018 kiểm Calendar/Meet/Gmail và website thật. E019 bổ sung claim/callback có xác thực theo vòng và trạng thái bền: website tự hiện link Meet/SMTP_ACCEPTED, reload giữ đúng; Gmail Inbox/time/link đã kiểm, regression73/73 đạt. Tại E019 code còn local và Hire chưa tích hợp; **E024 đã công bố cả readback/Hire**. Q23 vẫn còn recovery sau crash/mất callback và lead review. Trạng thái Gemini mới nhất xem E020; không gọi lại provider trong E024. Chi tiết: [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md).

## 1. Trạng thái hiện tại

Đã triển khai phần nghiệp vụ TV2 và kiểm thử trên MySQL thật, gồm readback Meet/trạng thái SMTP và Hire/User/5 task. **Chưa hoàn tất toàn bộ vai trò:** ổn định Gemini LIVE, recovery lịch/thư chào mừng và nghiệm thu bàn giao Workspace còn mở.

- Tổng **60** đầu việc: **43 DONE**, **15 REVIEW**, **2 BLOCKED**. Không dùng tỷ lệ task để suy ra phần trăm code.
- Bản tích hợp hiện hành: `HumanResources`, nhánh `feature/recruitment-ats`, code `67624af` đã push và xác nhận remote; gồm main764bf37/merge74dbd50. Tài liệu E024 đi cùng đợt công bố; SHA tài liệu tra trong lịch sử nhánh. Bản nguồn `HumanResources-full`/`local/recruitment-complete` tại3b6fa7f giữ local, chưa đồng bộ core mới; backup3429b99 giữ nguyên. Chưa mở PR.
- Đợt07/10 E009: **64/64 PASS** = Jobs27 + recruitment37; **10 nhóm browser PASS** với API/MySQL9.6/JWT/password thật; AI/n8n contract stub và SDK lead fallback thật. Build/TypeScript/Vite đạt; lint exit0 còn5 warning. Kết quả Q01–Q04/E005–E008 bên dưới là lịch sử.
- Lịch sử bản full02/10: **34/34 PASS** (32 bài kiểm tra con + 2 nhóm); MySQL thật, AI/n8n contract stub, chạy lại ngày02/10.
- Lịch sử browser02/10: **10 nhóm smoke PASS**, desktop 1440px, mobile 375/390px, tablet 768px, chạy lại ngày02/10.
- Build backend/TypeScript frontend/Vite production E024: PASS. Lint phạm vi phân hệ exit0, 3 warning; kết quả6 warning ở RUNBOOK là lịch sử với phạm vi kiểm khác.
- Xem [hướng dẫn chạy/demo/test](RUNBOOK.md), [API/SDK contract](CONTRACTS.md), evidence E002/E003.
- Implementation TV2 nhận core/entities/auth/Workspace/package/lockfile từ main764bf37 qua merge74dbd50; Applications tích hợp Hire lead với quyền/state/readback ATS. Navbar sửa một class để hết tràn ngang mobile.

## 2. Quy tắc đánh dấu

- TODO: chưa bắt đầu; DOING: đang làm; BLOCKED: không tiếp tục được vì dependency; REVIEW: chờ kiểm; DONE: đạt acceptance và có evidence.
- Chỉ DONE đổi `- [ ]` thành `- [x]`; REVIEW/BLOCKED không tích.
- Khi xong thêm commit/PR, evidence ID, ngày/reviewer. Evidence ghi rõ stub/live và giới hạn.
- Các mã V2- thay thế checklist v1; công việc core từng có trong v1 đã chuyển owner, không được tính là TV2 hoàn thành.
- Mock/stub không là bằng chứng provider AI/mail/Meet LIVE. User/5 task E023 là ghi DB thật qua nghiệp vụ Hire; dispatcher thư dùng stub.
- Cập nhật PLAN và PROGRESS cùng lúc khi đổi scope; không xóa task khó để tăng tỷ lệ.
- Số task không phản ánh tỷ trọng công sức. Task khảo sát 1/60 không có nghĩa đã code 1/60.

## 3. Tổng quan phase

| Phase | Nội dung | Tổng | Xong | Trạng thái |
| --- | --- | ---: | ---: | --- |
| P00 | Phạm vi và contract | 5 | 2 | Hire đã nhận; ownership/recovery chờ review |
| P01 | Môi trường và test nền | 5 | 4 | Chờ review phần còn lại |
| P02 | API Jobs | 5 | 5 | DONE |
| P03 | Careers và form ứng tuyển | 5 | 5 | DONE |
| P04 | CV và Application | 5 | 5 | DONE |
| P05 | Tích hợp Gemini SDK | 5 | 3 | SDK và fallback đã nối; còn nghiệm thu LIVE |
| P06 | Bàn HR và Kanban | 5 | 4 | Chờ review phần còn lại |
| P07 | Phỏng vấn Manager | 5 | 5 | DONE |
| P08 | Xếp lịch và n8n | 5 | 3 | Readback LIVE đạt; UI/recovery và vận hành chờ review |
| P09 | Hire và bàn giao | 5 | 3 | DB/UI đạt; mail/recovery/TV3 còn REVIEW |
| P10 | Kiểm thử và hoàn thiện | 5 | 2 | Chờ review phần còn lại |
| P11 | Demo và bàn giao cuối | 5 | 2 | Có dependency còn BLOCKED |

## 4. Mốc nghiệm thu

| Mốc | Điều kiện | Trạng thái | Evidence |
| --- | --- | --- | --- |
| M1 | Jobs/Careers/Apply dữ liệu thật | PASS local/test DB | E002/E003 |
| M2 | 3 Gemini SDK tích hợp, mode/lỗi rõ | Từng method có LIVE riêng; strict lượt mới nhất fail503/429, chưa nghiệm thu vận hành | E009/E011/E020 |
| M3 | Board ba cột và Manager result | PASS local/test DB | E002/E003 |
| M4 | Lịch/email/Meet thật | PASS local LIVE gồm callback lưu về ATS; REVIEW vận hành/recovery sau crash/lỗi provider thật | E017/E018/E019 |
| M5 | Hire/User/5 task/handoff | DB/UI PASS; mail chào mừng LIVE/recovery/Workspace còn REVIEW | E023 |
| M6 | Test/demo/bàn giao | REVIEW; chưa đóng vì live integrations thiếu | E002/E003 |

## 5. Checklist

### P00 — Phạm vi và contract

Acceptance và gate: [PLAN P00](PLAN.md#p00).

- [x] V2-P00.01 — Ghi nhận baseline và phân công mới | DONE | Evidence: E001 | 01/10/2026
- [ ] V2-P00.02 — Chốt ownership và vùng file | REVIEW | Evidence: E002/E003 | Đã ghi boundary trong CONTRACTS; chờ nhóm review
- [ ] V2-P00.03 — Chốt SDK Gemini và fallback | REVIEW | Evidence: E009 | Đã nối SDK lead aiGenerated và kiểm fallback; còn lead review semantics/provider live
- [ ] V2-P00.04 — Chốt schedule và provisioning | REVIEW | Evidence: E019/E023 | Hire contract đã nhận và tích hợp; recovery lịch/thư và vận hành còn review
- [x] V2-P00.05 — Chốt MVP, nhánh và thứ tự PR | DONE | Evidence: E002/E003 | Nhánh bàn giao feature/recruitment-ats; chưa mở PR

### P01 — Môi trường và test nền

Acceptance và gate: [PLAN P01](PLAN.md#p01).

- [x] V2-P01.01 — Toolchain và môi trường local | DONE | Evidence: E002/E003
- [ ] V2-P01.02 — Nhận Auth và seed hợp lệ | REVIEW | Evidence: E021/E023 | Seed TV2 đã push; Auth lead chặn thiếu password/role-only; còn review Auth/frontend chung
- [x] V2-P01.03 — Fixture tuyển dụng | DONE | Evidence: E002/E003
- [x] V2-P01.04 — CV và SDK fixtures | DONE | Evidence: E002/E003
- [x] V2-P01.05 — Test harness và command | DONE | Evidence: E002/E003

### P02 — API Jobs

Acceptance và gate: [PLAN P02](PLAN.md#p02).

- [x] V2-P02.01 — Tách public và admin | DONE | Evidence: E002/E003
- [x] V2-P02.02 — DTO và tạo tin | DONE | Evidence: E002/E003
- [x] V2-P02.03 — Sửa và đóng mở tin | DONE | Evidence: E002/E003
- [x] V2-P02.04 — Search, filter, paging và lookup | DONE | Evidence: E002/E003
- [x] V2-P02.05 — Nghiệm thu Jobs API | DONE | Evidence: E002/E003

### P03 — Careers và form ứng tuyển

Acceptance và gate: [PLAN P03](PLAN.md#p03).

- [x] V2-P03.01 — Nối Careers và filters | DONE | Evidence: E002/E003
- [x] V2-P03.02 — Chi tiết đúng job id | DONE | Evidence: E002/E003
- [x] V2-P03.03 — Form contact và CV | DONE | Evidence: E002/E003
- [x] V2-P03.04 — Submit thật và biên nhận | DONE | Evidence: E002/E003
- [x] V2-P03.05 — Responsive và component tests | DONE | Evidence: E002/E003

### P04 — CV và Application

Acceptance và gate: [PLAN P04](PLAN.md#p04).

- [x] V2-P04.01 — Validate đơn và job OPEN | DONE | Evidence: E002/E003
- [x] V2-P04.02 — Upload/link và đọc text giới hạn | DONE | Evidence: E002/E003
- [x] V2-P04.03 — Persistence và chống trùng | DONE | Evidence: E002/E003
- [x] V2-P04.04 — List/detail/download có quyền | DONE | Evidence: E002/E003
- [x] V2-P04.05 — Nghiệm thu M1 | DONE | Evidence: E002/E003

### P05 — Tích hợp Gemini SDK

Acceptance và gate: [PLAN P05](PLAN.md#p05).

- [x] V2-P05.01 — Nhận ba SDK và kiểm contract | DONE | Evidence: E009 | main9733233, adapter aiGenerated/arrays/question objects; fallback thật và validation đạt; không coi đây là nghiệm thu LIVE
- [ ] V2-P05.02 — JD endpoint và modal | REVIEW | Evidence: E002/E003/E020 | JD endpoint LIVE qua HTTP; UI draft/edit/save đạt với MOCK; chưa có UI draft LIVE mới
- [x] V2-P05.03 — Score caller, lưu kết quả và retry | DONE | Evidence: E002/E003
- [x] V2-P05.04 — Questions caller và Interview snapshot | DONE | Evidence: E002/E003
- [ ] V2-P05.05 — Nghiệm thu M2 và lỗi SDK | BLOCKED | Evidence: E011/E020 | B01: cả3 method từng LIVE riêng; strict mới nhất fail503/429, chưa ổn định

### P06 — Bàn HR và Kanban

Acceptance và gate: [PLAN P06](PLAN.md#p06).

- [x] V2-P06.01 — Tách component và nối sidebar | DONE | Evidence: E002/E003
- [x] V2-P06.02 — Ba cột, paging và trạng thái phụ | DONE | Evidence: E002/E003
- [x] V2-P06.03 — Drawer CV và AI | DONE | Evidence: E002/E003
- [x] V2-P06.04 — Transition UI và concurrency | DONE | Evidence: E002/E003
- [ ] V2-P06.05 — JobEditor và nghiệm thu HR | REVIEW | Evidence: E002/E003 | CRUD Jobs đã browser test; JD AI live chờ B01

### P07 — Phỏng vấn Manager

Acceptance và gate: [PLAN P07](PLAN.md#p07).

- [x] V2-P07.01 — Scope và danh sách phỏng vấn | DONE | Evidence: E002/E003
- [x] V2-P07.02 — Form điểm và câu hỏi | DONE | Evidence: E002/E003
- [x] V2-P07.03 — API ghi result thật | DONE | Evidence: E002/E003
- [x] V2-P07.04 — HR nhận kết quả và Hire condition | DONE | Evidence: E002/E003
- [x] V2-P07.05 — Nghiệm thu M3 | DONE | Evidence: E002/E003

### P08 — Xếp lịch và n8n

Acceptance và gate: [PLAN P08](PLAN.md#p08).

- [x] V2-P08.01 — Validate và lưu Interview | DONE | Evidence: E002/E003/E018 | Website lưu và reload đúng; replay giữ1 vòng, Manager khác phòng403
- [x] V2-P08.02 — Caller triggerInterviewScheduled | DONE | Evidence: E002/E003/E018 | N8nService thật gọi đúng1 lần, workflow test hoàn tất
- [x] V2-P08.03 — Readback và lưu kết quả | DONE | Evidence: E019 | Token hash theo vòng, claim/callback có auth và dedupe; Meet/eventId/SMTP persist, reload đúng
- [ ] V2-P08.04 — UI trạng thái và retry | REVIEW | Evidence: E019 | Poll/link/status đúng; callback replay/retry có contract, UNKNOWN không resend; còn recovery sau crash/mất callback
- [ ] V2-P08.05 — Nghiệm thu M4 | REVIEW | Evidence: E019 | Website→DB→n8n→mail/Meet→ATS LIVE đạt; còn lead review vận hành và lỗi provider thật

### P09 — Hire và bàn giao

Acceptance và gate: [PLAN P09](PLAN.md#p09).

- [x] V2-P09.01 — Nhận contract Hire hoàn chỉnh | DONE | Evidence: E023 | Lead main764bf37 có hireCandidate tạo User/password/5 task; timing/email collision rõ; phần recovery theo P09.04
- [x] V2-P09.02 — Validate và chuẩn bị action ATS | DONE | Evidence: E023 | HR/Admin, INTERVIEWING/OFFERED/latest PASSED; email có User409; không password/hash trong receipt
- [x] V2-P09.03 — Caller và cập nhật trạng thái | DONE | Evidence: E023 | User + 5 task + HIRED atomic; UI xác nhận/refetch, board và reload giữ đúng
- [ ] V2-P09.04 — Idempotency và khôi phục lỗi | REVIEW | Evidence: E023 | Duplicate/concurrent/DB rollback/dispatch failure PASS; còn mail LIVE/outbox/cấp lại truy cập
- [ ] V2-P09.05 — HireModal, handoff TV3 và M5 | REVIEW | Evidence: E023 | UI Hire và dữ liệu 5 task/userId đạt; còn TV3 Workspace/mail LIVE/recovery

### P10 — Kiểm thử và hoàn thiện

Acceptance và gate: [PLAN P10](PLAN.md#p10).

- [x] V2-P10.01 — Unit, contract và DB integration | DONE | Evidence: E002/E003
- [ ] V2-P10.02 — Quyền và dữ liệu nhạy cảm | REVIEW | Evidence: E020/E023 | Domain role/scope/CV đạt; Auth lead đã chặn thiếu password/role-only; log/filter/frontend chung cần review
- [ ] V2-P10.03 — Lỗi SDK và automation | REVIEW | Evidence: E019 | SDK/lỗi automation/auth/partial email đạt bằng fixture; happy path readback LIVE đạt; chưa outage/recovery provider thật
- [x] V2-P10.04 — UI, hiệu năng và runtime smoke | DONE | Evidence: E002/E003
- [ ] V2-P10.05 — Review và kiểm tra diff | REVIEW | Evidence: E002/E003 | Diff local đã kiểm; chờ lead review, chưa PR

### P11 — Demo và bàn giao cuối

Acceptance và gate: [PLAN P11](PLAN.md#p11).

- [x] V2-P11.01 — Hướng dẫn chạy phân hệ | DONE | Evidence: E002/E003
- [x] V2-P11.02 — Contract và tài liệu cuối | DONE | Evidence: E002/E003
- [ ] V2-P11.03 — Demo chính và lỗi | REVIEW | Evidence: E019/E023 | Meet/readback LIVE trước đó; Hire/user/5 task/UI đạt DB test, còn strict AI/mail chào mừng/recovery/TV3
- [ ] V2-P11.04 — Chứng cứ đóng góp và handoff | REVIEW | Evidence: E024 | Toàn bộ code TV2 hiện có đã push67624af, tài liệu/evidence đi cùng đợt; còn lead review/TV3 handoff, chưa PR
- [ ] V2-P11.05 — Đóng tracker và M6 | BLOCKED | Evidence: E002/E003 | Không đóng M6 khi B01/B02/B03 còn mở

## 6. Dependency và bàn giao

Owner theo phân công mới; đã nhận main764bf37 của lead, nối Hire/adapter và kiểm regression E023. Chưa liên hệ lead hoặc tự gửi tin nhắn.

| ID | Cần nhận | Owner | Trạng thái thực tế | Ảnh hưởng |
| --- | --- | --- | --- | --- |
| DEP01 | Auth thật, seed và Department.code hợp lệ | Lead | JWT/password thật, seed TV2 và chặn login thiếu password đã test; Auth/frontend chung còn review | P01 và E2E |
| DEP02 | generateJobDescription, scoreResume, generateInterviewQuestions | Lead | Đã nhận từ main9733233, consumer/fallback đạt E009 | P05: còn nghiệm thu live |
| DEP03 | Output schema, LIVE/MOCK, lỗi/timeout/retry | Lead + TV2 | Adapter hỗ trợ aiGenerated theo main9733233; contract + actual fallback đạt; chưa provider live | P05/P08/P09 |
| DEP04 | Kết quả schedule thật/accepted-completed và workflow | Lead + TV2 | E019 callback auth/claim/persist và Meet/SMTP/Inbox đã LIVE; helper boolean vẫn không là provider result; recovery còn thiếu | P08 |
| DEP05 | Nguồn userId, owner User, password/5 task, partial failure | Lead | Đã nhận hireCandidate main764bf37, TV2 tích hợp transaction/dedupe/UI; E02399test | P09: recovery/mail còn review |
| DEP06 | Schema thiếu status/mode/version và stream/error contract | Lead | Dùng expectedUpdatedAt tăng tối thiểu1s, MOCK preview-only; chưa sửa entities/core | P04/P05/P08/P09 |
| DEP07 | Manager kỹ thuật recruitment | TV2 | Theo phân công mới; comment cũ không còn là căn cứ giao TV3 | P07 |
| DEP08 | Handoff user/5 task cho Workspace | Lead + TV3 + TV2 | DB User/5 task/userId đã có E023; TV3 UI và mail LIVE chưa nghiệm thu | P09 REVIEW |

## 7. Decision log

Ownership ghi trong PLAN; các lựa chọn phía TV2 đã triển khai bên dưới chưa đồng nghĩa lead đã đồng ý SDK contract.

| ID | Quyết định | Trạng thái | Người chốt/ngày | Kết quả |
| --- | --- | --- | --- | --- |
| D01 | Shape 3 SDK và trường lưu | INTEGRATED | TV2 07/10 | CONTRACTS: SDK lead aiGenerated được chuẩn hóa mode/data; fallback thật đạt, live chưa kiểm |
| D02 | LIVE/MOCK/unavailable | CONSUMER IMPLEMENTED | TV2 01/10 | MOCK score/questions preview-only; missing503 |
| D03 | Timeout/retry/rate limit | LOCAL IMPLEMENTED | TV2 01/10 | AI45s; parse10s; submit10/phút/IP; không tự retry |
| D04 | Score sync/async, trạng thái bền | LOCAL IMPLEMENTED | TV2 01/10 | Score sync, khóa trong process + revision; chưa queue bền |
| D05 | Upload/link và nguồn text | IMPLEMENTED | TV2 01/10 | Multipart PDF; không nhận URL/fake text; scan xem tay |
| D06 | Schedule callback/poll/readback | REVIEW | Lead + TV2 | E019 claim/callback/poll/persist LIVE đã có; còn đối soát/recovery sau crash/mất callback |
| D07 | Ai tạo User/source userId | INTEGRATED LOCAL | Lead + TV2 07/10 | hireCandidate lead tạo User; receipt dùng ID DB |
| D08 | HIRED/provisioning timing và partial | INTEGRATED LOCAL | Lead + TV2 07/10 | User/5task/HIRED một transaction; dispatch sau commit |
| D09 | Idempotency/retry password/task/mail | REVIEW | Lead + TV2 | DB dedupe/rollback PASS; mail LIVE/recovery còn thiếu |
| D10 | Ba cột/OFFERED/REJECTED/Hire | LOCAL IMPLEMENTED | TV2 07/10 | HIRED/userId/UI đã có E023; kéo mở detail, không bypass |
| D11 | Manager scope/result edits | IMPLEMENTED | TV2 01/10 | Manager đọc theo phòng, ghi theo assignment + CAS |
| D12 | Schema/status/version nền | REVIEW | Lead | Dùng schema cũ; điểm lịch sử không có version/mode bền |
| D13 | Auth/seed/domain boundary/test config | LOCAL IMPLEMENTED | TV2 01/10 | Test DB ngẫu nhiên, real JWT, gate riêng recruitment |
| D14 | Access user mới/email existing | INTEGRATED LOCAL | Lead + TV2 07/10 | Email existing409, không đổi role/password; user mới bcrypt, login test PASS; delivery recovery REVIEW |

## 8. Blockers và rủi ro

| Blocker | Task | Bằng chứng | Cần ai | Có thể làm tiếp |
| --- | --- | --- | --- | --- |
| B01 | V2-P05.05 / M2 | E011/E020: từng method đã LIVE; strict mới nhất JD LIVE, score/questions MOCK do503/429 | Lead + TV2 kiểm quota/công suất/model và review | Dừng retry429; nghiệm thu lại khi provider đủ công suất |
| B02 (REVIEW) | V2-P09.04/05 | E023: contract/User/5 task/HIRED/UI đã có; welcome-mail recovery/Workspace chưa nghiệm thu | Lead + TV2 + TV3 | Không còn chặn DB/caller; mail LIVE/đối soát/cấp truy cập và TV3 review |
| B03 | V2-P08.04/05 | Callback/poll/persist/claim dedupe đã có; còn recovery khi crash/mất callback/outcome mơ hồ | Lead review contract và cơ chế đối soát/recovery | E019 LIVE lưu Meet/SMTP về ATS, reload/Inbox đạt; chưa outbox/queue/resend an toàn |

| Risk | Nội dung | Hướng xử lý |
| --- | --- | --- |
| R01 | Có SDK nhưng chưa chứng minh provider live; Auth nền còn demo | Kiểm evidence, không tin câu 100% thay runtime |
| R02 | Mock đẹp UI bị hiểu nhầm AI/Meet/Hire live | Metadata/mode badge, evidence riêng |
| R03 | TV2 làm trùng AI/n8n/schema với lead theo plan cũ | Dùng plan v2, archive v1, owner rõ |
| R04 | Hire tạo user/task hai lần hoặc thiếu một phần | Chốt nguồn User, idempotency, status/recovery |
| R05 | Comment cũ gán Manager phỏng vấn cho TV3 | Theo phân công mới TV2 recruitment, TV3 Team Mood |
| R06 | Thời gian chờ SDK ảnh hưởng lịch | M1/Board/Manager trước, ghi blocker cho tích hợp |

## 9. Kiểm thử chức năng

Trạng thái NOT_RUN/PASS/PARTIAL/FAIL/BLOCKED, ghi stub/live trong evidence. Các hàng test không cộng thêm vào tổng task.

| Test ID | Tình huống | Điều kiện đạt | Trạng thái | Evidence |
| --- | --- | --- | --- | --- |
| V2-T-JOB-01 | CRUD OPEN/CLOSED | API/DB/public UI khớp | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-JOB-02 | Public all=true/id closed | Không lộ tin nội bộ | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-JOB-03 | Search/filter/page | items/total/scope đúng | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-JOB-04 | DTO giả/department sai | Reject, không mass assignment | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-APP-01 | PDF/contact hợp lệ | Một hồ sơ/file thật/receipt tối thiểu | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-APP-02 | Fake/hỏng/lớn/scan PDF | Reject hoặc xem tay đúng policy | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-APP-03 | Email/job trùng, concurrent | Unique giữ một hồ sơ | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-APP-04 | Job close race/DB lỗi | State/cleanup đúng | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-APP-05 | CV link/SSRF | Không fetch URL tùy ý/fake text | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-APP-06 | CV/detail trái quyền | Chặn, không lộ file/path | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-SDK-01 | Ba Gemini method có thật | Signature/source/contract đạt | PASS | E009, main9733233; provider live kiểm riêng |
| V2-T-SDK-02 | JD schema/timeout | Draft đúng hoặc lỗi rõ | PASS | E009: schema/timeout, preview UI và actual fallback; chưa provider live |
| V2-T-SDK-03 | Score null/NaN/range/mock | Không điểm giả, mode rõ | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-SDK-04 | Questions 3–5/tiêu chí | Lưu đúng Interview | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-SDK-05 | Duplicate/response cũ | Không overwrite sai/retry chồng | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-SDK-06 | Live/fallback | Evidence riêng, không giả live | PARTIAL | E011 score/questions LIVE; E020 JD LIVE; strict mới nhất false do503/429/MOCK; không ghép thành một lượt E2E LIVE |
| V2-T-ATS-01 | Chọn job/ba cột | OFFERED/REJECTED không mất | PASS local | E023: Hire DB thật → HIRED, board/reload đúng; provider stub |
| V2-T-ATS-02 | Nhiều page/counts | Không chỉ tính page đầu | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-ATS-03 | Drag cancel/error | Action/rollback đúng | PASS local | E004: kéo APPLIED mở lịch; hủy không lưu, lỗi lookup retry; kéo HIRED không bypass, Manager không kéo được |
| V2-T-ATS-04 | PATCH bypass Hire/schedule | Backend chặn | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-MGR-01 | Ngoài phòng/không assigned | Không đọc/ghi vượt quyền | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-MGR-02 | Score/feedback/result sai | Validation/persistence đúng | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-MGR-03 | Terminal/concurrent result | Theo contract, không mất âm thầm | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-MGR-04 | HR đọc vòng mới nhất | Hire condition đúng | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-INT-01 | Past time/timezone/interviewer sai | Validation/UTC-VN đúng | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-INT-02 | Schedule lặp | Không thêm lịch/request logic | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-INT-03 | Accepted/false/mock | Chưa báo completed | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-INT-04 | Workflow live/readback | Meet/mail thật đúng hồ sơ | PASS | E019: callback persist/link/status, website reload và Gmail Inbox/time/href LIVE |
| V2-T-INT-05 | Retry/timeout/callback lặp | Dedupe/đối soát đúng contract | PARTIAL | E019: claim/callback concurrent/replay/auth/expiry/UNKNOWN bằng HTTP/MySQL fixture; còn recovery/outage provider thật |
| V2-T-HIRE-01 | Nguồn User/userId | Một owner tạo, không id giả | PASS local | E023 HTTP/MySQL thật, service lead/ATS transaction |
| V2-T-HIRE-02 | Hire live | User/access/5 task/link đúng | PARTIAL | E023 DB/password/login/5task/UI PASS; welcome-mail/Workspace LIVE chưa kiểm |
| V2-T-HIRE-03 | Double/concurrent/timeout | Không user/task/mail trùng | PARTIAL | E023 duplicate/concurrent giữ1User/5task/1stub dispatch; timeout/crash delivery recovery chưa có |
| V2-T-HIRE-04 | Email có user | Không chiếm user/đổi role/password | PASS local | E023409/no rebind/no hash-role change; race2apps1email đạt |
| V2-T-HIRE-05 | Partial/mock | Status/recovery đúng contract | PARTIAL | E023 DB rollback/dispatch false-throw/replay PASS; mail LIVE/recovery REVIEW |
| V2-T-SEC-01 | No token/Employee/Manager khác phòng | Backend chặn API nhạy cảm | PASS tested API | E023 domain guards và Auth lead chặn thiếu password/role-only; không phải audit toàn hệ thống |
| V2-T-SEC-02 | Response/log/file | Không secret/hash/path/CV public | PARTIAL | E002: DTO/file đạt; shared log/filter cần lead |
| V2-T-UI-01 | Mobile/phím/loading/error | Dùng được, không success giả | PASS | E002/E003; stub/live scope xem RUNBOOK |
| V2-T-UI-02 | Response cũ/form mới | Không ghi đè state mới | PARTIAL | AbortController + reset có code; chưa test toàn bộ race UI |
| V2-T-OPS-01 | Cài/run/build/test từ hướng dẫn | Tái lập, thiếu nền báo đúng | PASS | E002/E003; stub/live scope xem RUNBOOK |

## 10. Evidence và nhật ký

### E001 — Đồng bộ và khảo sát ngày 01/10/2026

- Git fetch origin thành công, fast-forward main từ 0734659 lên c37a5e4, commit `full base`.
- Diff upstream: thêm báo cáo phân công mới, bỏ bảng phân công cũ; không source/package/lockfile thay đổi.
- Đã đọc nội dung Word user gửi và Markdown mới trong repo, đối chiếu các điểm khác nhau như fallback.
- Kiểm tra GeminiService: có generateJson/generateText/isAvailable; chưa có generateJobDescription/scoreResume/generateInterviewQuestions/chatCopilot.
- Kiểm N8nService: schedule/hire helpers có; fetch không await và return true sớm; hire payload cần userId.
- Kiểm AuthContext: mock_jwt_token và mặc định mock HR còn tồn tại.
- Chỉ nghiệm thu task khảo sát V2-P00.01; không chứng minh API/DB/SDK/workflow chạy thật. Không chạy lại build/test ứng dụng vì upstream chỉ đổi tài liệu.
- Archive v1 trước cập nhật v2. Kiểm tra mã task/test và liên kết giữa hai file tài liệu; chưa code chức năng, commit/push hoặc gửi tin cho lead.

| Ngày | Công việc | Kết quả | Tiếp theo |
| --- | --- | --- | --- |
| 30/09/2026 | Chuẩn bị plan v1 | 104 task theo giả định phân công cũ, chưa code | Được thay thế và archive |
| 01/10/2026 | Git + tài liệu phân công mới | c37a5e4, plan v2, E001, B01/B02 | Chốt ownership/SDK, môi trường và Jobs độc lập |


### E002 — Triển khai và kiểm thử backend ngày 01/10/2026

- Branch feature/recruitment-ats; source Jobs/Applications đầy đủ như RUNBOOK/CONTRACTS.
- Node24.14.1, MySQL8.0 container test local cổng13316; mỗi run database random, dọn sau test; không sửa DB nhóm.
- Native bcrypt đã cài binary theo dependency hiện có; login bằng email/password và JWT thật trong harness.
- Lệnh build backend và `node --test test/recruitment.test.cjs`: 33/33 PASS (31 bài con + 2 nhóm).
- Kiểm quyền/scope, public closed, DTO/mass assignment, PDF Việt/Anh/scan/fake/corrupt/oversize, unique concurrent, CV download, submit/close race, rollback cleanup, status bypass, score mock/live-envelope/stale/timeout, questions stale, schedule dedupe/n8n false, Manager assignment/concurrent result, Hire503 không side effect.
- 100 jobs/500 hồ sơ fixture: tổng và page cuối đúng; hai list HTTP request tổng19ms một lần đo local, không phải benchmark production.
- Đã sửa lỗi bắt được trong test: multipart parts limit; pdf.js cũ cần Uint8Array semantics; stale AI/questions, department transfer khi có hồ sơ.
- AI và n8n dùng contract stub trong test; chưa gọi provider/workflow thật. Không xem envelope LIVE stub là Gemini live.

### E003 — Frontend và browser ngày 01/10/2026

- Careers, JobDetail, RecruitmentAdmin lấy API thật; domain API/types/components mới; façade API cũ cập nhật shape.
- `tsc -b` và `vite build` PASS. Oxlint exit0 với6 warning mô tả ở RUNBOOK; không lint error.
- `node test/recruitment.browser.cjs`: 6 nhóm smoke PASS. Real HR login/CRUD tin; mobile Careers/PDF/receipt; tải CV riêng tư; lịch UTC+7; Manager lưu result; HR OFFERED; cancel từ chối; Hire tắt; tablet lỗi503/retry/empty/404. Không pageerror.
- Viewports1440/375/390/768. Đã sửa label association và Navbar flex-wrap gây overflow; đã đọc ảnh kiểm tra bố cục.
- Artifact: [ATS desktop](evidence/ats-desktop.png), [Careers mobile](evidence/careers-mobile.png), [Manager mobile](evidence/manager-mobile.png).
- Giới hạn: chưa có full UI race matrix, chưa Gemini/Meet/Hire live; các dòng PARTIAL/BLOCKED còn mở.
- Chưa commit/push/PR, chưa gửi tin nhóm. RUNBOOK/CONTRACTS là tài liệu review được.


### E004 — Hoàn thiện local ngày 02/10/2026

- Tạo worktree `HumanResources-full`, nhánh `local/recruitment-complete` từ backup3429b99; merge main2faffef (merge local e572a79). Nhánh công bố ecc1e8b không đổi và không push thêm trong lượt này.
- Hoàn thiện kéo thả Kanban qua form lịch, retry lookup Manager/phòng ban/bộ lọc/detail, reset route/form, mã ID an toàn, ngăn response đã hủy và bảng của job không còn trong bộ lọc.
- Thêm khóa tạo câu hỏi AI theo interview; test cuộc gọi trùng, lỗi provider và retry. Khóa trong process, chưa hỗ trợ nhiều replica.
- Backend build, frontend TypeScript + Vite production build đạt. Lint phần tuyển dụng exit0, 5 warning đã có về setState-in-effect/Fast Refresh; không lint error.
- Backend: 34/34 PASS (32 bài con + 2 nhóm), MySQL8 thật, AI/n8n stub, database và CV riêng được dọn sau test.
- Browser: 10 nhóm PASS. Có HR/API login thật, CRUD, tìm tin rỗng xóa lựa chọn, lookup lỗi/thử lại, invalid ID không gọi API, detail retry, upload PDF/biên nhận thật, tải CV, kéo thả/hủy/Hire guard, lịch UTC+7, Manager result, HR offer, MOCK JD preview/chỉnh sửa/lưu có chủ đích; không pageerror.
- Đã xem ảnh 1440px và375/390px tại `tmp/verification-2026-10-02/` của worktree (artifact local, không nằm trong lịch sử công bố).
- Chưa nghiệm thu Gemini thật, Google Meet/email, Hire/User/5 task; B01/B02/B03 vẫn mở. 38 DONE/12 REVIEW/10 BLOCKED giữ nguyên vì các gate review/live chưa đạt.
- Chuẩn bị hàng đợi DAILY-PUBLISH, có ngày code và ngày công bố riêng, dependency và acceptance cho mỗi phần nhỏ.

### E005 — Công bố Q01 ngày 02/10/2026

- Theo yêu cầu mới của người dùng, thêm đúng một commit `074f065` trên `feature/recruitment-ats` sau ecc1e8b; push và xác nhận SHA remote `074f0652f96b4e211cef5124f72cbc06890584e1`.
- Phạm vi: q tìm title, trim/max150, bind SQL và escape ký tự wildcard, response array, public OPEN/admin scope; UI debounce250ms/xóa/rỗng/lỗi/retry/AbortSignal.
- Kiểm thử riêng bản trích: backend14/14 với MySQL8/JWT thật; frontend TypeScript/Vite build và lint các file đổi đạt; browser6 nhóm dùng API fixture, có test response trễ và mobile390px. Không dùng kết quả34/34 của bản full thay cho bản trích.
- File DAILY-PUBLISH đã tích Q01, phần tiếp theo Q02 lọc phòng ban. Chỉ cập nhật tracker local trong worktree full; không tạo thêm commit công bố hoặc push bản full.

### E006 — Công bố Q02 ngày 03/10/2026

- Đọc tracker, fetch origin; main vẫn2faffef. Phát hiện nhánh AI của lead `origin/feature/core-ai-automation` tại8266411, chưa tích hợp/kiểm contract hoặc live trong đợt này; các blocker tích hợp giữ nguyên.
- Thêm đúng một commit `b6a90cc` sau074f065, push `feature/recruitment-ats` và xác nhận SHA remote `b6a90cc079282609e8e5a17b2edb964d788ad823`; không push main/bản full/backup.
- Phạm vi: lookup public chỉ id/name duy nhất của phòng có tin OPEN; departmentId nguyên dương hợp lệ; kết hợp q/phòng/OPEN và giữ Manager scope; select Careers có loading/error/retry, bỏ lọc, giữ q, AbortSignal và chặn response cũ. List vẫn array.
- Backend build, frontend TypeScript/Vite build, lint hai file frontend và diff check đạt. `jobs-crud.test.cjs`:18/18 PASS (17 bài con +1 nhóm), JWT/password thật và MySQL9.6.0 local tại13316. Docker lỗi khởi động nên dùng mysqld cài sẵn với datadir tạm riêng; chưa kiểm lại Q02 trên MySQL8.0. Database test, server và datadir tạm đã dọn.
- Browser:8 nhóm PASS với API fixture; lookup tải/rỗng/lỗi/retry, kết hợp bộ lọc, bỏ lọc/giữ từ khóa, response trễ, retry giữ cả hai bộ lọc, link ID đúng, desktop1366px/mobile390px và không pageerror. Đã xem ảnh trong `HumanResources/tmp/careers-department-*.png`; artifact local, không commit. Đây không phải E2E browser với backend thật.
- DAILY-PUBLISH tích Q02, đề xuất tiếp theo Q03 lọc địa điểm. Tracker được cập nhật local sau xác nhận push, không tạo thêm commit công bố. Tổng task nghiệp vụ60 và các gate live không đổi.

### E007 — Công bố Q03 ngày 03/10/2026 theo yêu cầu mới

- Đọc tracker và fetch origin; main vẫn2faffef, nhánh công bố vẫn b6a90cc trước lượt này. Thêm đúng một commit `d4431ab`, push `feature/recruitment-ats`, xác nhận remote `d4431ab9f5c286767b09ef5dbb26bb16849e7a98`. Ngày03/10 có Q02 và Q03 qua hai yêu cầu riêng; không rewrite/backdate hoặc push bản full.
- Phạm vi: location trim/max150/chặn query mảng-object, so khớp bằng tham số SQL; kết hợp q/phòng/OPEN/quyền Manager. Lookup thêm locations duy nhất từ tin OPEN, không rỗng. Frontend select địa điểm, bỏ từng bộ lọc độc lập, loading/error/retry, AbortSignal và chặn response cũ. List vẫn array.
- Backend build, frontend TypeScript/Vite build, lint hai file frontend và diff check đạt. `jobs-crud.test.cjs`:22/22 PASS (21 bài con +1 nhóm), MySQL9.6.0 và JWT/password thật tại localhost13316, datadir riêng. Database ngẫu nhiên, server và datadir tạm đã dọn. Docker chưa hoạt động; chưa kiểm Q03 trên MySQL8.0.
- Chromium production:9 nhóm PASS với API fixture, gồm ba bộ lọc/bỏ từng điều kiện, Unicode/ký tự đặc biệt, rỗng/khôi phục, lookup lỗi/retry/rỗng, danh sách retry giữ điều kiện, response trễ, link chi tiết đúng ID và layout1366px/390px. Không pageerror, đã xem ảnh `HumanResources/tmp/careers-location-*.png` (local, không commit); không phải E2E browser với MySQL.
- Đã tích Q03 và đề xuất Q04 phân trang trong DAILY-PUBLISH; tracker cập nhật local sau push, không tạo thêm commit công bố. Bản full và tổng task/live gate giữ nguyên.

### E008 — Công bố Q04 ngày 04/10/2026

- Đọc tracker, fetch origin; main vẫn2faffef. Remote có cập nhật nhánh AI của lead và nhánh admin settings riêng nhưng không đổi `feature/recruitment-ats`; không merge các phần ngoài Q04.
- Thêm đúng một commit `1da83aa` sau d4431ab, push `feature/recruitment-ats` và xác nhận remote `1da83aadb79fcce42b758a6757b9994b95c827f8`; không push main/bản full/backup.
- Phạm vi: page/pageSize opt-in; request cũ vẫn array, request phân trang nhận items/total/page/pageSize. Count sau q/phòng/địa điểm/quyền, thứ tự createdAt+id ổn định, DTO giới hạn và Manager scope. Careers6 tin/trang, tổng/trang, trước-sau, reset trang theo filter, retry và tự sửa trang vượt tổng.
- Backend build, frontend TypeScript/Vite build, lint hai file frontend và diff check đạt. `jobs-crud.test.cjs`:27/27 PASS (26 bài con +1 nhóm), JWT/password thật và MySQL9.6.0 tại localhost13316 với database/datadir tạm riêng. Docker chưa hoạt động; chưa chạy Q04 trên MySQL8.0. Database, server và datadir tạm đã dọn.
- Chromium production:6 nhóm PASS với API fixture; biên/trang cuối, lọc reset trang, stale page response, lỗi/retry và total shrink, desktop1366px/mobile390px. Không pageerror; đã xem ảnh `HumanResources/tmp/careers-pagination-*.png` (local, không commit). Navbar demo dùng chung vẫn tràn ở mobile như giới hạn đã ghi; nội dung Careers/pagination không tràn. Chưa phải browser E2E với MySQL.
- DAILY-PUBLISH tích Q04, đề xuất Q05 đăng nhập API thật. Tracker cập nhật local sau xác nhận push, không tạo thêm commit công bố. Tổng task nghiệp vụ và các blocker live giữ nguyên.

### E009 — Công bố toàn bộ code còn lại ngày07/10/2026

- Yêu cầu mới “push hết các phần còn lại” thay giới hạn một commit mỗi ngày. Fetch main mới9733233; merge54cb79a, conflict Jobs giải quyết giữ CRUD/Q01–Q04, core/entities/auth/workflows của lead giữ nguyên.
- Code đã push `8f7212a65be15f1b8efc80346a3a41378d11f3f7`, xác nhận remote cùng SHA: Q05–Q19, consumer Q20–Q22, caller schedule và guard Hire. Không push main/backup/local branch, không rewrite hoặc backdate.
- SDK lead dùng aiGenerated, JD arrays và question objects; adapter chuẩn hóa mode/data, validation/timeout vẫn giữ. Test chính SDK lead không có key cho cả3 method trả MOCK. MOCK score/questions chỉ preview, không ghi DB.
- Jobs vẫn array khi không paging, page envelope khi có đủpage/pageSize; Careers6/trang, tìm wildcard literal và Manager scope giữ nguyên. Thêm counts tin nội bộ/status filter và lookup theo quyền.
- Jobs27/27 + recruitment37/37 = **64/64 PASS** trên MySQL9.6.0 localhost test riêng, JWT/bcrypt thật. Fixture100 Jobs/500 ứng viên đạt; các database/CV của harness đã dọn. AI/n8n HTTP integration dùng contract stub; không gọi provider hoặc gửi mail thật.
- **10 nhóm browser PASS**, Chromium headless với API/MySQL thật; không pageerror. Desktop1440px, mobile375/390px, tablet768px. Đã xem ảnh desktop/mobile tại [evidence07/10](evidence/2026-10-07/ats-desktop.png). Build backend/TypeScript/Vite đạt, lint exit0 còn5 warning (Fast Refresh và set-state-in-effect), không error.
- Q23 chưa callback/poll/readback/retry bền dù workflow lead đã có; true từ helper vẫn UNVERIFIED. Q24 chỉ guard503/UI khóa, chưa User/password/5 task/HIRED. Chưa nghiệm thu Gemini live, mail/Meet hay Hire.
- 39 DONE/12 REVIEW/9 BLOCKED: chỉ chuyển V2-P05.01 sang DONE vì SDK đã nhận và contract đạt; các gate live M2/M4/M5/M6 còn mở.

### E010 — Test n8n cục bộ ngày07/10/2026

- Đã nhập master inactive từ bản sao thêmid và sửa3 responder trùng tên; không sửa template lead. Đã nhập workflow thử riêng hrTv2LocalTest01, không có node tích hợp ngoài.
- Manual execution thực trong n8n2.42.3 thành công: webhook và Code chạy thật; Google Calendar MOCK; email/Telegram chỉ preview, delivery=NOT_SENT. Script test trả success=true, mode=LOCAL_TEST. Có hướng dẫn [TEST-N8N.md](TEST-N8N.md) để người dùng chạy lại.
- Gemini, giao email/Telegram và tạo Meet thật chưa đạt; không chuyển các gate LIVE/Q23 sang DONE và chưa commit/push thay đổi đợt này.

### E011 — Kiểm Gemini sau khi người dùng điền key ngày07/10/2026

- backend/.env được tạo từ template và người dùng đã điền key; file được Git ignore. Kiểm cấu hình Google trả200, model gemini-3.6-flash có trong danh sách generateContent. Không ghi hoặc in key.
- LượtHTTP đầu: JD MOCK, score LIVE, questions MOCK. Lượt chẩn đoán SDK riêng: JD LIVE; câu hỏi nhận503 Service Unavailable vì model có nhu cầu cao.
- Runtime thêm tùy chọn retry tối đa2 lần sau responseMOCK đã hoàn tất do provider500/502/503/504, mặc định0. LượtHTTP sau: JD MOCK/3 attempts (503 cả3), score LIVE/1, questions LIVE/2 (503 lần đầu). Đã assert điểm/câu hỏi lưu và đọc lại đúng qua API. Không lấy JD LIVE ở lầnSDK riêng để đóng gate toàn bộHTTP.
- aiLiveAcceptance=false; n8n NOT_REQUESTED; mail/Meet chưa nghiệm thu. MySQL/CV/database thử được dọn sau khi server dừng hoàn toàn. Cấu hình model giữ nguyên; chưa commit/push đợt này. Hướng dẫn và kết quả đầy đủ tại [LIVE-ACCEPTANCE.md](LIVE-ACCEPTANCE.md).

### E012 — Giới hạn phạm vi test theo yêu cầu người dùng

- Chỉ kiểm thử phần liên quan TV2: Jobs, ATS/CV, ba chức năng AI tuyển dụng, lịch/kết quả phỏng vấn và ranh giới handoff của ATS. Các bài Gemini vừa thực hiện đúng phạm vi này.
- n8n chỉ kiểm `interview-schedule`; dùng workflow phỏng vấn riêng, master vẫn inactive. Không chạy employee-hired/burnout-alert hay AI/onboarding của thành viên khác. Phạm vi chi tiết đã ghi trong LIVE-ACCEPTANCE.md và TEST-N8N.md.

### E013 — Chuẩn bị test phỏng vấn bằng Gmail cá nhân

- Người dùng chọn Gmail cá nhân cho bài test Meet/thư mời TV2. Đã mở workflow riêng hrTv2Interview01 và hộp thoại Connect to Google Calendar.
- Form xác minh cần OAuth Client ID/Secret, redirect URI http://localhost:5678/rest/oauth2-credential/callback. Chưa nhập/saved credentials hoặc cấp quyền, chưa tạo lịch/gửi thư. Hướng dẫn bước Calendar và SMTP đã bổ sung trong TEST-N8N.md.

### E014 — Kiểm OAuth trên GitHub và chuẩn bị hướng dẫn

- Theo yêu cầu người dùng, fetch origin và kiểm main9733233, core-ai-automation1f4d5d5 cùng các nhánh remote hiện có: không có cấu hình OAuth Google Calendar; workflow JSON không có credential references. Không in bí mật trong quá trình kiểm tra.
- Đã đối chiếu hướng dẫn Custom OAuth chính thức của n8n và tạo [GOOGLE-CALENDAR-SETUP.md](GOOGLE-CALENDAR-SETUP.md), gồm project, Calendar API, Google Auth Platform/External/Test users, OAuth client Web application, redirect localhost và kết nối n8n.
- Chưa tạo OAuth client trên Google, chưa nhập/saved credential, chưa tạo lịch hoặc gửi mail. Người dùng tự thực hiện các bước tài khoản/cấp quyền. Phạm vi tiếp tục chỉ phỏng vấn TV2.

### E015 — Làm rõ callback và chuẩn bị lệnh chạy n8n

- Người dùng mở URL callback trực tiếp; UI xác nhận `Insufficient parameters for OAuth2 callback`. Readiness của n8n HTTP200: handler đã có, không cần thêm endpoint.
- Repo đã có service Docker n8n với port5678 và volume riêng; Docker Engine hiện chưa chạy. Giữ runtime Node/profile đang dùng trong lúc cấu hình OAuth.
- Thêm scripts/start-n8n-local.ps1 kiểm/tái sử dụng runtime và in link workflow TV2; callback được dán vào Authorized redirect URIs của OAuth client, đăng nhập bắt đầu từ Sign in with Google trong n8n. Chưa cấp quyền, tạo lịch hoặc gửi thư.
- Kiểm script -CheckOnly đạt HTTP200 với readiness127.0.0.1; PowerShell syntax PASS. Không khởi động thêm instance hoặc đổi profile trong lúc người dùng cấu hình OAuth.

### E016 — Kết nối Calendar và chuẩn bị SMTP ngày07/10/2026

- Người dùng tự nhập OAuth client và cấp quyền. Sau khi xử lý403 access_denied bằng Test users, UI xác nhận Google Calendar account **Account connected / Saved**; không ghi Client ID/Secret/token vào evidence.
- n8n đọc được danh sách lịch của tài khoản; chọn primary. Làm mới giao diện sau OAuth, Conference Data hiển thị Google Meet, lỗi options cũ hết. Chưa tạo event hoặc link Meet thật.
- Node Calendar có hai dòng output mẫu First item/Second item được ghim. Đã bỏ ghim, reload và xác nhận output không còn pinned để không dùng dữ liệu mẫu thay cho lời gọi Google ở bài test tiếp theo.
- n8n trước đó Offline; nhánh khởi động thật của scripts/start-n8n-local.ps1 đã được thực hiện với đúng runtime/profile cũ và readiness đạt HTTP200. Không đổi sang Docker hoặc tạo profile mới.
- Đã mở form SMTP từ node Gửi Email Mời Ứng Viên, điền Host smtp.gmail.com, giữ Port465/SSL-TLS bật. User/Password để người dùng tự nhập Google App Password và lưu; chưa có SMTP credential được lưu, chưa gửi email/Telegram. Master/onboarding/burnout không chạy.
- Cập nhật hướng dẫn TEST-N8N/GOOGLE-CALENDAR-SETUP và trạng thái LIVE; gate tạo Meet/giao thư vẫn mở. Chưa commit/push thay đổi đợt này.

### E017 — Calendar/Meet và email Gmail thật ngày07/10/2026

- Người dùng tự lưu SMTP credential; UI báo Connection tested successfully. Host smtp.gmail.com/Port465/SSL-TLS bật; không đọc/ghi App Password vào log hoặc Git.
- Tạo workflow test riêng hrTv2LiveSelf01 từ export local của workflow TV2 đã gắn credentials; chỉ credential references được sao chép. Chưa publish, không pinData, không Telegram. Guard khóa sender/recipient về cùng Gmail của người dùng, dữ liệu ứng viên giả và reference của lượt test; không dùng địa chỉ fallback của lead.
- Một request test TV2-LIVE-20261007-muxgxcun hoàn tất: tạo event10:00–10:45 ngày08/10/2026, Calendar GET readback đúng id/time/title và conference status success/link Meet thật. EventId xác định theo reference, Calendar/SMTP không auto retry, không có attendees/sendUpdates hoặc reminder của event test.
- SMTP trả đúng một recipient accepted, không rejected và có messageId. Đã mở đúng subject trong Gmail, UI hiển thị nhãn Hộp thư đến, nội dung10:00 ngày08/10 và href CTA khớp link Meet Google: **giao thư thật đã VERIFIED**. Chưa có email hoặc Telegram gửi tới người khác.
- N8n UI báo Workflow executed successfully. Kết quả JSON/ảnh và bằng chứng Inbox lưu trong .temp/n8n-import được Git ignore; tài liệu công bố không chứa địa chỉ Gmail, secrets hoặc link Meet/eventId thực.
- Sửa template workflows/interview-schedule.json: summary/description vào additionalFields đúng schema n8n, vì tham số ngoài collection bị bỏ qua khi import. Đã áp dụng hai field vào workflow gốc local qua CLI export/import, giữ credential references và inactive; chưa chạy lại nguyên luồng gốc qua website/API.
- Helper prepare-tv2-live-test.cjs kiểm syntax Code trước khi ghi import, script test-tv2-live-self.ps1 kiểm kết quả cuối/không tự retry. Bản import thử đầu có lỗi escape regex, đã sửa và kiểm trước khi execute; bản lỗi inactive chưa chạy hoặc gửi gì.
- Provider smoke LIVE đạt cho Calendar/Meet/Gmail; không dùng kết quả này để đóng Q23 callback/poll/readback/retry bền, Q24 Hire hoặc gate toàn bộ Gemini HTTP. Gemini JD vẫn503/MOCK ở evidence E011, website/API schedule và Telegram chưa kiểm. Chưa commit/push đợt thay đổi local này.

### E018 — Xếp lịch từ website tới Calendar/Meet/Gmail ngày07/10/2026

- Runtime test riêng: frontend5173 → API3011 → MySQL9.6 tại13316. Auth/JWT/password/TypeORM và SDK N8nService của lead thật; chỉ tải module TV2 và dữ liệu giả. Gemini được khởi tạo nhưng không gọi trong bài test này. Backend/.env không bị đổi; địa chỉ webhook/sender được đặt riêng cho tiến trình.
- Đăng nhập HR, mở ứng viên TV2 WEB TEST - Ung vien gia, chọn TV2 WEB TEST - Manager cùng phòng, lưu11:00–11:45 ngày08/10/2026. Form hiển thị timezone Asia/Saigon. Trước lần gửi thành công, thao tác điền tự động chưa đồng bộ React gây Invalid time value; lúc đó DB vẫn0 vòng/0 dispatch. Sau nhập bằng bàn phím và kiểm giá trị, website gửi đúng một lịch.
- API/DB xác nhận applicationId=1, interviewId=1, interviewerId=2, round=1, status=INTERVIEWING; scheduledAt=2026-10-08T04:00:00Z. Tải lại website/mở lại hồ sơ vẫn đúng dữ liệu. Caller thật được đếm1 lần, không thay hành vi bằng stub.
- Workflow hrTv2WebLive01 dùng Test URL riêng, inactive/unpublished, không pinData/Telegram; guard khóa hồ sơ/thời gian/Gmail cá nhân. Chuỗi tạo event/Meet → Calendar GET kiểm id/title/time/conference success → SMTP một recipient accepted hoàn tất. UI báo Workflow executed successfully; result applicationId/interviewId khớp DB.
- Đã mở đúng subject TV2-WEB-20261007-b901aab615 trong Gmail: nhãn Hộp thư đến, nội dung11:00 ngày08/10 và CTA href khớp Meet được Google tạo. Không gửi tới lead/người khác, không mời Calendar attendees.
- Replay API đúng cùng payload trả201/NOT_RETRIED; vẫn đúng1 Interview và1 dispatch. Manager khác phòng trả403. Đây là chống trùng request đã lưu, chưa là retry workflow lỗi/timeout hoặc callback bền.
- Artifact kết quả/DB/replay/Inbox và ảnh tv2-web-* lưu tại .temp/n8n-import, được Git ignore. Không đưa địa chỉ Gmail, secrets, eventId hoặc link Meet thật vào tài liệu công bố. Runtime website được giữ chạy để người dùng xem; chưa chạy trên DB nhóm hoặc nguyên graph gốc có Telegram.
- Phần chưa hoàn tất: meetingLink trong ATS=null dù Meet thật đã được tạo; UI vẫn báo chưa có liên kết. Q23/M4 còn result contract, auth callback/poll và retry/đối soát bền. Q24/User/5 task không chạy, JD503/MOCK không test lại. Tổng39 DONE/12 REVIEW/9 BLOCKED giữ nguyên; chưa commit/push.

### E019 — Readback Meet/trạng thái thư về ATS ngày07/10/2026

- Người dùng yêu cầu hoàn thiện phần link/trạng thái sau E018. Thêm entity/table InterviewDelivery riêng trong modules/applications, đăng ký bổ sung AppModule/harness; không đổi schema Interview hoặc N8nService core của lead. Token256 bit/hash SHA256 theo vòng, expire48 giờ, không trả token/hash/snapshot trong DTO browser.
- Interview và tracking được lưu cùng transaction. Workflow phải claim một lần để nhận snapshot chuẩn của contact/time từ backend; duplicate claim409 trước provider. Callback kiểm requestId/interview/application/event/time/Meet/recipient, lock cùng thứ tự transaction; duplicate identical no-op, khác kết quả409, sai token401. Calendar lưu meetingLink/eventId, SMTP lưu accepted/messageId; không coi SMTP là Inbox.
- Workflow standalone interview-schedule-readback.json inactive, không credentials/pinData/Telegram. Calendar Create→Get verify→Save Meet→SMTP verify→Save email; callback sanitized khi node provider lỗi. Chỉ HTTP callback có retry3; không auto retry claim/provider. UNKNOWN sau10 phút; chưa outbox/queue/recovery tự động sau crash/mất callback.
- Website poll3 giây khi PENDING/RUNNING, render trạng thái và link; reload giữ kết quả. Callback delivery không làm đổi revision/form nhận xét Manager. Cấu hình sai base/sender thì503 và rollback trước dispatch; không đổi backend/.env trong bài test.
- **73/73 PASS**: regression Jobs/recruitment +8 nhóm callback mới (9 bài kể cả parent), HTTP/MySQL9.6/JWT/password thật, provider contract fixture. Auth/mass assignment/link giả/sai aggregate/expiry/concurrent claim/callback/downgrade/partial email/config rollback đạt. Script dùng MySQL13317 tạm riêng và tự dọn. Backend TypeScript, frontend TypeScript/Vite build và lint CandidateDetail PASS; esbuild sandbox EPERM được xử lý bằng build cùng lệnh ngoài sandbox.
- LIVE trên fixture mới/API3011/MySQL13316: HR xếp12:00–12:45 ngày08/10/2026, workflow hrTv2Readback01 ở Test URL riêng. Một Interview/dispatch; claim thật, Calendar GET/Meet verified, hai callback lưu về ATS, status COMPLETED/calendar CONFIRMED/email SMTP_ACCEPTED. Website tự hiện Mở phòng phỏng vấn; sau reload link/status vẫn đúng.
- Subject TV2-WEB-20261007-0e587ea839 mở trong Gmail: nhãn Hộp thư đến,12:00/href khớp Meet của website. Replay schedule giữ1 vòng/1 dispatch và NOT_RETRIED, Manager khác phòng403. Không recipient lead/Telegram/onboarding/burnout hoặc User/5 task. Private artifacts tv2-readback-* trong .temp/n8n-import được ignore; runtime giữ mở để người dùng xem.
- V2-P08.03 chuyển DONE, V2-P08.05 sang REVIEW, tổng40 DONE/13 REVIEW/7 BLOCKED. Q23 chưa đóng toàn bộ vì recovery và lead review vận hành; JD Gemini/Q24 giữ giới hạn cũ. Chưa commit/push.

### E020 — Audit toàn bộ phần còn lại và kiểm readback sau kết quả phỏng vấn

- Fetch origin thành công; main9733233/remote feature d7e1642 không có cập nhật chưa nhận. Không merge vào thay đổi local hoặc commit/push.
- CUA trên website thật: UI AI trả MOCK, score/questions không persist; HR chỉnh bản nháp JD rồi lưu Job#2, Careers đọc đúng nội dung; PDF giả tạo Application#2, HR REJECTED và filter hiện đúng. Manager fixture chấm Interview#1 đạt91/100, HR chuyển Application#1 OFFERED, hủy từ chối giữ trạng thái; Escape đóng dialog.
- Callback Meet/SMTP của E019 vẫn persist sau result/offer/reload. Runtime cuối giữ1 Interview/1dispatch, không tạo thêm Meet/thư; fixture mới không có lịch. Ảnh `.temp/n8n-import/tv2-e020-website.png` giữ private.
- 27 assertion API trên fixture đang chạy đạt: JWT/password, CV/role/scope, MOCK không lưu, result/readback/edited JD và Hire503 không đổi hồ sơ. Probe riêng phát hiện lỗi Auth chung: valid email + roleHR không password vẫn cấp token và đọc hồ sơ200. V2-T-SEC-01 không còn ghi PASS toàn hệ thống; cần lead sửa.
- Gemini actual SDK qua HTTP/MySQL tạm: JD LIVE lần1, score MOCK sau3 provider503; questions MOCK sau503/503/429. Strict aiLiveAcceptance=false, dừng gọi thêm khi429. Score/questions từng LIVE/persist ở E011; không ghép các evidence thành một lượt E2E LIVE.
- Thêm `backend/test/interview-workflow.test.cjs`:12 tình huống chạy Code-node JSON trong VM; calendar id/time/Meet/pending, canonical recipient, HTML escaping, SMTP acceptance, failure sanitization và callback-only retries đạt. Một bài test gom các tình huống này, không gọi n8n/provider.
- Sửa runner MySQL dùng cwd Temp ASCII: lỗi267 khi chạy trong đường dẫn môn học đã được khắc phục. Sandbox EPERM ở process con được chạy lại bằng quyền thực thi phù hợp. `node scripts/test-tv2-readback.cjs` cuối **74/74 PASS**; MySQL riêng13317 được dọn. Không lặp lại các build đã đạt ở E019 vì source TypeScript không đổi trong audit này.
- Viewport override390 vẫn actual1280 trong browser hiện tại; không ghi PASS mobile mới. Responsive375/390/768 ở E009 là evidence lịch sử; mọi race UI/lỗi log chung chưa được coi là đã kiểm toàn bộ.
- Tổng60 task giữ40 DONE/13 REVIEW/7 BLOCKED. Báo cáo phủ tất cả phase/test và các phần không thể nghiệm thu vì chưa có implementation: [REMAINING-TESTS.md](REMAINING-TESTS.md). Hire/User/5 task, recovery và security/Auth vẫn cần hoàn thiện; đợt code/test này chưa push.

### E021 — Dữ liệu demo TV2 và công bố seed

- Theo yêu cầu thêm dữ liệu BE riêng TV2, đã push commit `27fbd3fae92233ed30c2ad303187ce0d9bda8e48` lên `feature/recruitment-ats`; `git ls-remote` xác nhận SHA khớp. Commit chứa đúng8 file seed/catalog/PDF/CLI, package scripts, demo harness caller, seed tests và [DEMO-DATA.md](DEMO-DATA.md). E019/E020 và các thay đổi readback trước đó giữ local.
- Bộ seed thêm12 job (10OPEN/2CLOSED),108 hồ sơ/CV (36APPLIED,36INTERVIEWING,18OFFERED,18REJECTED),90 vòng (36PENDING/54đã đánh giá mẫu). Backend NestJS42 hồ sơ giúp demo phân trang; mặc định35 vì7REJECTED bị ẩn. Chỉ ghi bảng jobs/applications/interviews và CV; dùng HR/Manager/phòng ban có sẵn, không fake HIRED/Meet/mail. Điểm/câu hỏi/nhận xét/PDF đều có nhãn synthetic/demo.
- Backend build PASS. Seed integration8/8 PASS với MySQL9.6; bản dựng từ HEAD đã công bố cộng đúng thay đổi demo cũng build/8test PASS, không phụ thuộc readback local. Kiểm dry-run, invalid actor/department, counts/scope, API pagination/auth, PDF download/parse, concurrent/idempotent rerun, giữ HR edit, partial rerun lịch ổn định, rollback file. Render2CV đại diện và kiểm lề cả12 loại PASS.
- MySQL3306 của backend/.env trả ER_ACCESS_DENIED_ERROR; không reset password hay ghi vào DB đó. Đã chạy API demo riêng3001/MySQL13318 với database hr_ats_test_* và CV tạm, AI/n8n stub. Frontend test5173 chuyển từ3011 sang3001; đăng nhập HR fixture, website hiển thị bộ dữ liệu, mở hồ sơ2 vòng PASS. Ảnh `.temp/demo-seed/ats-demo.png` được ignore. Runtime demo sống tới khi dừng; khởi động lại harness tạo bộ mới, seed trên database của nhóm theo DEMO-DATA.md để giữ dữ liệu lâu dài.
- Runtime readback cũ3011/control3012/MySQL13316 và n8n được giữ. Vite cũ13708 đã dừng có kiểm ownership; frontend mới47012. PID hiện tại của demo ở `.temp/demo-seed/processes.json` và `frontend-process.json`; thông tin frontend cũ ở tv2-web-test không còn áp dụng. Không gửi thêm email/tạo Meet/gọi Gemini. Các blocker/progress task bắt buộc giữ nguyên; demo data không đóng Q23/Q24.

### E022 — Lịch và danh sách phỏng vấn TV2 (ĐÃ PUSH)

- [x] API lịch/phân trang, chi tiết và bộ lọc có JWT/role/scope Manager theo phòng ban; minimal projection, không lộ CV/password/token; chỉ điều hướng link Meet đúng định dạng.
- [x] UI tuần/tháng, lịch/danh sách nhóm theo ngày giờ VN; tìm/lọc kết hợp; trước/sau/hôm nay/đi đến ngày; mở thêm lịch tháng; click mở chi tiết/ngày giờ/link và hồ sơ ứng viên.
- [x] Tải lại thủ công, polling lịch30s/chi tiết15s khi tab hiện, focus refresh; hủy request cũ; loading/error/retry/empty và giới hạn1.000 buổi không cắt ngầm.
- [x] Backend build, frontend TypeScript/Vite build PASS; lint feature/API/types không warning mới (RecruitmentAdminPage còn2 warning có từ trước).
- [x] Calendar backend7/7 (gồm test cha) + seed8/8 =15/15 PASS với MySQL/JWT thật. Test date frontend1/1 PASS; dùng compiler TypeScript sẵn có để tương thích Node20/22, chạy trực tiếp file test do sandbox chặn spawn của `node --test`.
- [x] Browser: tuần18buổi/16pending, tháng66buổi/36pending; đúng09:00 ngày08/10; chi tiết không link, fixture link/cập nhật/link attrs/target/rel, mở hồ sơ, danh sách theo giờ, tổ hợp lọc còn1kết quả, Xem thêm vòng2, đi đến07/01/2027 hiện0buổi/empty, Hôm nay trở lại tuần hiện tại. Ngày kiểm CUA `fill` không phát cập nhật native date; `setValue` đã đổi đúng và kiểm UI empty thành công. Viewport thật662px, chưa ghi PASS375px.
- [x] Commit/push lịch: `1b841eaa2d0cf894ba52b479eec42ed2232179df` lên `feature/recruitment-ats`; `git ls-remote` xác nhận SHA khớp. 15 file/hunk đúng phạm vi, build/15test backend/date1test/lint trên bản staged riêng cũng PASS; các thay đổi readback local trước đó được giữ.

Runtime: API3003/control3014/MySQL13319, frontend5173→3003; runner48020/mysql28804/backend29024/frontend33204. PID files ở `.temp/calendar-demo/`. Runtime readback3011/n8n5678 và demo seed3001 được giữ; Vite47012 của E021 đã dừng có kiểm ownership. Token/password không công bố. Link fixture đã gỡ, dữ liệu demo0link; không tạo phòng/gửi email/gọi Gemini. Ảnh cuối `.temp/calendar-demo/calendar-list-final.png`, `.temp/calendar-demo/calendar-week-final.png`; hướng dẫn [INTERVIEW-CALENDAR.md](INTERVIEW-CALENDAR.md). Feature bổ sung này không thay đổi tổng60task hay đóng B01/B02/B03/Q23/Q24.

### E023 — Service Hire mới của lead và UI Đã nhận việc (LOCAL)

- Nhận main764bf37/corec914f6f bằng merge74dbd50 trên feature/recruitment-ats. Conflict Applications được tích hợp: giữ ATS quyền/state/readback và service hireCandidate/mẫu5 task của lead; autostash đã reapply. Không reset/force push, không bỏ thay đổi local cũ.
- POST hire → hireCandidate; HR/Admin/latest PASSED, User/password/5 task/HIRED atomic và khóa/dedupe. Email existing409; không rebind/change role/password. Dispatcher sau commit; true chỉ DISPATCHED_UNVERIFIED, false/throw FAILED, replay NOT_RETRIED. ATS không lộ password/hash.
- UI Tuyển/xác nhận/hủy/refetch và cột Đã nhận việc; kéo HIRED mở detail thay vì đọc interviews rỗng từ list. Detail mới nhất gate latest PASSED. Guard kéo đã build; chưa ghi PASS browser drag mới.
- Backend build và frontend TypeScript/Vite PASS; lint exit0 còn2 warning có trước. Runner test-tv2-hire99/99 PASS (HTTP/MySQL/JWT/password thật, AI/n8n provider stub); gồm auth missing-password/role-only fix của lead, eligibility, User/tasks/login/persist, concurrent/email collision, DB rollback và dispatch false/throw/replay. Không gọi Google/SMTP/Gemini hoặc workflow TV3.
- Browser API3005/MySQL13320: Nguyễn Ngọc Mai synthetic, hủy rồi xác nhận tuyển; UI user7/5task, board HIRED; reload và mở lại vẫn HIRED/user7. Control read-only: Application5 → user7,5task,1dispatch STUB. Mật khẩu/token/control secret không công bố.
- Runtime demo giữ mở frontend5173→3005; API3003/calendar,3001/seed,3011/readback và n8n5678 giữ nguyên. PID files/log/ảnh private ở .temp/hire-integration; HIRE-INTEGRATION.md hướng dẫn và giới hạn. Không triển khai DB nhóm.
- Tổng60 task thành43 DONE/15 REVIEW/2 BLOCKED. P09.01–03 DONE; P09.04–05 và P00.04 REVIEW. B02 contract không còn thiếu, nhưng welcome-mail LIVE/recovery và TV3 Workspace chưa nghiệm thu; Q24 chưa tích Đã push. Merge mới/code/tài liệu đợt này chưa push, chưa mở PR.

### E024 — Công bố toàn bộ code TV2 hiện có (ĐÃ PUSH)

- Theo yêu cầu push hết phần TV2 còn local, fetch origin thành công; main lead764bf37 đã được nhận qua merge74dbd50. Không có main mới cần nhận trong lượt này.
- Commit code **`67624af8f1ec8ac51909d8da63325170d18b1be1`**, 32file: readback/claim/callback có xác thực, SQL additive, workflow/helper/test và Hire/User/5task/HIRED/API/UI. `git push origin feature/recruitment-ats` thành công; `git ls-remote` xác nhận đúng SHA. Không force push hoặc backdate.
- Chạy lại **99/99 HTTP/MySQL/JWT regression PASS**, backend Nest build và TypeScript/Vite frontend PASS, calendar-date **1/1 PASS**; lint phân hệ exit0 còn3 warning. PowerShell scripts parse0error; staged diff whitespace check đạt.
- Audit43file so với baseline không phát hiện bí mật/Gmail cá nhân mới hoặc workflow chứa credential bindings/pinned data/active flag. `.env`, config/ảnh/evidence `.temp` và workflow tự test chứa credentials giữ private, không công bố.
- Không gọi Gemini/Calendar/SMTP/n8n delivery trong E024; lượt người dùng tự test vẫn do người dùng bấm gửi. E017–E019 giữ bằng chứng LIVE lịch sử, không được ghép thành nghiệm thu mail chào mừng hoặc TV3 Workspace.
- **60task =43 DONE/15 REVIEW/2 BLOCKED** giữ nguyên. Q23/Q24 được đánh dấu ĐÃ PUSH CODE ở DAILY-PUBLISH; recovery lịch/thư, Gemini vận hành, welcome-mail LIVE và handoff TV3 vẫn mở. Chưa triển khai DB nhóm hoặc mở PR.

Mẫu evidence cho triển khai sau này:

```text
Evidence: E002
Task/test: V2-Pxx.xx / V2-T-...
Commit/PR: ...
Môi trường: DB test, phiên bản runtime, branch
Lệnh hoặc thao tác: ...
SDK/workflow: LIVE hoặc MOCK/STUB
Kết quả và artifact: ...
Giới hạn chưa kiểm: ...
Ngày/người kiểm/reviewer: ...
```

## 11. Gate trước khi báo hoàn tất

- Scope cuối đúng phân công mới và các thay đổi được ghi nhận.
- Tasks bắt buộc đạt acceptance, tests có evidence; SDK chưa nhận không bị tích Done.
- Live AI và workflow được nghiệm thu đúng phạm vi cam kết, không lấy mock thay thế.
- Manager result do TV2 hoàn thiện, TV3 nhận handoff Workspace rõ.
- Hire/User/access/5 task có đúng owner, duplicate/partial failure được kiểm.
- Người khác chạy lại được, lead review shared boundary, tài liệu và trạng thái đúng thực tế.
