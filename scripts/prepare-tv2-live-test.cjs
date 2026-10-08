// Builds a private, unpublished TV2 test from the locally configured workflow.
// Credential references are copied; passwords/tokens are never exported here.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  const dir = path.resolve(__dirname, '../.temp/n8n-import');
  const webMode = process.argv.includes('--web');
  const config = JSON.parse(
    await fs.readFile(
      path.join(dir, webMode ? 'tv2-web-test-config.json' : 'tv2-self-test-config.json'),
      'utf8',
    ),
  );
  const exported = JSON.parse(
    await fs.readFile(path.join(dir, 'tv2-configured-export.json'), 'utf8'),
  );
  const source = Array.isArray(exported) ? exported[0] : exported;
  const email = String(config.selfEmail || '')
    .trim()
    .toLowerCase();
  const reference = String(config.testReference || '');
  if (!/^[^\s@]+@gmail\.com$/.test(email))
    throw new Error('A confirmed personal Gmail is required');
  if (!/^TV2-(LIVE|WEB)-[A-Za-z0-9-]+$/.test(reference)) throw new Error('Invalid test reference');
  if (webMode && !Number.isSafeInteger(config.applicationId))
    throw new Error('A seeded test application is required');
  if (!(Date.parse(config.scheduledAt) > Date.now()))
    throw new Error('Test time must be in the future');
  if (process.argv.includes('--readback')) {
    if (!webMode || config.callbackBaseUrl !== 'http://127.0.0.1:3011/api')
      throw new Error('Prepared web readback runtime required');
    const { buildReadbackWorkflow } = require('./build-interview-readback-workflow.cjs');
    const workflow = buildReadbackWorkflow(source, config.callbackBaseUrl);
    workflow.id = 'hrTv2Readback01';
    workflow.name = 'TV2 - WEB TEST - Meet and email saved to ATS';
    const byName = (name) => workflow.nodes.find((n) => n.name === name);
    const webhook = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    webhook.parameters.path = 'hr-tv2-readback-test/interview-schedule';
    webhook.webhookId = 'tv2-readback-live-test';
    const assertion = `if (p.applicationId !== ${config.applicationId} || p.candidateName !== 'TV2 WEB TEST - Ung vien gia' || p.round !== 1 || Date.parse(p.scheduledAt) !== Date.parse(${JSON.stringify(config.scheduledAt)})) throw new Error('Only the prepared synthetic schedule is allowed');
const self = ${JSON.stringify(email)};
if ([p.candidateEmail,p.fromEmail,p.interviewerEmail].some(x=>String(x).toLowerCase()!==self)) throw new Error('Only the configured personal Gmail may receive the test');`;
    const envelope = byName('Validate delivery envelope');
    envelope.parameters.jsCode = envelope.parameters.jsCode.replace(
      'return [{json:{interviewId:p.interviewId, delivery:d}}];',
      assertion + '\nreturn [{json:{interviewId:p.interviewId, delivery:d}}];',
    );
    const payload = byName('Load interview payload');
    payload.parameters.jsCode = payload.parameters.jsCode.replace(
      'return [{json:{...p, delivery:d}}];',
      assertion + '\nreturn [{json:{...p, delivery:d}}];',
    );
    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.googleCalendar') {
        const credential = source.nodes.find((n) => n.type === node.type)?.credentials
          ?.googleCalendarOAuth2Api;
        if (!credential) throw new Error('Calendar credential reference required');
        node.credentials = { googleCalendarOAuth2Api: credential };
        if (node.parameters.operation === 'create') {
          Object.assign(node.parameters.additionalFields, {
            summary: '[TV2 READBACK TEST] ' + reference,
            description: 'Du lieu ung vien gia TV2, gui ve chinh Gmail test.',
            visibility: 'private',
            showMeAs: 'transparent',
          });
        }
      } else if (node.type === 'n8n-nodes-base.emailSend') {
        const credential = source.nodes.find((n) => n.type === node.type)?.credentials?.smtp;
        if (!credential) throw new Error('SMTP credential reference required');
        node.credentials = { smtp: credential };
        node.parameters.subject = '[TV2 READBACK TEST] ' + reference;
      }
    }
    const report = {
      id: 'tv2-readback-live-report',
      name: 'TV2 readback test result',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2880, 400],
      parameters: {
        jsCode: `const saved = $input.first().json.data || $input.first().json;
const p = $('Load interview payload').first().json; const e = $('Verify Calendar readback').first().json;
if (saved.recorded!==true || saved.interviewId!==p.interviewId || saved.automation.calendarStatus!=='CONFIRMED' || saved.automation.emailStatus!=='SMTP_ACCEPTED') throw new Error('ATS readback was not saved');
return [{json:{success:true,mode:'TV2_READBACK_LIVE_TEST',testReference:${JSON.stringify(reference)},applicationId:p.applicationId,interviewId:p.interviewId,meetingLink:e.hangoutLink,automation:saved.automation,inboxDelivery:'NOT_YET_VERIFIED'}}];`,
      },
    };
    workflow.nodes.push(report);
    const respond = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.respondToWebhook');
    respond.position = [3120, 400];
    workflow.connections['Save email status to ATS'] = {
      main: [[{ node: report.name, type: 'main', index: 0 }]],
    };
    workflow.connections[report.name] = {
      main: [[{ node: respond.name, type: 'main', index: 0 }]],
    };
    for (const n of workflow.nodes)
      if (n.type === 'n8n-nodes-base.code') new Function(n.parameters.jsCode);
    await fs.writeFile(
      path.join(dir, 'tv2-interview-readback-test.json'),
      JSON.stringify(workflow, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        workflowId: workflow.id,
        reference,
        scheduledAt: config.scheduledAt,
        active: false,
        recipient: 'SMTP Gmail itself',
        telegram: 'EXCLUDED',
        readback: 'AUTHENTICATED',
      }),
    );
    return;
  }
  const eventId =
    'tv2test' + crypto.createHash('sha256').update(reference).digest('hex').slice(0, 40);
  const take = (type) => {
    const node = source.nodes.find((n) => n.type === type);
    if (!node) throw new Error('Required TV2 node not found: ' + type);
    return structuredClone(node);
  };
  const code = (id, name, jsCode, x) => ({
    id,
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [x, 400],
    parameters: { jsCode },
  });
  const webhook = take('n8n-nodes-base.webhook');
  webhook.parameters.path = 'hr-tv2-live-self-test/interview-schedule';
  webhook.parameters.responseMode = 'responseNode';
  webhook.webhookId = 'hr-tv2-live-self-test-interview';
  webhook.position = [100, 400];
  const guard = code(
    'tv2-self-guard',
    'Validate TV2 self-test',
    `const body = $input.first().json.body || $input.first().json;
const p = body.data || body;
const self = ${JSON.stringify(email)};
if (p.testOnly !== true || p.testReference !== ${JSON.stringify(reference)}) throw new Error('Not the prepared TV2 test');
if (String(p.candidateEmail).toLowerCase() !== self || String(p.fromEmail).toLowerCase() !== self || String(p.interviewerEmail).toLowerCase() !== self) throw new Error('Only this Gmail may receive the test');
if (p.candidateName !== 'TV2 TEST - Ung vien gia' || p.round !== 1 || p.scheduledAt !== ${JSON.stringify(config.scheduledAt)}) throw new Error('Unexpected interview test data');
return [{ json: p }];`,
    340,
  );
  const calendar = take('n8n-nodes-base.googleCalendar');
  const smtp = take('n8n-nodes-base.emailSend');
  if (!calendar.credentials?.googleCalendarOAuth2Api || !smtp.credentials?.smtp)
    throw new Error('Calendar and SMTP credential references are required');
  calendar.position = [580, 400];
  calendar.retryOnFail = false;
  calendar.parameters = {
    resource: 'event',
    operation: 'create',
    calendar: { __rl: true, mode: 'list', value: 'primary', cachedResultName: 'primary' },
    start: '={{ $json.scheduledAt }}',
    end: '={{ new Date(Date.parse($json.scheduledAt) + 45 * 60000).toISOString() }}',
    useDefaultReminders: false,
    remindersUi: { remindersValues: [] },
    additionalFields: {
      id: eventId,
      summary: '[TV2 TEST] ' + reference,
      description:
        'Du lieu kiem thu TV2. Khong phai lich phong van that. Tao Meet va gui mot email ve chinh Gmail da cau hinh.',
      visibility: 'private',
      showMeAs: 'transparent',
      sendUpdates: 'none',
      conferenceDataUi: { conferenceDataValues: { conferenceSolution: 'hangoutsMeet' } },
    },
  };
  const readback = {
    ...structuredClone(calendar),
    id: 'tv2-event-readback',
    name: 'Read back Google event',
    position: [820, 400],
    parameters: {
      resource: 'event',
      operation: 'get',
      calendar: calendar.parameters.calendar,
      eventId: '={{ $json.id }}',
      options: {},
    },
  };
  const checkMeet = code(
    'tv2-check-meet',
    'Verify real Calendar and Meet',
    `const e = $input.first().json;
const expectedId = ${JSON.stringify(eventId)};
const expectedStart = Date.parse(${JSON.stringify(config.scheduledAt)});
const meet = e.hangoutLink || e.conferenceData?.entryPoints?.find(x => x.entryPointType === 'video')?.uri;
if (e.id !== expectedId || e.status !== 'confirmed' || e.summary !== ${JSON.stringify('[TV2 TEST] ' + reference)}) throw new Error('Calendar readback mismatch');
if (Date.parse(e.start?.dateTime) !== expectedStart || Date.parse(e.end?.dateTime) !== expectedStart + 45 * 60000) throw new Error('Interview time readback mismatch');
if (!new RegExp('^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$').test(meet || '') || e.conferenceData?.createRequest?.status?.statusCode !== 'success') throw new Error('Google Meet is not ready; inspect this event before retrying, do not create another');
if ((e.attendees || []).length) throw new Error('Self-test must not invite Calendar attendees');
return [{ json: { ...e, hangoutLink: meet } }];`,
    1060,
  );
  const format = take('n8n-nodes-base.code');
  format.position = [1300, 400];
  const mailGuard = code(
    'tv2-mail-guard',
    'Validate self-addressed invitation',
    `const p = $input.first().json;
const self = ${JSON.stringify(email)};
const event = $('Verify real Calendar and Meet').first().json;
if (String(p.fromEmail).toLowerCase() !== self || String(p.candidateEmail).toLowerCase() !== self || p.googleMeetUrl !== event.hangoutLink || !p.emailHtml?.includes(event.hangoutLink)) throw new Error('Unexpected recipient or Meet URL');
p.emailSubject = ${JSON.stringify('[TV2 TEST] ' + reference)};
p.emailHtml = p.emailHtml.replace('<body>', '<body><p><strong>TV2 TEST: Du lieu ung vien gia, gui ve chinh tai khoan test.</strong></p>');
return [{ json: p }];`,
    1540,
  );
  smtp.position = [1780, 400];
  smtp.retryOnFail = false;
  smtp.parameters.emailFormat = 'html';
  const report = code(
    'tv2-live-report',
    'TV2 live test result',
    `const m = $input.first().json;
const e = $('Verify real Calendar and Meet').first().json;
const self = ${JSON.stringify(email)};
if (!m.messageId || !Array.isArray(m.accepted) || m.accepted.length !== 1 || String(m.accepted[0]).toLowerCase() !== self || (m.rejected || []).length) throw new Error('SMTP did not accept the one self-addressed message');
return [{ json: { success: true, mode: 'TV2_LIVE_SELF_TEST', testReference: ${JSON.stringify(reference)}, calendar: { eventId: e.id, googleMeetUrl: e.hangoutLink, readback: 'VERIFIED' }, email: { status: 'SMTP_ACCEPTED', messageId: m.messageId, inboxDelivery: 'NOT_YET_VERIFIED' }, telegram: 'NOT_REQUESTED' } }];`,
    2020,
  );
  const respond = take('n8n-nodes-base.respondToWebhook');
  respond.position = [2260, 400];
  respond.parameters.responseBody = '={{ $json }}';
  respond.parameters.respondWith = 'json';
  const nodes = [
    webhook,
    guard,
    calendar,
    readback,
    checkMeet,
    format,
    mailGuard,
    smtp,
    report,
    respond,
  ];
  const names = new Set(nodes.map((n) => n.name));
  if (names.size !== nodes.length) throw new Error('Duplicate node names');
  for (const n of nodes) {
    delete n.disabled;
    delete n.continueOnFail;
  }
  for (const n of nodes) if (n.type === 'n8n-nodes-base.code') new Function(n.parameters.jsCode);
  const connections = {};
  for (let i = 0; i < nodes.length - 1; i++)
    connections[nodes[i].name] = { main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]] };
  const workflow = {
    id: 'hrTv2LiveSelf01',
    name: 'TV2 - LIVE TEST - Calendar and Gmail self-only',
    active: false,
    nodes,
    connections,
    pinData: {},
    settings: { executionOrder: 'v1', timezone: 'Asia/Ho_Chi_Minh' },
  };
  if (workflow.nodes.some((n) => n.type.includes('telegram')))
    throw new Error('Telegram must be excluded');
  if (webMode) {
    workflow.id = 'hrTv2WebLive01';
    workflow.name = 'TV2 - WEB TEST - Recruitment Calendar and Gmail';
    webhook.parameters.path = 'hr-tv2-web-test/interview-schedule';
    webhook.webhookId = 'hr-tv2-web-test-interview';
    guard.parameters.jsCode = [
      'const body = $input.first().json.body || $input.first().json; const p = body.data || body;',
      'const self = ' + JSON.stringify(email) + ';',
      'if (p.applicationId !== ' +
        config.applicationId +
        ' || !Number.isSafeInteger(p.interviewId) || p.interviewId < 1) throw new Error("Not the seeded application");',
      'if (String(p.candidateEmail).toLowerCase() !== self || String(p.fromEmail).toLowerCase() !== self || String(p.interviewerEmail).toLowerCase() !== self) throw new Error("Only the configured Gmail may receive the test");',
      'if (p.candidateName !== "TV2 WEB TEST - Ung vien gia" || p.round !== 1 || Date.parse(p.scheduledAt) !== Date.parse(' +
        JSON.stringify(config.scheduledAt) +
        ')) throw new Error("Unexpected website schedule");',
      'return [{json:p}];',
    ].join('\n');
    const title = '[TV2 WEB TEST] ' + reference;
    calendar.parameters.additionalFields.summary = title;
    checkMeet.parameters.jsCode = checkMeet.parameters.jsCode.replace(
      JSON.stringify('[TV2 TEST] ' + reference),
      JSON.stringify(title),
    );
    mailGuard.parameters.jsCode = mailGuard.parameters.jsCode.replace(
      JSON.stringify('[TV2 TEST] ' + reference),
      JSON.stringify(title),
    );
    report.parameters.jsCode = report.parameters.jsCode
      .replace('TV2_LIVE_SELF_TEST', 'TV2_WEB_LIVE_TEST')
      .replace(
        'success: true,',
        'success: true, applicationId: ' +
          config.applicationId +
          ', interviewId: $("Validate TV2 self-test").first().json.interviewId,',
      );
    for (const n of nodes) if (n.type === 'n8n-nodes-base.code') new Function(n.parameters.jsCode);
  }
  const payload = {
    testOnly: true,
    testReference: reference,
    candidateName: 'TV2 TEST - Ung vien gia',
    candidateEmail: email,
    fromEmail: email,
    interviewerName: 'TV2 TEST - HR Demo',
    interviewerEmail: email,
    scheduledAt: config.scheduledAt,
    round: 1,
  };
  await fs.writeFile(
    path.join(dir, webMode ? 'tv2-interview-web-test.json' : 'tv2-interview-live-self-test.json'),
    JSON.stringify(workflow, null, 2) + '\n',
  );
  if (!webMode)
    await fs.writeFile(
      path.join(dir, 'tv2-live-self-test-payload.json'),
      JSON.stringify(payload, null, 2) + '\n',
    );
  console.log(
    JSON.stringify({
      workflowId: workflow.id,
      reference,
      eventId,
      scheduledAt: config.scheduledAt,
      durationMinutes: 45,
      active: false,
      pinned: false,
      recipient: 'SMTP Gmail itself',
      telegram: 'EXCLUDED',
    }),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
