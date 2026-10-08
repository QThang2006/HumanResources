# Thành viên 2 — Chạy bản tích hợp AI/n8n trước khi push

Cập nhật 07/10/2026, E024. Đã nhận cập nhật lead, build/regression bản tích hợp và **push toàn bộ code TV2 hiện có tại `67624af` lên `feature/recruitment-ats`**, SHA remote đã xác nhận. Đây là công bố code; Gemini vận hành, recovery lịch/thư, welcome-mail LIVE và handoff TV3 còn chờ nghiệm thu. Các mục E011/E017–E020 bên dưới là lịch sử kiểm provider/runtime.

## Phạm vi test được người dùng xác định

Chỉ kiểm thử phần liên quan thành viên2 (TV2): CRUD/tìm kiếm/phân quyền tin tuyển dụng; nộp, xem và xử lý CV/hồ sơ ATS; AI tạo JD, chấm CV, câu hỏi phỏng vấn; lịch phỏng vấn, quyền Manager và kết quả; handoff/guard từ ATS theo phạm vi TV2. AI dùng SDK chung nhưng chỉ gọi ba chức năng TV2.

Với n8n, chỉ test `interview-schedule` và nội dung thư mời/thông báo lịch phỏng vấn. Ưu tiên workflow riêng để không bật các luồng khác. Không chạy test `employee-hired`, `burnout-alert`, RAG/Copilot, cảm xúc, khóa học hoặc xử lý onboarding của thành viên khác. Không dùng script `backend/src/test-n8n.ts` vì script gọi cả ba sự kiện. Nếu phát hiện lỗi ở SDK chung, chỉ điều tra phần ảnh hưởng TV2 và ghi rõ ranh giới.

## 1. Trạng thái đã xác minh

| Kiểm tra | Kết quả |
| --- | --- |
| Fetch origin và nhận main lead | main764bf37 đã nhận qua merge74dbd50; bản công bố code67624af chứa cập nhật này |
| Nhánh AI của lead | feature/core-ai-automation đã merge vào main764bf37; không có main mới chưa nhận trong E024 |
| Backend build, TypeScript/Vite frontend | PASS |
| Regression API/MySQL/JWT | E02499/99 PASS, gồm Hire/readback và workflow contract fixtures; AI/n8n provider dùng stub. E02074/74 và12 tình huống Code-node là bằng chứng lịch sử |
| SDK Gemini thực của lead qua API TV2 | E011 score/questions LIVE/persist; E020 JD LIVE qua API. Strict mới nhất score/questions MOCK sau503/429; aiLiveAcceptance=false. UI E020 cả3 lần MOCK, không persist điểm/câu hỏi |
| n8n engine local | n8n2.42.3 tại Temp riêng, khởi động127.0.0.1:5678; editor và /healthz/readiness200; JS Task Runner đã đăng ký |
| Import workflow lead | Đã import interview-schedule vào DB n8n riêng, inactive; chạy lại giữ cùngid |
| Nghiệm thu Gemini LIVE | CHƯA ĐẠT vận hành toàn bộ: từng method có LIVE riêng, lượt strict mới nhất fail503/429; dừng retry khi gặp429 |
| Calendar/Meet/mail provider smoke TV2 | ĐẠT trong workflow test riêng hrTv2LiveSelf01: tạo event/Meet thật, GET readback id/time/title/link đúng, SMTP một recipient ACCEPTED, Gmail Inbox/time/href VERIFIED |
| Schedule từ website/API TV2 | E018 ĐẠT trên DB riêng và workflow hrTv2WebLive01: HR lưu11:00 ngày08/10, API/DB1 vòng và1 dispatch thật, n8n/Meet/Inbox VERIFIED. Reload giữ lịch, replay NOT_RETRIED/1 vòng/1 dispatch, Manager khác phòng403. ATS meetingLink=null; Q23 còn readback/retry bền. Telegram chưa kiểm |
| Readback về ATS TV2 | E019 ĐẠT: workflow hrTv2Readback01 claim/callback có xác thực, persist Meet/eventId/SMTP_ACCEPTED, website tự hiện và reload đúng; Gmail Inbox12:00 ngày08/10 VERIFIED.73/73 HTTP/MySQL regression đạt. Còn recovery/outbox khi crash/mất callback và lead review |
| Hire từ ATS | E023/E024 DB/API/UI đạt: User +5task+HIRED atomic, password/login/role/state/dedupe/rollback kiểm bằng99regression; welcome dispatcher stub, mail LIVE/recovery/TV3 còn REVIEW |
| Push mới | Code67624af đã push feature/recruitment-ats; git ls-remote xác nhận SHA khớp. Tài liệu E024 đi cùng đợt công bố |

