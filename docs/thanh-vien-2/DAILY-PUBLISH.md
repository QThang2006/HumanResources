# Thành viên 2 — Theo dõi công bố code

Cập nhật: **07/10/2026**. Người dùng đã yêu cầu **“push hết các phần còn lại”**; giới hạn một chức năng/commit mỗi ngày của các lượt trước không còn áp dụng cho đợt này.

**Đã công bố phần TV2 còn local ngày07/10 — E024:** theo yêu cầu push mới nhất, commit `67624af8f1ec8ac51909d8da63325170d18b1be1` đã lên `feature/recruitment-ats`; GitHub xác nhận SHA khớp. Gồm readback Meet/trạng thái SMTP, Hire/User/5 task/API/UI, SQL bổ sung, workflow không credential và các helper/test TV2. Main764bf37 đã được tích hợp bằng74dbd50. Build backend/frontend PASS, regression99/99, date test1/1, lint exit0 còn3 warning có trước, PowerShell parser0error. Không gửi provider mới trong lượt công bố.

E023 đã kiểm User + 5 task + HIRED atomic, UI Tuyển/xác nhận/hủy và board/reload với MySQL/HTTP thật, dispatcher stub. Auth thiếu password/role-only được lead sửa và kiểm lại. **Q23/Q24 đã push code**, nhưng recovery lịch/thư, mail chào mừng LIVE và TV3 Workspace còn REVIEW. Ô Đã push không đồng nghĩa nghiệp vụ đã nghiệm thu toàn bộ. [HIRE-INTEGRATION.md](HIRE-INTEGRATION.md) và [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md).

## 1. Trạng thái Git đã xác nhận

Cập nhật mới nhất: code `67624af` đã push và xác nhận remote, tiếp nối lịch E022 `1b841ea` và seed E021 `27fbd3f`. Main764bf37/merge74dbd50 cũng đã có trên nhánh công bố. Tài liệu theo dõi đi cùng đợt này; SHA HEAD tài liệu xem Git thực tế. Hướng dẫn lịch: [INTERVIEW-CALENDAR.md](INTERVIEW-CALENDAR.md); Hire: [HIRE-INTEGRATION.md](HIRE-INTEGRATION.md).

| Nơi | Nhánh | Trạng thái |
| --- | --- | --- |
| `HumanResources` | `feature/recruitment-ats` | Code67624af đã push/xác nhận remote; main764bf37 đã nhận; tài liệu đi cùng đợt |
| `HumanResources-full` | `local/recruitment-complete` | Bản nguồn cũ `3b6fa7f`, giữ local để đối chiếu; code chưa đồng bộ main mới |
| Backup | `backup/recruitment-ats-full-2026-10-01` | `3429b99`, giữ nguyên và không push |

Đợt 07/10: merge `origin/main` tại `9733233` bằng `54cb79a`, giải quyết conflict Jobs giữ CRUD và Q01–Q04, sau đó push code còn lại bằng `8f7212a65be15f1b8efc80346a3a41378d11f3f7`. Không rewrite lịch sử, không force push, không push main/backup/local branch. Commit tài liệu đi sau code; xem Git thực tế để biết HEAD mới nhất.

Jobs giữ hợp đồng cũ: không có page/pageSize trả array; có cả hai trả page envelope; thiếu một bị400. Careers vẫn6 tin/trang, giữ debounce/AbortSignal và tìm wildcard theo nghĩa đen. Client recruitment gửi paging tường minh. Core/entities/auth và workflow mới của lead được giữ từ main.

## 2. Phần tiếp theo còn cần làm

Q01–Q24 đều đã công bố code hiện có. Q20–Q22 còn strict Gemini LIVE; Q23 còn recovery/vận hành; Q24 còn mail chào mừng LIVE/recovery/TV3. Không còn implementation TV2 đã kiểm trong working tree chờ trích/push; file `.temp`, credential và dữ liệu thử riêng giữ ngoài Git.

