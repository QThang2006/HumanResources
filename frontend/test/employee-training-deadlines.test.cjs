const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src/components');
function load(file, mocks = {}) {
  const filename = path.join(root, file), m = new Module(filename, module);
  m.filename = filename; m.paths = Module._nodeModulePaths(root);
  const original = m.require.bind(m); m.require = name => name.endsWith('.css') ? {} : mocks[name] || original(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  return m.exports;
}
const dates = load('training-date.ts');
const base = { id: 1, courseId: 1, title: 'Khóa học hội nhập', type: 'MANDATORY', progressPercent: 25, status: 'IN_PROGRESS', durationHours: 6, skillsProvided: ['Làm việc nhóm'], courseUrl: null };
const examples = [
  { ...base, dueAt: '2026-12-27T16:59:59Z' },
  { ...base, id: 2, title: 'An toàn thông tin cơ bản', dueAt: '2026-11-29T16:59:59Z' },
  { ...base, id: 3, title: 'Quy trình vận hành', dueAt: '2026-11-26T16:59:59Z' },
  { ...base, id: 4, title: 'Đào tạo đã hoàn thành', status: 'COMPLETED', progressPercent: 100, dueAt: '2026-11-20T16:59:59Z' },
  { ...base, id: 5, title: 'Dữ liệu lịch sử chưa có hạn', dueAt: null },
];
function render(rows = examples) {
  const states = [rows, false, null, 'ALL', '']; let index = 0;
  const { EmployeeTrainingsWidget } = load('EmployeeTrainingsWidget.tsx', {
    react: { ...React, useState: () => React.useState(states[index++]) },
    '../api/onboarding.api': { onboardingApi: { getTrainings() { throw Error('No live API in rendering tests'); } } },
    './training-date': { ...dates, trainingDeadline: (value, completed) => dates.trainingDeadline(value, completed, Date.parse('2026-11-27T01:00:00Z')) },
  });
  return renderToStaticMarkup(React.createElement(EmployeeTrainingsWidget));
}
test('actual employee widget renders deadlines, warning colors and safe historical/completed states', () => {
  const html = render(), articles = html.match(/<article[\s\S]*?<\/article>/g);
  assert.equal(articles.length, 5);
  assert.match(articles[0], /27\/12\/2026/); assert.doesNotMatch(articles[0], /Sắp đến hạn|Quá hạn/);
  assert.match(articles[1], /Sắp đến hạn/); assert.match(articles[1], /border-amber-200 bg-amber-50 text-amber-700/);
  assert.match(articles[2], /Quá hạn/); assert.match(articles[2], /border-rose-200 bg-rose-50 text-rose-700/);
  assert.match(articles[3], /20\/11\/2026/); assert.doesNotMatch(articles[3], /Sắp đến hạn|Quá hạn/);
  assert.match(articles[4], /Chưa có hạn hoàn thành/); assert.doesNotMatch(html, /Invalid Date/);
  assert.match(html, /<time\b[^>]*dateTime="2026-11-29T16:59:59.000Z"/);
});
module.exports = { render };
