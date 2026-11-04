const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/components/training-date.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const dates = {};
new vm.Script('(function(exports) {\n' + compiled.outputText + '\n})').runInThisContext()(dates);

test('training deadlines and default dates use Vietnam calendar on Windows, Linux and UTC hosts', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(dates.trainingDayKey('2026-11-04T16:59:59Z'), '2026-11-04');
      assert.equal(dates.trainingDayKey('2026-11-04T17:00:00Z'), '2026-11-05');
      assert.equal(dates.trainingDateInput(1, Date.parse('2026-12-31T17:00:00Z')), '2027-01-02');
      assert.equal(dates.trainingDateInput(1, Date.parse('2028-02-28T08:00:00Z')), '2028-02-29');
      assert.equal(dates.trainingDateInput(30, Date.parse('2026-11-04T17:00:00Z')), '2026-12-05');
      assert.equal(dates.trainingDayKey('invalid'), '');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