- **B01:** nghiệm thu JD/score/questions với Gemini thật, credentials và quota hợp lệ; adapter đã hỗ trợ `aiGenerated` từ SDK main và phân biệt LIVE/MOCK. Fallback thật đã test, MOCK score/questions không lưu.
- **B03/Q23:** code67624af đã công bố callback/poll/persist/claim dedupe; E019 website/Meet/SMTP/Inbox LIVE và reload đúng. Còn recovery/đối soát sau crash/mất callback, lỗi provider thật và lead review. Boolean SDK vẫn UNVERIFIED; callback mới là nguồn kết quả bền.
- **B02/Q24 (REVIEW):** contract/service lead và User/5task/HIRED/UI đã công bố ở67624af,99test + browser đạt; còn thư chào mừng LIVE/recovery/cấp lại truy cập và TV3 Workspace.

Kiểm thực tế 07/10: Jobs27/27 + recruitment37/37 = **64/64 PASS**, **10 nhóm browser PASS** với API/MySQL9.6 thật, AI/n8n contract stub. Có thêm test SDK lead thực tế không có key trả MOCK. Backend build, frontend TypeScript/Vite build đạt; lint exit0 còn5 warning, không error. Xem E009 tại [PROGRESS.md](PROGRESS.md) và [RUNBOOK.md](RUNBOOK.md).

## 3. Những gì đã công bố

| Đã lên Git | Ngày | Phần | Commit |
| --- | --- | --- | --- |
| [x] | 01/10/2026 | Tạo Jobs có validation; tách public/admin và scope | `f66b794` |
| [x] | 01/10/2026 | Sửa Jobs, mở/đóng tuyển, chống ghi đè dữ liệu mới | `f74f8ab` |
| [x] | 01/10/2026 | Kiểm thử CRUD/role/scope/concurrency | `c54e905` |
| [x] | 02/10/2026 | Careers đọc danh sách và chi tiết từ API, loading/error/retry | `ecc1e8b` |
| [x] | 02/10/2026 | Q01 tìm tin theo title, debounce/xóa/retry, giữ array và scope | `074f065` |
| [x] | 03/10/2026 | Q02 lọc theo phòng ban, lookup OPEN, kết hợp q và giữ Manager scope | `b6a90cc` |
| [x] | 03/10/2026 | Q03 lọc theo địa điểm, lookup OPEN và kết hợp cả ba bộ lọc | `d4431ab` |
| [x] | 04/10/2026 | Q04 phân trang Careers, tổng kết quả và giữ response array cũ | `1da83aa` |
| [x] | 07/10/2026 | Đồng bộ main mới của lead | `54cb79a` |
| [x] | 07/10/2026 | Q05–Q19; consumer Q20–Q22; guard/caller cho phần tích hợp còn mở | `8f7212a` |
| [x] | 07/10/2026 | Seed demo riêng TV2 | `27fbd3f` |
| [x] | 07/10/2026 | Lịch và danh sách phỏng vấn | `1b841ea` |
| [x] | 07/10/2026 | Đồng bộ service Hire/Auth/Gemini/log mới của lead | `74dbd50` |
| [x] | 07/10/2026 | Q23 readback và Q24 Hire, SQL/workflow/helper/test TV2 | `67624af` |

`007b2ae` là commit đồng bộ main đã có trước đợt Careers, không phải chức năng mới. Lịch sử thực tế giữ nguyên; giới hạn một commit chỉ áp dụng các lượt trước; đợt07/10 công bố hết theo yêu cầu mới.

## 4. Hàng đợi công bố

`SẴN LOCAL` = có implementation trong bản đầy đủ, đã kiểm trong ngữ cảnh bản đầy đủ; **vẫn phải trích và kiểm thử riêng trước khi công bố**. `CHỜ LEAD` = caller có thể đã có nhưng chức năng chưa chạy live. Ô đánh dấu ở bảng này chỉ dành cho **đã push**, không dùng để đánh dấu đã code.

