const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadHelpers() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/features/recruitment/interview-helpers.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = {};
  new vm.Script('(function(exports) {\n' + compiled.outputText + '\n})').runInThisContext()(mod);
  return mod;
}

test('SCRUM-25 interview helpers guard reschedule/cancel permissions and +/- 45m conflicts', () => {
  const h = loadHelpers();

  assert.equal(h.canManageInterview('PENDING', 'INTERVIEWING', true), true);
  assert.equal(h.canManageInterview('PENDING', 'INTERVIEWING', false), false);
  assert.equal(h.canManageInterview('PASSED', 'INTERVIEWING', true), false);
  assert.equal(h.canManageInterview('FAILED', 'INTERVIEWING', true), false);
  assert.equal(h.canManageInterview('PENDING', 'OFFERED', true), false);
  assert.equal(h.canManageInterview('PENDING', 'HIRED', true), false);
  assert.equal(h.canManageInterview('PENDING', 'REJECTED', true), false);

  const existing = ['2099-05-01T10:00:00Z'];
  assert.equal(h.hasInterviewConflict('2099-05-01T10:00:00Z', existing), true);
  assert.equal(h.hasInterviewConflict('2099-05-01T10:44:00Z', existing), true);
  assert.equal(h.hasInterviewConflict('2099-05-01T09:16:00Z', existing), true);
  assert.equal(h.hasInterviewConflict('2099-05-01T10:45:00Z', existing), false);
  assert.equal(h.hasInterviewConflict('2099-05-01T09:15:00Z', existing), false);

  const localInput = h.toDateTimeLocalInput('2099-05-01T10:30:00Z');
  assert.match(localInput, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(h.toDateTimeLocalInput('invalid'), '');
});
