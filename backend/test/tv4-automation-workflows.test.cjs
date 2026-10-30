const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { PerformanceReviewService } = require(
  '../dist/modules/training/performance-review.service.js',
);
const { OffboardingService } = require(
  '../dist/modules/offboarding/offboarding.service.js',
);
const { N8nService } = require(
  '../dist/modules/core/automation/n8n.service.js',
);
const {
  AutomationDeliveryStatus,
  ReviewReminderPhase,
} = require('../dist/entities/performance-review-reminder.entity.js');
const { OffboardingStatus } = require('../dist/entities/offboarding-case.entity.js');

const workflow = (file) => JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, `../../workflows/tv4_admin_training/${file}`),
    'utf8',
  ),
);

// Execute the Code nodes from the actual workflow JSON with n8n's item-mode
// contract. Delivery results are fixtures; these tests send no messages.
function runCodeNode(value, name, inputs, namedOutputs = {}) {
  const node = value.nodes.find(candidate => candidate.name === name);
  assert.ok(node, `Missing Code node: ${name}`);
  const execute = (index) => vm.runInNewContext(
    `(function () { ${node.parameters.jsCode}\n})()`,
    {
      $json: inputs[index],
      $input: {
        first: () => ({ json: inputs[0] }),
        all: () => inputs.map(json => ({ json })),
      },
      $execution: { id: 'tv4-fixture-run' },
      $: (nodeName) => {
        const items = namedOutputs[nodeName];
        if (!items) throw new Error(`Node not executed: ${nodeName}`);
        return {
          item: { json: items[index] },
          first: () => ({ json: items[0] }),
        };
      },
    },
    { timeout: 1000 },
  );
  if (node.parameters.mode === 'runOnceForEachItem') {
    return inputs.map((_, index) => {
      const output = execute(index);
      assert.ok(!Array.isArray(output), `${name} must return one item per input`);
      return JSON.parse(JSON.stringify(output.json));
    });
  }
  const output = execute(0);
  assert.ok(Array.isArray(output), `${name} must return an item array`);
  return JSON.parse(JSON.stringify(output.map(item => item.json)));
}

test('workflow đào tạo giữ đủ nhiều nhân viên, tên riêng và xuống dòng Telegram', () => {
  const value = workflow('02_mandatory_training_reminder.json');
  const reminders = [1, 2].map(id => ({
    assignmentId: id,
    employee: { id, fullName: `Nhân viên ${id} <QA>`, email: `employee${id}@example.invalid` },
    manager: id === 1 ? { fullName: 'Quản lý & HR', email: 'manager@example.invalid' } : null,
    course: { title: `Khóa học ${id} & bảo mật`, courseUrl: 'https://example.invalid/course' },
    daysRemaining: id === 1 ? 2 : -1,
    progressPercent: 25,
  }));
  const split = runCodeNode(value, 'Tách từng lượt đào tạo', [{ data: { reminders } }], {
    'Nạp cấu hình an toàn': [{ senderEmail: 'sender@example.invalid' }],
  });
  const composed = runCodeNode(value, 'Soạn nội dung nhắc bằng tiếng Việt', split);
  assert.equal(composed.length, 2);
  assert.deepEqual(composed.map(item => item.assignmentId), [1, 2]);
  assert.deepEqual(composed.map(item => item.employeeEmail), reminders.map(item => item.employee.email));
  assert.match(composed[0].employeeHtml, /&lt;QA&gt;/);
  assert.doesNotMatch(composed[0].employeeHtml, /<QA>/);
  assert.match(composed[0].telegramText, /\nNhân viên:/);
  assert.doesNotMatch(composed[0].telegramText, /\\n/);
  assert.equal(composed[1].hasManager, false);
  assert.match(composed[1].emailSubject, /Quá hạn/);

  const summarized = runCodeNode(value, 'Tổng hợp kết quả gửi', [{}, {}], {
    'Soạn nội dung nhắc bằng tiếng Việt': composed,
    'Gửi thư nhắc nhân viên': [{ accepted: ['employee1@example.invalid'], rejected: [] }, { rejected: ['employee2@example.invalid'] }],
    'Thông báo cho quản lý': [{ rejected: [] }, {}],
    'Thông báo kênh đào tạo': [{ ok: true }, { ok: false, description: 'Chat unavailable' }],
  });
  assert.deepEqual(summarized.map(item => item.assignmentId), [1, 2]);
  assert.deepEqual(summarized.map(item => item.status), ['SENT', 'FAILED']);
  assert.equal(summarized[1].employeeNotified, false);
  assert.equal(summarized[1].telegramNotified, false);
});

