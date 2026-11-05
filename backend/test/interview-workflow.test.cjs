const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const workflow = JSON.parse(
  fs.readFileSync(path.join(root, 'workflows/interview-schedule-readback.json'), 'utf8'),
);
const { test: nodeTest } = require('node:test');
const checks = [];
nodeTest('TV2 n8n readback Code contract fixtures (no providers)', () => {
  function run(name, input, upstream = {}) {
    const node = workflow.nodes.find((n) => n.name === name);
    return vm.runInNewContext(
      '(function(){' + node.parameters.jsCode + '\n})()',
      {
        Buffer,
        $input: { first: () => ({ json: input }) },
        $: (key) => ({ first: () => ({ json: upstream[key] }) }),
      },
      { timeout: 1000 },
    );
  }
  function test(name, action) {
    action();
    checks.push({ name, result: 'PASS' });
  }
  const delivery = {
    requestId: '11111111-1111-4111-8111-111111111111',
    token: 'a'.repeat(64),
    callbackUrl: 'http://localhost:3001/api/applications/interviews/1/delivery',
    eventId: 'hrtv2' + '1'.repeat(32),
  };
  const payload = {
    interviewId: 1,
    applicationId: 1,
    round: 1,
    scheduledAt: '2099-01-01T03:30:00Z',
    candidateName: '<img src=x onerror=alert(1)>',
    candidateEmail: 'candidate@example.test',
    fromEmail: 'sender@example.test',
    interviewerName: '<script>test</script>',
    interviewerEmail: 'manager@example.test',
    delivery,
  };
  const event = {
    id: delivery.eventId,
    status: 'confirmed',
    start: { dateTime: payload.scheduledAt },
    end: { dateTime: '2099-01-01T04:15:00Z' },
    hangoutLink: 'https://meet.google.com/abc-defg-hij',
    conferenceData: { createRequest: { status: { statusCode: 'success' } } },
  };
  const upstream = {
    '02. Kiểm tra quyền xử lý yêu cầu phỏng vấn': { interviewId: 1, delivery },
    '04. Nạp thông tin buổi phỏng vấn': payload,
  };
  test('Envelope accepts fixed local callback', () =>
    assert.equal(
      run('02. Kiểm tra quyền xử lý yêu cầu phỏng vấn', { body: { data: payload } })[0].json.interviewId,
      1,
    ));
  test('Envelope rejects arbitrary callback and malformed capability', () => {
    assert.throws(() =>
      run('02. Kiểm tra quyền xử lý yêu cầu phỏng vấn', {
        ...payload,
        delivery: { ...delivery, callbackUrl: 'https://example.test/callback' },
      }),
    );
    assert.throws(() =>
      run('02. Kiểm tra quyền xử lý yêu cầu phỏng vấn', { ...payload, delivery: { ...delivery, token: 'bad' } }),
    );
  });
  test('Claim loads canonical recipient snapshot', () =>
    assert.equal(
      run(
        '04. Nạp thông tin buổi phỏng vấn',
        { data: { claimed: true, payload, eventId: delivery.eventId } },
        upstream,
      )[0].json.candidateEmail,
      payload.candidateEmail,
    ));
  test('Claim rejects mismatching event and invalid sender', () => {
    assert.throws(() =>
      run('04. Nạp thông tin buổi phỏng vấn', { claimed: true, payload, eventId: 'wrong' }, upstream),
    );
    assert.throws(() =>
      run(
        '04. Nạp thông tin buổi phỏng vấn',
        { claimed: true, payload: { ...payload, fromEmail: '' }, eventId: delivery.eventId },
        upstream,
      ),
    );
  });
  test('Calendar readback emits the correct authenticated result', () =>
    assert.equal(
      run('08. Xác minh lịch và liên kết Google Meet', event, upstream)[0].json.callback.event,
      'CALENDAR_CONFIRMED',
    ));
  test('Calendar rejects wrong time/id/Meet and pending conference', () => {
    for (const invalid of [
      { ...event, id: 'wrong' },
      { ...event, end: { dateTime: '2099-01-01T05:15:00Z' } },
      { ...event, hangoutLink: 'https://example.test/meet' },
      { ...event, conferenceData: { createRequest: { status: { statusCode: 'pending' } } } },
    ])
      assert.throws(() => run('08. Xác minh lịch và liên kết Google Meet', invalid, upstream));
  });
  test('SMTP emits acceptance only when both recipients are accepted', () =>
    assert.equal(
      run(
        '12. Xác minh kết quả gửi thư mời',
        { messageId: '<test@example.test>', accepted: [payload.candidateEmail, payload.interviewerEmail], rejected: [] },
        upstream,
      )[0].json.event,
      'SMTP_ACCEPTED',
    ));
  test('SMTP rejects wrong/multiple/rejected recipients or absent messageId', () => {
    for (const invalid of [
      { messageId: 'id', accepted: ['other@example.test'], rejected: [] },
      { messageId: 'id', accepted: [payload.candidateEmail, 'other@example.test'], rejected: [] },
      { messageId: 'id', accepted: [payload.candidateEmail], rejected: ['other@example.test'] },
      { accepted: [payload.candidateEmail], rejected: [] },
    ])
      assert.throws(() => run('12. Xác minh kết quả gửi thư mời', invalid, upstream));
  });
  test('Email escapes display names instead of rendering injected HTML', () => {
    const prepared = run(
      '10. Soạn thư mời và tệp lịch ICS',
      {},
      { ...upstream, '08. Xác minh lịch và liên kết Google Meet': event },
    )[0];
    assert.ok(prepared.json.emailHtml.includes('&lt;img'));
    assert.equal(prepared.json.emailHtml.includes(payload.candidateName), false);
    assert.equal(prepared.json.toEmail, payload.candidateEmail + ',' + payload.interviewerEmail);
  });
  test('Failures use fixed codes without raw provider error', () => {
    for (const [name, stage, code] of [
      ['14. Tổng hợp lỗi tạo lịch phỏng vấn', 'CALENDAR', 'CALENDAR_ERROR'],
      ['16. Tổng hợp lỗi gửi thư mời', 'EMAIL', 'SMTP_ERROR'],
    ]) {
      const value = run(name, { error: 'SYNTHETIC_PRIVATE_PROVIDER_ERROR' }, upstream)[0].json;
      assert.equal(value.stage, stage);
      assert.equal(value.code, code);
      assert.equal(JSON.stringify(value).includes('SYNTHETIC_PRIVATE_PROVIDER_ERROR'), false);
    }
  });
  test('Only result callbacks retry; Calendar/SMTP/claim do not retry', () => {
    for (const node of workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest')) {
      assert.equal(node.retryOnFail, node.name !== '03. Nhận quyền xử lý lịch phỏng vấn');
      if (node.retryOnFail) assert.equal(node.maxTries, 3);
    }
    for (const node of workflow.nodes.filter((n) =>
      ['n8n-nodes-base.googleCalendar', 'n8n-nodes-base.emailSend'].includes(n.type),
    ))
      assert.equal(node.retryOnFail, false);
  });
  test('Publishable template contains no credentials, pinned data, or other member workflow', () => {
    assert.equal(
      workflow.nodes.some(
        (n) => n.credentials || /telegram|employee-hired|copilot|burnout/i.test(n.type),
      ),
      false,
    );
    assert.equal(Object.keys(workflow.pinData || {}).length, 0);
  });
  const evidence = {
    scope: 'Exact exported Code-node logic with VM contract fixtures; no n8n engine/provider calls',
    totalPassed: checks.length,
    checks,
  };
  fs.mkdirSync(path.join(root, '.temp/n8n-import'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.temp/n8n-import/tv2-e020-workflow.json'),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(JSON.stringify({ totalPassed: checks.length, providerCalls: 0 }));
});
