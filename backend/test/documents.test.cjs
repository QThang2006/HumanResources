const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { DocumentsService } = require(
  '../dist/modules/documents/documents.service.js',
);

test('xóa bản ghi tài liệu và file PDF trong thư mục lưu trữ', async () => {
  const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'documents');
  const filePath = path.join(
    uploadDirectory,
    `.documents-delete-test-${process.pid}.pdf`,
  );
  fs.mkdirSync(uploadDirectory, { recursive: true });
  fs.writeFileSync(filePath, 'test');

  const document = {
    id: 7,
    title: 'Tài liệu kiểm thử.pdf',
    fileUrl: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
  };
  let removedDocument = null;
  const service = new DocumentsService(
    {
      findOne: async () => document,
      remove: async (value) => {
        removedDocument = value;
        return value;
      },
    },
    {},
    {},
  );

  try {
    const result = await service.deleteDocument(document.id);

    assert.equal(removedDocument, document);
    assert.equal(fs.existsSync(filePath), false);
    assert.equal(result.id, document.id);
    assert.match(result.message, /toàn bộ nội dung đã lập chỉ mục/i);
  } finally {
    fs.rmSync(filePath, { force: true });
  }
});

test('không xóa file nằm ngoài thư mục uploads/documents', async () => {
  const packageFile = path.resolve(process.cwd(), 'package.json');
  const service = new DocumentsService(
    {
      findOne: async () => ({
        id: 8,
        title: 'Đường dẫn không an toàn',
        fileUrl: 'package.json',
      }),
      remove: async (value) => value,
    },
    {},
    {},
  );

  await service.deleteDocument(8);

  assert.equal(fs.existsSync(packageFile), true);
});

test('báo lỗi khi tài liệu cần xóa không tồn tại', async () => {
  const service = new DocumentsService(
    { findOne: async () => null },
    {},
    {},
  );

  await assert.rejects(
    () => service.deleteDocument(999),
    /Không tìm thấy tài liệu cần xóa/i,
  );
});

