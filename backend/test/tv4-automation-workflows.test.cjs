const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { PerformanceReviewService } = require(
  '../dist/modules/training/performance-review.service.js',
);
const { OffboardingService } = require(
  '../dist/modules/offboarding/offboarding.service.js',
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