Audit E020 còn xác nhận PDF/REJECTED/filter, Manager91/PASSED→HR OFFERED và readback còn nguyên. Lỗi Auth cấp token HR không password ở E020 **đã được lead sửa trên main764bf37 và chặn lại bằng regression E023/E024**; chưa coi toàn bộ Auth/frontend/log đã audit. Báo cáo: [REMAINING-TESTS.md](REMAINING-TESTS.md). Các mục provider/runtime bên dưới giữ làm lịch sử; trạng thái công bố mới nhất là E024.

`isAvailable()` hoặc tồn tại3 method không chứng minh LIVE. `triggerInterviewScheduled()` trả true trước khi fetch hoàn tất; API trả UNVERIFIED. HTTP200 của workflow chỉ xác nhận tiếp nhận, không chứng minh Google Calendar/email đã chạy.

## 2. Cấu hình cần nhận từ lead

Đặt bí mật vào backend/.env hoặc environment của tiến trình, không commit hoặc đưa vào báo cáo:

- GEMINI_API_KEY hợp lệ và GEMINI_MODEL mà tài khoản thực sự hỗ trợ. Ngày07/10 người dùng đã điền key vào backend/.env; Google trả200 cho kiểm tra cấu hình, gemini-3.6-flash có trong danh sách generateContent. Vẫn phải kiểm thực tế từng chức năng; danh sách model không bảo đảm mọi yêu cầu sinh nội dung thành công.
- N8N_WEBHOOK_URL của n8n đang chạy; nhận đúng file workflow/version đang dùng.
- Credential Google Calendar OAuth2 của tài khoản thử; bật tạo hội nghị Google Meet.
- SMTP hoặc dịch vụ email được workflow dùng, sender/recipient thử nghiệm được phép gửi.
- Telegram credential/chatId nếu giữ node Telegram; thống nhất tắt node này nếu không dùng.
- Hợp đồng kết quả callback/poll/idempotency cho readback mail/Meet và hợp đồng provisioning User/5 task nếu nghiệm thu Hire.

Không chạy backend/src/test-n8n.ts nguyên bản: script này hard-code email/chatId của lead và gửi3 sự kiện thật. Quyền gửi thử trong phiên chỉ áp dụng cho dữ liệu giả TV2 gửi về chính Gmail cá nhân đã xác nhận; không bao gồm recipient của lead/Telegram hoặc hai sự kiện khác.

## 3. Lệnh kiểm SDK thực bằng API và DB riêng

Chạy từ backend sau build, với MySQL test riêng tại127.0.0.1:13316; tránh DB nhóm:

```powershell
$env:ATS_TEST_DB_PASSWORD = 'MAT_KHAU_MYSQL_TEST'
node ./node_modules/@nestjs/cli/bin/nest.js build
node --test test/jobs-crud.test.cjs test/recruitment.test.cjs
# Đọc SDK và config thực; không override Gemini/N8n bằng stub.
# Không gửi n8n mặc định; Interview được tạo như fixture DB riêng.
$env:ATS_REQUIRE_LIVE = '1'
$env:ATS_AI_TRANSIENT_RETRIES = '2' # Tùy chọn: tối đa2 lần thử lại sau lỗi provider500/502/503/504 đã hoàn tất
node test/recruitment-runtime.cjs
```

