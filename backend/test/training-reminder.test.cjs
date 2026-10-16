const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TrainingService } = require('../dist/modules/training/training.service.js');
const { AutomationSecretGuard } = require('../dist/common/guards/automation-secret.guard.js');
const { TrainingCourseType } = require('../dist/entities/training-course.entity.js');
const { TrainingStatus } = require('../dist/entities/employee-training.entity.js');

const fixedNow = '2026-10-16T01:00:00.000Z';

function assignment(overrides = {}) {
  return {
    id: 1,
    progressPercent: 25,
    status: TrainingStatus.IN_PROGRESS,
    dueAt: new Date('2026-10-18T16:59:59.000Z'),
    lastReminderAt: null,
    reminderCount: 0,
    managerEscalatedAt: null,
    lastReminderRunId: null,
    user: {
      id: 10,
      fullName: 'Nguyễn Nhân Viên',
      email: 'employee@company.com',
      isActive: true,
      manager: {
        id: 20,
        fullName: 'Trần Quản Lý',
        email: 'manager@company.com',
      },
    },
    course: {
      id: 30,
      title: 'An toàn thông tin',
      type: TrainingCourseType.MANDATORY,
      courseUrl: 'https://training.example/course',
    },
    ...overrides,
  };
}

function serviceWith(employeeTrainingRepository, userRepository = { find: async () => [] }) {
  return new TrainingService(
    {},
    employeeTrainingRepository,
    userRepository,
    {},
  );
}

test('chỉ trả các khóa bắt buộc sắp đến hạn, tiến độ dưới 50% và chưa được nhắc gần đây', async () => {
  const rows = [
    assignment({ id: 1 }),
    assignment({ id: 2, status: TrainingStatus.COMPLETED }),
    assignment({ id: 3, progressPercent: 50 }),
    assignment({ id: 4, course: { ...assignment().course, type: TrainingCourseType.SOFT_SKILL } }),
    assignment({ id: 5, dueAt: new Date('2026-11-20T16:59:59.000Z') }),
    assignment({ id: 6, lastReminderAt: new Date('2026-10-15T20:00:00.000Z') }),
    assignment({ id: 7, dueAt: new Date('2026-10-14T16:59:59.000Z') }),
  ];
  const service = serviceWith({ find: async () => rows });

  const result = await service.getPendingTrainingReminders(fixedNow);

  assert.equal(result.count, 2);
  assert.deepEqual(
    result.reminders.map((item) => item.assignmentId),
    [1, 7],
  );
  assert.equal(result.reminders[0].level, 'DUE_SOON');
  assert.equal(result.reminders[0].notifyManager, true);
  assert.equal(result.reminders[0].managerSource, 'DIRECT');
  assert.equal(result.reminders[1].level, 'OVERDUE');
});

test('dùng Trưởng phòng cùng phòng ban khi nhân viên chưa có quản lý trực tiếp', async () => {
  const row = assignment({
    user: {
      ...assignment().user,
      departmentId: 8,
      manager: null,
    },
  });
  const departmentManager = {
    id: 88,
    fullName: 'Quản lý Phòng ban',
    email: 'department-manager@company.com',
    departmentId: 8,
    role: 'MANAGER',
    isActive: true,
  };
  const service = serviceWith(
    { find: async () => [row] },
    { find: async () => [departmentManager] },
  );

  const result = await service.getPendingTrainingReminders(fixedNow);

  assert.equal(result.count, 1);
  assert.equal(result.reminders[0].manager.id, departmentManager.id);
  assert.equal(result.reminders[0].managerSource, 'DEPARTMENT');
  assert.equal(result.reminders[0].notifyManager, true);
});

test('callback ghi nhận một lần và không tăng bộ đếm khi n8n gửi lặp', async () => {
  const row = assignment({ reminderCount: 2 });
  let saveCount = 0;
  const repository = {
    findOne: async () => row,
    save: async (value) => {
      saveCount += 1;
      return value;
    },
  };
  const service = serviceWith(repository);
  const payload = {
    assignmentId: row.id,
    runId: 'n8n-run-101',
    employeeNotified: true,
    managerNotified: true,
    telegramNotified: true,
    status: 'SENT',
  };

  const first = await service.recordTrainingReminderResult(payload);
  const duplicate = await service.recordTrainingReminderResult(payload);

  assert.equal(first.recorded, true);
  assert.equal(first.reminderCount, 3);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.reminderCount, 3);
  assert.equal(saveCount, 1);
  assert.ok(row.lastReminderAt instanceof Date);
  assert.ok(row.managerEscalatedAt instanceof Date);
});

test('callback ghi nhận trạng thái Telegram để không báo SENT khi kênh này lỗi', async () => {
  const row = assignment();
  const repository = {
    findOne: async () => row,
    save: async (value) => value,
  };
  const service = serviceWith(repository);

  const result = await service.recordTrainingReminderResult({
    assignmentId: row.id,
    runId: 'n8n-run-telegram-partial',
    employeeNotified: true,
    managerNotified: false,
    telegramNotified: false,
    status: 'PARTIAL',
  });

  assert.equal(result.recorded, true);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.telegramNotified, false);
});

test('API tự động hóa từ chối khóa sai và chấp nhận khóa đúng', () => {
  const guard = new AutomationSecretGuard({
    get: () => 'mot-khoa-bi-mat-rat-dai',
  });
  const context = (secret) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { 'x-automation-secret': secret },
      }),
    }),
  });

  assert.throws(() => guard.canActivate(context('sai-khoa')), /chưa được xác thực/i);
  assert.equal(guard.canActivate(context('mot-khoa-bi-mat-rat-dai')), true);
});

test('workflow 4.1 giữ đúng 12 node và ghi nhận cả kết quả Telegram', () => {
  const workflowPath = path.resolve(
    __dirname,
    '../../workflows/tv4_admin_training/02_mandatory_training_reminder.json',
  );
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const nodeByName = new Map(workflow.nodes.map((node) => [node.name, node]));
  const configFields = nodeByName
    .get('Nạp cấu hình an toàn')
    .parameters.assignments.assignments;

  assert.equal(workflow.nodes.length, 12);
  assert.equal(
    configFields.find((field) => field.name === 'apiBaseUrl').value,
    'http://host.docker.internal:3001/api',
  );
  assert.equal(
    configFields.some((field) => String(field.value).includes('$env')),
    false,
  );
  assert.match(
    nodeByName.get('Tổng hợp kết quả gửi').parameters.jsCode,
    /telegramNotified/,
  );
  assert.match(
    nodeByName.get('Lưu kết quả về hệ thống').parameters.body,
    /telegramNotified/,
  );
});
