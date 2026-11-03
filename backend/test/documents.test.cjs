const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { DocumentsService } = require(
  '../dist/modules/documents/documents.service.js',
);
const { VectorService } = require(
  '../dist/modules/core/ai/vector.service.js',
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

  const result = await service.generateGroundedAnswer(
    'gán khóa học và thời hạn',
    [
    {
      chunkId: 31,
      documentId: 8,
      documentTitle: 'Quy chế đào tạo.pdf',
      content:
        'ực cho vị trí hoặc dự án Cloud; bảo mật; quản trị nhân sự\n' +
        '3. Gán khóa học và thời hạn\n' +
        '• Khóa bắt buộc mặc định có hạn hoàn thành trong 30 ngày kể từ ngày được gán, trừ khi khóa học ghi\nthời hạn ngắn hơn.\n' +
        '• Khóa hội nhập dành cho nhân viên mới phải hoàn thành trong 15 ngày đầu.',
      similarity: 0.82,
    },
    ],
  );

  assert.equal(result.aiGenerated, false);
  assert.doesNotMatch(result.answer, /Dịch vụ AI chưa thể tổng hợp/i);
  assert.doesNotMatch(result.answer, /ực cho vị trí/i);
  assert.match(result.answer, /Khóa bắt buộc mặc định/i);
  assert.match(result.answer, /Khóa hội nhập dành cho nhân viên mới/i);
  assert.match(result.answer, /trừ khi khóa học ghi thời hạn ngắn hơn\./);
  assert.deepEqual(
    result.sources.map((source) => source.chunkId),
    [31],
  );
});

test('không trích câu cắt dở hoặc mục chỉ trùng một từ chung', async () => {
  const service = new DocumentsService({}, {}, {}, {}, {
    generateJson: async () => null,
  });
  const result = await service.generateGroundedAnswer('gán khóa học và thời hạn', [
    {
      chunkId: 71, documentId: 7, documentTitle: 'Đào tạo.pdf', similarity: 0.6,
      content: '3. Gán khóa học và thời hạn\n• Khóa bắt buộc phải hoàn thành trong 30 ngày.\n• Khóa hội nhập phải hoàn thành trong 15 ngày đầu.',
    },
    {
      chunkId: 72, documentId: 7, documentTitle: 'Đào tạo.pdf', similarity: 0.4,
      content: 'Quy chế thiết lập cách gán khóa học, theo dõi t',
    },
    {
      chunkId: 73, documentId: 8, documentTitle: 'Tiêu chuẩn.pdf', similarity: 0.5,
      content: '6. Tiêu chuẩn hoàn thành\n• Tham dự ít nhất 80% thời lượng đối với chương trình có lịch học trực tiếp.',
    },
  ]);
  assert.match(result.answer, /30 ngày\./);
  assert.match(result.answer, /15 ngày đầu\./);
  assert.doesNotMatch(result.answer, /theo dõi t|80%|Tiêu chuẩn/);
  assert.deepEqual(result.sources.map(source => source.chunkId), [71]);
});

test('không khẳng định có căn cứ khi nguồn không chứa câu trả lời hoàn chỉnh', async () => {
  const service = new DocumentsService({}, {}, {}, {}, {
    generateJson: async () => null,
  });
  for (const content of [
    'Tham dự ít nhất 80% thời lượng đối với chương trình có lịch học trực tiếp.',
    'Hạn hoàn thành khóa học bắt buộc là',
  ]) {
    const result = await service.generateGroundedAnswer('thời hạn khóa học bắt buộc', [
      {chunkId: 81, documentId: 8, documentTitle: 'Tài liệu.pdf', content, similarity: 0.7},
    ]);
    assert.equal(result.sources.length, 0);
    assert.match(result.answer, /chưa có đủ thông tin/);
  }
});

test('chia tài liệu theo ranh giới từ và câu thay vì cắt giữa từ', () => {
  const service = new VectorService({ get: () => '' });
  const chunks = service.chunkText(
    '1. Phạm vi áp dụng\n\n' +
      'Quy định này áp dụng cho toàn bộ nhân viên chính thức và thử việc. ' +
      'Mỗi nhân viên phải hoàn thành khóa học bắt buộc theo đúng thời hạn được giao. ' +
      'Quản lý trực tiếp có trách nhiệm theo dõi tiến độ và hỗ trợ khi cần thiết.\n\n' +
      '2. Thời hạn\n\n' +
      'Khóa hội nhập phải được hoàn thành trong 15 ngày đầu kể từ ngày nhận việc.',
    120,
    30,
  );

  assert.ok(chunks.length >= 3);
  assert.ok(chunks.every((chunk) => chunk.length <= 120));
  assert.ok(chunks.every((chunk) => !/^\p{Ll}/u.test(chunk)));
  assert.ok(chunks.some((chunk) =>
    chunk.includes('Khóa hội nhập phải được hoàn thành trong 15 ngày đầu kể từ ngày nhận việc.'),
  ));
  const text = 'Nhân viên được quản lý hướng dẫn hoàn thành khóa học bắt buộc. Hạn tối đa 2 ngày.';
  const shortTailChunks = service.chunkText(text, 65, 0);
  assert.match(shortTailChunks.join(' '), /Hạn tối đa 2 ngày\./);
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