| Đã push | Mã | Một chức năng của đợt | Nguồn bản full | Cần có trước | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| [x] | Q01 | Tìm Careers theo tên công việc | CareersPage, JobsService.list, JobsQuery | ecc1e8b | ĐÃ PUSH 02/10/2026:074f065 |
| [x] | Q02 | Lọc Careers theo phòng ban | CareersPage, jobs/filters, JobsQuery | Q01 | ĐÃ PUSH 03/10/2026:b6a90cc |
| [x] | Q03 | Lọc Careers theo địa điểm | CareersPage, jobs/filters, JobsQuery | Q02 | ĐÃ PUSH 03/10/2026:d4431ab |
| [x] | Q04 | Phân trang Careers có tổng kết quả | PageQuery, JobsService.list, Pagination, recruitment/api | Q03 | ĐÃ PUSH 04/10/2026:1da83aa; opt-in paging giữ array cũ |
| [x] | Q05 | Đăng nhập API thật trong phân hệ tuyển dụng | RecruitmentLogin trong RecruitmentAdminPage | Auth backend đã có, seed test hợp lệ | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q06 | Sidebar Jobs nội bộ theo quyền và chọn tin | RecruitmentBoard, jobs/admin | Q05, list contract | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q07 | Form HR tạo tin tuyển dụng | JobEditor, jobs/departments, createJob | Q06, CRUD API đã có | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q08 | HR sửa JD và mở/đóng tin trên UI | JobEditor, toggleStatus, updateJob/jobStatus | Q07 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q09 | API nhận đơn kèm PDF và trả biên nhận | applications/apply, CvStorageService, SubmitInput, SubmitRateGuard | Jobs OPEN | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q10 | Form ứng tuyển PDF trên trang chi tiết | JobDetailPage, api.apply | Q09 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q11 | API xem danh sách/chi tiết ứng viên có phân quyền | ApplicationsService.list/detail, ApplicationQuery, view DTO | Q09, auth/role | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q12 | Tải CV riêng tư có kiểm quyền | applications/:id/cv, files.read, CandidateDetail.download | Q11 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q13 | Bảng ứng viên ba cột theo job | RecruitmentBoard, CandidateDetail, candidate types/API | Q06, Q11 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q14 | Tìm/lọc/phân trang ứng viên và counts đúng | ApplicationQuery, list, Board filters | Q13 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q15 | Từ chối hồ sơ có xác nhận và chống trạng thái cũ | StateInput, recruitment.policy, status, CandidateDetail | Q13 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q16 | Xếp lịch phỏng vấn lưu DB, chọn Manager | ScheduleInput, schedule, interviewers, CandidateDetail | Q13, private CV nếu demo cần | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q17 | Manager được giao lưu điểm/nhận xét/kết quả | ResultInput, result, ResultForm | Q16 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q18 | HR đề xuất nhận việc sau vòng mới nhất PASSED | status OFFERED, CandidateDetail | Q17 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q19 | Kéo thả APPLIED mở form xếp lịch, hủy an toàn | RecruitmentBoard.dropCandidate, CandidateDetail.focusSchedule | Q16 | ĐÃ PUSH 07/10/2026:8f7212a |
| [x] | Q20 | Gợi ý JD qua SDK và duyệt bản nháp | RecruitmentAiService.jd, JobEditor | Q07, B01 | ĐÃ PUSH CODE 07/10/2026:8f7212a; SDK lead đã nối, còn nghiệm thu LIVE |
| [x] | Q21 | Chấm CV AI, lưu điểm và chống response cũ | RecruitmentAiService.score, ApplicationsService.score | Q09/Q13, B01 | ĐÃ PUSH CODE 07/10/2026:8f7212a; SDK lead đã nối, còn nghiệm thu LIVE |
| [x] | Q22 | Sinh câu hỏi và snapshot theo vòng PV | RecruitmentAiService.questions, ApplicationsService.questions | Q16, B01 | ĐÃ PUSH CODE 07/10/2026:8f7212a; SDK lead đã nối, còn nghiệm thu LIVE |
| [x] | Q23 | Xác nhận email/Meet thật và trạng thái workflow | Schedule/n8n result contract | Q16, B03 | ĐÃ PUSH CODE67624af; E019 readback LIVE đạt, recovery/lead review còn REVIEW |
| [x] | Q24 | Hire thành User và bàn giao5 task | hireCandidate lead + ATS/API/UI | Q18, B02, TV3 | ĐÃ PUSH CODE67624af;99/99/User/5task/HIRED/UI đạt, mail/recovery/TV3 REVIEW |

