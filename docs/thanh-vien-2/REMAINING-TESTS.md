# TV2 — Kết quả kiểm tra các phần còn lại

Cập nhật 07/10/2026, evidence E020/E023/E024. Chỉ kiểm Jobs, Careers, ATS, AI tuyển dụng, phỏng vấn và Hire. **Toàn bộ code TV2 hiện có đã push `67624af` lên `feature/recruitment-ats`**, SHA remote đã xác nhận. Các dòng E020 là lịch sử; Hire/Auth hiện hành đã tích hợp E023 và kiểm/công bố E024.

## Kết quả chính

- **E024 mới nhất:** code67624af đã công bố, chạy lại **99/99 regression PASS**, build backend/frontend PASS, date1/1 PASS, lint exit0 còn3warning, PowerShell parse0error. E023 đã kiểm main764bf37/merge74dbd50 và service Hire lead với ATS transaction/role/state: User + 5 task + HIRED atomic, duplicate/concurrent/email collision/rollback/dispatch false-throw-replay. Browser xác nhận/hủy, board HIRED và reload/userId đúng. Provider Hire dùng stub, không mail LIVE hoặc Workspace. [HIRE-INTEGRATION.md](HIRE-INTEGRATION.md).
- **Auth E023:** lỗi login thiếu password/role-only E020 được lead sửa và regression đã chặn. Chưa coi toàn bộ frontend Auth/log/security đã audit.

Các kết quả dưới đây thuộc **audit lịch sử E020**; Hire503 và lỗi Auth ở lượt đó đã được giải quyết bằng E023/E024:

- Readback đã hoạt động: website lưu và đọc lại link Meet, event Google và trạng thái SMTP theo đúng vòng. Kết quả còn nguyên sau Manager chấm 91/100, HR chuyển sang OFFERED và tải lại hồ sơ.
- Regression **74/74 PASS** với HTTP/MySQL/JWT/password thật. AI và provider trong regression dùng contract fixture. Trong 74 có một bài workflow chứa 12 tình huống chạy đúng Code-node từ file JSON, không gọi Google/SMTP.
- Kiểm thêm **27 assertion API PASS** trên fixture website đang chạy: quyền đọc/chấm, CV riêng tư, MOCK không persist, readback giữ nguyên và Hire trả503 không đổi trạng thái. Kết quả này tách với 74 regression.
- UI thật: bản nháp JD MOCK được ghi rõ, HR đưa vào form/sửa/lưu; Careers đọc đúng nội dung đã sửa; nộp PDF tạo hồ sơ #2; HR từ chối và bộ lọc REJECTED hiện đúng. Manager lưu kết quả, HR đọc/đề xuất, hủy từ chối giữ OFFERED; Escape đóng dialog; đổi bộ lọc nhanh giữ kết quả cuối.
- Gemini qua API/DB tạm: **JD LIVE** ở lần đầu; score MOCK sau3 lỗi503; questions MOCK sau2 lỗi503 và1 lỗi429. Dừng gọi thêm khi gặp429. Cả3 method từng có bằng chứng LIVE riêng (score/questions E011, JD E020), nhưng lượt nghiệm thu đồng thời mới nhất **aiLiveAcceptance=false**. Website E020 cũng trả MOCK cho cả3 lần gọi; không coi bản nháp đó là LIVE.
- Phát hiện lỗi ở Auth chung: email hợp lệ + role HR, không có password, vẫn cấp token và đọc hồ sơ200. Guard tuyển dụng đúng với vai trò trong token, nhưng demo login làm mất bảo đảm xác thực bằng mật khẩu.

## Ma trận phạm vi

