const assert = require('node:assert/strict');
const test = require('node:test');
const { ForbiddenException } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { GUARDS_METADATA } = require('@nestjs/common/constants');
const { OnboardingService } = require('../dist/modules/onboarding/onboarding.service.js');
const { OnboardingController } = require('../dist/modules/onboarding/onboarding.controller.js');
const { RolesGuard } = require('../dist/common/guards/roles.guard.js');
const { JwtAuthGuard } = require('../dist/common/guards/jwt-auth.guard.js');
const { ROLES_KEY } = require('../dist/common/decorators/roles.decorator.js');
const { UserRole } = require('../dist/entities/user.entity.js');
const { MoodType } = require('../dist/entities/employee-mood.entity.js');

function createHarness() {
  const deptA = { id: 10, name: 'Kỹ thuật', managerId: 100 };
  const deptB = { id: 20, name: 'Kinh doanh', managerId: 200 };
  const deptC = { id: 30, name: 'Vận hành', managerId: 100 }; // Also headed by Manager A

  const users = [
    { id: 1, fullName: 'Super Admin', role: UserRole.SUPERADMIN, departmentId: null, managerId: null },
    { id: 2, fullName: 'HR Specialist', role: UserRole.HR, departmentId: null, managerId: null },
    { id: 100, fullName: 'Manager Dept A', role: UserRole.MANAGER, departmentId: 10, department: deptA, managerId: null },
    { id: 200, fullName: 'Manager Dept B', role: UserRole.MANAGER, departmentId: 20, department: deptB, managerId: null },
    { id: 101, fullName: 'Employee Dept A', role: UserRole.EMPLOYEE, departmentId: 10, department: deptA, managerId: 100 },
    { id: 201, fullName: 'Employee Dept B', role: UserRole.EMPLOYEE, departmentId: 20, department: deptB, managerId: 200 },
    { id: 202, fullName: 'Direct Report Under A', role: UserRole.EMPLOYEE, departmentId: 20, department: deptB, managerId: 100 },
    { id: 301, fullName: 'Employee Dept C (Head A)', role: UserRole.EMPLOYEE, departmentId: 30, department: deptC, managerId: null },
  ];

  const tasks = [
    { id: 1, userId: 101, title: 'Task A1', isCompleted: false, completedAt: null },
    { id: 2, userId: 201, title: 'Task B1', isCompleted: false, completedAt: null },
    { id: 3, userId: 202, title: 'Task DirectReport', isCompleted: false, completedAt: null },
    { id: 4, userId: 301, title: 'Task DeptC', isCompleted: false, completedAt: null },
    { id: 5, userId: 100, title: 'Task Manager Own', isCompleted: false, completedAt: null },
  ];

  const moods = [
    {
      id: 50,
      userId: 101,
      user: users.find((u) => u.id === 101),
      mood: MoodType.STRESSED,
      isBurnoutRisk: true,
      isResolved: false,
      resolvedById: null,
      resolvedNote: null,
    },
    {
      id: 51,
      userId: 201,
      user: users.find((u) => u.id === 201),
      mood: MoodType.STRESSED,
      isBurnoutRisk: true,
      isResolved: false,
      resolvedById: null,
      resolvedNote: null,
    },
    {
      id: 52,
      userId: 202,
      user: users.find((u) => u.id === 202),
      mood: MoodType.STRESSED,
      isBurnoutRisk: true,
      isResolved: false,
      resolvedById: null,
      resolvedNote: null,
    },
  ];

  let taskSaveCount = 0;
  let moodSaveCount = 0;

  const taskRepo = {
    async findOne({ where } = {}) {
      return tasks.find((t) => t.id === where?.id) || null;
    },
    async find({ where } = {}) {
      return tasks.filter((t) => t.userId === where?.userId);
    },
    async save(task) {
      taskSaveCount += 1;
      return task;
    },
  };

  const moodRepo = {
    async findOne({ where } = {}) {
      return moods.find((m) => m.id === where?.id) || null;
    },
    async save(mood) {
      moodSaveCount += 1;
      return mood;
    },
  };

  const userRepo = {
    async findOne({ where } = {}) {
      return users.find((u) => u.id === where?.id) || null;
    },
  };

  const service = new OnboardingService(
    taskRepo,
    moodRepo,
    {},
    {},
    {},
    userRepo,
    {},
    {},
    {},
    {},
  );

  return {
    service,
    tasks,
    moods,
    getTaskSaveCount: () => taskSaveCount,
    getMoodSaveCount: () => moodSaveCount,
  };
}

function createMockExecutionContext(handler, role) {
  return {
    getHandler: () => handler,
    getClass: () => OnboardingController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 999, role } }),
    }),
  };
}

test('toggleTask: Manager Dept A cannot toggle task of Employee Dept B (403 Forbidden)', async () => {
  const { service, tasks, getTaskSaveCount } = createHarness();

  await assert.rejects(
    () => service.toggleTask(2, 100, UserRole.MANAGER),
    (err) => err instanceof ForbiddenException,
  );
  assert.equal(tasks.find((t) => t.id === 2).isCompleted, false);
  assert.equal(getTaskSaveCount(), 0);
});