test('workflow KPI soạn riêng từng quản lý và báo PARTIAL khi Telegram thất bại', () => {
  const value = workflow('03_monthly_performance_review_reminder.json');
  const input = ['OPENING', 'SECOND_REMINDER'].map((phase, index) => ({
    phase, reviewPeriod: '2026-10', reviewPeriodLabel: '10/2026',
    recipient: { id: index + 1, fullName: `Quản lý ${index + 1}`, email: `manager${index + 1}@example.invalid` },
    employees: [{ id: index + 10, fullName: 'Nhân viên <QA>', departmentName: 'Kỹ thuật & AI' }],
    pendingCount: 1, deadline: '31/10/2026', reviewFormUrl: 'https://example.invalid/review',
  }));
  const composed = runCodeNode(value, 'Soạn nội dung đánh giá bằng tiếng Việt', input);
  assert.equal(composed.length, 2);
  assert.match(composed[0].emailSubject, /Mở kỳ/);
  assert.match(composed[1].emailSubject, /Nhắc lần 2/);
  assert.match(composed[0].emailHtml, /&lt;QA&gt;/);
  const result = runCodeNode(value, 'Tổng hợp kết quả thông báo', [{}, {}], {
    'Soạn nội dung đánh giá bằng tiếng Việt': composed,
    'Gửi thư cho quản lý': [{ rejected: [] }, { rejected: [] }],
    'Thông báo kênh đánh giá': [{ ok: true }, { ok: false }],
  });
  assert.deepEqual(result.map(item => item.status), ['SENT', 'PARTIAL']);
  assert.deepEqual(result.map(item => item.recipient.id), [1, 2]);
});

test('workflow thôi việc dùng đúng email theo kênh và phản ánh kênh bị từ chối', () => {
  const value = workflow('04_offboarding_workflow.json');
  const config = { itEmail: 'it@example.invalid', accountingEmail: 'finance@example.invalid', exitSurveyUrl: 'https://example.invalid/survey' };
  const record = {
    caseId: 19, lastWorkingDate: '2026-11-15',
    employee: { fullName: 'Nhân viên <QA>', personalEmail: 'personal@example.invalid', workEmail: 'work@example.invalid', departmentName: 'Kỹ thuật' },
    approvedBy: { fullName: 'HR kiểm thử' },
  };
  const composed = runCodeNode(value, 'Soạn nội dung điều phối bằng tiếng Việt', [{ data: record }], {
    'Xác thực yêu cầu từ hệ thống': [config],
  });
  assert.equal(composed[0].itRecipient, config.itEmail);
  assert.equal(composed[0].accountingRecipient, config.accountingEmail);
  assert.equal(composed[0].employeeRecipient, record.employee.personalEmail);
  assert.match(composed[0].itHtml, /15\/11\/2026/);
  assert.match(composed[0].itHtml, /&lt;QA&gt;/);
  const result = runCodeNode(value, 'Tổng hợp kết quả liên phòng ban', [{}], {
    'Soạn nội dung điều phối bằng tiếng Việt': composed,
    'Gửi ticket cho phòng IT': [{ rejected: [] }],
    'Gửi thông báo cho Kế toán': [{ rejected: [] }],
    'Gửi thư cảm ơn và khảo sát': [{ rejected: ['personal@example.invalid'] }],
    'Thông báo kênh liên phòng ban': [{ ok: true }],
  });
  assert.equal(result[0].status, 'PARTIAL');
  assert.equal(result[0].employeeNotified, false);
  assert.equal(result[0].itNotified, true);
});

test('workflow 4.1 tách riêng email thử nghiệm của nhân viên và quản lý', () => {
  const value = workflow('02_mandatory_training_reminder.json');
  const nodes = new Map(value.nodes.map((node) => [node.name, node]));
  const assignments = nodes
    .get('Nạp cấu hình an toàn')
    .parameters.assignments.assignments;
  const configNames = assignments.map((item) => item.name);
  const composeCode = nodes
    .get('Soạn nội dung nhắc bằng tiếng Việt')
    .parameters.jsCode;

  assert.ok(configNames.includes('testEmployeeEmail'));
  assert.ok(configNames.includes('testManagerEmail'));
  assert.ok(!configNames.includes('testRecipientEmail'));
  assert.match(composeCode, /testEmployeeEmail \|\| employee\.email/);
  assert.match(composeCode, /testManagerEmail \|\| manager\.email/);
});