Thứ tự là gợi ý theo dependency, không phải cam kết phải có đủ24 ngày. Có thể chọn một mục sẵn sàng khác nếu nhóm đang cần; không lấy mục CHỜ LEAD để báo hoàn thành bằng mock.

## 5. Acceptance của các phần (quy tắc chia đợt dưới đây là lịch sử)

### Careers Q01-Q04

- Mỗi đợt chỉ thêm một loại thao tác tìm/lọc/phân trang; giữ các xử lý tải/rỗng/lỗi đã có.
- Q02 dùng lookup chỉ từ tin OPEN. Không lấy thông tin người dùng hay tin CLOSED ra public.
- Q04 thay đổi array sang page envelope là thay đổi API có ảnh hưởng consumer: cập nhật đồng thời controller/service, facade, pages và tests. Nếu muốn giữ tương thích, dùng endpoint/opt-in paging được nhóm thống nhất; không đổi âm thầm GET /jobs.
- Sau mỗi đợt kiểm khi đóng tin và đổi filter/page nhanh, xác nhận link mở đúng ID.

### Nội bộ HR Q05-Q08

- Q05 dùng password/JWT thật của backend. Role switch demo không cấp quyền API. Auth/seed toàn ứng dụng vẫn thuộc lead.
- Q06 kiểm Manager chỉ thấy phòng mình; chọn job/filter rỗng không giữ bảng ứng viên của job khác.
- Q07 có lookup phòng ban và thử lại khi lookup lỗi. Server quyết định createdBy từ JWT.
- Q08 gửi expectedUpdatedAt từ server, xử lý409, không chuyển phòng ban khi đã có đơn.
- Lấy từng component/helper cần thiết; chưa kéo cả Kanban/CV/AI vào đợt form Jobs.

### CV Q09-Q12

- Q09 là một API nhận hồ sơ hoàn chỉnh: PDF thật, tối đa5MiB, parser giới hạn40 trang/60.000 ký tự/10s, file riêng tư, unique email+job, kiểm lại OPEN trong transaction. Receipt chỉ trả thông tin tối thiểu.
- Không tách validation, privacy hoặc chống trùng ra khỏi API upload để có thêm ngày công bố. Nếu đợt quá lớn thì chia endpoint/form như Q09/Q10, giữ API an toàn ngay từ đầu.
- Q10 chỉ báo nhận hồ sơ sau API thành công; có lỗi file, lỗi mạng, duplicate và PDF scan cảnh báo xem thủ công. Không có OCR/link CV tùy ý.
- Q11/Q12 cần test role/scope thật; DTO không lộ rawCvText/storage key/password; PDF không được mount public.

### Kanban và phỏng vấn Q13-Q19

- Q13/Q14 dùng counts trước paging; OFFERED ở cột phỏng vấn, REJECTED có filter riêng; không tính tổng từ trang đầu.
- Q15 từ chối có xác nhận, backend kiểm expectedStatus, terminal không chuyển ngược.
- Q16 lưu lịch và gọi helper n8n hiện có; hiển thị UNVERIFIED/FAILED/NOT_RETRIED đúng. Tin đã lưu không đồng nghĩa email đã gửi. Không thêm webhook/callback không xác thực.
- Q17 chỉ Manager cùng phòng được giao vòng đó được ghi; điểm0..100/feedback/result, có CAS chống ghi đè.
- Q18 dùng kết quả vòng cao nhất, không lấy một vòng cũ đã PASS để vượt qua vòng mới chưa đạt.
- Q19 chỉ mở form khi thả APPLIED sang phỏng vấn, không chuyển thẻ trước API. Hủy/lỗi không đổi DB; bàn phím/mobile vẫn mở hồ sơ được. E023: thả INTERVIEWING/OFFERED sang HIRED mở detail/xác nhận; chỉ backend Hire hợp lệ mới đổi trạng thái.

### AI và Hire Q20-Q24