test('toggleTask: Manager can toggle same-department, direct-report, headed-dept, and own tasks', async () => {
  const { service } = createHarness();

  // Same department (Employee 101 in Dept A)
  const sameDept = await service.toggleTask(1, 100, UserRole.MANAGER);
  assert.equal(sameDept.task.isCompleted, true);

  // Direct subordinate (Employee 202 has managerId = 100)
  const directReport = await service.toggleTask(3, 100, UserRole.MANAGER);
  assert.equal(directReport.task.isCompleted, true);

  // Department headed by Manager A (Dept C has managerId = 100)
  const headedDept = await service.toggleTask(4, 100, UserRole.MANAGER);
  assert.equal(headedDept.task.isCompleted, true);

  // Manager's own task
  const ownTask = await service.toggleTask(5, 100, UserRole.MANAGER);
  assert.equal(ownTask.task.isCompleted, true);
});

test('toggleTask: HR and SUPERADMIN can toggle any employee task; EMPLOYEE cannot toggle others', async () => {
  const { service } = createHarness();

  const byHr = await service.toggleTask(2, 2, UserRole.HR);
  assert.equal(byHr.task.isCompleted, true);

  const bySuperAdmin = await service.toggleTask(2, 1, UserRole.SUPERADMIN);
  assert.equal(bySuperAdmin.task.isCompleted, false);

  // Employee toggling another employee's task -> 403
  await assert.rejects(
    () => service.toggleTask(2, 101, UserRole.EMPLOYEE),
    (err) => err instanceof ForbiddenException,
  );

  // Employee toggling own task -> allowed
  const own = await service.toggleTask(1, 101, UserRole.EMPLOYEE);
  assert.equal(own.task.isCompleted, true);
});

test('resolveBurnout: Manager Dept A cannot resolve burnout of Employee Dept B (403 Forbidden)', async () => {
  const { service, moods, getMoodSaveCount } = createHarness();

  await assert.rejects(
    () => service.resolveBurnout(51, 100, 'Thử xử lý phòng khác', UserRole.MANAGER),
    (err) => err instanceof ForbiddenException,
  );
  assert.equal(moods.find((m) => m.id === 51).isResolved, false);
  assert.equal(getMoodSaveCount(), 0);
});

test('resolveBurnout: Manager resolves same-dept/direct-report; SUPERADMIN & HR resolve any department (200 OK)', async () => {
  const { service } = createHarness();

  // Manager A resolves Employee A (same department)
  const byManagerSame = await service.resolveBurnout(50, 100, 'Đã hẹn 1-on-1', UserRole.MANAGER);
  assert.equal(byManagerSame.isResolved, true);
  assert.equal(byManagerSame.resolvedById, 100);

  // Manager A resolves direct report (managerId = 100)
  const byManagerDirect = await service.resolveBurnout(52, 100, 'Hỗ trợ giảm tải', UserRole.MANAGER);
  assert.equal(byManagerDirect.isResolved, true);
  assert.equal(byManagerDirect.resolvedById, 100);

  // SUPERADMIN resolves Employee Dept B -> 200 OK
  const bySuperAdmin = await service.resolveBurnout(51, 1, 'SuperAdmin can thiệp trực tiếp', UserRole.SUPERADMIN);
  assert.equal(bySuperAdmin.isResolved, true);
  assert.equal(bySuperAdmin.resolvedById, 1);
  assert.equal(bySuperAdmin.resolvedNote, 'SuperAdmin can thiệp trực tiếp');
});

test('OnboardingController RBAC metadata & RolesGuard: PATCH /mood/:id/resolve includes SUPERADMIN and POST /seed-tasks is SUPERADMIN-only', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  // 1. PATCH /onboarding/mood/:id/resolve
  const resolveHandler = OnboardingController.prototype.resolveMoodAlert;
  const resolveRoles = reflector.get(ROLES_KEY, resolveHandler);
  assert.deepEqual(resolveRoles, [UserRole.MANAGER, UserRole.HR, UserRole.SUPERADMIN]);

  assert.equal(guard.canActivate(createMockExecutionContext(resolveHandler, UserRole.SUPERADMIN)), true);
  assert.equal(guard.canActivate(createMockExecutionContext(resolveHandler, UserRole.HR)), true);
  assert.equal(guard.canActivate(createMockExecutionContext(resolveHandler, UserRole.MANAGER)), true);
  assert.throws(
    () => guard.canActivate(createMockExecutionContext(resolveHandler, UserRole.EMPLOYEE)),
    (err) => err instanceof ForbiddenException,
  );

  // 2. POST /onboarding/seed-tasks
  const seedHandler = OnboardingController.prototype.seedTasks;
  const seedGuards = Reflect.getMetadata(GUARDS_METADATA, seedHandler);
  const seedRoles = reflector.get(ROLES_KEY, seedHandler);
  assert.deepEqual(seedGuards, [JwtAuthGuard, RolesGuard]);
  assert.deepEqual(seedRoles, [UserRole.SUPERADMIN]);

  assert.equal(guard.canActivate(createMockExecutionContext(seedHandler, UserRole.SUPERADMIN)), true);
  for (const blockedRole of [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR]) {
    assert.throws(
      () => guard.canActivate(createMockExecutionContext(seedHandler, blockedRole)),
      (err) => err instanceof ForbiddenException,
    );
  }
});
