# Contract triển khai tuyển dụng TV2

Ngày **07/10/2026**. Contract hiện hành của `HumanResources` / `feature/recruitment-ats`: code `67624af` đã push và xác nhận SHA remote; main lead `764bf37` đã merge tại `74dbd50`. Hire/readback đã công bố. SDK lead đã nhận; consumer chuẩn hóa aiGenerated và vẫn hỗ trợ envelope ok/mode/data cho contract tests. Hire DB/UI đạt E023/E024; mail chào mừng/recovery/TV3 còn REVIEW.

## API hiện có

Prefix /api. JSON thành công qua wrapper chung `{ success, statusCode, data, timestamp }`; apiClient bóc wrapper một lần. Endpoint CV trả binary PDF riêng.

| Method/path | Quyền | Input/response chính |
| --- | --- | --- |
| GET /jobs | Public | q, departmentId, location, page, pageSize; chỉ OPEN |
| GET /jobs/filters | Public | departments[{id,name}], locations[] từ tin OPEN |
| GET /jobs/:id | Public | OPEN hoặc 404 |
| GET /jobs/admin | HR/Admin/Manager | Query như public + status; Manager theo phòng |
| GET /jobs/admin/:id | HR/Admin/Manager | Tin bất kỳ trạng thái trong scope |
| GET /jobs/departments | HR/Admin | id/name/code, không User |
| GET /jobs/capabilities | Nội bộ recruitment | jd/score/questions là method availability; hire=true ở code67624af |
| POST /jobs | HR/Admin | title, departmentId, description, requirements, location?, salaryRange? |
| PATCH /jobs/:id | HR/Admin | Full JobInput + expectedUpdatedAt ISO |
| PATCH /jobs/:id/status | HR/Admin | status OPEN/CLOSED + expectedUpdatedAt |
| POST /jobs/ai-generate | HR/Admin | title, departmentName, level; preview mode/data |
| POST /applications/apply | Public | Multipart jobId, candidateName, candidateEmail, candidatePhone?, cv |
| GET /applications | HR/Admin/Manager | jobId bắt buộc; q/status/minScore/page/pageSize |
| GET /applications/:id | HR/Admin/Manager | Hồ sơ và interviews trong scope |
| GET /applications/:id/cv | HR/Admin/Manager | PDF attachment, private/no-store/nosniff |
| GET /applications/interviewers | HR/Admin | jobId; Manager active cùng phòng |
| PATCH /applications/:id/status | HR/Admin | expectedStatus + status; chỉ chuyển được theo bảng dưới |
| POST /applications/:id/score | HR/Admin | Không nhận text/điểm client; dùng CV/JD server |
| POST /applications/:id/interview | HR/Admin | interviewerId, scheduledAt ISO có múi giờ, round |
| POST /applications/interviews/:id/questions | HR/Admin | CV/requirements server; snapshot lên Interview |
| PATCH /applications/interviews/:id/result | Manager được giao | score int0..100, feedback1..5000, result PASSED/FAILED, expectedResult, expectedUpdatedAt |
| POST /applications/:id/hire | HR/Admin | INTERVIEWING/OFFERED + latest PASSED → User/5 task/HIRED atomic; receipt tối thiểu, đã HIRED trả idempotent; email có tài khoản409 |

Public `all=true` bị400. GET /jobs và /jobs/admin không gửi paging vẫn trả array; phải gửi đồng thời page và pageSize mới nhận `{items,total,page,pageSize}`, thiếu một bị400. Public luôn OPEN dù có status. Applications list luôn trả page envelope. Applications list thêm `counts` theo toàn bộ bộ lọc trước paging. Mặc định không gồm REJECTED; chọn status=REJECTED để xem riêng. Không có endpoint /summary riêng. Frontend api/jobs.api.ts giữ client array/getPage đã công bố; recruitment/api gửi paging tường minh; api/applications.api.ts là facade nghiệp vụ mới.

Jobs page1..100000/pageSize1..100 khi paging; Applications mặc định page1/pageSize20. Thứ tự createdAt DESC rồi id DESC. UI Careers6/job sidebar10/applications30 mỗi trang. Board phân trang chung cho ba cột, có counts toàn bộ filter và chú thích rõ.

