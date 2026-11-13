const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '../..');
const files = ['02_mandatory_training_reminder.json', '03_monthly_performance_review_reminder.json', '04_offboarding_workflow.json'];
const workflows = files.map(file => JSON.parse(fs.readFileSync(path.join(root, 'workflows/tv4_admin_training', file))));
const config = workflow => Object.fromEntries(workflow.nodes.find(node => node.type === 'n8n-nodes-base.set').parameters.assignments.assignments.map(field => [field.name, field.value]));
function compose(index, name, input, outputs = {}) {
  const source = workflows[index].nodes.find(node => node.name === name).parameters.jsCode;
  const value = vm.runInNewContext(`(function(){${source}\n})()`, {
    $json: input,
    $input: { first: () => ({ json: input }) },
    $: name => ({ item: { json: outputs[name] }, first: () => ({ json: outputs[name] }) }),
  }, { timeout: 1000 });
  return JSON.parse(JSON.stringify(Array.isArray(value) ? value[0].json : value.json));
}
test('Production workflow defaults never redirect employee or manager mail', () => {
  for (const workflow of workflows) {
    for (const [field, value] of Object.entries(config(workflow))) {
      if (['testEmployeeEmail', 'testManagerEmail', 'testInternalEmail'].includes(field)) assert.equal(value, '');
    }
  }
});
test('Training uses each assignment employee and manager from the database', () => {
  for (const suffix of ['one', 'two']) {
    const result = compose(0, 'Compose Training Notices', {
      ...config(workflows[0]), employee: { fullName: suffix, email: `${suffix}@example.invalid` },
      manager: { fullName: 'Manager', email: `manager-${suffix}@example.invalid` },
      course: { title: 'Course' }, daysRemaining: 2, progressPercent: 0,
    });
    assert.equal(result.employeeEmail, `${suffix}@example.invalid`);
    assert.equal(result.managerEmail, `manager-${suffix}@example.invalid`);
  }
});
test('KPI uses database reviewer and links to the deployed admin scoring page', () => {
  const result = compose(1, 'Compose Review Notices', {
    ...config(workflows[1]), recipient: { fullName: 'Reviewer', email: 'reviewer@example.invalid' },
    employees: [], phase: 'OPENING', reviewPeriodLabel: 'Tháng 11/2026', deadline: '2026-11-30',
  });
  assert.equal(result.recipientEmail, 'reviewer@example.invalid');
  assert.match(result.emailHtml, /href="https:\/\/soma-registrar-dependent-baltimore\.trycloudflare\.com\/admin\/settings"/);
  assert.doesNotMatch(result.emailHtml, /employee\/workspace/);
});
test('Explicit test overrides route only the configured test recipients', () => {
  const qa = 'qa@example.invalid';
  const training = compose(0, 'Compose Training Notices', {
    ...config(workflows[0]), testEmployeeEmail: qa, testManagerEmail: qa,
    employee: { fullName: 'Employee', email: 'employee@example.invalid' },
    manager: { fullName: 'Manager', email: 'manager@example.invalid' },
    course: { title: 'Course' }, daysRemaining: 2, progressPercent: 0,
  });
  assert.equal(training.employeeEmail, qa);
  assert.equal(training.managerEmail, qa);
  const review = compose(1, 'Compose Review Notices', {
    ...config(workflows[1]), testManagerEmail: qa,
    recipient: { fullName: 'Manager', email: 'manager@example.invalid' },
    employees: [], phase: 'OPENING',
  });
  assert.equal(review.recipientEmail, qa);
  const offboarding = compose(2, 'Compose Offboarding Notices', { data: {
    caseId: 1, lastWorkingDate: '2026-11-30', employee: { fullName: 'Employee', personalEmail: 'personal@example.invalid' },
  } }, { 'Authenticate Offboarding Request': {
    ...config(workflows[2]), testEmployeeEmail: qa, testInternalEmail: qa,
  } });
  assert.equal(offboarding.employeeRecipient, qa);
  assert.equal(offboarding.itRecipient, qa);
  assert.equal(offboarding.accountingRecipient, qa);
});
test('Offboarding uses personal email, falls back to work email, and routes departments separately', () => {
  const settings = { ...config(workflows[2]), itEmail: 'it@example.invalid', accountingEmail: 'finance@example.invalid' };
  for (const personalEmail of ['personal@example.invalid', '']) {
    const result = compose(2, 'Compose Offboarding Notices', { data: {
      caseId: 1, lastWorkingDate: '2026-11-30', alreadyNotified: {},
      employee: { fullName: 'Employee', personalEmail, workEmail: 'work@example.invalid' },
    } }, { 'Authenticate Offboarding Request': settings });
    assert.equal(result.employeeRecipient, personalEmail || 'work@example.invalid');
    assert.equal(result.itRecipient, settings.itEmail);
    assert.equal(result.accountingRecipient, settings.accountingEmail);
    assert.equal(result.sendEmployee, true);
    assert.equal(result.sendIt, true);
    assert.equal(result.sendFinance, true);
  }
});
test('Import preparer accepts empty test overrides but validates real and non-empty test recipients', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv4-routing-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const filename = path.join(temp, 'mail.json');
  const routing = { senderEmail: 'sender@example.invalid', itEmail: 'it@example.invalid', accountingEmail: 'finance@example.invalid' };
  const prepare = values => {
    fs.writeFileSync(filename, JSON.stringify(values));
    return spawnSync(process.execPath, [path.join(root, 'scripts/prepare-tv4-n8n-import.cjs')], {
      env: { ...process.env, TV4_N8N_CREDENTIAL_SOURCE_DIR: '', TV4_N8N_MAIL_CONFIG_FILE: filename, TV4_N8N_IMPORT_OUTPUT_DIR: path.join(temp, 'out') }, encoding: 'utf8',
    });
  };
  assert.equal(prepare(routing).status, 0);
  for (const file of files) {
    const output = JSON.parse(fs.readFileSync(path.join(temp, 'out', file)));
    for (const [field, value] of Object.entries(config(output))) if (field.startsWith('test')) assert.equal(value, '');
    assert.equal(output.active, false);
  }
  assert.equal(prepare({ ...routing, testManagerEmail: 'qa@example.invalid' }).status, 0);
  assert.notEqual(prepare({ ...routing, testManagerEmail: 'not-an-email' }).status, 0);
  assert.notEqual(prepare({ ...routing, itEmail: '' }).status, 0);
});
