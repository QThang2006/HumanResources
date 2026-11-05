// Build a standalone TV2 workflow. No credentials, tokens or pinned results in Git.
const fs = require('node:fs/promises');
const path = require('node:path');

function buildReadbackWorkflow(source, base = 'http://localhost:3001/api') {
  const url = new URL(base);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
  )
    throw new Error('Invalid callback API base');
  base = url.toString().replace(/\/$/, '');
  const take = (type) => {
    const found = source.nodes.find((n) => n.type === type);
    if (!found) throw new Error('Missing TV2 node: ' + type);
    const node = structuredClone(found);
    delete node.credentials;
    delete node.disabled;
    delete node.continueOnFail;
    node.retryOnFail = false;
    return node;
  };
  const code = (id, name, jsCode, x, y = 400) => ({
    id,
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [x, y],
    parameters: { jsCode },
  });
  const http = (id, name, endpoint, body, x, y = 400) => ({
    id,
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [x, y],
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 1000,
    parameters: {
      method: 'POST',
      url: endpoint,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-interview-callback-token',
            value: "={{ $('02. Kiểm tra quyền xử lý yêu cầu phỏng vấn').first().json.delivery.token }}",
          },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: body,
      options: { timeout: 10000 },
    },
  });
  const webhook = take('n8n-nodes-base.webhook');
  webhook.position = [0, 400];
  webhook.parameters.path = 'interview-schedule';
  webhook.parameters.responseMode = 'responseNode';
  const envelope = code(
    'tv2-delivery-envelope',
    '02. Kiểm tra quyền xử lý yêu cầu phỏng vấn',
    `const body = $input.first().json.body || $input.first().json;
const p = body.data || body; const d = p.delivery;
const base = ${JSON.stringify(base)};
if (!Number.isSafeInteger(p.interviewId) || p.interviewId < 1 || !d || !/^[a-f0-9]{64}$/.test(d.token || '') || !/^[a-f0-9-]{36}$/.test(d.requestId || '')) throw new Error('Authenticated TV2 delivery metadata required');
if (d.callbackUrl !== base + '/applications/interviews/' + p.interviewId + '/delivery') throw new Error('Callback destination must match configured API');
return [{json:{interviewId:p.interviewId, delivery:d}}];`,
    240,
  );
  const claim = http(
    'tv2-delivery-claim',
    '03. Nhận quyền xử lý lịch phỏng vấn',
    "={{ $json.delivery.callbackUrl + '/claim' }}",
    '={{ {requestId:$json.delivery.requestId} }}',
    480,
  );
  // Claim is deliberately NOT retried: a lost response is uncertain. No providers
  // should run until one confirmed claim supplies an authoritative snapshot.
  claim.retryOnFail = false;
  const payload = code(
    'tv2-authoritative-payload',
    '04. Nạp thông tin buổi phỏng vấn',
    `const r = $input.first().json.data || $input.first().json;
const d = $('02. Kiểm tra quyền xử lý yêu cầu phỏng vấn').first().json.delivery; const p = r.payload;
if (r.claimed !== true || !p || p.interviewId !== $('02. Kiểm tra quyền xử lý yêu cầu phỏng vấn').first().json.interviewId || r.eventId !== d.eventId) throw new Error('Interview claim mismatch');
for (const key of ['candidateEmail','fromEmail','interviewerEmail']) if (!/^[^\\s@]+@[^\\s@]+[.][^\\s@]+$/.test(p[key] || '')) throw new Error('Configured recipient and sender required');
if (!Number.isFinite(Date.parse(p.scheduledAt)) || !Number.isSafeInteger(p.applicationId) || !Number.isSafeInteger(p.round)) throw new Error('Invalid persisted schedule');
return [{json:{...p, delivery:d}}];`,
    720,
  );
  const calendar = take('n8n-nodes-base.googleCalendar');
  calendar.position = [960, 400];
  calendar.onError = 'continueErrorOutput';
  calendar.parameters = {
    resource: 'event',
    operation: 'create',
    calendar: { __rl: true, mode: 'list', value: 'primary', cachedResultName: 'primary' },
    start: '={{ $json.scheduledAt }}',
    end: '={{ new Date(Date.parse($json.scheduledAt)+45*60000).toISOString() }}',
    useDefaultReminders: false,
    remindersUi: { remindersValues: [] },
    additionalFields: {
      id: '={{ $json.delivery.eventId }}',
      summary: "={{ 'Phỏng vấn Vòng ' + $json.round + ' - ' + $json.candidateName }}",
      description: 'Lịch phỏng vấn được quản lý trong ATS TV2.',
      sendUpdates: 'none',
      conferenceDataUi: { conferenceDataValues: { conferenceSolution: 'hangoutsMeet' } },
    },
  };
  const readback = {
    ...structuredClone(calendar),
    id: 'tv2-delivery-calendar-get',
    name: '07. Đọc lại sự kiện trên Google Calendar',
    position: [1200, 400],
    parameters: {
      resource: 'event',
      operation: 'get',
      calendar: calendar.parameters.calendar,
      eventId: '={{ $json.id }}',
      options: {},
    },
  };
  const verify = code(
    'tv2-delivery-calendar-verify',
    '08. Xác minh lịch và liên kết Google Meet',
    `const e = $input.first().json; const p = $('04. Nạp thông tin buổi phỏng vấn').first().json;
const meet = e.hangoutLink || e.conferenceData?.entryPoints?.find(x => x.entryPointType === 'video')?.uri;
if (e.id !== p.delivery.eventId || e.status !== 'confirmed' || Date.parse(e.start?.dateTime) !== Date.parse(p.scheduledAt) || Date.parse(e.end?.dateTime) !== Date.parse(p.scheduledAt)+45*60000 || !/^https:\\/\\/meet[.]google[.]com\\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meet || '') || e.conferenceData?.createRequest?.status?.statusCode !== 'success') throw new Error('Calendar/Meet readback not confirmed');
return [{json:{...e,hangoutLink:meet, callback:{requestId:p.delivery.requestId,applicationId:p.applicationId,event:'CALENDAR_CONFIRMED',eventId:e.id,meetingLink:meet,scheduledAt:e.start.dateTime}}}];`,
    1440,
  );
  verify.onError = 'continueErrorOutput';
  const confirmed = http(
    'tv2-delivery-meet-callback',
    '09. Lưu lịch và liên kết Meet vào ATS',
    "={{ $('04. Nạp thông tin buổi phỏng vấn').first().json.delivery.callbackUrl }}",
    '={{ $json.callback }}',
    1680,
  );
  const format = take('n8n-nodes-base.code');
  format.position = [1920, 400];
  let js = format.parameters.jsCode;
  const before = js.indexOf('const candidateName =');
  if (before < 0) throw new Error('Unexpected lead email template');
  js =
    "const calendarItem = $('08. Xác minh lịch và liên kết Google Meet').first().json;\nconst payload = $('04. Nạp thông tin buổi phỏng vấn').first().json;\nconst escapeHtml = value => String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\n" +
    js.slice(before);
  js = js
    .replace(
      "payload.candidateName || payload.fullName || 'Ứng viên'",
      'escapeHtml(payload.candidateName)',
    )
    .replace(
      "payload.candidateEmail || payload.email || 'quocthangngo2006@gmail.com'",
      'payload.candidateEmail',
    )
    .replace(
      "payload.interviewerName || 'Hội đồng Tuyển dụng'",
      'escapeHtml(payload.interviewerName)',
    )
    .replace("payload.fromEmail || 'quocthangngo2006@gmail.com'", 'payload.fromEmail')
    .replace(
      "calendarItem.hangoutLink || payload.googleMeetUrl || 'https://meet.google.com/new'",
      'calendarItem.hangoutLink',
    );
  format.parameters.jsCode = js;
  const smtp = take('n8n-nodes-base.emailSend');
  smtp.position = [2160, 400];
  smtp.parameters.emailFormat = 'html';
  smtp.onError = 'continueErrorOutput';
  const email = code(
    'tv2-delivery-smtp-check',
    '12. Xác minh kết quả gửi thư mời',
    `const m = $input.first().json; const p = $('04. Nạp thông tin buổi phỏng vấn').first().json;
if (!m.messageId || !Array.isArray(m.accepted) || m.accepted.length !== 1 || String(m.accepted[0]).toLowerCase() !== p.candidateEmail.toLowerCase() || (m.rejected || []).length) throw new Error('SMTP acceptance not confirmed');
return [{json:{requestId:p.delivery.requestId,applicationId:p.applicationId,event:'SMTP_ACCEPTED',eventId:p.delivery.eventId,recipient:p.candidateEmail,messageId:m.messageId}}];`,
    2400,
  );
  email.onError = 'continueErrorOutput';
  const saved = http(
    'tv2-delivery-email-callback',
    '13. Lưu trạng thái gửi thư vào ATS',
    "={{ $('04. Nạp thông tin buổi phỏng vấn').first().json.delivery.callbackUrl }}",
    '={{ $json }}',
    2640,
  );
  const calendarError = code(
    'tv2-delivery-calendar-error',
    '14. Tổng hợp lỗi tạo lịch phỏng vấn',
    `const p = $('04. Nạp thông tin buổi phỏng vấn').first().json; return [{json:{requestId:p.delivery.requestId,applicationId:p.applicationId,event:'FAILED',stage:'CALENDAR',code:'CALENDAR_ERROR'}}];`,
    1680,
    720,
  );
  const emailError = code(
    'tv2-delivery-email-error',
    '16. Tổng hợp lỗi gửi thư mời',
    `const p = $('04. Nạp thông tin buổi phỏng vấn').first().json; return [{json:{requestId:p.delivery.requestId,applicationId:p.applicationId,event:'FAILED',stage:'EMAIL',code:'SMTP_ERROR'}}];`,
    2400,
    720,
  );
  const saveCalendarError = http(
    'tv2-delivery-save-calendar-error',
    '15. Lưu lỗi tạo lịch vào ATS',
    "={{ $('04. Nạp thông tin buổi phỏng vấn').first().json.delivery.callbackUrl }}",
    '={{ $json }}',
    1920,
    720,
  );
  const saveEmailError = http(
    'tv2-delivery-save-email-error',
    '17. Lưu lỗi gửi thư vào ATS',
    "={{ $('04. Nạp thông tin buổi phỏng vấn').first().json.delivery.callbackUrl }}",
    '={{ $json }}',
    2640,
    720,
  );
  const respond = take('n8n-nodes-base.respondToWebhook');
  respond.position = [2880, 400];
  respond.parameters.respondWith = 'json';
  respond.parameters.responseBody = '={{ $json }}';
  const nodes = [
    webhook,
    envelope,
    claim,
    payload,
    calendar,
    readback,
    verify,
    confirmed,
    format,
    smtp,
    email,
    saved,
    calendarError,
    emailError,
    saveCalendarError,
    saveEmailError,
    respond,
  ];
  const connections = {};
  const connect = (a, b, index = 0) => {
    connections[a.name] ||= { main: [] };
    connections[a.name].main[index] ||= [];
    connections[a.name].main[index].push({ node: b.name, type: 'main', index: 0 });
  };
  const normal = [
    webhook,
    envelope,
    claim,
    payload,
    calendar,
    readback,
    verify,
    confirmed,
    format,
    smtp,
    email,
    saved,
    respond,
  ];
  for (let i = 0; i < normal.length - 1; i++) connect(normal[i], normal[i + 1]);
  for (const n of [calendar, readback, verify]) connect(n, calendarError, 1);
  for (const n of [smtp, email]) connect(n, emailError, 1);
  connect(calendarError, saveCalendarError);
  connect(saveCalendarError, respond);
  connect(emailError, saveEmailError);
  connect(saveEmailError, respond);
  for (const n of nodes) if (n.type === 'n8n-nodes-base.code') new Function(n.parameters.jsCode);
  return {
    name: 'TV2 - Interview scheduling with authenticated ATS readback',
    nodes,
    connections,
    active: false,
    pinData: {},
    settings: { executionOrder: 'v1', timezone: 'Asia/Ho_Chi_Minh' },
  };
}
module.exports = { buildReadbackWorkflow };
if (require.main === module)
  (async () => {
    const root = path.resolve(__dirname, '..');
    const source = JSON.parse(
      await fs.readFile(path.join(root, 'workflows/interview-schedule.json'), 'utf8'),
    );
    const workflow = buildReadbackWorkflow(source);
    await fs.writeFile(
      path.join(root, 'workflows/interview-schedule-readback.json'),
      JSON.stringify(workflow, null, 2) + '\n',
    );
    console.log('Prepared inactive TV2 readback template; no credentials or pinned data.');
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