- Chỉ đưa ra nghiệm thu live sau khi nhận đúng SDK và workflow. Bộ test có stub không thay thế credentials/quota/workflow thật.
- Gợi ý JD là bản nháp HR duyệt/chỉnh sửa. Score/questions MOCK chỉ preview, không lưu giả thành kết quả live.
- Khóa tác vụ trong process và kiểm dữ liệu đã đổi khi AI đang chạy; vận hành nhiều replica cần queue/lock dùng chung do nền cung cấp.
- Hire **đã tích hợp E023 và push67624af**: dùng service lead, ghi User/5task/HIRED trong một transaction và dùng ID DB thật. Không trả password/hash qua ATS; true của dispatcher chỉ UNVERIFIED, chưa là mail gửi thành công. Mail LIVE/recovery/TV3 còn review.

## 6. Những phần còn chờ lead

| ID | Cần bàn giao cụ thể | Có sẵn phía TV2 | Điều kiện bỏ chặn |
| --- | --- | --- | --- |
| B01 | Nghiệm thu Gemini live và môi trường thử | Ba SDK đã nhận từ main9733233; adapter aiGenerated, fallback thật và contract tests đạt | Credentials/quota hợp lệ, chạy provider live với dữ liệu test |
| B03 | Review/recovery workflow sau crash/mất callback/outcome mơ hồ | E019 authenticated claim/callback/persist, UI poll, Calendar/Meet/Inbox LIVE đã đạt | Cơ chế đối soát/recovery không gửi trùng, lỗi provider thật, lead review trước triển khai nhóm |
| B02 (REVIEW) | Mail chào mừng LIVE/recovery/cấp lại truy cập, TV3 Workspace | Contract lead/User/5task/HIRED/UI và99test E023 đã có; no email rebind, DB atomic/dedupe | Review handoff Workspace và đối soát/mail recovery; không tự resend mật khẩu khi chưa biết kết quả |

Auth/seed chung, exception filter/log, metadata/version AI bền và limiter nhiều replica cũng cần lead review trước triển khai môi trường thật; đây không phải các mục đã hoàn tất bằng demo local.

Khi SDK xuất hiện trên Git: kiểm source thực tế và contract, triển khai phần consumer còn thiếu ở bản full, bổ sung test live phù hợp rồi cập nhật bảng. Tài liệu mô tả “đã xong” không tự bỏ blocker.

Fetch ngày03/10 phát hiện `origin/feature/core-ai-automation` tại8266411; diff có cập nhật AI core/Applications và Jobs AI. `origin/main` vẫn2faffef. Nhánh AI chưa được tích hợp hoặc kiểm contract/live trong đợt Q02; B01/B02/B03 chưa được bỏ chặn.

## 7. Quy trình cho lần làm tiếp theo

1. Kiểm Git trạng thái/remote và fetch main mới; dùng bản tích hợp `HumanResources`.
2. Xem B01/B03/B02; chỉ triển khai phần đã có hợp đồng/ownership hoặc thông tin cần thiết. Q05–Q22 đã công bố, không trích lại bản nguồn cũ để tạo commit trùng.
3. Giữ các tính năng/API đã công bố; không ghi đè core/entities/auth/workflows của lead. Test đúng phạm vi, ghi rõ provider live hay stub/fallback.
4. Commit với ngày thực tế và phạm vi thật; push riêng `feature/recruitment-ats`, không force hoặc sửa lịch sử. Nếu remote thay đổi, tích hợp và kiểm lại.
5. Xác nhận SHA remote rồi tích cột Đã push và cập nhật evidence. Q23/Q24 đã có readback/provisioning thực, nhưng checkbox công bố không thay cho gate nghiệm thu recovery/provider/TV3 trong PROGRESS.
6. Quy tắc “một commit hôm nay” chỉ áp dụng nếu người dùng yêu cầu lại cho lượt mới.

Các lệnh kiểm thường dùng trong frontend/backend:

```powershell
# Frontend
node ./node_modules/typescript/bin/tsc -b
node ./node_modules/vite/bin/vite.js build
node ./node_modules/oxlint/bin/oxlint src
# Backend, MySQL test riêng đã sẵn sàng
node ./node_modules/@nestjs/cli/bin/nest.js build
node --test test/jobs-crud.test.cjs test/recruitment.test.cjs
```

## 8. Nhật ký và mẫu cập nhật