test('workflow 4.2 có 12 node, hai lịch đúng ngày và ghi kết quả về backend', () => {
  const value = workflow('03_monthly_performance_review_reminder.json');
  const nodes = new Map(value.nodes.map((node) => [node.name, node]));

  assert.equal(value.nodes.length, 12);
  assert.equal(
    nodes.get('Cron ngày 25 - Mở kỳ đánh giá').parameters.rule.interval[0].expression,
    '0 8 25 * *',
  );
  assert.equal(
    nodes.get('Cron ngày 28 - Đôn đốc chưa nộp').parameters.rule.interval[0].expression,
    '0 8 28 * *',
  );
  assert.equal(
    nodes.get('Soạn nội dung đánh giá bằng tiếng Việt').parameters.mode,
    'runOnceForEachItem',
  );
  assert.match(
    nodes.get('Lưu kết quả nhắc đánh giá').parameters.url,
    /review-reminder-results/,
  );
});

test('workflow 4.3 có 12 node, dùng hồ sơ backend và theo dõi đủ bốn kênh', () => {
  const value = workflow('04_offboarding_workflow.json');
  const nodes = new Map(value.nodes.map((node) => [node.name, node]));

  assert.equal(value.nodes.length, 12);
  assert.equal(
    nodes.get('Webhook - HR Duyệt Thôi Việc').parameters.path,
    'tv4-offboarding',
  );
  assert.match(
    nodes.get('Lấy hồ sơ thôi việc đã duyệt').parameters.url,
    /offboarding\/automation/,
  );
  const summaryCode = nodes.get('Tổng hợp kết quả liên phòng ban').parameters.jsCode;
  assert.match(summaryCode, /itNotified/);
  assert.match(summaryCode, /financeNotified/);
  assert.match(summaryCode, /employeeNotified/);
  assert.match(summaryCode, /telegramNotified/);
});

test('dịch vụ 4.3 chuẩn hóa URL webhook khi cấu hình còn đường dẫn thử nghiệm', async () => {
  const config = {
    get: (key) => ({
      N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/hr-admin-test',
      N8N_AUTOMATION_SECRET: 'automation-test-secret',
    })[key],
  };
  const service = new N8nService(config);
  const originalFetch = global.fetch;
  let requestUrl = '';
  let requestHeaders = {};

  global.fetch = async (url, options) => {
    requestUrl = String(url);
    requestHeaders = options.headers;
    return { ok: true, status: 200 };
  };

  try {
    const accepted = await service.triggerOffboardingApproved({ caseId: 9 });

    assert.equal(accepted, true);
    assert.equal(
      requestUrl,
      'http://localhost:5678/webhook/tv4-offboarding',
    );
    assert.equal(
      requestHeaders['X-Automation-Secret'],
      'automation-test-secret',
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('dịch vụ 4.2 gom nhân viên chưa được đánh giá theo quản lý', async () => {
  const employees = [
    {
      id: 4,
      fullName: 'Phạm Hồng Quân',
      email: 'employee@company.com',
      jobTitle: 'Kỹ sư',
      departmentId: 1,
      department: { name: 'Kỹ thuật' },
      manager: {
        id: 3,
        fullName: 'Trần Văn Minh',
        email: 'manager@company.com',
        role: 'MANAGER',
        isActive: true,
      },
    },
  ];
  const userRepository = {
    find: async ({ where }) => {
      if (where.role === 'EMPLOYEE') return employees;
      if (where.role === 'MANAGER') return [];
      return [];
    },
  };
  const service = new PerformanceReviewService(
    { find: async () => [] },
    { find: async () => [] },
    userRepository,
  );

  const result = await service.getPendingReviewReminders(
    '2026-10-25T01:00:00.000Z',
    ReviewReminderPhase.OPENING,
  );

  assert.equal(result.count, 1);
  assert.equal(result.pendingEmployeeCount, 1);
  assert.equal(result.reminders[0].recipient.id, 3);
  assert.deepEqual(result.reminders[0].employees.map((item) => item.id), [4]);
});

test('dịch vụ 4.3 chỉ hoàn tất khi n8n xác nhận kết quả gửi', async () => {
  const record = {
    id: 9,
    status: OffboardingStatus.IN_PROGRESS,
    lastWorkflowRunId: null,
    itNotifiedAt: null,
    financeNotifiedAt: null,
    employeeNotifiedAt: null,
    telegramNotifiedAt: null,
  };
  const repository = {
    findOne: async () => record,
    save: async (value) => value,
  };
  const service = new OffboardingService(repository, {}, {});

  const result = await service.recordAutomationResult(9, {
    runId: 'workflow-run-9',
    itNotified: true,
    financeNotified: true,
    employeeNotified: true,
    telegramNotified: true,
    status: AutomationDeliveryStatus.SENT,
  });

  assert.equal(result.status, OffboardingStatus.COMPLETED);
  assert.deepEqual(result.channels, {
    it: true,
    finance: true,
    employee: true,
    telegram: true,
  });
});
