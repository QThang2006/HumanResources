// Offline regression test: execute the generated n8n Code node without Backend build or services.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workflow = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../workflows/candidate-intake-ai.json'), 'utf8'));
const node = workflow.nodes.find(n => n.name === '09. Soạn thư xác nhận đã nhận hồ sơ');
assert.ok(node, 'AI intake acknowledgement node exists');
assert.equal(node.parameters.mode, 'runOnceForEachItem');

function render(data) {
  return vm.runInNewContext('(function(){' + node.parameters.jsCode + '\n})()', {
    $json: { data },
  }, { timeout: 1000 }).json;
}
function escape(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
const input = {
  applicationId: 23,
  candidateName: 'Nguyễn Văn An',
  candidateEmail: 'candidate@example.test',
  candidatePhone: '+84901234567',
  fromEmail: 'hr@example.test',
  channel: 'GMAIL',
  sourceId: 'offline-message-23',
};

test('AI acknowledgement retains recruitment branding and email-safe layout', () => {
  const { html } = render(input);
  for (const expected of [
    '<!doctype html>', '<html lang="vi">', 'HR ATS • TUYỂN DỤNG',
    'XÁC NHẬN ĐÃ NHẬN HỒ SƠ', 'Phòng Nhân sự', 'Enterprise HR &amp; Talent Ecosystem',
    'max-width:760px', 'border-radius:18px', 'role="presentation"',
    'background:#f3f6fb', 'background:linear-gradient(120deg,#1e3a8a,#2563eb)',
    'background:#f8fafc', 'border-left:5px solid #2563eb',
    'Bước tiếp theo', 'Đã tiếp nhận hồ sơ', '#23',
  ]) assert.ok(html.includes(expected), 'Missing layout/content: ' + expected);
  assert.ok(html.includes(escape(input.candidateName)));
  assert.ok(html.includes(escape(input.candidateEmail)));
  assert.doesNotMatch(html, /<script\b|<iframe\b|<img\b|<a\b/i);
});

test('AI acknowledgement preserves routing, source data and subject', () => {
  const output = render(input);
  for (const [key, value] of Object.entries(input)) assert.equal(output[key], value, key);
  assert.equal(output.subject, 'Xác nhận đã nhận hồ sơ ứng tuyển');
  assert.deepEqual(Object.keys(output).sort(), [...Object.keys(input), 'subject', 'html'].sort());
  assert.equal(input.candidateName, 'Nguyễn Văn An');
});

test('All displayed candidate fields escape HTML metacharacters and injected elements', () => {
  const payload = '<script>alert("x"&\'y\')</script><img src=x onerror=alert(1)>';
  // applicationId is numeric in production; testing it here also guards template interpolation.
  for (const field of ['candidateName', 'candidateEmail', 'applicationId']) {
    const data = { ...input, [field]: payload };
    const output = render(data);
    assert.ok(output.html.includes(escape(payload)), field + ' must be escaped');
    assert.ok(!output.html.includes(payload), field + ' must not be raw');
    assert.doesNotMatch(output.html, /<script\b|<img\b|<iframe\b|<[^>]*\sonerror\s*=/i,
      field + ' must not inject an active element or attribute');
    assert.equal(output[field], payload, field + ' source value must remain intact');
  }
});
