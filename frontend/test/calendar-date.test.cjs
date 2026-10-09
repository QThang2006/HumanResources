const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('interview calendar respects Vietnam midnight, week/month boundaries and safe links', () => {
  // Exercise the actual source with the project's compiler, including on Node 20/22.
  const source = fs.readFileSync(
    path.join(__dirname, '../src/features/recruitment/calendar-date.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const date = {};
  new vm.Script('(function(exports) {\n' + compiled.outputText + '\n})').runInThisContext()(date);
  assert.equal(date.dayKey('2026-10-07T16:59:59Z'), '2026-10-07');
  assert.equal(date.dayKey('2026-10-07T17:00:00Z'), '2026-10-08');
  assert.equal(date.timeLabel('2026-10-08T02:00:00Z'), '09:00');
  assert.equal(date.timeLabel('2026-10-07T17:00:00Z'), '00:00');
  assert.equal(date.weekStart('2026-10-11'), '2026-10-05');
  assert.equal(date.weekStart('2026-10-12'), '2026-10-12');
  const week = date.calendarWindow('2026-10-07', 'week');
  assert.equal(week.from, '2026-10-05T00:00:00+07:00');
  assert.equal(week.to, '2026-10-12T00:00:00+07:00');
  assert.equal(week.days.length, 7);
  const month = date.calendarWindow('2026-11-30', 'month');
  assert.equal(month.days[0], '2026-10-26');
  assert.equal(month.days.length, 42);
  assert.ok(month.days.includes('2026-11-30'));
  assert.equal(date.shiftPeriod('2026-01-31', 'month', 1), '2026-02-01');
  assert.equal(date.shiftPeriod('2026-12-31', 'month', 1), '2027-01-01');
  assert.equal(date.shiftPeriod('2026-01-01', 'week', -1), '2025-12-25');
  assert.equal(date.shiftDay('2024-02-28', 1), '2024-02-29');
  const meet = 'https://meet.google.com/abc-defg-hij';
  assert.equal(date.safeMeetLink(meet), meet);
  for (const value of [
    null,
    '',
    'javascript:alert(1)',
    meet + '?token=private',
    'https://meet.google.com.evil.test/abc-defg-hij',
  ])
    assert.equal(date.safeMeetLink(value), null);
});
