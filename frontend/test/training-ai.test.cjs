const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.join(__dirname, '../src/api/training-ai-response.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const helpers = {};
new vm.Script('(function(exports) {\n' + compiled.outputText + '\n})').runInThisContext()(helpers);
const { parseTrainingAiSuggestion } = helpers;
const suggestion = {
  employeeId: 10, employeeName: 'Nhân viên giả lập', analysisMode: 'PRELIMINARY', dataNotice: 'Chưa có KPI.',
  skillGaps: ['TypeScript'], readinessScore: 70, summary: 'Phân tích sơ bộ: nhu cầu phát triển theo vị trí.',
  courseId: 5, courseTitle: 'TypeScript cơ bản', matchedMissingSkills: ['TypeScript'], priority: 'HIGH',
  estimatedTimeToComplete: '8 giờ', reason: 'Phù hợp với kỹ năng được đề xuất.', careerAdvice: 'Thực hành mỗi tuần.',
  assignedByAi: true, aiGenerated: true, hasMatchingCourse: true,
};

test('valid preliminary and full analyses retain all display and assignment fields', () => {
  assert.equal(parseTrainingAiSuggestion(suggestion), suggestion);
  const full = { ...suggestion, analysisMode: 'FULL', dataNotice: null };
  assert.equal(parseTrainingAiSuggestion(full), full);
});

test('a valid analysis without a matching catalog course is still displayable', () => {
  const empty = { ...suggestion, hasMatchingCourse: false, assignedByAi: false, courseId: null, courseTitle: null, matchedMissingSkills: [], priority: null, estimatedTimeToComplete: null };
  assert.equal(parseTrainingAiSuggestion(empty), empty);
});

test('malformed AI responses become actionable errors before React attempts to render them', () => {
  for (const invalid of [null, undefined, '', [], {}, ...[
    { skillGaps: 'TypeScript' }, { skillGaps: [{}] }, { summary: {} }, { reason: {} }, { careerAdvice: {} },
    { readinessScore: {} }, { readinessScore: NaN }, { readinessScore: 101 }, { courseTitle: {} }, { dataNotice: {} },
    { courseId: null }, { employeeId: '10' }, { estimatedTimeToComplete: {} }, { priority: {} }, { hasMatchingCourse: false },
  ].map(fields => ({ ...suggestion, ...fields }))]) {
    assert.throws(() => parseTrainingAiSuggestion(invalid), /chưa đúng định dạng/);
  }
});