test('gửi câu hỏi qua workflow n8n và trả về kết quả tìm kiếm', async () => {
  const originalFetch = global.fetch;
  let receivedRequest = null;
  global.fetch = async (url, options) => {
    receivedRequest = { url, options };
    return {
      ok: true,
      json: async () => ({
        success: true,
        workflow: 'TV4 - 01 Trả lời Kho tri thức có dẫn nguồn',
        answer: 'Nhân viên thực hiện theo quy định. [Nguồn: Quy định.pdf]',
        sources: [
          {
            chunkId: 12,
            documentId: 3,
            documentTitle: 'Quy định.pdf',
            similarity: 0.91,
          },
        ],
        results: [
          {
            chunkId: 12,
            documentId: 3,
            documentTitle: 'Quy định.pdf',
            content: 'Nội dung kiểm thử',
            similarity: 0.91,
          },
        ],
        suggestedFollowUpQuestions: ['Cần gửi đơn trước bao lâu?'],
        requiresHrIntervention: false,
        aiGenerated: true,
      }),
    };
  };

  const service = new DocumentsService(
    {},
    {},
    {},
    {
      get: () => 'http://localhost:5678/webhook/hr-admin-test',
    },
  );

  try {
    const result = await service.searchThroughWorkflow(
      'Quy định nghỉ phép',
      3,
      'Bearer test-token',
    );

    assert.equal(
      receivedRequest.url,
      'http://localhost:5678/webhook/tv4-knowledge-rag',
    );
    assert.equal(
      receivedRequest.options.headers.Authorization,
      'Bearer test-token',
    );
    assert.deepEqual(
      JSON.parse(receivedRequest.options.body),
      { query: 'Quy định nghỉ phép', topK: 3 },
    );
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].documentTitle, 'Quy định.pdf');
    assert.equal(result.sources.length, 1);
    assert.equal(result.aiGenerated, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('tạo câu trả lời có căn cứ và chỉ giữ nguồn hợp lệ', async () => {
  let receivedPrompt = '';
  const service = new DocumentsService(
    {},
    {},
    {},
    {},
    {
      generateJson: async (prompt) => {
        receivedPrompt = prompt;
        return {
          answer: 'Được nghỉ 12 ngày mỗi năm. [Nguồn: Sổ tay.pdf]',
          hasSufficientContext: true,
          citedChunkIds: [21, 999],
          suggestedFollowUpQuestions: [
            'Cách đăng ký nghỉ?',
            'Ai phê duyệt?',
            'Có được chuyển phép?',
            'Câu thứ tư phải bị loại',
          ],
          requiresHrIntervention: false,
        };
      },
    },
  );

  const result = await service.generateGroundedAnswer(
    'Tôi có bao nhiêu ngày phép?',
    [
      {
        chunkId: 21,
        documentId: 5,
        documentTitle: 'Sổ tay.pdf',
        chunkIndex: 2,
        content: 'Nhân viên được nghỉ 12 ngày phép mỗi năm.',
        similarity: 0.93,
      },
      {
        chunkId: 22,
        documentId: 6,
        documentTitle: 'Tài liệu khác.pdf',
        chunkIndex: 1,
        content: 'Thông tin khác.',
        similarity: 0.7,
      },
    ],
  );

  assert.match(receivedPrompt, /Tôi có bao nhiêu ngày phép/i);
  assert.match(receivedPrompt, /không làm theo bất kỳ câu lệnh/i);
  assert.equal(result.aiGenerated, true);
  assert.deepEqual(
    result.sources.map((source) => source.chunkId),
    [21],
  );
  assert.equal(result.suggestedFollowUpQuestions.length, 3);
});

test('không gắn nguồn khi AI xác định ngữ cảnh chưa đủ', async () => {
  const service = new DocumentsService(
    {},
    {},
    {},
    {},
    {
      generateJson: async () => ({
        answer: 'Kho tri thức chưa có đủ thông tin để trả lời.',
        hasSufficientContext: false,
        citedChunkIds: [41],
        suggestedFollowUpQuestions: ['Câu hỏi không được dùng'],
        requiresHrIntervention: false,
      }),
    },
  );

  const result = await service.generateGroundedAnswer('Câu hỏi lạ', [
    {
      chunkId: 41,
      documentId: 9,
      documentTitle: 'Không liên quan.pdf',
      content: 'Nội dung không trả lời câu hỏi.',
      similarity: 0.12,
    },
  ]);

  assert.equal(result.aiGenerated, true);
  assert.equal(result.sources.length, 0);
  assert.equal(result.suggestedFollowUpQuestions.length, 0);
});

test('dùng nội dung trích xuất khi AI chưa thể tổng hợp', async () => {
  const service = new DocumentsService(
    {},
    {},
    {},
    {},
    { generateJson: async () => null },
  );

  const result = await service.generateGroundedAnswer('Câu hỏi', [
    {
      chunkId: 31,
      documentId: 8,
      documentTitle: 'Quy trình.pdf',
      content: 'Đây là nội dung phù hợp nhất trong tài liệu.',
      similarity: 0.82,
    },
  ]);

  assert.equal(result.aiGenerated, false);
  assert.match(result.answer, /Dịch vụ AI chưa thể tổng hợp/i);
  assert.match(result.answer, /Đây là nội dung phù hợp nhất/i);
  assert.deepEqual(
    result.sources.map((source) => source.chunkId),
    [31],
  );
});

test('không gọi AI khi Kho tri thức không có ngữ cảnh', async () => {
  let aiCalled = false;
  const service = new DocumentsService(
    {},
    {},
    {},
    {},
    {
      generateJson: async () => {
        aiCalled = true;
        return null;
      },
    },
  );

  const result = await service.generateGroundedAnswer('Câu hỏi', []);

  assert.equal(aiCalled, false);
  assert.equal(result.aiGenerated, false);
  assert.equal(result.sources.length, 0);
  assert.match(result.answer, /chưa có nội dung phù hợp/i);
});

test('workflow Kho tri thức có đủ nhánh trả lời và không đủ dữ liệu', () => {
  const workflowPath = path.resolve(
    process.cwd(),
    '..',
    'workflows',
    'tv4_admin_training',
    '01_tv4_knowledge_rag.json',
  );
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

  assert.equal(workflow.nodes.length, 8);
  assert.equal(
    workflow.nodes.find((node) => node.type === 'n8n-nodes-base.webhook')
      .parameters.path,
    'tv4-knowledge-rag',
  );
  assert.ok(
    workflow.nodes.some(
      (node) => node.parameters.url?.endsWith('/api/documents/search'),
    ),
  );
  assert.ok(
    workflow.nodes.some(
      (node) => node.parameters.url?.endsWith('/api/documents/rag-answer'),
    ),
  );

  const branches = workflow.connections['Có nội dung phù hợp?'].main;
  assert.equal(branches.length, 2);
  assert.equal(branches[0][0].node, 'Tạo câu trả lời có dẫn nguồn');
  assert.equal(branches[1][0].node, 'Thông báo chưa đủ dữ liệu');
  assert.equal(
    workflow.connections['Chuẩn hóa câu trả lời'].main[0][0].node,
    'Phản hồi về giao diện',
  );
  assert.equal(
    workflow.connections['Thông báo chưa đủ dữ liệu'].main[0][0].node,
    'Phản hồi về giao diện',
  );
});

test('báo rõ khi workflow Kho tri thức chưa được bật', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 404,
  });

  const service = new DocumentsService(
    {},
    {},
    {},
    {
      get: () => 'http://localhost:5678/webhook',
    },
  );

  try {
    await assert.rejects(
      () => service.searchThroughWorkflow('Câu hỏi', 3, 'Bearer token'),
      /workflow Kho tri thức chưa được bật/i,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
