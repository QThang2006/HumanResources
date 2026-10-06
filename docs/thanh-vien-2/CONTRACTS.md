# Contract triển khai tuyển dụng TV2

Ngày **07/10/2026**. Contract của bản tích hợp đã push `HumanResources` / `feature/recruitment-ats`, code8f7212a, main9733233. SDK lead đã nhận và consumer đã chuẩn hóa định dạng aiGenerated; envelope ok/mode/data vẫn được hỗ trợ cho contract tests. Provider live, workflow readback và Hire chưa nghiệm thu.

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
| GET /jobs/capabilities | Nội bộ recruitment | jd/score/questions là method availability; hire=false |
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
| POST /applications/:id/hire | HR/Admin | Điều kiện tuyển hợp lệ → 503 chờ provisioning; đã HIRED có userId thì trả idempotent receipt |

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

Đọc meetingLink sẵn có từ entity và chỉ render liên kết HTTPS. Chưa có callback/poll/retry workflow endpoint của TV2 vì lead chưa cung cấp auth/event/result/idempotency contract. Cần lead bàn giao trước khi viết readback; không nhận callback không xác thực.

## Hire: blocker cụ thể cần lead chốt

SDK hiện nhận userId nhưng không có source tạo User trước đó. TV2 chưa gọi helper bằng id đoán hoặc tự tạo User/task.

Lead cần trả lời/bàn giao:

1. SDK nhận applicationId tự tạo User hay gọi User service của lead trước? Ai sở hữu thao tác đó?
2. Khóa idempotency, email đã có User, chống chiếm tài khoản/thay role/password.
3. Thời điểm ghi HIRED/hiredUserId; payload accepted/completed/failed và cách đọc kết quả.
4. Một nơi tạo password/cấp access/5 task; partial failure/retry không tạo thêm mail/task.
5. Chứng cứ workflow test và dữ liệu handoff TV3; không trả password qua API tuyển dụng.

Hiện API hire kiểm role, trạng thái và latest PASSED rồi trả503, không User/task/status mutation. UI Hire disable có lý do. Test kiểm count User/task không đổi. Đây là phần còn thiếu tích hợp, không phải Hire hoàn tất.

## Vùng thay đổi và bàn giao

TV2: modules/jobs, modules/applications, ba page, features/recruitment, domain API facade và backend/test. Giữ entities/core/auth/Workspace/dependencies của main9733233; merge54cb79a đưa cập nhật của lead vào, implementation TV2 không ghi đè core. Navbar chỉ đổi class flex-wrap/gap/height để sửa tràn ngang có bằng chứng browser.

Lead review API shape/mode/concurrency/shared concerns nêu trong RUNBOOK. TV3 giữ Workspace/onboarding tasks, nhận hiredUserId sau khi lead hoàn tất provisioning. Toàn bộ implementation TV2 hiện có đã push8f7212a ngày07/10 theo yêu cầu “push hết”; bản nguồn cũ giữ local. Chưa mở PR hoặc gửi tin nhắn cho thành viên khác. Thay đổi Applications thay endpoint demo lead bằng endpoint phân quyền/CV riêng tư: dùng multipart field cv, POST :id/score và POST interviews/:id/questions như bảng trên; không tự chấm khi nộp CV. Consumers cũ cần chuyển sang contract này.
