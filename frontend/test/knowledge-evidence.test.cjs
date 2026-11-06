const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(name, extension = 'tsx') {
  const filename = path.resolve(__dirname, `../src/components/${name}.${extension}`);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const requireOriginal = loaded.require.bind(loaded);
  loaded.require = name => name === './knowledge-evidence' ? load('knowledge-evidence', 'ts') : requireOriginal(name);
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}
const { groupKnowledgeEvidence, cleanKnowledgeAnswer } = load('knowledge-evidence', 'ts');
const { KnowledgeEvidence } = load('KnowledgeEvidence');
const { KnowledgeAnswer } = load('KnowledgeAnswer');
const response = {
  sources: [
    { chunkId: 2, documentId: 1, documentTitle: 'Đào tạo.pdf', excerpt: 'Khóa bắt buộc có thời hạn 30 ngày.', excerptIsPartial: false },
    { chunkId: 3, documentId: 1, documentTitle: 'Đào tạo.pdf', excerpt: 'Khóa hội nhập có thời hạn 15 ngày.', excerptIsPartial: true },
    { chunkId: 3, documentId: 1, documentTitle: 'Đào tạo.pdf', excerpt: 'Bản trùng không được hiển thị.' },
    { chunkId: 4, documentId: 2, documentTitle: 'Nghỉ phép.pdf', excerpt: 'Nhân viên có 12 ngày phép mỗi năm.', excerptIsPartial: false },
  ],
  results: [
    { chunkId: 9, documentId: 3, documentTitle: 'Không dùng.pdf', content: 'Nội dung không được dùng.', similarity: .99 },
  ],
};

test('gom theo tài liệu, giữ các đoạn đã dùng và bỏ kết quả tìm kiếm không được trích dẫn', () => {
  const groups = groupKnowledgeEvidence(response);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].quotes.length, 2);
  assert.equal(groups[1].quotes.length, 1);
  assert.equal(groups[0].quotes[1].partial, true);
  assert.doesNotMatch(JSON.stringify(groups), /Không dùng|Bản trùng|0.99/);
});

test('không lấy nhầm đoạn của tài liệu khác; thiếu văn bản được báo rõ', () => {
  const groups = groupKnowledgeEvidence({ sources: [{ chunkId: 2, documentId: 7, documentTitle: 'Nguồn.pdf' }], results: [{ chunkId: 2, documentId: 8, content: 'Không được lấy nhầm.' }] });
  assert.equal(groups[0].unavailable, true);
  assert.equal(groups[0].quotes.length, 0);
  assert.equal(groupKnowledgeEvidence({ sources: [], results: response.results }).length, 0);
});

test('tương thích API cũ và không tự viết lại văn bản thiếu ngữ cảnh', () => {
  const groups = groupKnowledgeEvidence({ sources: [{ chunkId: 2, documentId: 7, documentTitle: 'Nguồn.pdf' }], results: [{ chunkId: 2, documentId: 7, content: 'phần văn bản cũ bị cắt' }] });
  assert.equal(groups[0].quotes[0].text, 'phần văn bản cũ bị cắt');
  assert.equal(groups[0].quotes[0].partial, true);
});

test('trích đoạn thu gọn mặc định, mỗi tài liệu một nhóm, không hiện phần trăm', () => {
  const html = renderToStaticMarkup(React.createElement(KnowledgeEvidence, { documents: groupKnowledgeEvidence(response) }));
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
  assert.match(html, /Xem trích đoạn gốc/);
  assert.match(html, /3 trích đoạn được dùng từ 2 tài liệu/);
  assert.equal((html.match(/>Đào tạo.pdf</g) || []).length, 1);
  assert.doesNotMatch(html, /Độ liên quan|similarity|Không dùng.pdf/);
  assert.match(html, /Đã lược bớt phần trước/);
});

test('câu trả lời bỏ nhãn nguồn, giữ số liệu và tách đoạn dẫn nhập khỏi danh sách', () => {
  const answer = 'Các quy định gồm:\n- Hoàn thành khóa học trong 30 ngày. [Nguồn: Đào tạo.pdf]\n- Nghỉ phép theo Điều [12]. [Source: Handbook.pdf]';
  assert.equal(cleanKnowledgeAnswer('Không thêm nội dung [12]. [Nguồn: Tài liệu.pdf]'), 'Không thêm nội dung [12].');
  const html = renderToStaticMarkup(React.createElement(KnowledgeAnswer, { answer }));
  assert.match(html, /<p>Các quy định gồm:<\/p>/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.match(html, /30 ngày|Điều \[12\]/);
  assert.doesNotMatch(html, /Nguồn:|Source:|Đào tạo.pdf|Handbook.pdf/);
});

test('các đoạn trong cùng tài liệu được xếp theo thứ tự gốc thay vì điểm tìm kiếm', () => {
  const groups = groupKnowledgeEvidence({ sources: [
    { chunkId: 8, documentId: 1, documentTitle: 'Đào tạo.pdf', chunkIndex: 8, excerpt: 'Đoạn ở sau trong tài liệu.' },
    { chunkId: 2, documentId: 1, documentTitle: 'Đào tạo.pdf', chunkIndex: 2, excerpt: 'Đoạn ở trước trong tài liệu.' },
  ], results: [] });
  assert.deepEqual(groups[0].quotes.map(quote => quote.chunkId), [2, 8]);
});
