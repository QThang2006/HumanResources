# Tiến độ Thành viên 2 — Tuyển dụng ATS và phỏng vấn

Phiên bản **2.6**, cập nhật **07/10/2026**. Nhánh công bố đã nhận main `9733233` qua merge `54cb79a` và push toàn bộ code TV2 hiện có tại `8f7212a`. Lịch sử công bố: [DAILY-PUBLISH.md](DAILY-PUBLISH.md).
Kế hoạch hiện hành: [PLAN.md](PLAN.md). Lịch sử: [PROGRESS 30/09](archive/PROGRESS-2026-09-30.md).

## 1. Trạng thái hiện tại

Đã triển khai phần nghiệp vụ TV2 và kiểm thử trên MySQL thật. **Chưa hoàn tất tích hợp toàn bộ vai trò:** Gemini live, email/Meet readback và Hire/User/5 task còn phụ thuộc lead.

- Tổng **60** đầu việc: **39 DONE**, **12 REVIEW**, **9 BLOCKED**. Không dùng tỷ lệ task để suy ra phần trăm code.
- Bản tích hợp hiện hành: `HumanResources`, nhánh `feature/recruitment-ats`, code `8f7212a` đã xác nhận SHA remote. Bản nguồn `HumanResources-full`/`local/recruitment-complete` tại3b6fa7f giữ local, chưa đồng bộ core mới; backup3429b99 giữ nguyên. Chưa mở PR.
- Đợt07/10 E009: **64/64 PASS** = Jobs27 + recruitment37; **10 nhóm browser PASS** với API/MySQL9.6/JWT/password thật; AI/n8n contract stub và SDK lead fallback thật. Build/TypeScript/Vite đạt; lint exit0 còn5 warning. Kết quả Q01–Q04/E005–E008 bên dưới là lịch sử.
- Lịch sử bản full02/10: **34/34 PASS** (32 bài kiểm tra con + 2 nhóm); MySQL thật, AI/n8n contract stub, chạy lại ngày02/10.
- Lịch sử browser02/10: **10 nhóm smoke PASS**, desktop 1440px, mobile 375/390px, tablet 768px, chạy lại ngày02/10.
- Build backend/TypeScript frontend/Vite production: PASS. Lint exit0, 6 warning được ghi ở RUNBOOK.
- Xem [hướng dẫn chạy/demo/test](RUNBOOK.md), [API/SDK contract](CONTRACTS.md), evidence E002/E003.
- Implementation TV2 giữ core/entities/auth/Workspace/package/lockfile từ main9733233; thay đổi của lead đi qua merge54cb79a. Navbar sửa một class để hết tràn ngang mobile.

## 2. Quy tắc đánh dấu

- TODO: chưa bắt đầu; DOING: đang làm; BLOCKED: không tiếp tục được vì dependency; REVIEW: chờ kiểm; DONE: đạt acceptance và có evidence.
- Chỉ DONE đổi `- [ ]` thành `- [x]`; REVIEW/BLOCKED không tích.
- Khi xong thêm commit/PR, evidence ID, ngày/reviewer. Evidence ghi rõ stub/live và giới hạn.
- Các mã V2- thay thế checklist v1; công việc core từng có trong v1 đã chuyển owner, không được tính là TV2 hoàn thành.
- Mock giúp test UI/caller, không là bằng chứng live AI, mail/Meet hay User/5 task thật.
- Cập nhật PLAN và PROGRESS cùng lúc khi đổi scope; không xóa task khó để tăng tỷ lệ.
- Số task không phản ánh tỷ trọng công sức. Task khảo sát 1/60 không có nghĩa đã code 1/60.

## 3. Tổng quan phase

