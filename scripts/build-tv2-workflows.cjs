// Generate importable workflows. No credentials/secrets are stored in these templates.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const API = 'http://localhost:3001/api';
const settings = { executionOrder: 'v1', timezone: 'Asia/Ho_Chi_Minh', saveExecutionProgress: true };
const expr = s => '={{ ' + s + ' }}';
function workflow(id, name) { return { id, name, active: false, nodes: [], connections: {}, settings, pinData: {} }; }
function node(w, name, type, parameters, x, y = 300, version = 1) {
  const n = { id: w.id + '-' + (w.nodes.length + 1), name, type: 'n8n-nodes-base.' + type, typeVersion: version, position: [x, y], parameters };
  if (type === 'webhook') n.webhookId = parameters.path;
  w.nodes.push(n); return n;
}
function connect(w, a, b, output = 0) {
  const c = w.connections[a] ||= { main: [] };
  while (c.main.length <= output) c.main.push([]);
  c.main[output].push({ node: b, type: 'main', index: 0 });
}
function chain(w, names) { for (let i = 1; i < names.length; i++) connect(w, names[i - 1], names[i]); }
function code(w, name, jsCode, x, y = 300, each = false) { return node(w, name, 'code', { mode: each ? 'runOnceForEachItem' : 'runOnceForAllItems', jsCode }, x, y, 2); }
function condition(w, name, value, x, y = 300) {
  return node(w, name, 'if', { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: name, leftValue: expr(value), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, x, y, 2.2);
}
function http(w, name, url, body, x, y = 300, headers = []) {
  return node(w, name, 'httpRequest', { method: 'POST', url, sendHeaders: !!headers.length, headerParameters: { parameters: headers }, sendBody: true, specifyBody: 'json', jsonBody: body, options: { timeout: 20000 } }, x, y, 4.2);
}
function email(w, name, from, to, subject, html, x, y = 300, options = {}) {
  return node(w, name, 'emailSend', { operation: 'send', fromEmail: from, toEmail: to, subject, emailFormat: 'html', html, options: { appendAttribution: false, ...options } }, x, y, 2.1);
}
function save(w, filename) {
  validate(w);
  fs.writeFileSync(path.join(root, 'workflows', filename), JSON.stringify(w, null, 2) + '\n');
  console.log(`${w.name}: ${w.nodes.length} nodes`);
}
function validate(w) {
  const names = new Set(w.nodes.map(n => n.name));
  if (names.size !== w.nodes.length || w.nodes.length < 12) throw Error('Invalid node count/names');
  for (const [name, links] of Object.entries(w.connections)) {
    if (!names.has(name) || Array.isArray(links)) throw Error('Invalid connection source ' + name);
    for (const group of links.main) for (const edge of group) if (!names.has(edge.node)) throw Error('Invalid edge ' + edge.node);
  }
  for (const n of w.nodes.filter(n => n.type.endsWith('.code'))) new Function(n.parameters.jsCode);
}

const intake = workflow('hrTv2IntakeV2', '02 | TV2 2.1 – Tiếp nhận CV đa kênh và gửi thư xác nhận');
node(intake, '01. Theo dõi CV mới trong Gmail tuyển dụng', 'gmailTrigger', { pollTimes: { item: [{ mode: 'everyMinute' }] }, simple: false, filters: { q: 'has:attachment {filename:pdf filename:png filename:jpg filename:jpeg filename:webp} subject:JOB-', readStatus: 'unread' }, options: { downloadAttachments: true, dataPropertyAttachmentsPrefixName: 'attachment_' } }, 0, 120, 1.3);
code(intake, '02. Chuẩn hóa hồ sơ nhận qua Gmail', String.raw`
const m = $json;
const sender = m.from?.value?.[0];
const job = String(m.subject || '').match(/\bJOB-(\d+)\b/i);
const files = Object.values($input.item.binary || {}).filter(b => ['application/pdf','image/png','image/jpeg','image/webp'].includes(b.mimeType) || /\.(pdf|png|jpe?g|webp)$/i.test(b.fileName || ''));
if (!job || !sender?.address || !m.id || files.length !== 1) throw Error('Email cần tiêu đề JOB-<id>, địa chỉ người gửi và đúng 1 CV PDF hoặc ảnh PNG/JPG/WEBP.');
return { json: { channel: 'GMAIL', sourceId: m.id, jobId: Number(job[1]), candidateName: sender.name || sender.address.split('@')[0], candidateEmail: sender.address, candidatePhone: String(m.text || '').match(/(?:Phone|Điện thoại)\s*:\s*([+\d ()-]{7,20})/i)?.[1]?.trim() || '' }, binary: { cv: files[0] } };
`, 260, 120, true);
node(intake, '03. Phát hiện câu trả lời Google Form mới', 'googleSheetsTrigger', { pollTimes: { item: [{ mode: 'everyMinute' }] }, documentId: { __rl: true, mode: 'id', value: '14QSDBEyQGC08wyLE33G7PhMRyPdskj1Iy1vu7YzGyH8' }, sheetName: { __rl: true, mode: 'id', value: '2005238133' }, event: 'rowAdded', options: {} }, 0, 500, 1);
code(intake, '04. Chuẩn hóa hồ sơ và mã vị trí từ Form', String.raw`
const r = $json;
// The public form uses Vietnamese labels; keep the internal payload stable for ATS.
const value = (...keys) => keys.map(key => r[key]).find(item => item !== undefined && item !== null);
const raw = String(value('cvFileId', 'Tải lên CV (PDF/PNG/JPG/WEBP)', 'Tải lên CV (định dạng PDF)', 'Tải lên CV') || '').trim();
const id = /^[\w-]{15,}$/.test(raw) ? raw : raw.match(/^https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{15,})/)?.[1];
const source = r.sourceId || ((r.Timestamp || r['Dấu thời gian']) ? String(r.Timestamp || r['Dấu thời gian']) + ':' + id : '');
const rawJob = String(value('jobId', 'Mã vị trí ứng tuyển') || '').trim();
const jobId = Number(rawJob.match(/^\s*(?:JOB-)?(\d+)\s*(?:[-–—]|$)/i)?.[1] || rawJob);
if (!id || !source) throw Error('Sheet cần Timestamp hoặc sourceId duy nhất, cùng cvFileId là file Drive hoặc URL Drive hợp lệ.');
if (!Number.isSafeInteger(jobId) || jobId < 1) throw Error('Hãy chọn một vị trí tuyển dụng hợp lệ.');
return { json: { channel: 'GOOGLE_FORM', sourceId: String(source), fileId: id, jobId, candidateName: String(value('candidateName', 'Họ và tên ứng viên') || '').trim(), candidateEmail: String(value('candidateEmail', 'Địa chỉ email') || '').trim(), candidatePhone: String(value('candidatePhone', 'Số điện thoại') || '').trim() } };
`, 260, 500, true);
node(intake, '05. Tải CV từ Google Drive', 'googleDrive', { resource: 'file', operation: 'download', fileId: { __rl: true, mode: 'id', value: expr('$json.fileId') }, options: { binaryPropertyName: 'cv' } }, 520, 500, 3);
code(intake, '06. Kiểm tra thông tin ứng viên và tệp CV', String.raw`
const p = $json, cv = $input.item.binary?.cv;
if (!Number.isSafeInteger(p.jobId) || p.jobId < 1 || !p.candidateName || p.candidateName.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.candidateEmail) || !cv || !/\.(pdf|png|jpe?g|webp)$/i.test(cv.fileName || '')) throw Error('Thiếu thông tin ứng viên hoặc CV phải là PDF hoặc ảnh PNG/JPG/WEBP.');
return { json: p, binary: { cv } };
`, 780, 300, true);
const upload = node(intake, '07. Lưu hồ sơ và CV vào ATS', 'httpRequest', { method: 'POST', url: API + '/recruitment/intake', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, contentType: 'multipart-form-data', bodyParameters: { parameters: [ ...['channel', 'sourceId', 'jobId', 'candidateName', 'candidateEmail', 'candidatePhone'].map(name => ({ name, value: expr('$json.' + name) })), { parameterType: 'formBinaryData', name: 'cv', inputDataFieldName: 'cv' } ] }, options: { timeout: 60000 } }, 1040, 300, 4.2);
condition(intake, '08. Kiểm tra hồ sơ cần gửi xác nhận', '$json.data.shouldSend === true', 1300);
code(intake, '09. Soạn thư xác nhận đã nhận hồ sơ', String.raw`
const p = $json.data;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
return { json: { ...p, subject: 'Xác nhận đã nhận hồ sơ ứng tuyển', html: '<p>Chào ' + esc(p.candidateName) + ',</p><p>Phòng Nhân sự đã nhận CV của bạn. Mã hồ sơ: <b>' + p.applicationId + '</b>.</p><p>Chúng tôi sẽ liên hệ sau khi xem xét hồ sơ. Cảm ơn bạn đã ứng tuyển!</p>' } };
`, 1560, 160, true);
email(intake, '10. Gửi thư xác nhận cho ứng viên', expr('$json.fromEmail'), expr('$json.candidateEmail'), expr('$json.subject'), expr('$json.html'), 1820, 160);
const ack = http(intake, '11. Lưu kết quả gửi thư xác nhận', expr(`'${API}/recruitment/intake/' + $('09. Soạn thư xác nhận đã nhận hồ sơ').item.json.applicationId + '/acknowledgement'`), expr('{accepted:$json.accepted,messageId:$json.messageId}'), 2080, 160);
Object.assign(ack.parameters, { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' });
condition(intake, '12. Kiểm tra hồ sơ đến từ Gmail', `$('06. Kiểm tra thông tin ứng viên và tệp CV').item.json.channel === 'GMAIL'`, 2340);
node(intake, '13. Đánh dấu email tuyển dụng đã xử lý', 'gmail', { resource: 'message', operation: 'markAsRead', messageId: expr(`$('06. Kiểm tra thông tin ứng viên và tệp CV').item.json.sourceId`) }, 2600, 160, 2.1);
chain(intake, ['01. Theo dõi CV mới trong Gmail tuyển dụng', '02. Chuẩn hóa hồ sơ nhận qua Gmail', '06. Kiểm tra thông tin ứng viên và tệp CV']);
chain(intake, ['03. Phát hiện câu trả lời Google Form mới', '04. Chuẩn hóa hồ sơ và mã vị trí từ Form', '05. Tải CV từ Google Drive', '06. Kiểm tra thông tin ứng viên và tệp CV', '07. Lưu hồ sơ và CV vào ATS', '08. Kiểm tra hồ sơ cần gửi xác nhận', '09. Soạn thư xác nhận đã nhận hồ sơ', '10. Gửi thư xác nhận cho ứng viên', '11. Lưu kết quả gửi thư xác nhận', '12. Kiểm tra hồ sơ đến từ Gmail', '13. Đánh dấu email tuyển dụng đã xử lý']);
connect(intake, '08. Kiểm tra hồ sơ cần gửi xác nhận', '12. Kiểm tra hồ sơ đến từ Gmail', 1);
Object.assign(intake, require('./patch-wf02-website-ack.cjs').addWebsiteAcknowledgement(intake, { allowPlaceholders: true }));
save(intake, 'candidate-intake-omnichannel.json');

// Synchronize the Backend job catalog into the Google Form dropdown.
const jobSync = workflow('hrTv2JobSyncV2', '01 | TV2 2.0 – Đồng bộ vị trí tuyển dụng vào Google Form');
node(jobSync, '01. Nhận thông báo thay đổi vị trí tuyển dụng', 'webhook', { httpMethod: 'POST', path: 'jobs-changed', responseMode: 'responseNode', options: {} }, 0, 300, 2);
code(jobSync, '02. Chuẩn hóa sự kiện tuyển dụng', String.raw`
const body = $json.body || $json;
const data = body.data || body;
return { json: { action: data.action || body.action || 'UPDATED', job: data.job || body.job || null, receivedAt: body.timestamp || new Date().toISOString() } };
`, 260, 300, true);
node(jobSync, '03. Lấy danh sách vị trí đang mở từ Backend', 'httpRequest', { method: 'GET', url: API + '/jobs', options: { timeout: 20000 } }, 520, 300, 4.2);
code(jobSync, '04. Kiểm tra và lọc vị trí đang mở', String.raw`
const root = $json;
const rows = Array.isArray(root.data) ? root.data : Array.isArray(root) ? root : null;
if (!rows || rows.some(job => !Number.isSafeInteger(job.id) || job.id < 1 || typeof job.title !== 'string' || !job.title.trim())) throw Error('Backend trả về danh sách vị trí không hợp lệ.');
const jobs = rows.filter(job => job?.status === 'OPEN').sort((a,b) => a.id-b.id);
const event = $('02. Chuẩn hóa sự kiện tuyển dụng').first().json;
return { json: { ...event, jobs } };
`, 780, 300, true);
code(jobSync, '05. Tạo lựa chọn mã vị trí – tên công việc', String.raw`
const options = $json.jobs.length
  ? $json.jobs.map(job => 'JOB-' + String(job.id).padStart(4, '0') + ' – ' + job.title)
  : ['Hiện chưa có vị trí đang mở'];
return { json: { ...$json, options, jobIds: $json.jobs.map(job => Number(job.id)) } };
`, 1040, 300, true);
code(jobSync, '06. Chuẩn bị dữ liệu đồng bộ Google Form', String.raw`
const p = $json;
if (!p.options.length) throw Error('Không thể tạo danh sách lựa chọn trống cho Google Form.');
return { json: { ...p, formId: '1AqBqqfQT1CXqbGtDIp5DsXFtSzAwDEwiQ1kFNtX_16k' } };
`, 1300, 300, true);
const formSync = node(jobSync, '07. Cập nhật danh sách chọn trên Google Form', 'httpRequest', { method: 'POST', url: expr('$env.GOOGLE_FORM_SYNC_URL'), authentication: 'genericCredentialType', genericAuthType: 'httpCustomAuth', sendBody: true, specifyBody: 'json', jsonBody: expr('{formId:$json.formId, options:$json.options, jobIds:$json.jobIds, action:$json.action}'), options: { timeout: 45000, response: { response: { responseFormat: 'json' } } } }, 1560, 300, 4.2);
formSync.continueOnFail = true;
formSync.retryOnFail = true;
formSync.maxTries = 3;
formSync.waitBetweenTries = 2000;
code(jobSync, '08. Kiểm tra kết quả cập nhật Google Form', String.raw`
const response = $json;
const ok = response.success === true || response.ok === true || response.updated === true;
const source = $('06. Chuẩn bị dữ liệu đồng bộ Google Form').first().json;
return { json: { ...source, syncOk: ok, syncResponse: response } };
`, 1820, 300, true);
condition(jobSync, '09. Xác định đồng bộ thành công', '$json.syncOk === true', 2080, 300);
code(jobSync, '10. Tổng hợp kết quả đồng bộ thành công', String.raw`
return { json: { success: true, action: $json.action, updatedJobIds: $json.jobIds, optionCount: $json.options.length, message: 'Đã đồng bộ danh sách vị trí đang mở vào Google Form.' } };
`, 2340, 180, true);
node(jobSync, '11. Phản hồi đồng bộ thành công', 'respondToWebhook', { respondWith: 'json', responseBody: expr('$json'), options: {} }, 2600, 180, 1.1);
code(jobSync, '12. Tổng hợp lỗi đồng bộ', String.raw`
return { json: { success: false, action: $json.action, error: 'Không cập nhật được dropdown Google Form.', detail: $json.syncResponse || null } };
`, 2340, 500, true);
node(jobSync, '13. Phản hồi đồng bộ thất bại', 'respondToWebhook', { respondWith: 'json', responseBody: expr('$json'), options: { responseCode: 502 } }, 2600, 500, 1.1);
chain(jobSync, ['01. Nhận thông báo thay đổi vị trí tuyển dụng', '02. Chuẩn hóa sự kiện tuyển dụng', '03. Lấy danh sách vị trí đang mở từ Backend', '04. Kiểm tra và lọc vị trí đang mở', '05. Tạo lựa chọn mã vị trí – tên công việc', '06. Chuẩn bị dữ liệu đồng bộ Google Form', '07. Cập nhật danh sách chọn trên Google Form', '08. Kiểm tra kết quả cập nhật Google Form', '09. Xác định đồng bộ thành công']);
connect(jobSync, '09. Xác định đồng bộ thành công', '10. Tổng hợp kết quả đồng bộ thành công', 0);
connect(jobSync, '09. Xác định đồng bộ thành công', '12. Tổng hợp lỗi đồng bộ', 1);
connect(jobSync, '10. Tổng hợp kết quả đồng bộ thành công', '11. Phản hồi đồng bộ thành công');
connect(jobSync, '12. Tổng hợp lỗi đồng bộ', '13. Phản hồi đồng bộ thất bại');
node(jobSync, '14. Đồng bộ dự phòng mỗi 5 phút', 'scheduleTrigger', { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } }, 0, 80, 1.2);
connect(jobSync, '14. Đồng bộ dự phòng mỗi 5 phút', '02. Chuẩn hóa sự kiện tuyển dụng');
save(jobSync, 'job-form-sync.json');

const offer = workflow('hrTv2OfferV2', '04 | TV2 2.3 – Phát hành thư mời nhận việc và nhắc hạn 24–48 giờ');
node(offer, '01. Nhận yêu cầu phát hành thư mời nhận việc', 'webhook', { httpMethod: 'POST', path: 'offer-issued', responseMode: 'onReceived', options: {} }, 0, 300, 2);
code(offer, '02. Kiểm tra quyền phát hành thư mời nhận việc', String.raw`
const b = $input.first().json.body; const p = b?.data || b;
if (!p || !Number.isSafeInteger(p.offerId) || p.offerId < 1 || !/^[a-f0-9]{64}$/.test(p.token || '') || !/^[a-f0-9]{64}$/.test(p.responseToken || '')) throw Error('Invalid Offer capability');
return [{ json: { offerId: p.offerId, token: p.token, responseToken: p.responseToken } }];
`, 260);
const offerRef = `$('02. Kiểm tra quyền phát hành thư mời nhận việc').first().json`;
function offerHttp(name, action, x, y = 300, smtp = false) {
  const extra = action === 'CLAIM' ? `,responseToken:${offerRef}.responseToken` : smtp ? ',accepted:$json.accepted,messageId:$json.messageId' : '';
  const n = http(offer, name, expr(`'${API}/offers/' + ${offerRef}.offerId + '/delivery'`), expr(`{action:'${action}'${extra}}`), x, y, [{ name: 'x-offer-token', value: expr(offerRef + '.token') }]);
  // Retry only idempotent receipts, never resend SMTP or repeat claims automatically.
  if (smtp) Object.assign(n, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1000 });
  return n;
}
offerHttp('03. Nhận nội dung thư mời từ Backend', 'CLAIM', 520);
email(offer, '04. Gửi thư mời nhận việc cho ứng viên', expr('$json.data.fromEmail'), expr('$json.data.candidateEmail'), expr('$json.data.subject'), expr('$json.data.html'), 780);
offerHttp('05. Lưu kết quả gửi và bắt đầu hạn 48 giờ', 'SENT', 1040, 300, true);
node(offer, '06. Chờ đến mốc 24 giờ', 'wait', { resume: 'specificTime', dateTime: expr('$json.data.remindAt') }, 1300, 300, 1.1);
offerHttp('07. Kiểm tra phản hồi ứng viên sau 24 giờ', 'REMIND', 1560);
condition(offer, '08. Kiểm tra có cần gửi thư nhắc', '$json.data.shouldSend === true', 1820);
const original = `$('03. Nhận nội dung thư mời từ Backend').first().json.data`;
email(offer, '09. Gửi thư nhắc ứng viên và thông báo HR', expr(original + '.fromEmail'), expr(original + '.candidateEmail'), 'Nhắc phản hồi thư mời nhận việc', expr(`'<p>Offer của bạn còn thời hạn phản hồi. Vui lòng xem lại thông tin và xác nhận qua liên kết bên dưới.</p>' + ${original}.html`), 2080, 140, { ccEmail: expr(original + '.hrEmail') });
offerHttp('10. Lưu kết quả gửi thư nhắc', 'REMINDED', 2340, 140, true);
node(offer, '11. Chờ đến hạn 48 giờ', 'wait', { resume: 'specificTime', dateTime: expr(`$('05. Lưu kết quả gửi và bắt đầu hạn 48 giờ').first().json.data.expiresAt`) }, 2600, 300, 1.1);
offerHttp('12. Kiểm tra và đóng thư mời đã hết hạn', 'EXPIRE', 2860);
condition(offer, '13. Kiểm tra thư mời hết hạn cần báo HR', '$json.data.shouldSend === true', 3120);
email(offer, '14. Thông báo HR về thư mời hết hạn', expr(original + '.fromEmail'), expr(original + '.hrEmail'), 'Offer hết hạn sau 48 giờ', expr(`'<p>Offer #' + ${offerRef}.offerId + ' đã hết hạn mà chưa có phản hồi. Vui lòng kiểm tra hồ sơ trong ATS.</p>'`), 3380);
offerHttp('15. Lưu kết quả thông báo hết hạn', 'EXPIRY_NOTIFIED', 3640, 300, true);
chain(offer, offer.nodes.map(n => n.name));
connect(offer, '08. Kiểm tra có cần gửi thư nhắc', '11. Chờ đến hạn 48 giờ', 1);
save(offer, 'offer-letter-48h.json');

// Preserve authenticated calendar/SMTP readback and its error branches.
const interview = JSON.parse(fs.readFileSync(path.join(root, 'workflows/interview-schedule-readback.json'), 'utf8'));
interview.id = 'hrTv2InterviewV2'; interview.name = '03 | TV2 2.2 – Xếp lịch phỏng vấn, Google Meet và thư mời'; interview.active = false; interview.settings = settings;
const extra = interview.nodes.find(n => n.name === '19. Gửi lịch cho người phỏng vấn');
if (extra) interview.nodes = interview.nodes.filter(n => n !== extra);
for (const [name, c] of Object.entries(interview.connections)) {
  if (name === extra?.name) delete interview.connections[name];
  else for (const group of c.main) for (let i = group.length - 1; i >= 0; i--) if (group[i].node === extra?.name) group.splice(i, 1);
}
const find = name => interview.nodes.find(n => n.name === name);
find('01. Nhận yêu cầu xếp lịch phỏng vấn').parameters.responseMode = 'onReceived';
{
  const calendar = find('05. Tạo lịch phỏng vấn và Google Meet');
  delete calendar.parameters.additionalFields.attendees;
  calendar.parameters.additionalFields.attendeesUi = {
    values: { mode: 'add', attendees: [expr('$json.candidateEmail'), expr('$json.interviewerEmail')] },
  };
}
find('10. Soạn thư mời và tệp lịch ICS').parameters.jsCode = String.raw`
const e = $('08. Xác minh lịch và liên kết Google Meet').first().json;
const p = $('04. Nạp thông tin buổi phỏng vấn').first().json;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = s => String(s).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = s => new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z');
// RFC5545: fold at 75 UTF-8 octets, never split a multibyte character.
const fold = line => { let out = '', col = 0; for (const c of line) { const n = Buffer.byteLength(c); if (col+n > 75) { out += '\r\n '; col = 1; } out += c; col += n; } return out; };
const organizer = e.organizer?.email || p.fromEmail;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizer)) throw Error('Calendar organizer missing');
const attendees = [...new Set([p.candidateEmail,p.interviewerEmail])];
const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HR ATS//Interview//VI','CALSCALE:GREGORIAN','METHOD:REQUEST','BEGIN:VEVENT',
  'UID:' + text(e.iCalUID || (e.id+'@google.com')), 'SEQUENCE:' + (e.sequence || 0), 'DTSTAMP:' + stamp(e.updated || Date.now()),
  'DTSTART:' + stamp(p.scheduledAt), 'DTEND:' + stamp(Date.parse(p.scheduledAt)+45*60000), 'STATUS:CONFIRMED',
  'SUMMARY:' + text('Phỏng vấn vòng '+p.round+' - '+p.candidateName), 'DESCRIPTION:' + text('Google Meet: '+e.hangoutLink),
  'LOCATION:' + text(e.hangoutLink), 'URL:' + e.hangoutLink, 'ORGANIZER:mailto:' + organizer,
  ...attendees.map(email => 'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:'+email), 'END:VEVENT','END:VCALENDAR'];
const ics = lines.map(fold).join('\r\n')+'\r\n';
const time = new Date(p.scheduledAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const endTime = new Date(Date.parse(p.scheduledAt)+45*60000).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});
const safeMeet = esc(e.hangoutLink);
const emailHtml = '<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
  'body{margin:0;background:#f3f6fb;color:#243247;font-family:Arial,Helvetica,sans-serif;line-height:1.6}' +
  '.wrap{max-width:760px;margin:24px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(25,55,95,.12)}' +
  '.hero{padding:34px 42px;background:linear-gradient(120deg,#1e3a8a,#2563eb);color:#fff;text-align:center}' +
  '.hero h1{margin:0;font-size:27px;letter-spacing:.4px}.hero p{margin:8px 0 0;color:#dbeafe;font-size:14px}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:700;color:#bfdbfe;margin-bottom:10px}' +
  '.content{padding:34px 42px}.content p{margin:0 0 18px}.card{margin:24px 0;padding:22px 24px;background:#f8fafc;border-left:5px solid #2563eb;border-radius:10px}.row{display:flex;gap:12px;align-items:flex-start;margin:11px 0}.icon{width:24px;font-size:19px}.label{font-weight:700;color:#172554;margin-right:6px}.muted{color:#64748b;font-size:14px}.button{display:inline-block;margin:4px 0 22px;padding:13px 24px;background:#2563eb;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:700}.notice{padding:15px 18px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:14px}.footer{padding:20px 42px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center}@media(max-width:600px){.hero,.content,.footer{padding-left:22px;padding-right:22px}.hero h1{font-size:22px}}' +
  '</style></head><body><div class="wrap"><div class="hero"><div class="eyebrow">HR ATS • TUYỂN DỤNG</div><h1>THƯ MỜI PHỎNG VẤN</h1><p>Enterprise HR &amp; Talent Ecosystem</p></div><div class="content">' +
  '<p>Kính gửi <strong>'+esc(p.candidateName)+'</strong>,</p>' +
  '<p>Cảm ơn bạn đã quan tâm và ứng tuyển vào đội ngũ công nghệ của chúng tôi. Hội đồng tuyển dụng trân trọng kính mời bạn tham dự buổi phỏng vấn với thông tin chi tiết dưới đây:</p>' +
  '<div class="card"><div class="row"><span class="icon">⏰</span><div><span class="label">Thời gian:</span>'+esc(time)+' (Việt Nam)<br><span class="muted">Thời lượng dự kiến: 45 phút, kết thúc lúc '+esc(endTime)+'</span></div></div>' +
  '<div class="row"><span class="icon">🎯</span><div><span class="label">Vòng phỏng vấn:</span> Vòng '+esc(p.round)+' (Chuyên môn)</div></div>' +
  '<div class="row"><span class="icon">👤</span><div><span class="label">Người phỏng vấn:</span> '+esc(p.interviewerName)+'</div></div>' +
  '<div class="row"><span class="icon">💻</span><div><span class="label">Hình thức:</span> Trực tuyến qua Google Meet</div></div></div>' +
  '<a class="button" href="'+safeMeet+'">Tham gia Google Meet</a>' +
  '<p class="muted">Vui lòng tham gia trước giờ hẹn 5 phút và kiểm tra micro, camera cùng đường truyền Internet.</p>' +
  '<div class="notice">📅 Lịch <strong>.ics</strong> được đính kèm để bạn thêm sự kiện vào Google Calendar, Outlook hoặc ứng dụng lịch trên điện thoại.</div>' +
  '<p style="margin-top:24px">Nếu cần thay đổi lịch, vui lòng phản hồi email này để bộ phận Nhân sự hỗ trợ.</p></div>' +
  '<div class="footer">Trân trọng,<br><strong>Phòng Nhân sự</strong> • Enterprise HR &amp; Talent Ecosystem</div></div></body></html>';
return [{json:{fromEmail:p.fromEmail,toEmail:attendees.join(','),emailSubject:'Thư mời phỏng vấn vòng '+p.round,emailHtml},
  binary:{calendar:{data:Buffer.from(ics).toString('base64'),mimeType:'text/calendar',fileName:'interview-'+p.interviewId+'.ics'}}}];
`;
const mail = find('11. Gửi thư mời phỏng vấn');
mail.parameters.toEmail = expr('$json.toEmail');
delete mail.parameters.attachments;
mail.parameters.options = { fileAttachments: 'calendar', appendAttribution: false };
find('12. Xác minh kết quả gửi thư mời').parameters.jsCode = String.raw`
const m=$input.first().json,p=$('04. Nạp thông tin buổi phỏng vấn').first().json;
const accepted=new Set((m.accepted||[]).map(x=>String(x).toLowerCase()));
if (!m.messageId || ![p.candidateEmail,p.interviewerEmail].every(e=>accepted.has(e.toLowerCase())) || (m.rejected||[]).length) throw Error('SMTP chưa chấp nhận đủ hai người nhận');
return [{json:{requestId:p.delivery.requestId,applicationId:p.applicationId,event:'SMTP_ACCEPTED',eventId:p.delivery.eventId,recipient:p.candidateEmail,acceptedRecipients:[...accepted],messageId:m.messageId}}];
`;
// Calendar conference creation is asynchronous; allow Google time before readback.
if (!find('06. Chờ Google khởi tạo phòng Meet')) {
  node(interview, '06. Chờ Google khởi tạo phòng Meet', 'wait', { resume: 'timeInterval', amount: 5, unit: 'seconds' }, 1080, 80, 1.1);
  interview.connections['05. Tạo lịch phỏng vấn và Google Meet'].main[0] = [{ node: '06. Chờ Google khởi tạo phòng Meet', type: 'main', index: 0 }];
  connect(interview, '06. Chờ Google khởi tạo phòng Meet', '07. Đọc lại sự kiện trên Google Calendar');
}
find('18. Hoàn tất xử lý yêu cầu').type = 'n8n-nodes-base.noOp'; find('18. Hoàn tất xử lý yêu cầu').typeVersion = 1; find('18. Hoàn tất xử lý yêu cầu').parameters = {};
save(interview, 'interview-schedule-readback.json');
module.exports = { validate };
