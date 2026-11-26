const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTrackingHelpers() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/features/recruitment/tracking-helpers.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  new vm.Script('(function(exports, module) {\n' + compiled.outputText + '\n})').runInThisContext()(
    mod.exports,
    mod,
  );
  return mod.exports;
}

test('SCRUM-28: tracking code normalization and validation accept APP-* codes and reject malformed input', () => {
  const helpers = loadTrackingHelpers();
  assert.equal(helpers.normalizeTrackingCode('  app-a1b2c3d4e5f6  '), 'APP-A1B2C3D4E5F6');
  assert.equal(helpers.isValidTrackingCode('app-a1b2c3d4e5f6'), true);
  assert.equal(helpers.isValidTrackingCode('APP-123456'), true);

  for (const invalid of ['', '   ', 'SHORT', 'APP 123456', 'APP-1234!@#', 'A'.repeat(33)]) {
    assert.equal(helpers.isValidTrackingCode(invalid), false, invalid);
  }
});

test('SCRUM-28: status metadata maps every ApplicationStatus to safe Vietnamese progress without exposing internal notes', () => {
  const helpers = loadTrackingHelpers();
  assert.equal(helpers.TRACKING_STEPS.length, 4);

  const applied = helpers.getTrackingStatusMeta('APPLIED');
  assert.equal(applied.activeStepIndex, 0);
  assert.equal(applied.isRejected, false);

  const interviewing = helpers.getTrackingStatusMeta('INTERVIEWING');
  assert.equal(interviewing.activeStepIndex, 1);
  assert.equal(interviewing.isRejected, false);

  const offered = helpers.getTrackingStatusMeta('OFFERED');
  assert.equal(offered.activeStepIndex, 2);
  assert.equal(offered.isRejected, false);

  const hired = helpers.getTrackingStatusMeta('HIRED');
  assert.equal(hired.activeStepIndex, 3);
  assert.equal(hired.isRejected, false);

  const rejected = helpers.getTrackingStatusMeta('REJECTED');
  assert.equal(rejected.activeStepIndex, -1);
  assert.equal(rejected.isRejected, true);
  assert.match(rejected.headline, /Cảm ơn/);
});

test('SCRUM-28: formatTrackingDateTime formats timestamps in Asia/Ho_Chi_Minh and falls back cleanly', () => {
  const helpers = loadTrackingHelpers();
  assert.equal(helpers.formatTrackingDateTime(null), 'Chưa cập nhật');
  assert.equal(helpers.formatTrackingDateTime('not-a-date'), 'Chưa cập nhật');
  const formatted = helpers.formatTrackingDateTime('2026-11-26T02:30:00Z');
  assert.match(formatted, /09:30/);
  assert.match(formatted, /26\/11\/2026/);
});