| Ngày chuẩn bị | Ngày công bố | Mã | Kết quả | SHA remote | Kiểm thử |
| --- | --- | --- | --- | --- | --- |
| 01-02/10/2026 | 02/10/2026 | Careers đọc cơ bản | Đã push | ecc1e8b | Build/TS/lint;8 nhóm browser API fixture |
| 01-02/10/2026 | 07/10/2026 | Bản full và sửa lỗi | Đã tích hợp/công bố | 8f7212a | Bản tích hợp64/64; browser10 nhóm; AI/n8n stub, SDK fallback thật |
| 01-02/10/2026 | 02/10/2026 | Q01 | Đã push thêm một commit theo yêu cầu | 074f065 | Backend14/14 với MySQL/JWT thật; browser6 nhóm API fixture; build/TS/lint đạt |
| 01-03/10/2026 | 03/10/2026 | Q02 | Đã push đúng một commit | b6a90cc | Backend18/18 MySQL9.6/JWT thật; browser8 nhóm API fixture; build/TS/lint đạt; chưa chạy Q02 trên MySQL8 |
| 01-03/10/2026 | 03/10/2026 | Q03 | Đã push thêm một commit theo yêu cầu mới | d4431ab | Backend22/22 MySQL9.6/JWT thật; browser9 nhóm API fixture; build/TS/lint đạt; chưa chạy Q03 trên MySQL8 |
| 01-04/10/2026 | 04/10/2026 | Q04 | Đã push đúng một commit | 1da83aa | Backend27/27 MySQL9.6/JWT thật; browser6 nhóm API fixture; build/TS/lint đạt; chưa chạy Q04 trên MySQL8 |
| 01-07/10/2026 | 07/10/2026 | Q05–Q22 và guards | Đã push code; live gate riêng | 8f7212a | Jobs27/27 + recruitment37/37; browser10 nhóm; build/TS/lint đạt |
| 07/10/2026 | Chưa công bố | E018 website/n8n live test | LOCAL; không đóng Q23 | Không có commit mới | Interview persist/reload,1 dispatch thật, Calendar/Meet/Inbox VERIFIED; replay201 NOT_RETRIED, Manager khác phòng403; ATS chưa lưu Meet |
| 07/10/2026 | Chưa công bố | E019 callback/readback TV2 | CODE LOCAL + LIVE PASS; chưa đóng toàn bộ Q23 | Không có commit mới |73/73 regression, claim/auth/dedupe, Calendar/SMTP→ATS persist, auto refresh/reload/Inbox VERIFIED; còn recovery/lead review |
| 07/10/2026 | 07/10/2026 | E021 dữ liệu demo TV2 | Đã push riêng seed/demo; giữ E019/E020 local | 27fbd3f | Backend build + seed8/8 MySQL9.6; baseline công bố + demo cũng8/8; CV render/parse, website12 job/108 hồ sơ/90 vòng; DB demo riêng, main .env bị MySQL từ chối đăng nhập |
| 07/10/2026 | 07/10/2026 | E022 lịch/danh sách phỏng vấn | Đã push riêng lịch; readback mới giữ local | 1b841ea | Baseline công bố cũng calendar7/7 + seed8/8; frontend date1/1; build/TS/Vite/lint; browser tuần/tháng/list/lọc/chi tiết/link fixture đã gỡ/empty date; API3003/MySQL13319, AI/n8n stub |

Sau một đợt, thêm dòng với ngày thực tế, mã Qxx, commit SHA, lệnh/test đã chạy, giới hạn chưa kiểm; đổi đúng ô `[ ]` của mục đó thành `[x]` và cập nhật mục2. Nếu upstream đã làm thay phần đó thì ghi “đã có từ upstream” kèm SHA, chọn mục khác có thay đổi thật.

## 9. Câu nhờ dùng lại (sau công bố toàn bộ)

> Đọc DAILY-PUBLISH.md và PROGRESS.md, kiểm tra cập nhật main của lead, chọn một phần còn mở B01/B03/B02 đã đủ hợp đồng, triển khai và kiểm thử đúng phạm vi trước khi push feature/recruitment-ats. Không công bố lại code đã có.

Nếu chỉ muốn xem tiến độ:

> Đọc DAILY-PUBLISH.md và PROGRESS.md, cho tôi biết cái gì đã code local, cái gì đã lên GitHub, cái gì còn chờ lead. Chưa push.