| Phase | Nội dung | Tổng | Xong | Trạng thái |
| --- | --- | ---: | ---: | --- |
| P00 | Phạm vi và contract | 5 | 2 | Có dependency còn BLOCKED |
| P01 | Môi trường và test nền | 5 | 4 | Chờ review phần còn lại |
| P02 | API Jobs | 5 | 5 | DONE |
| P03 | Careers và form ứng tuyển | 5 | 5 | DONE |
| P04 | CV và Application | 5 | 5 | DONE |
| P05 | Tích hợp Gemini SDK | 5 | 3 | SDK và fallback đã nối; còn nghiệm thu LIVE |
| P06 | Bàn HR và Kanban | 5 | 4 | Chờ review phần còn lại |
| P07 | Phỏng vấn Manager | 5 | 5 | DONE |
| P08 | Xếp lịch và n8n | 5 | 2 | Có dependency còn BLOCKED |
| P09 | Hire và bàn giao | 5 | 0 | Có dependency còn BLOCKED |
| P10 | Kiểm thử và hoàn thiện | 5 | 2 | Chờ review phần còn lại |
| P11 | Demo và bàn giao cuối | 5 | 2 | Có dependency còn BLOCKED |

## 4. Mốc nghiệm thu

| Mốc | Điều kiện | Trạng thái | Evidence |
| --- | --- | --- | --- |
| M1 | Jobs/Careers/Apply dữ liệu thật | PASS local/test DB | E002/E003 |
| M2 | 3 Gemini SDK tích hợp, mode/lỗi rõ | Adapter/contract/fallback đạt; provider LIVE chưa nghiệm thu | E009 |
| M3 | Board ba cột và Manager result | PASS local/test DB | E002/E003 |
| M4 | Lịch/email/Meet thật | Chờ workflow/result contract, chưa nghiệm thu | — |
| M5 | Hire/User/5 task/handoff | Chờ contract userId/provisioning, chưa nghiệm thu | — |
| M6 | Test/demo/bàn giao | REVIEW; chưa đóng vì live integrations thiếu | E002/E003 |

## 5. Checklist

### P00 — Phạm vi và contract

