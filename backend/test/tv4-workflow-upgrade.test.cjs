const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '../..');
const files = ['02_mandatory_training_reminder.json', '03_monthly_performance_review_reminder.json', '04_offboarding_workflow.json'];
const workflows = files.map(file => JSON.parse(fs.readFileSync(path.join(root, 'workflows/tv4_admin_training', file))));
function run(workflow, name, input = {}, outputs = {}) {
  const node = workflow.nodes.find(node => node.name === name);
  assert.ok(node, name);
  const inputs = Array.isArray(input) ? input : [input];
  const lookup = name => {
    if (!(name in outputs)) throw Error('Not executed: ' + name);
    const values = Array.isArray(outputs[name]) ? outputs[name] : [outputs[name]];
    return { item: { json: values[0] }, first: () => ({ json: values[0] }), all: () => values.map(json => ({ json })) };
  };
  const context = { $json: inputs[0], $input: { first: () => ({ json: inputs[0] }), all: () => inputs.map(json => ({ json })) }, $: lookup, $execution: { id: 'qa-run-42' } };
  let source;
  if (node.type === 'n8n-nodes-base.code') source = `(function(){${node.parameters.jsCode}\n})()`;
  else if (node.type === 'n8n-nodes-base.if') source = node.parameters.conditions.conditions[0].leftValue.slice(3, -2);
  else source = node.parameters.responseBody.slice(3, -2);
  const result = vm.runInNewContext(source, context, { timeout: 1000 });
  return JSON.parse(JSON.stringify(result));
}
const config = { apiBaseUrl: 'http://localhost:3001/api/', automationSecret: 'fixture-only-not-a-live-secret', senderEmail: 'sender@example.invalid', telegramChatId: '-5413459681', workspaceUrl: 'https://hr.example.invalid/employee/workspace', reviewFormUrl: 'https://hr.example.invalid/employee/workspace' };
const training = { ...config, assignmentId: 1, runId: 'qa-run-42', employee: { id: 4, fullName: 'Employee <QA>', email: 'employee@example.invalid' }, manager: { id: 3, fullName: 'Manager QA', email: 'manager@example.invalid' }, course: { title: 'Training QA' }, daysRemaining: 2, progressPercent: 25, notifyManager: true };
const offboarding = { caseId: 19, status: 'IN_PROGRESS', lastWorkingDate: '2026-11-15', employee: { fullName: 'Employee QA', workEmail: 'work@example.invalid', personalEmail: 'personal@example.invalid' }, alreadyNotified: {} };
const offConfig = { ...config, caseId: 19, itEmail: 'it@example.invalid', accountingEmail: 'finance@example.invalid' };
const offCompose = record => run(workflows[2], 'Compose Offboarding Notices', { data: record }, { 'Authenticate Offboarding Request': offConfig })[0].json;

