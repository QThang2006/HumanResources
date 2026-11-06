const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Compile the actual components in memory. These tests verify rendered content,
// not browser interaction, dialog focus behavior or visual layout.
function loadComponent(name) {
  const filename = path.resolve(__dirname, `../src/components/${name}.tsx`);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled.outputText, filename);
  return loaded.exports[name];
}
const CourseLearnersPanel = loadComponent('CourseLearnersPanel');
const CourseRemoveDialog = loadComponent('CourseRemoveDialog');
const CoursePermanentDeleteDialog = loadComponent('CoursePermanentDeleteDialog');
const CourseEditDialog = loadComponent('CourseEditDialog');
const course = { id: 1, title: 'Đào tạo an toàn', isArchived: false, assignmentCount: 1 };
const assignment = {
  id: 1, user: { fullName: 'Nhân viên A', email: 'learner@example.invalid', departmentName: 'Kỹ thuật', isActive: true },
  course, progressPercent: 75, status: 'IN_PROGRESS', dueAt: '2026-11-10T16:59:59Z', createdAt: '2026-10-30T03:00:00Z',
};
const noop = () => {};
function roster(props = {}) {
  return renderToStaticMarkup(React.createElement(CourseLearnersPanel, {
    course, assignments: [assignment], loading: false, error: '', onBack: noop, onRetry: noop, onManageProgress: noop, ...props,
  }));
}

test('roster shows the person, department, deadline, progress and archived explanation', () => {
  const html = roster({ course: { ...course, isArchived: true } });
  for (const text of ['Nhân viên A', 'learner@example.invalid', 'Kỹ thuật', '10/11/2026', '75%', 'Đang học', 'vẫn có thể tiếp tục học']) {
    assert.ok(html.includes(text), `Missing visible content: ${text}`);
  }
  assert.match(html, /<caption[^>]*>Người học được gán khóa/);
  assert.match(html, /aria-label="Bảng người học"/);
});

test('empty, loading and error screens remain distinct and errors offer retry', () => {
  assert.match(roster({ assignments: [] }), /Chưa có nhân viên được gán/);
  const loading = roster({ assignments: [], loading: true });
  assert.match(loading, /role="status"/);
  assert.match(loading, /Đang tải danh sách/);
  assert.doesNotMatch(loading, /Chưa có nhân viên được gán/);
  const error = roster({ error: 'Không thể tải danh sách.' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Thử lại/);
  assert.doesNotMatch(error, /learner@example.invalid/);
});

test('long rosters render a bounded first page and escape names supplied by users', () => {
  const html = roster({ assignments: Array.from({ length: 23 }, (_, index) => ({
    ...assignment, id: index + 1,
    user: { ...assignment.user, fullName: `Người ${index + 1} <script>alert(1)</script>` },
  })) });
  assert.equal((html.match(/<tr class=/g) || []).length, 20);
  assert.match(html, /Trang 1\/2/);
  assert.match(html, /20 \/ 23 người học/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('remove confirmation explains retention and disables both actions while saving', () => {
  const html = renderToStaticMarkup(React.createElement(CourseRemoveDialog, {
    course, busy: true, error: '', onCancel: noop, onConfirm: noop,
  }));
  assert.match(html, /role="alertdialog"/);
  assert.match(html, /1 lượt gán cùng toàn bộ tiến độ học tập vẫn được giữ nguyên/);
  assert.match(html, /khôi phục khóa học sau/);
  assert.match(html, /Đang gỡ/);
  assert.equal((html.match(/<button[^>]*disabled=""/g) || []).length, 2);
});

test('permanent deletion explains retained history and continuing learning', () => {
  const html = renderToStaticMarkup(React.createElement(CoursePermanentDeleteDialog, {
    course, busy: false, error: '', onCancel: noop, onConfirm: noop,
  }));
  assert.match(html, /1 lượt học cùng tiến độ và kết quả vẫn được giữ trong hồ sơ nhân viên/);
  assert.match(html, /vẫn có thể tiếp tục học và cập nhật tiến độ/);
  assert.doesNotMatch(html, /xóa luôn toàn bộ tiến độ/);
  assert.match(html, /không thể khôi phục khóa học/);
});

const editCourse = { ...course, type: 'SOFT_SKILL', skillsProvided: ['Giao tiếp', 'Excel'], durationHours: 8, courseUrl: 'https://example.invalid/course' };
const edit = props => renderToStaticMarkup(React.createElement(CourseEditDialog, {
  course: editCourse, busy: false, error: '', onCancel: noop, onConfirm: noop, ...props,
}));

test('course editor pre-fills metadata and locks type and skills for an assigned course', () => {
  const html = edit();
  for (const content of ['Chỉnh sửa khóa học', 'Đào tạo an toàn', 'Giao tiếp, Excel', 'https://example.invalid/course', 'tiến độ, hạn và kết quả được giữ nguyên']) {
    assert.ok(html.includes(content), content);
  }
  assert.match(html, /<select[^>]*disabled=""/);
  assert.match(html, /<textarea[^>]*disabled=""/);
  assert.doesNotMatch(html, /<input[^>]*disabled=""/);
  assert.match(html, /type="submit"/);
});

test('an unassigned course can edit content; busy and failure feedback remain explicit', () => {
  const html = edit({ course: { ...editCourse, assignmentCount: 0 } });
  assert.doesNotMatch(html, /disabled=""/);
  assert.match(html, /Việc lưu không tự tạo lượt gán mới/);
  const failed = edit({ error: 'Không thể lưu. Vui lòng thử lại.' });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Không thể lưu/);
  assert.match(failed, /Giao tiếp, Excel/);
  const busy = edit({ busy: true });
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /Đang lưu/);
  assert.match(busy, /<button[^>]*type="submit"[^>]*disabled=""/);
});