Acceptance và gate: [PLAN P00](PLAN.md#p00).

- [x] V2-P00.01 — Ghi nhận baseline và phân công mới | DONE | Evidence: E001 | 01/10/2026
- [ ] V2-P00.02 — Chốt ownership và vùng file | REVIEW | Evidence: E002/E003 | Đã ghi boundary trong CONTRACTS; chờ nhóm review
- [ ] V2-P00.03 — Chốt SDK Gemini và fallback | REVIEW | Evidence: E009 | Đã nối SDK lead aiGenerated và kiểm fallback; còn lead review semantics/provider live
- [ ] V2-P00.04 — Chốt schedule và provisioning | BLOCKED | Evidence: E002/E003 | B02/B03: thiếu provisioning và workflow readback
- [x] V2-P00.05 — Chốt MVP, nhánh và thứ tự PR | DONE | Evidence: E002/E003 | Nhánh bàn giao feature/recruitment-ats; chưa mở PR

### P01 — Môi trường và test nền

Acceptance và gate: [PLAN P01](PLAN.md#p01).

- [x] V2-P01.01 — Toolchain và môi trường local | DONE | Evidence: E002/E003
- [ ] V2-P01.02 — Nhận Auth và seed hợp lệ | REVIEW | Evidence: E002/E003 | JWT/password thật đã test; seed/Auth chung vẫn chờ lead
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
- [ ] V2-P05.02 — JD endpoint và modal | REVIEW | Evidence: E002/E003 | JD endpoint/modal đã code; contract test có; UI draft live chờ SDK
- [x] V2-P05.03 — Score caller, lưu kết quả và retry | DONE | Evidence: E002/E003
- [x] V2-P05.04 — Questions caller và Interview snapshot | DONE | Evidence: E002/E003
- [ ] V2-P05.05 — Nghiệm thu M2 và lỗi SDK | BLOCKED | Evidence: E002/E003 | B01: chưa có bằng chứng Gemini live

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

- [x] V2-P08.01 — Validate và lưu Interview | DONE | Evidence: E002/E003
- [x] V2-P08.02 — Caller triggerInterviewScheduled | DONE | Evidence: E002/E003
- [ ] V2-P08.03 — Readback và lưu kết quả | BLOCKED | Evidence: E002/E003 | B03: thiếu callback/poll/auth contract của lead
- [ ] V2-P08.04 — UI trạng thái và retry | REVIEW | Evidence: E002/E003 | Có UNVERIFIED/FAILED/NOT_RETRIED; chưa có durable retry/readback
- [ ] V2-P08.05 — Nghiệm thu M4 | BLOCKED | Evidence: E002/E003 | B03: chưa có email/Meet live

### P09 — Hire và bàn giao

Acceptance và gate: [PLAN P09](PLAN.md#p09).

- [ ] V2-P09.01 — Nhận contract Hire hoàn chỉnh | BLOCKED | Evidence: E002/E003 | B02: nguồn userId và provisioning chưa rõ
- [ ] V2-P09.02 — Validate và chuẩn bị action ATS | REVIEW | Evidence: E002/E003 | Đã guard/precondition và 503 an toàn; còn contract contact/provisioning
- [ ] V2-P09.03 — Caller và cập nhật trạng thái | BLOCKED | Evidence: E002/E003 | B02: không gọi SDK bằng userId đoán, chưa HIRED mutation
- [ ] V2-P09.04 — Idempotency và khôi phục lỗi | BLOCKED | Evidence: E002/E003 | B02: chỉ kiểm không có side effect khi chưa tích hợp
- [ ] V2-P09.05 — HireModal, handoff TV3 và M5 | BLOCKED | Evidence: E002/E003 | B02: UI giải thích Hire chưa mở; chưa bàn giao User/task cho TV3

### P10 — Kiểm thử và hoàn thiện

Acceptance và gate: [PLAN P10](PLAN.md#p10).

- [x] V2-P10.01 — Unit, contract và DB integration | DONE | Evidence: E002/E003
- [ ] V2-P10.02 — Quyền và dữ liệu nhạy cảm | REVIEW | Evidence: E002/E003 | Domain role/scope/DTO/private CV đạt; auth/filter/log nền cần lead review
- [ ] V2-P10.03 — Lỗi SDK và automation | REVIEW | Evidence: E002/E003 | Missing/schema/timeout/mock/n8n false đạt bằng stub; live/partial workflow chưa kiểm
- [x] V2-P10.04 — UI, hiệu năng và runtime smoke | DONE | Evidence: E002/E003
- [ ] V2-P10.05 — Review và kiểm tra diff | REVIEW | Evidence: E002/E003 | Diff local đã kiểm; chờ lead review, chưa PR

### P11 — Demo và bàn giao cuối

Acceptance và gate: [PLAN P11](PLAN.md#p11).

- [x] V2-P11.01 — Hướng dẫn chạy phân hệ | DONE | Evidence: E002/E003
- [x] V2-P11.02 — Contract và tài liệu cuối | DONE | Evidence: E002/E003
- [ ] V2-P11.03 — Demo chính và lỗi | REVIEW | Evidence: E002/E003 | Luồng tới OFFERED + lỗi đã demo tự động; Gemini/Meet/Hire live còn thiếu
- [ ] V2-P11.04 — Chứng cứ đóng góp và handoff | REVIEW | Evidence: E009 | Code đã push8f7212a, tài liệu/evidence đi cùng đợt; còn lead review/handoff, chưa PR
- [ ] V2-P11.05 — Đóng tracker và M6 | BLOCKED | Evidence: E002/E003 | Không đóng M6 khi B01/B02/B03 còn mở

## 6. Dependency và bàn giao

Owner theo phân công mới; SDK/workflow mới đã nhận từ main9733233 ngày07/10, TV2 đã nối adapter và kiểm fallback. Chưa liên hệ lead hoặc tự gửi tin nhắn.

| ID | Cần nhận | Owner | Trạng thái thực tế | Ảnh hưởng |
| --- | --- | --- | --- | --- |
| DEP01 | Auth thật, seed và Department.code hợp lệ | Lead | JWT/password thật đã test bằng fixture; frontend gate recruitment có thật, auth/seed nền chưa sửa | P01 và E2E |
| DEP02 | generateJobDescription, scoreResume, generateInterviewQuestions | Lead | Đã nhận từ main9733233, consumer/fallback đạt E009 | P05: còn nghiệm thu live |
| DEP03 | Output schema, LIVE/MOCK, lỗi/timeout/retry | Lead + TV2 | Adapter hỗ trợ aiGenerated theo main9733233; contract + actual fallback đạt; chưa provider live | P05/P08/P09 |
| DEP04 | Kết quả schedule thật/accepted-completed và workflow | Lead | Helper có nhưng trả boolean trước HTTP result; chưa xác minh workflow | P08 |
| DEP05 | Nguồn userId, owner User, password/5 task, partial failure | Lead | SDK đòi userId; tài liệu chưa nói ai tạo User trước | V2-P09.01 B02 |
| DEP06 | Schema thiếu status/mode/version và stream/error contract | Lead | Dùng expectedUpdatedAt tăng tối thiểu1s, MOCK preview-only; chưa sửa entities/core | P04/P05/P08/P09 |
| DEP07 | Manager kỹ thuật recruitment | TV2 | Theo phân công mới; comment cũ không còn là căn cứ giao TV3 | P07 |
| DEP08 | Handoff user/5 task cho Workspace | Lead + TV3 + TV2 | Lead provisioning, TV3 đọc/cập nhật task, TV2 nối Hire | P09 |

## 7. Decision log

Ownership ghi trong PLAN; các lựa chọn phía TV2 đã triển khai bên dưới chưa đồng nghĩa lead đã đồng ý SDK contract.

| ID | Quyết định | Trạng thái | Người chốt/ngày | Kết quả |
| --- | --- | --- | --- | --- |
| D01 | Shape 3 SDK và trường lưu | INTEGRATED | TV2 07/10 | CONTRACTS: SDK lead aiGenerated được chuẩn hóa mode/data; fallback thật đạt, live chưa kiểm |
| D02 | LIVE/MOCK/unavailable | CONSUMER IMPLEMENTED | TV2 01/10 | MOCK score/questions preview-only; missing503 |
| D03 | Timeout/retry/rate limit | LOCAL IMPLEMENTED | TV2 01/10 | AI45s; parse10s; submit10/phút/IP; không tự retry |
| D04 | Score sync/async, trạng thái bền | LOCAL IMPLEMENTED | TV2 01/10 | Score sync, khóa trong process + revision; chưa queue bền |
| D05 | Upload/link và nguồn text | IMPLEMENTED | TV2 01/10 | Multipart PDF; không nhận URL/fake text; scan xem tay |
| D06 | Schedule callback/poll/readback | BLOCKED | Lead | UNVERIFIED/FAILED/NOT_RETRIED; chưa readback/retry |
| D07 | Ai tạo User/source userId | BLOCKED | Lead | B02: chưa owner tạo User |
| D08 | HIRED/provisioning timing và partial | BLOCKED | Lead | Chưa HIRED/provisioning mutation |
| D09 | Idempotency/retry password/task/mail | BLOCKED | Lead | Chưa recovery/password/task/mail contract |
| D10 | Ba cột/OFFERED/REJECTED/Hire | LOCAL IMPLEMENTED | TV2 01/10 | OFFERED trong PV, REJECTED riêng, Hire disable |
| D11 | Manager scope/result edits | IMPLEMENTED | TV2 01/10 | Manager đọc theo phòng, ghi theo assignment + CAS |
| D12 | Schema/status/version nền | REVIEW | Lead | Dùng schema cũ; điểm lịch sử không có version/mode bền |
| D13 | Auth/seed/domain boundary/test config | LOCAL IMPLEMENTED | TV2 01/10 | Test DB ngẫu nhiên, real JWT, gate riêng recruitment |
| D14 | Access user mới/email existing | BLOCKED | Lead | Không tự chiếm User theo email |

## 8. Blockers và rủi ro

| Blocker | Task | Bằng chứng | Cần ai | Có thể làm tiếp |
| --- | --- | --- | --- | --- |
| B01 | V2-P05.05 / M2 | E009: SDK/adapter/fallback đã có, chưa provider live | Lead cung cấp môi trường credentials/quota test và review | Nghiệm thu JD/score/questions với dữ liệu test |
| B02 | V2-P09.01 | E001/E002: SDK Hire cần userId, nguồn chưa rõ | Lead chốt D07/D08/D14 | Precondition/503 và UI disable đã có; chưa provisioning |
| B03 | V2-P08.03/05 | Helper n8n trả true sớm, chưa callback/poll/auth/idempotency | Lead bàn giao workflow và result contract | Lưu lịch + caller đã test; chưa Meet/mail live |

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
| V2-T-SDK-06 | Live/fallback | Evidence riêng, không giả live | BLOCKED | B01/B02/B03; chưa live |
| V2-T-ATS-01 | Chọn job/ba cột | OFFERED/REJECTED không mất | PARTIAL | E003: APPLIED/INTERVIEWING/OFFERED; HIRED live chờ B02 |
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
| V2-T-INT-04 | Workflow live/readback | Meet/mail thật đúng hồ sơ | BLOCKED | B01/B02/B03; chưa live |
| V2-T-INT-05 | Retry/timeout/callback lặp | Dedupe/đối soát đúng contract | BLOCKED | B01/B02/B03; chưa live |
| V2-T-HIRE-01 | Nguồn User/userId | Một owner tạo, không id giả | BLOCKED | B01/B02/B03; chưa live |
| V2-T-HIRE-02 | Hire live | User/access/5 task/link đúng | BLOCKED | B01/B02/B03; chưa live |
| V2-T-HIRE-03 | Double/concurrent/timeout | Không user/task/mail trùng | BLOCKED | B01/B02/B03; chưa live |
| V2-T-HIRE-04 | Email có user | Không chiếm user/đổi role/password | BLOCKED | B01/B02/B03; chưa live |
| V2-T-HIRE-05 | Partial/mock | Status/recovery đúng contract | BLOCKED | B01/B02/B03; chưa live |
| V2-T-SEC-01 | No token/Employee/Manager khác phòng | Backend chặn API nhạy cảm | PASS | E002/E003; stub/live scope xem RUNBOOK |
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


### E022 — Lịch và danh sách phỏng vấn TV2, 07/10/2026

- Commit chứa mục này bổ sung API lịch/phân trang/bộ lọc/chi tiết, JWT/role và Manager scope theo phòng ban; minimal projection và link Meet HTTPS kiểm ở cả BE/FE.
- UI tuần/tháng, lịch/danh sách nhóm ngày giờ VN; tìm/lọc kết hợp, chuyển ngày/hôm nay/trước/sau, Xem thêm, mở chi tiết/link và hồ sơ. Polling lịch30s/chi tiết15s khi tab hiện, hủy request cũ, loading/error/retry/empty; tối đa1.000 buổi/khoảng, vượt mức yêu cầu thu hẹp bộ lọc.
- Build backend/frontend, test calendar7/7 + seed8/8 =15/15 với MySQL/JWT thật, date test1/1 và lint feature đạt. Bản Git chuẩn bị công bố được dựng/kiểm riêng từ seed27fbd3f với đúng các file/hunk lịch.
- Browser kiểm tuần18buổi, tháng66buổi, danh sách, lọc còn1kết quả, chi tiết09:00 ngày08/10, fixture link/target/rel rồi gỡ, mở hồ sơ, Xem thêm vòng2, đổi sang07/01/2027 hiện0buổi rồi Hôm nay trở lại. Viewport thực tế662px; không ghi PASS375px. AI/n8n stub; không tạo phòng/gửi email trong lượt này.
- [x] Implementation và kiểm thử lịch/danh sách.
- Phần readback mới và các gate Gemini/recovery/Hire chưa công bố cùng commit lịch. Lịch đọc `interviews.meetingLink` đã có trong entity; không tự tạo phòng. Tổng task nghiệp vụ cũ không thay đổi.
- Hướng dẫn: [INTERVIEW-CALENDAR.md](INTERVIEW-CALENDAR.md).