| Phase / test | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| P00 ownership/contract | Đã nhận Hire E023, REVIEW handoff | Provisioning main764bf37 đã tích hợp; callback TV2 có contract. Mail recovery/TV3 còn review; không tự gửi tin cho lead. |
| P01/P02 Jobs CRUD/public/filter/page | PASS | E009 và regression E020; schema/input/stale writes, scope và OPEN/CLOSED có test. Careers E020 đọc JD đã chỉnh sửa. |
| P03/P04 PDF/Application | PASS | Regression kiểm PDF giả/hỏng/lớn/scan, trùng/concurrent, rollback khi Job đóng/DB lỗi, SSRF/input riêng tư; CUA E020 nộp PDF thật và nhận mã #2. |
| P05 SDK/provenance/schema/timeout | PASS contract, PARTIAL LIVE | Regression kiểm missing SDK, output sai/timeout, duplicate/stale AI; E011/E020 là bằng chứng provider riêng. Không persist MOCK. Provider503/429 khiến strict LIVE hiện chưa đạt. |
| P06 ATS/ba cột/filter/concurrency | PASS local | E009/E020/E023: các trạng thái gồm HIRED/User DB thật; board và reload đúng. Chưa khẳng định mọi race UI hoặc drag mới đã được kiểm trên browser. |
| P07 Manager/result/HR đọc lại | PASS | E020 chấm91/PASSED trên website, HR OFFERED; peer/HR không chấm thay được, Manager không thực hiện action HR. Latest-round/stale/concurrent/terminal có regression. |
| P08 schedule/Meet/email/readback | PASS happy path LIVE | E018/E019: website→API/MySQL→n8n→Calendar/SMTP→ATS; Inbox được kiểm độc lập. E020 xác nhận kết quả không mất sau chấm/đề xuất/reload. |
| P08 lỗi/duplicate/timeout | PASS contract, PARTIAL vận hành | Backend có auth/claim/replay/expiry/UNKNOWN/partial SMTP tests; 12 workflow fixture kiểm event/time/Meet/recipient/HTML/failure/retry. Không cố tình tạo outage Google/SMTP thật. |
| P09 Hire/User/5 task/TV3 | PASS DB/UI, REVIEW delivery/handoff | E023 User/password/login/5task/HIRED/link/dedupe/rollback đạt HTTP/MySQL/browser; dispatcher stub. Mail LIVE/recovery và TV3 Workspace chưa nghiệm thu. |
| P10 quyền/CV/DTO | PASS tested API, REVIEW chung | Guards/CV đạt; Auth thiếu password/role-only lead đã sửa và kiểm E023. Chưa audit toàn bộ frontend Auth/log. |
| P10 UI/phím/responsive | PASS desktop; mobile lịch sử | CUA E020 kiểm loading/MOCK/result/offer/cancel/reject/Escape. Viewport override390 trong lượt này vẫn báo actual1280 nên không ghi PASS mobile mới; E009 có mobile375/390 và tablet768. |
| P10/P11 build/ops/handoff | PASS local, ĐÃ PUSH CODE, REVIEW triển khai | Build backend/frontend E024, regression99/99. Code67624af đã push/xác nhận remote; runner dùng MySQL/Temp riêng. Chưa deploy DB nhóm hoặc mở PR; delivery/recovery/TV3 vẫn REVIEW. |
| V2-T-E2E-01 Job→Apply→AI→ATS→Manager | PASS các bước; PARTIAL LIVE nối tiếp | UI Job/PDF/ATS/Manager dùng API thật; AI website trả MOCK và không lưu. API JD LIVE ở DB tạm riêng, không ghép bằng chứng thành một lần E2E LIVE. |
| V2-T-E2E-02 Schedule→Meet/mail→Hire→TV3 | PARTIAL | Meet/mail/readback LIVE E019; Hire DB/UI E023 đạt với dispatcher stub. Chưa một lượt E2E LIVE tới welcome-mail/Workspace TV3. |

## Những phần cần hoàn thiện trước nghiệm thu toàn bộ

1. **Auth/frontend/log chung (Lead):** lỗi backend login không password E020 đã được sửa ở main764bf37 và chặn lại E023. Frontend AuthContext/LoginPage và sanitization/log toàn hệ thống vẫn cần review riêng; không báo đã audit tất cả.
2. **Hire delivery/handoff (Lead + TV2 + TV3):** DB provisioning và API/UI đã đạt E023. Cần mail chào mừng LIVE/readback/đối soát, recovery/cấp lại truy cập sau crash hoặc dispatch lỗi và TV3 xác nhận Workspace đọc/cập nhật 5 task đúng user. Không tạo User/task lại hoặc gửi mật khẩu lần nữa bằng bấm tuyển lại.
3. **Recovery lịch/thư (Lead + TV2):** cần đối soát khi crash/mất callback/outcome mơ hồ. Claim hiện chống tạo/gửi lặp; callback lặp an toàn; chưa có outbox/queue hoặc công cụ recovery. Không dùng xếp vòng mới để gửi lại một vòng chưa biết kết quả.
4. **Gemini vận hành:** main mới có retry do lead cung cấp; chưa nghiệm thu provider lại trong E023. Cần quota/công suất rồi kiểm strict LIVE; không lấy regression stub thay cho provider thành công.
5. **Review còn lại:** lỗi500/log dùng chung cần sanitization; mọi race UI và responsive mới chưa đủ bằng chứng riêng. Những giới hạn này không phủ nhận kết quả đọc lại Meet đã đạt.

## Chạy lại và chứng cứ

```powershell
# Tại root repo; MySQL9.6 đã cài, port13317 phải rảnh
node scripts/test-tv2-hire.cjs
# Một bài workflow độc lập, không có MySQL/provider
node --test backend/test/interview-workflow.test.cjs
```

Runner tạo MySQL/database/CV tạm thuộc bài test và dọn trong finally; không dùng DB nhóm. Trên môi trường hạn chế tạo process con, test runner cần quyền chạy tiến trình con; lỗi EPERM không được tính là test đã chạy hoặc lỗi nghiệp vụ.

Evidence private, Git ignore: `.temp/n8n-import/tv2-e020-regression.log`, `tv2-e020-api.json`, `tv2-e020-workflow.json`, `tv2-e020-ai-live.log`, `tv2-e020-website.png`. Không commit ảnh có Gmail cá nhân, link Meet thật, key, token hoặc credential. Các script `.temp` phục vụ lượt audit có thể được dọn; regression workflow đã nằm trong `backend/test/interview-workflow.test.cjs`.

Website hiện http://localhost:5173/admin/recruitment → API3005/MySQL13320, seed synthetic và dispatcher stub; Application5 Nguyễn Ngọc Mai HIRED/user7/5task/1stub dispatch E023. Runtime readback cũ3011 vẫn được giữ riêng, không phải API website đang dùng. **SMTP_ACCEPTED** là máy chủ email nhận gửi; **DISPATCHED_UNVERIFIED** của Hire chưa chứng minh mail được nhận. Hướng dẫn: [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md) và [HIRE-INTEGRATION.md](HIRE-INTEGRATION.md).