Tin đã có hồ sơ không được chuyển departmentId. Revision updatedAt tăng tối thiểu một giây mỗi thay đổi có kiểm concurrent, tương thích cả database cấu hình timestamp chỉ chính xác đến giây. Client phải dùng updatedAt trả từ server, không tự tính.

Submit chỉ trả applicationId/submittedAt/message/warning. Không nhận link CV hoặc rawCvText client. PDF scan được lưu với rawCvText null và cảnh báo. Email lowercase/trim, unique jobId+candidateEmail; job bị đóng trong lúc parse được kiểm lại trong transaction.

Application DTO không có cvFileUrl/rawCvText/user.passwordHash. Điểm chưa chấm là null, khác 0. CV UUID chỉ được đọc sau guard và kiểm scope. Manager xem hồ sơ trong phòng; chỉ Manager có interviewerId trùng JWT mới ghi result.

## State machine

| Từ | Đến | Action |
| --- | --- | --- |
| APPLIED | INTERVIEWING | Lưu lịch hợp lệ |
| INTERVIEWING | INTERVIEWING | Xếp vòng kế tiếp |
| INTERVIEWING | OFFERED | PATCH status; vòng mới nhất PASSED |
| APPLIED / INTERVIEWING / OFFERED | REJECTED | PATCH có expectedStatus; UI xác nhận |
| INTERVIEWING / OFFERED | HIRED | Chưa mở, cần provisioning contract |
| HIRED / REJECTED | Trạng thái khác | Không cho phép |

UI cho HR/Admin kéo APPLIED sang cột phỏng vấn để mở form xếp lịch; chỉ chuyển sau khi API lưu thành công. Hủy/lookup lỗi không đổi trạng thái. Bấm thẻ và bàn phím vẫn dùng được; Manager không kéo. Kéo sang HIRED chỉ thông báo đang chờ tích hợp, không gọi mutation. Backend vẫn chặn PATCH trực tiếp sang INTERVIEWING/HIRED.

Interview result cho phép Manager được giao sửa khi application còn INTERVIEWING; CAS expectedResult + expectedUpdatedAt chống ghi đè. PASSED không tự động Hire. HR xét vòng có round lớn nhất, không lấy kết quả tốt nhất trong lịch sử.

## Ba SDK Gemini đã nhận từ main9733233

```typescript
generateJobDescription(title: string, departmentName: string, level: string)
scoreResume(resumeText: string, jobDescription: string)
generateInterviewQuestions(resumeText: string, requirements: string)
// SDK lead trả object có aiGenerated:boolean (true=LIVE, false=MOCK).
// Consumer trả { mode: 'LIVE' | 'MOCK'; data: ... } đã chuẩn hóa.
// Envelope { ok:true, mode, data } vẫn được hỗ trợ cho contract tests.
```

| Method | data |
| --- | --- |
| generateJobDescription | Lead: summary/responsibilities[]/requirements[]/benefits[] → consumer description:string, requirements:string, benefits:string |
| scoreResume | Lead: matchScore:number0..100, summary:string, matchedSkills[] → consumer skillsDetected[] |
| generateInterviewQuestions | Lead: questions:{question,...}[] → consumer questions:string[] dài3..5; metadata chi tiết chưa lưu trong schema hiện hành |

Adapter `RecruitmentAiService` nằm trong modules/jobs của TV2, gọi đúng method trên GeminiService. Chưa có method →503; thiếu aiGenerated hoặc mode/sai schema →502; provider exception →502 đã che chi tiết; quá45giây →503. Không viết prompt hoặc Gemini core trong TV2.

MOCK JD là bản nháp có nhãn, HR có thể chọn đưa vào form và sửa trước khi đăng. MOCK score/questions chỉ preview, saved=false, không persist vì schema chưa có mode. LIVE score/questions ghi DB khi revision CV/application/interview/JD vẫn phù hợp. Score khóa tác vụ cùng application trong process; dữ liệu cũ bị409. Không auto-retry provider timeout để tránh chồng request.

capabilities=true chỉ có nghĩa tồn tại method; không đảm bảo credentials, quota hoặc live provider khỏe. Score và questions có khóa theo application/interview trong process, trả409 khi yêu cầu trùng; khóa được giải phóng kể cả SDK lỗi.