Harness tạo database hr_ats_test_<16hex> và CV tạm riêng, JWT/password thật, rồi dọn trong finally. Báo cáo aiLiveAcceptance phải true mới nghiệm thu3 chức năng Gemini live. Khi SDK fallback, lệnh strict thất bại có chủ đích; không đổi MOCK thành LIVE để qua kiểm.

Kết quả mới nhất sau cấu hình key: JD=MOCK (3 attempts, cả3 provider503), score=LIVE (1 attempt), questions=LIVE (2 attempts, lần đầu provider503). Điểm và câu hỏi LIVE đã được lưu và đọc lại đúng qua API. Kiểm riêng SDK đã từng tạo JD LIVE, nhưng kiểm toàn bộHTTP vẫn aiLiveAcceptance=false nên gate vẫn mở. Chẩn đoán Google báo model đang có nhu cầu cao; không phải lỗi key. Hai probe nhỏ với model khác chưa cho cấu hình thay thế đã xác minh, vì vậy backend/.env vẫn giữ gemini-3.6-flash. Không gửi n8n trong các lần kiểm AI; các database/CV/server MySQL thử đã được dọn.

Runtime mặc định không retry. Tùy chọn trên chỉ thử lại response201/MOCK sau lỗi server tạm thời đã được ghi nhận; không thử lại LIVE, timeout còn đang chạy, lỗi xác thực hoặc quota429. Báo cáo chỉ giữ mã HTTP và số lần thử, không ghi key hay thông báo provider thô.

Tùy chọn ATS_RUNTIME_N8N=1 gọi helper thực đến localhost n8n; script kiểm URL từ ConfigService, dùng địa chỉ example.invalid và không coi UNVERIFIED là mail/Meet thành công. Chỉ dùng sau khi đã chuẩn bị môi trường n8n/credentials và thống nhất gửi thử; không phải bài kiểm xác nhận giao thư.

## 4. Nghiệm thu n8n

Phát hiện thực tế: CLI n8n2.42.3 import file lead nguyên bản lỗi `SQLITE_CONSTRAINT: NOT NULL constraint failed: workflow_entity.id`. Helper dưới đây thêmid ổn định vào bản sao và buộc inactive; không sửa workflow template của lead:

```powershell
# Tại root repository
node scripts/prepare-n8n-import.cjs
$env:N8N_USER_FOLDER = Join-Path $env:TEMP 'hr-n8n-data-20261007'
$env:N8N_DIAGNOSTICS_ENABLED = 'false'
$env:N8N_VERSION_NOTIFICATIONS_ENABLED = 'false'
$n8nCli = Join-Path $env:TEMP 'hr-n8n-runtime-20261007/node_modules/n8n/bin/n8n'
node $n8nCli import:workflow --input=.temp/n8n-import/interview-schedule.json
```

Ban đầu đã xác minh import lặp vẫn chỉ có1 workflow idhrTv2Interview01, active=0. Sau bước hướng dẫn test, đã nhập thêm master và bản test riêng: tổng3 workflow, chưa publish. Có thể lưu cả master và các workflow riêng ở trạng thái inactive; chỉ activate một lựa chọn vì webhook paths production giao nhau.

Ngày07/10/2026: helper chuẩn bị thêm master có idhrMasterEcosystem01 và đổi tên3 responder trùng trong bản sao; template lead không đổi. Workflow hrTv2LocalTest01 dùng đường dẫn riêng `hr-tv2-local-test/interview-schedule`, nhận webhook thật, chạy Code thật, thay Google Calendar bằng dữ liệu MOCK và hai bước gửi bằng kiểm tra preview. Manual execution trong n8n thành công; hai nhánh preview hoàn tất, không gửi email/Telegram hoặc tạo lịch Google. Lệnh `scripts/test-n8n-local.ps1` trả success=true, mode=LOCAL_TEST, delivery=NOT_SENT. Hướng dẫn chạy lại: [TEST-N8N.md](TEST-N8N.md). Đây chưa phải bằng chứng LIVE; gate Gemini và mail/Meet tiếp tục mở.

