const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/features/recruitment/job-deadline.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = {};
  new vm.Script('(function(exports) {\n' + compiled.outputText + '\n})').runInThisContext()(mod);
  return mod;
}

test('job deadline helpers follow Vietnam date boundaries and format progress cleanly', () => {
  const helper = loadModule();
  const beforeVnMidnight = new Date('2026-11-25T16:59:59Z');
  const afterVnMidnight = new Date('2026-11-25T17:00:00Z');

  assert.equal(helper.todayVietnamDate(beforeVnMidnight), '2026-11-25');
  assert.equal(helper.todayVietnamDate(afterVnMidnight), '2026-11-26');

  assert.equal(helper.isJobDeadlineExpired('2026-11-25', beforeVnMidnight), false);
  assert.equal(helper.isJobDeadlineExpired('2026-11-25', afterVnMidnight), true);
  assert.equal(helper.isJobDeadlineExpired('2026-11-24', beforeVnMidnight), true);
  assert.equal(helper.isJobDeadlineExpired(null, afterVnMidnight), false);

  assert.equal(helper.daysUntilDeadline('2026-11-25', beforeVnMidnight), 0);
  assert.equal(helper.daysUntilDeadline('2026-11-28', beforeVnMidnight), 3);
  assert.equal(helper.daysUntilDeadline('2026-11-24', beforeVnMidnight), -1);
  assert.equal(helper.daysUntilDeadline(null, beforeVnMidnight), null);

  assert.equal(helper.formatDeadlineDate('2026-11-30'), '30/11/2026');
  assert.equal(helper.formatDeadlineDate('2026-11-30T00:00:00.000Z'), '30/11/2026');
  assert.equal(helper.formatDeadlineDate(null), '');

  assert.equal(helper.formatHiringProgress(1, 2), 'Đã tuyển 1/2');
  assert.equal(helper.formatHiringProgress(undefined, undefined), 'Đã tuyển 0/1');
  assert.equal(helper.formatHiringProgress(3, 2), 'Đã tuyển 3/2');
});