for (const [index, workflow] of workflows.entries()) {
  test(`TV4 ${index + 2}: graph is complete, English, inactive and unpinned`, () => {
    assert.equal(workflow.nodes.length, [18, 19, 18][index]);
    assert.equal(workflow.active, false);
    assert.deepEqual(workflow.pinData, {});
    assert.equal(new Set(workflow.nodes.map(node => node.id)).size, workflow.nodes.length);
    const names = new Set(workflow.nodes.map(node => node.name));
    assert.equal(names.size, workflow.nodes.length);
    for (const node of workflow.nodes) {
      assert.match(node.name, /^[\x20-\x7E]+$/);
      if (/Send |Record /.test(node.name)) assert.equal(node.onError, 'continueRegularOutput');
    }
    const seen = new Set();
    function visit(name) {
      if (seen.has(name)) return;
      assert.ok(names.has(name), name);
      seen.add(name);
      for (const edges of workflow.connections[name]?.main || []) for (const edge of edges || []) visit(edge.node);
    }
    visit(workflow.nodes[0].name);
    // KPI has a second Schedule Trigger, intentionally sharing the same pipeline.

    assert.equal(seen.size, names.size);
    assert.ok(workflow.nodes.filter(node => node.name.startsWith('Record ')).every(node => node.retryOnFail && node.maxTries === 3));
  });
}
test('Training configuration fails closed for missing secret or invalid backend', () => {
  assert.throws(() => run(workflows[0], 'Validate Training Configuration', { ...config, automationSecret: '' }), /khóa xác thực/);
  assert.throws(() => run(workflows[0], 'Validate Training Configuration', { ...config, apiBaseUrl: 'javascript:alert(1)' }), /backend/);
  assert.equal(run(workflows[0], 'Validate Training Configuration', config)[0].json.apiBaseUrl, 'http://localhost:3001/api');
});
test('Training distinguishes overdue from due soon without changing backend eligibility', () => {
  assert.equal(run(workflows[0], 'Classify Training Alert', training).json.alertTier, 'DUE_SOON');
  assert.equal(run(workflows[0], 'Classify Training Alert', { ...training, daysRemaining: -2 }).json.alertTier, 'OVERDUE');
});
test('Training missing employee email still sends valid manager and Telegram routes', () => {
  const source = run(workflows[0], 'Compose Training Notices', { ...training, employee: { ...training.employee, email: '' } }).json;
  assert.equal(source.employeeEmailReady, false);
  assert.equal(source.hasManager, true);
  const result = run(workflows[0], 'Summarize Training Delivery', {}, { 'Compose Training Notices': source, 'Send Manager Reminder': { accepted: [source.managerEmail] }, 'Send Training Telegram': { message_id: 99 } }).json;
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.managerNotified, true);
  assert.equal(result.employeeNotified, false);
});
test('Training rejects unsafe links and cannot infer success from an empty SMTP result', () => {
  const source = run(workflows[0], 'Compose Training Notices', { ...training, workspaceUrl: '', course: { title: 'QA', courseUrl: 'javascript:alert(1)' } }).json;
  assert.doesNotMatch(source.employeeHtml, /href=""|javascript:/);
  const result = run(workflows[0], 'Summarize Training Delivery', {}, { 'Compose Training Notices': source, 'Send Employee Reminder': {}, 'Send Manager Reminder': {}, 'Send Training Telegram': {} }).json;
  assert.equal(result.status, 'FAILED');
});
test('Training no-manager branch can succeed without a manager notification', () => {
  const source = run(workflows[0], 'Compose Training Notices', { ...training, manager: null }).json;
  const result = run(workflows[0], 'Summarize Training Delivery', {}, { 'Compose Training Notices': source, 'Send Employee Reminder': { accepted: [source.employeeEmail] }, 'Send Training Telegram': { ok: true } }).json;
  assert.equal(result.status, 'SENT');
  assert.equal(result.managerNotified, false);
});
test('Empty training/review input stops sending normally', () => {
  assert.equal(run(workflows[0], 'Split Training Assignments', { data: { reminders: [] } }, { 'Validate Training Configuration': config })[0].json.skip, true);
  assert.equal(run(workflows[1], 'Split Review Recipients', { data: { reminders: [] } }, { 'Prepare Review Request': config })[0].json.skip, true);
});
test('KPI phase gate follows backend instead of a fixed day or local test overrides', () => {
  const request = run(workflows[1], 'Prepare Review Request', config)[0].json;
  assert.equal(request.runId, 'qa-run-42');
  assert.equal(request.phase, undefined);
  for (const phase of ['OPENING', 'SECOND_REMINDER']) assert.equal(run(workflows[1], 'Is Review Phase Active?', { data: { phase } }), true);
  assert.equal(run(workflows[1], 'Is Review Phase Active?', { data: { phase: null } }), false);
});
test('KPI final summary accounts for every recipient, channel failure and callback failure', () => {
  const result = run(workflows[1], 'Build Review Run Summary', [ { status: 'SENT' }, { status: 'PARTIAL' }, { status: 'FAILED', callbackError: true } ], {
    'Prepare Review Request': { ...config, phase: 'OPENING', telegramReady: true }, 'Fetch Review Recipients': { data: { count: 3, pendingEmployeeCount: 5, reviewPeriod: '2026-11' } },
  })[0].json;
  assert.deepEqual([result.totalRecipients, result.pendingEmployeeCount, result.sent, result.partial, result.failed, result.callbackErrors], [3, 5, 1, 1, 1, 1]);
  assert.match(result.telegramText, /\nKỳ:/);
  assert.doesNotMatch(result.telegramText, /\\n/);
});
test('Callback receipt flags a rejected or failed write instead of reporting it as recorded', () => {
  const source = { runId: 'qa-run-42', assignmentId: 1, status: 'SENT' };
  for (const response of [{ data: { recorded: false } }, { error: { message: 'unavailable' } }, {}]) {
    const receipt = run(workflows[0], 'Collect Training Receipt', response, { 'Summarize Training Delivery': source }).json;
    assert.equal(receipt.callbackRecorded, false);
    assert.equal(receipt.callbackError, true);
    assert.equal(receipt.automationSecret, undefined);
  }
  assert.equal(run(workflows[0], 'Collect Training Receipt', { data: { recorded: true, duplicate: true } }, { 'Summarize Training Delivery': source }).json.callbackRecorded, true);
});
test('Offboarding authenticates webhook and rejects non-positive or fake case IDs', () => {
  const outputs = { 'Offboarding Approval Webhook': { headers: { 'x-automation-secret': config.automationSecret }, body: { caseId: 19 } } };
  assert.equal(run(workflows[2], 'Authenticate Offboarding Request', config, outputs)[0].json.caseId, 19);
  for (const caseId of ['TV4-001', 0, -1, 1.5]) assert.throws(() => run(workflows[2], 'Authenticate Offboarding Request', config, { 'Offboarding Approval Webhook': { ...outputs['Offboarding Approval Webhook'], body: { caseId } } }), /không hợp lệ/);
  assert.throws(() => run(workflows[2], 'Authenticate Offboarding Request', config, { 'Offboarding Approval Webhook': { headers: {}, body: { caseId: 19 } } }), /xác thực/);
});
test('Offboarding rejects missing, mismatched, completed and malformed cases before sending', () => {
  const outputs = { 'Authenticate Offboarding Request': offConfig };
  assert.equal(run(workflows[2], 'Is Approved Case Valid?', { data: offboarding }, outputs), true);
  for (const record of [{}, { ...offboarding, caseId: 20 }, { ...offboarding, status: 'COMPLETED' }, { ...offboarding, lastWorkingDate: 'invalid' }]) assert.equal(run(workflows[2], 'Is Approved Case Valid?', { data: record }, outputs), false);
});
test('Offboarding retry skips three confirmed channels and only retries Telegram', () => {
  const source = offCompose({ ...offboarding, alreadyNotified: { it: true, finance: true, employee: true, telegram: false } });
  assert.deepEqual([source.sendIt, source.sendFinance, source.sendEmployee, source.sendTelegram], [false, false, false, true]);
  const result = run(workflows[2], 'Summarize Offboarding Delivery', {}, { 'Compose Offboarding Notices': source, 'Send Offboarding Telegram': { message_id: 9 } })[0].json;
  assert.equal(result.status, 'SENT');
  assert.deepEqual(result.attemptedChannels, ['telegram']);
  assert.deepEqual(result.skippedChannels, ['it', 'finance', 'employee']);
});
test('Offboarding failed retry preserves previously delivered channel flags', () => {
  const source = offCompose({ ...offboarding, alreadyNotified: { it: true, finance: true, employee: true } });
  const result = run(workflows[2], 'Summarize Offboarding Delivery', {}, { 'Compose Offboarding Notices': source, 'Send Offboarding Telegram': { error: 'unavailable' } })[0].json;
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.itNotified, true);
  assert.equal(result.telegramNotified, false);
});
test('Offboarding invalid employee email does not prevent IT and Finance notices', () => {
  const source = offCompose({ ...offboarding, employee: { fullName: 'QA' } });
  assert.equal(source.sendEmployee, false);
  assert.equal(source.sendIt, true);
  assert.equal(source.sendFinance, true);
  assert.doesNotMatch(source.farewellHtml, /href="undefined"|href=""/);
});
test('Offboarding response reports callback failure instead of false success', () => {
  const outputs = { 'Summarize Offboarding Delivery': { caseId: 19, status: 'SENT', itNotified: true, financeNotified: true, employeeNotified: true, telegramNotified: true } };
  const bad = JSON.parse(run(workflows[2], 'Respond to Offboarding Request', { error: 'timeout' }, outputs));
  assert.equal(bad.success, false);
  assert.equal(bad.callbackRecorded, false);
  const good = JSON.parse(run(workflows[2], 'Respond to Offboarding Request', { data: { recorded: true } }, outputs));
  assert.equal(good.success, true);
});