## Schedule/n8n

Trước gọi SDK, transaction lưu Interview và status INTERVIEWING. Time ISO tương lai, có zone, chính xác đến giây; round nối tiếp, interviewer active và cùng department. Cùng application/round/time/interviewer trả lại lịch đã lưu, không dispatch lần hai; cùng round nhưng payload khác trả409.

Payload gọi `triggerInterviewScheduled`: interviewId, applicationId, candidateName, candidateEmail, interviewerName, interviewerEmail, scheduledAt UTC ISO, round.

Response `{interview,dispatch,message}`:

- UNVERIFIED: helper trả true; không xác nhận gửi mail/Meet.
- FAILED: helper trả false hoặc throw; lịch vẫn giữ.
- NOT_RETRIED: lịch đã có; không gửi lại webhook.

Theo yêu cầu tiếp theo07/10, đã triển khai callback có xác thực và tracking riêng TV2: metadata delivery theo vòng; claim một lần trước provider, Calendar GET→callback lưu meetingLink/eventId, SMTP→callback lưu SMTP_ACCEPTED. Token256 bit được hash trong DB, callback/claim chống lặp và kiểm đúng aggregate. Website poll khi đang chờ và giữ link/trạng thái sau reload. Contract/config/schema/workflow riêng và E019 tại [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md). SDK core của lead giữ nguyên; AppModule chỉ đăng ký thêm entity TV2. Q23 còn recovery/đối soát sau crash/mất callback và lead review; không tự resend provider khi outcome mơ hồ.

## Hire: contract đã nhận, tích hợp E023 và công bố E024

Lead main764bf37 cung cấp `hireCandidate` tạo User/password/5 task. TV2 nối `hire` tới service này, giữ quyền HR/Admin/latest PASSED và bổ sung transaction/khóa/dedupe. Chỉ ghi HIRED/hiredUserId khi User + 5 task cùng commit; DB lỗi rollback. Email có User trả409, không đổi role/password hay liên kết tài khoản đó. Bấm lặp/đồng thời trả receipt đã có, không dispatch lại. PATCH status chung không bypass Hire.

Receipt gồm `success, alreadyHired, hiredUserId, email, fullName, onboardingTasksCount, welcomeEmailStatus`; không password/hash. Mật khẩu tạm chỉ đi vào payload dispatcher sau commit. Helper true → DISPATCHED_UNVERIFIED, false/throw → FAILED, replay → NOT_RETRIED. Boolean bất đồng bộ không chứng minh mail đã gửi; trạng thái receipt chưa là readback bền. Provisioning vẫn giữ nếu dispatch thất bại; recovery/cấp lại truy cập cần lead hoàn thiện.

UI bấm Tuyển hoặc kéo INTERVIEWING/OFFERED tới HIRED mở xác nhận; detail mới nhất quyết định đủ điều kiện. Thành công tải lại chi tiết/board; hủy không mutation. HTTP/MySQL regression99/99 và browser HIRED/persistence đạt; provider Hire dùng stub. TV3 nhận hiredUserId và task theo userId; Workspace/mail LIVE/recovery còn REVIEW. Chi tiết: [HIRE-INTEGRATION.md](HIRE-INTEGRATION.md).

## Vùng thay đổi và bàn giao

TV2: modules/jobs, modules/applications, ba page, features/recruitment, domain API facade và backend/test. Entities/core/auth/Workspace/dependencies nhận từ main764bf37 qua merge74dbd50; Auth/Gemini/log update do lead viết. Applications conflict đã tích hợp service Hire của lead với ATS, không bỏ các quyền/readback TV2. Navbar chỉ đổi class flex-wrap/gap/height để sửa tràn ngang có bằng chứng browser.

Lead review API shape/mode/concurrency/shared concerns nêu trong RUNBOOK. TV3 giữ Workspace/onboarding UI, nhận hiredUserId và task từ provisioning DB; handoff UI còn REVIEW. Code8f7212a, seed27fbd3f, lịch1b841ea và Hire/readback67624af đã push; chưa mở PR. Thay đổi Applications dùng multipart field cv, POST :id/score và POST interviews/:id/questions như bảng trên; không tự chấm khi nộp CV. Consumers cũ cần chuyển sang contract này.