Runtime cài ngoài repo để tránh npm install script lỗi với ký tự& trong tên thư mục môn học. Nếu cần cài lại, dùng Node24 và lệnh npm trong đường dẫn ASCII riêng, không sửa package/lockfile của backend/frontend. Dữ liệu n8n riêng: `%TEMP%/hr-n8n-data-20261007/.n8n`.

```powershell
$env:N8N_LISTEN_ADDRESS = '127.0.0.1'
$env:N8N_HOST = 'localhost'
$env:N8N_PORT = '5678'
$env:N8N_SECURE_COOKIE = 'false' # Chỉ local HTTP
node $n8nCli start
```

Mở http://localhost:5678 để tạo owner local rồi gắn credentials. Workflow vẫn inactive. Python runner chưa có virtualenv; workflow lead đang dùng Code JavaScript, JS Task Runner đã đăng ký. Các cảnh báo native/internal runner là giới hạn môi trường local, chưa nghiệm thu production.

1. Chạy n8n local trong runtime riêng; Docker Desktop hiện không có engine hoạt động. Không reset Docker hoặc xóa dữ liệu có sẵn.
2. Import workflows/interview-schedule.json và cấu hình credential. Chỉ activate khi đã kiểm người nhận và quyền gửi thử.
3. HR xếp lịch qua API TV2. Kiểm Interview lưu đúng application/Manager/timezone/round.
4. Mở execution n8n, kiểm từng node Google Calendar/Email; lấy eventId/link Meet thật và chứng cứ thư đến đúng địa chỉ thử.
5. Test lỗi/timeout/lặp của lịch phỏng vấn TV2; không tự retry một request chưa biết kết quả để tránh gửi trùng.
6. HTTP200/UNVERIFIED không đủ nghiệm thu Q23. Q24 đã tích hợp service Hire lead và công bố E024; DB/API/UI đạt, nhưng welcome-mail LIVE/recovery/TV3 vẫn cần kiểm riêng.

## 5. Công bố code và điều kiện nghiệm thu còn lại

- [x] Code lead mới nhất đã được nhận.
- [x] Build và regression TV2 đạt.
- [x] SDK lead thực qua HTTP chạy được; fallback được ghi đúng.
- [ ] Strict Gemini LIVE đạt cùng lượt cho JD/score/questions; bằng chứng từng method riêng E011/E020 chưa đóng gate vận hành.
- [x] Provider smoke Google Calendar/Meet/email có credentials và execution thành công; Inbox đã xác minh trong Gmail. Chỉ bản test riêng TV2.
- [x] Xếp lịch từ website/API TV2: Interview persist/readback, caller thật và workflow test riêng được kiểm E018; Google Calendar/Meet và Gmail Inbox VERIFIED. Chưa chạy DB nhóm/Telegram/nguyên graph gốc.
- [x] E019 link/eventId/trạng thái SMTP lưu lại ATS qua callback theo vòng có xác thực; UI poll/reload và Inbox đã kiểm. Hướng dẫn/schema/config: [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md).
- [ ] Q23: recovery/đối soát khi crash/mất callback/outcome mơ hồ, kiểm lỗi provider thật và lead review trước triển khai nhóm.
- [x] Người dùng yêu cầu push toàn bộ code TV2 hiện có; các giới hạn LIVE/recovery/handoff được ghi rõ, không tích DONE cho gate chưa đạt.
- [x] E024 review diff, commit code67624af ngày thực tế, push feature/recruitment-ats và xác nhận SHA remote; tracker cập nhật cùng đợt công bố.

Code đã công bố để lead review/tích hợp. Chỉ báo nghiệm thu toàn bộ khi các gate LIVE/recovery/handoff đạt; không lấy việc push hoặc provider stub làm bằng chứng delivery thực tế.
