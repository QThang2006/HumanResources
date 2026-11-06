require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const entities = require('../dist/entities');
const { InterviewDelivery } = require('../dist/modules/applications/interview-delivery.entity');
const { TrainingModule } = require('../dist/modules/training/training.module');
const { TrainingService } = require('../dist/modules/training/training.service');
const { AutomationModule } = require('../dist/modules/core/automation/automation.module');
const { N8nService } = require('../dist/modules/core/automation/n8n.service');
const { AuthModule } = require('../dist/modules/auth/auth.module');
const { OnboardingModule } = require('../dist/modules/onboarding/onboarding.module');
const { GeminiService } = require('../dist/modules/core/ai/gemini.service');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { migrateTrainingHistory } = require('../scripts/migrate-tv4-training-history.cjs');

test('catalog removal, roster and restore with isolated MySQL, HTTP and real JWT', { timeout: 60000 }, async t => {
  if (!process.env.TV4_TEST_DB_PASSWORD) throw Error('Set TV4_TEST_DB_PASSWORD for disposable localhost tests.');
  const database = 'hr_tv4_courses_test_' + randomBytes(8).toString('hex');
  const options = {
    host: '127.0.0.1', port: Number(process.env.TV4_TEST_DB_PORT || 3307),
    user: 'root', password: process.env.TV4_TEST_DB_PASSWORD,
  };
  const admin = await mysql.createConnection(options);
  let app;
  t.after(async () => {
    if (app) await app.close();
    if (!/^hr_tv4_courses_test_[a-f0-9]{16}$/.test(database)) throw Error('Refuse unknown database cleanup target.');
    await admin.query('DROP DATABASE IF EXISTS `' + database + '`');
    await admin.end();
  });
  await admin.query('CREATE DATABASE `' + database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

  let recommendedCatalog = [];
  let providerAvailable = true;
  let analysisPrompt = '';
  const sdk = {
    isAvailable: () => providerAvailable,
    generateJson: async prompt => {
      analysisPrompt = prompt;
      return { missingSkills: ['TypeScript'], summary: 'Phân tích sơ bộ: dữ liệu kiểm thử.' };
    },
    recommendSkillGapCourse: async (_skills, catalog) => {
      recommendedCatalog = catalog;
      return { recommendedCourses: [], skillGapsIdentified: ['TypeScript'], readinessScore: 70, summary: 'Kiểm thử', careerAdvice: 'Thực hành theo nội dung khóa học.', aiGenerated: false };
    },
  };
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      TypeOrmModule.forRoot({
        type: 'mysql', host: options.host, port: options.port,
        username: options.user, password: options.password, database,
        entities: [...Object.values(entities).filter(value => typeof value === 'function'), InterviewDelivery],
        synchronize: true, timezone: 'Z', logging: false,
      }),
      AuthModule, TrainingModule, OnboardingModule, AutomationModule,
    ],
  }).overrideProvider(GeminiService).useValue(sdk)
    .overrideProvider(N8nService).useValue({}).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(0, '127.0.0.1');
  const db = app.get(DataSource);
  const usersRepo = db.getRepository(entities.User);
  const coursesRepo = db.getRepository(entities.TrainingCourse);
  const assignmentsRepo = db.getRepository(entities.EmployeeTraining);
  const department = await db.getRepository(entities.Department).save({ name: 'Kỹ thuật kiểm thử', code: 'TV4_TEST' });
  const fixturePassword = randomBytes(18).toString('hex');
  const passwordHash = await bcrypt.hash(fixturePassword, 4);
  const actors = {};
  for (const [name, role] of Object.entries({ admin: 'SUPERADMIN', hr: 'HR', manager: 'MANAGER', employee: 'EMPLOYEE', other: 'EMPLOYEE', newcomer: 'EMPLOYEE' })) {
    actors[name] = await usersRepo.save({
      email: `${name}@example.invalid`, fullName: `${name} kiểm thử`, role,
      passwordHash, departmentId: department.id, jobTitle: 'Kỹ sư kiểm thử', isActive: true,
    });
  }
  const tokens = {};
  const base = (await app.getUrl()) + '/api';
  async function request(path, method = 'GET', body, actor = 'hr') {
    const response = await fetch(base + path, {
      method, headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(tokens[actor] ? { Authorization: 'Bearer ' + tokens[actor] } : {}),
      }, body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    return { status: response.status, data: payload.data ?? payload };
  }
  for (const name of Object.keys(actors)) {
    const login = await request('/auth/login', 'POST', { email: actors[name].email, password: fixturePassword }, null);
    assert.equal(login.status, 201);
    tokens[name] = login.data.accessToken;
    assert.ok(tokens[name]);
  }
  const createFixtureCourse = title => coursesRepo.save(coursesRepo.create({ title, type: 'SOFT_SKILL', skillsProvided: ['TypeScript'], durationHours: 8 }));
  const course = await createFixtureCourse('Khóa giữ lịch sử');
  const emptyCourse = await createFixtureCourse('Khóa chưa gán');
  const otherCourse = await createFixtureCourse('Khóa của nhóm khác');
  const dueAt = new Date(Date.now() + 10 * 86400000);
  const originalAssignments = await assignmentsRepo.save([
    { userId: actors.employee.id, courseId: course.id, progressPercent: 50, status: 'IN_PROGRESS', assignedByAi: false, dueAt, reminderCount: 2, lastReminderRunId: 'existing-run', lastReminderAt: new Date(), aiReason: null },
    { userId: actors.other.id, courseId: course.id, progressPercent: 100, status: 'COMPLETED', assignedByAi: true, completedAt: new Date(), dueAt, reminderCount: 0, aiReason: 'Đề xuất kiểm thử' },
    { userId: actors.newcomer.id, courseId: otherCourse.id, progressPercent: 0, status: 'ASSIGNED', assignedByAi: false },
  ]);
  let snapshot = JSON.stringify(await assignmentsRepo.find({ where: { courseId: course.id }, order: { id: 'ASC' } }));

  await t.test('editing an unassigned course validates fields, enforces roles and never creates assignments', async () => {
    const editable = await createFixtureCourse('Khóa chỉnh sửa');
    try {
      const endpoint = `/training/courses/${editable.id}`;
      for (const actor of [null, 'manager', 'employee']) {
        assert.equal((await request(endpoint, 'PATCH', { title: 'Không được sửa' }, actor)).status, actor ? 403 : 401);
      }
      for (const body of [{}, { title: ' ' }, { title: 'a'.repeat(256) }, { type: 'OTHER' }, { skillsProvided: [] },
        { skillsProvided: [123] }, { courseUrl: 'javascript:alert(1)' }, { courseUrl: 'x'.repeat(501) },
        { durationHours: 0 }, { durationHours: 1.5 }, { durationHours: '4' }, { isArchived: true }, { title: 'Hợp lệ', id: 100 }]) {
        assert.equal((await request(endpoint, 'PATCH', body)).status, 400, JSON.stringify(body));
      }
      assert.equal((await coursesRepo.findOneBy({ id: editable.id })).title, 'Khóa chỉnh sửa');
      const result = await request(endpoint, 'PATCH', { title: '  Khóa cập nhật  ', type: 'MANDATORY',
        skillsProvided: [' Giao tiếp ', 'Excel', 'Excel'], courseUrl: ' https://example.invalid/learn ', durationHours: 6 }, 'admin');
      assert.equal(result.status, 200);
      assert.equal(result.data.title, 'Khóa cập nhật');
      assert.equal(result.data.type, 'MANDATORY');
      assert.deepEqual(result.data.skillsProvided, ['Giao tiếp', 'Excel']);
      assert.equal(result.data.courseUrl, 'https://example.invalid/learn');
      assert.equal(result.data.durationHours, 6);
      assert.equal(result.data.assignmentCount, 0);
      assert.equal(await assignmentsRepo.countBy({ courseId: editable.id }), 0);
      assert.equal((await request(endpoint, 'PATCH', { courseUrl: null })).data.courseUrl, null);
      await coursesRepo.update(editable.id, { isArchived: true });
      assert.equal((await request(endpoint, 'PATCH', { title: 'Không sửa khóa đã gỡ' })).status, 409);
      assert.equal((await request('/training/courses/999999', 'PATCH', { title: 'Không tồn tại' })).status, 404);
      assert.equal((await request('/training/courses/not-an-id', 'PATCH', { title: 'Sai mã' })).status, 400);
    } finally { await coursesRepo.delete(editable.id); }
  });

  await t.test('editing assigned metadata preserves every learning field and rejects content/type changes', async () => {
    const editable = await createFixtureCourse('Khóa đang học');
    try {
      const assignment = await assignmentsRepo.save({ userId: actors.employee.id, courseId: editable.id, progressPercent: 75,
        status: 'IN_PROGRESS', dueAt, reminderCount: 3, lastReminderRunId: 'keep-run', lastReminderAt: new Date(), assignedByAi: true, aiReason: 'Giữ lý do AI' });
      const before = JSON.stringify(await assignmentsRepo.findOneBy({ id: assignment.id }));
      const endpoint = `/training/courses/${editable.id}`;
      const result = await request(endpoint, 'PATCH', { title: 'Tên mới', durationHours: 12, courseUrl: 'https://example.invalid/new' });
      assert.equal(result.status, 200);
      assert.equal(result.data.assignmentCount, 1);
      assert.equal((await request(endpoint, 'PATCH', { type: 'MANDATORY' })).status, 409);
      assert.equal((await request(endpoint, 'PATCH', { skillsProvided: ['Kỹ năng khác'] })).status, 409);
      assert.equal((await request(endpoint, 'PATCH', { type: 'SOFT_SKILL', skillsProvided: ['TypeScript'] })).status, 200);
      assert.equal(JSON.stringify(await assignmentsRepo.findOneBy({ id: assignment.id })), before);
      const history = await request('/onboarding/trainings', 'GET', undefined, 'employee');
      const item = history.data.find(item => item.id === assignment.id);
      assert.equal(item.title, 'Tên mới');
      assert.equal(item.courseUrl, 'https://example.invalid/new');
      assert.equal(item.progressPercent, 75);
    } finally {
      await assignmentsRepo.delete({ courseId: editable.id });
      await coursesRepo.delete(editable.id);
    }
  });

  await t.test('first assignment and content editing serialize under the same course lock', async () => {
    const editable = await createFixtureCourse('Khóa sửa đồng thời');
    try {
      const [edited, assigned] = await Promise.all([
        request(`/training/courses/${editable.id}`, 'PATCH', { skillsProvided: ['Excel'] }),
        request('/training/assignments', 'POST', { courseId: editable.id, userId: actors.employee.id }),
      ]);
      assert.equal(assigned.status, 201);
      assert.ok([200, 409].includes(edited.status));
      const saved = await coursesRepo.findOneBy({ id: editable.id });
      assert.deepEqual(saved.skillsProvided, edited.status === 200 ? ['Excel'] : ['TypeScript']);
      assert.equal(await assignmentsRepo.countBy({ courseId: editable.id }), 1);
      assert.equal((await request(`/training/courses/${editable.id}`, 'PATCH', { type: 'MANDATORY' })).status, 409);
    } finally {
      await assignmentsRepo.delete({ courseId: editable.id });
      await coursesRepo.delete(editable.id);
    }
  });

  await t.test('upgrading the legacy course foreign key preserves existing assignments', async () => {
    const queryRunner = db.createQueryRunner();
    try {
      const table = await queryRunner.getTable('employee_trainings');
      const relation = table.foreignKeys.find(key => key.columnNames.includes('course_id'));
      await queryRunner.dropForeignKey(table, relation);
      await db.query('ALTER TABLE employee_trainings MODIFY COLUMN course_id INT NOT NULL, DROP COLUMN course_snapshot, DROP COLUMN course_deleted_at');
      await db.query('DROP INDEX IDX_tv4_training_user_id ON employee_trainings');
      const legacyRelation = relation.clone();
      legacyRelation.onDelete = 'CASCADE';
      await queryRunner.createForeignKey('employee_trainings', legacyRelation);
      await admin.changeUser({ database });
      await migrateTrainingHistory(admin);
      await migrateTrainingHistory(admin); // Repeat deployment is safe.
      await db.synchronize();
      const upgraded = await queryRunner.getTable('employee_trainings');
      assert.equal(upgraded.findColumnByName('course_id').isNullable, true);
      assert.equal(upgraded.foreignKeys.find(key => key.columnNames.includes('course_id')).onDelete, 'SET NULL');
      assert.equal(JSON.stringify(await assignmentsRepo.find({ where: { courseId: course.id }, order: { id: 'ASC' } })), snapshot);
    } finally { await queryRunner.release(); }
  });

  await t.test('roster lists only the selected course, department, due date and progress without user secrets', async () => {
    const result = await request(`/training/courses/${course.id}/assignments`);
    assert.equal(result.status, 200);
    assert.equal(result.data.course.assignmentCount, 2);
    assert.equal(result.data.assignments.length, 2);
    assert.deepEqual(result.data.assignments.map(item => item.user.id).sort(), [actors.employee.id, actors.other.id].sort());
    assert.ok(result.data.assignments.every(item => item.course.id === course.id && item.user.departmentName === department.name));
    assert.deepEqual(result.data.assignments.map(item => item.progressPercent).sort(), [50, 100].sort());
    assert.doesNotMatch(JSON.stringify(result.data), /passwordHash|password_hash/);
    assert.equal((await request(`/training/courses/${emptyCourse.id}/assignments`)).data.assignments.length, 0);
    assert.equal((await request('/training/courses/999999/assignments')).status, 404);
    assert.equal((await request('/training/courses/not-an-id/assignments')).status, 400);
    assert.equal((await request('/training/courses?includeArchived=wrong')).status, 400);
  });

  await t.test('JWT and HR/SuperAdmin permissions apply to roster, removal and restore', async () => {
    for (const [path, method] of [[`/training/courses/${course.id}/assignments`, 'GET'], [`/training/courses/${course.id}`, 'DELETE'], [`/training/courses/${course.id}/restore`, 'PATCH'], [`/training/courses/${course.id}/permanent`, 'DELETE']]) {
      assert.equal((await request(path, method, undefined, null)).status, 401);
      assert.equal((await request(path, method, undefined, 'manager')).status, 403);
      assert.equal((await request(path, method, undefined, 'employee')).status, 403);
    }
    assert.equal((await coursesRepo.findOneBy({ id: course.id })).isArchived, false);
  });

  await t.test('removal hides the catalog entry and preserves every assignment field and employee history', async () => {
    const result = await request(`/training/courses/${course.id}`, 'DELETE');
    assert.equal(result.status, 200);
    assert.equal(result.data.isArchived, true);
    assert.equal(result.data.assignmentCount, 2);
    assert.equal((await request('/training/courses')).data.some(item => item.id === course.id), false);
    assert.equal((await request('/training/courses?includeArchived=true')).data.find(item => item.id === course.id).isArchived, true);
    assert.equal(JSON.stringify(await assignmentsRepo.find({ where: { courseId: course.id }, order: { id: 'ASC' } })), snapshot);
    const roster = await request(`/training/courses/${course.id}/assignments`);
    assert.equal(roster.data.course.isArchived, true);
    assert.equal(roster.data.assignments.length, 2);
    const employeeHistory = await request('/onboarding/trainings', 'GET', undefined, 'employee');
    assert.equal(employeeHistory.status, 200);
    const preserved = employeeHistory.data.find(item => item.courseId === course.id);
    assert.equal(preserved.title, course.title);
    assert.equal(preserved.progressPercent, 50);
    assert.equal((await request(`/training/courses/${course.id}`, 'DELETE')).status, 200);
    const update = await request(`/onboarding/trainings/${originalAssignments[0].id}/progress`, 'PATCH', { progressPercent: 75 }, 'employee');
    assert.equal(update.status, 200);
    assert.equal((await assignmentsRepo.findOneBy({ id: originalAssignments[0].id })).progressPercent, 75);
    snapshot = JSON.stringify(await assignmentsRepo.find({ where: { courseId: course.id }, order: { id: 'ASC' } }));
  });

  await t.test('archived course cannot be assigned and is absent from readiness and AI catalogs', async () => {
    const result = await request('/training/assignments', 'POST', { userId: actors.newcomer.id, courseId: course.id });
    assert.equal(result.status, 404);
    assert.equal(await assignmentsRepo.countBy({ courseId: course.id }), 2);
    const readiness = await request(`/training/ai-readiness/${actors.newcomer.id}`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.data.availableCourseCount, 1);
    const suggestion = await request('/training/ai-suggest', 'POST', { userId: actors.newcomer.id });
    assert.equal(suggestion.status, 201);
    assert.ok(recommendedCatalog.length > 0);
    assert.ok(recommendedCatalog.every(item => item.id !== course.id));
  });

  await t.test('restore is repeatable and existing progress remains editable without duplicate assignments', async () => {
    const result = await request(`/training/courses/${course.id}/restore`, 'PATCH', undefined, 'admin');
    assert.equal(result.status, 200);
    assert.equal(result.data.isArchived, false);
    assert.equal((await request(`/training/courses/${course.id}/restore`, 'PATCH')).status, 200);
    assert.equal(JSON.stringify(await assignmentsRepo.find({ where: { courseId: course.id }, order: { id: 'ASC' } })), snapshot);
    assert.equal((await request('/training/courses')).data.some(item => item.id === course.id), true);
    assert.equal((await request('/training/assignments', 'POST', { userId: actors.employee.id, courseId: course.id })).status, 409);
    const update = await request(`/onboarding/trainings/${originalAssignments[0].id}/progress`, 'PATCH', { progressPercent: 100 }, 'employee');
    assert.equal(update.status, 200);
    assert.equal((await assignmentsRepo.findOneBy({ id: originalAssignments[0].id })).progressPercent, 100);
  });

  await t.test('concurrent assignment and removal serialize instead of losing history or assigning a removed course', async () => {
    const race = await createFixtureCourse('Khóa kiểm thử đồng thời');
    const [assignment, removal] = await Promise.all([
      request('/training/assignments', 'POST', { userId: actors.employee.id, courseId: race.id }),
      request(`/training/courses/${race.id}`, 'DELETE'),
    ]);
    assert.equal(removal.status, 200);
    assert.ok([201, 404].includes(assignment.status), JSON.stringify(assignment));
    assert.equal((await coursesRepo.findOneBy({ id: race.id })).isArchived, true);
    assert.equal(await assignmentsRepo.countBy({ courseId: race.id }), assignment.status === 201 ? 1 : 0);
    assert.equal((await request('/training/assignments', 'POST', { userId: actors.other.id, courseId: race.id })).status, 404);
  });

  await t.test('concurrent duplicate assignment creates exactly one learner entry', async () => {
    const results = await Promise.all([1, 2].map(() => request('/training/assignments', 'POST', { userId: actors.newcomer.id, courseId: emptyCourse.id })));
    assert.deepEqual(results.map(item => item.status).sort(), [201, 409]);
    assert.equal(await assignmentsRepo.countBy({ userId: actors.newcomer.id, courseId: emptyCourse.id }), 1);
    assert.equal((await request('/training/courses/999999', 'DELETE')).status, 404);
    assert.equal((await request('/training/courses/999999/restore', 'PATCH')).status, 404);
  });

  await t.test('AI configuration errors reach the caller and retry returns a displayable analysis without assigning anything', async () => {
    const before = await assignmentsRepo.count();
    providerAvailable = false;
    const missingConfig = await request('/training/ai-suggest', 'POST', { userId: actors.employee.id });
    assert.equal(missingConfig.status, 400);
    assert.match(missingConfig.data.message, /Gemini cho backend/);
    providerAvailable = true;
    const result = await request('/training/ai-suggest', 'POST', { userId: actors.employee.id });
    assert.equal(result.status, 201);
    assert.equal(result.data.employeeId, actors.employee.id);
    assert.ok(Array.isArray(result.data.skillGaps));
    assert.equal(typeof result.data.summary, 'string');
    assert.equal(typeof result.data.careerAdvice, 'string');
    assert.equal(await assignmentsRepo.count(), before);
  });

  await t.test('permanent deletion removes the catalog entry while preserving learning, reminders and AI history', async () => {
    const historyCourse = await coursesRepo.save(coursesRepo.create({
      title: 'Khóa giữ kết quả sau khi xóa', type: 'MANDATORY', skillsProvided: ['TypeScript'],
      durationHours: 12, courseUrl: 'https://example.invalid/training/history',
    }));
    const pending = await assignmentsRepo.save({ userId: actors.employee.id, courseId: historyCourse.id, progressPercent: 45, status: 'IN_PROGRESS', assignedByAi: false, dueAt: new Date(Date.now() + 86400000), reminderCount: 2, lastReminderAt: new Date(Date.now() - 3 * 86400000), lastReminderRunId: 'retained-run' });
    const completed = await assignmentsRepo.save({ userId: actors.other.id, courseId: historyCourse.id, progressPercent: 100, status: 'COMPLETED', assignedByAi: true, completedAt: new Date(), dueAt, aiReason: 'Lý do cần giữ', reminderCount: 3 });
    const beforeRows = await assignmentsRepo.findByIds([pending.id, completed.id]);
    const stripCatalog = ({ courseId, courseSnapshot, courseDeletedAt, ...learning }) => learning;
    const beforeLearning = JSON.stringify(beforeRows.map(stripCatalog));
    assert.equal((await request(`/training/courses/${historyCourse.id}/permanent`, 'DELETE')).status, 409);
    assert.equal(await assignmentsRepo.countBy({ courseId: historyCourse.id }), 2);
    const summaryBefore = await request('/training/summary');
    await request(`/training/courses/${historyCourse.id}`, 'DELETE');
    const removal = await request(`/training/courses/${historyCourse.id}/permanent`, 'DELETE');
    assert.equal(removal.status, 200);
    assert.equal(removal.data.assignmentCount, 2);
    assert.equal(await coursesRepo.findOneBy({ id: historyCourse.id }), null);
    const afterRows = await assignmentsRepo.findByIds([pending.id, completed.id]);
    assert.equal(afterRows.length, 2);
    assert.equal(JSON.stringify(afterRows.map(stripCatalog)), beforeLearning);
    for (const row of afterRows) {
      assert.equal(row.courseId, null);
      assert.ok(row.courseDeletedAt instanceof Date);
      assert.deepEqual(row.courseSnapshot, { id: historyCourse.id, title: historyCourse.title, type: historyCourse.type, skillsProvided: historyCourse.skillsProvided, durationHours: 12, courseUrl: historyCourse.courseUrl });
    }
    assert.deepEqual((await request('/training/summary')).data, summaryBefore.data);
    assert.equal((await request('/training/courses?includeArchived=true')).data.some(item => item.id === historyCourse.id), false);
    assert.equal((await request(`/training/courses/${historyCourse.id}/assignments`)).status, 404);
    assert.equal((await request(`/training/courses/${historyCourse.id}/restore`, 'PATCH')).status, 404);
    assert.equal((await request(`/training/courses/${historyCourse.id}/permanent`, 'DELETE')).status, 404);
    assert.equal((await request('/training/assignments', 'POST', { userId: actors.newcomer.id, courseId: historyCourse.id })).status, 404);
    const history = (await request('/onboarding/trainings', 'GET', undefined, 'employee')).data.find(item => item.id === pending.id);
    assert.equal(history.title, historyCourse.title);
    assert.equal(history.courseUrl, historyCourse.courseUrl);
    assert.equal(history.durationHours, 12);
    assert.equal(history.isCourseDeleted, true);
    assert.equal(history.progressPercent, 45);
    const adminHistory = (await request('/training/assignments')).data.find(item => item.id === pending.id);
    assert.equal(adminHistory.course.title, historyCourse.title);
    assert.equal(adminHistory.course.isDeleted, true);
    const reminder = (await app.get(TrainingService).getPendingTrainingReminders()).reminders.find(item => item.assignmentId === pending.id);
    assert.equal(reminder.course.title, historyCourse.title);
    assert.equal(reminder.course.courseUrl, historyCourse.courseUrl);
    assert.equal((await request(`/onboarding/trainings/${pending.id}/progress`, 'PATCH', { progressPercent: 65 }, 'employee')).status, 200);
    assert.equal((await assignmentsRepo.findOneBy({ id: pending.id })).progressPercent, 65);
    assert.equal((await request(`/onboarding/trainings/${pending.id}/progress`, 'PATCH', { progressPercent: 10 }, 'other')).status, 404);
    assert.equal((await request('/training/ai-suggest', 'POST', { userId: actors.other.id })).status, 201);
    assert.ok(analysisPrompt.includes(historyCourse.title), 'AI should retain completed learning context');
    assert.ok(recommendedCatalog.every(item => item.id !== historyCourse.id));
  });

  await t.test('permanent deletion of an unassigned course requires removal first', async () => {
    const unused = await createFixtureCourse('Khóa chưa có người học để xóa');
    assert.equal((await request(`/training/courses/${unused.id}/permanent`, 'DELETE')).status, 409);
    await request(`/training/courses/${unused.id}`, 'DELETE');
    const result = await request(`/training/courses/${unused.id}/permanent`, 'DELETE');
    assert.equal(result.status, 200);
    assert.equal(result.data.assignmentCount, 0);
    assert.equal(await coursesRepo.findOneBy({ id: unused.id }), null);
  });

  await t.test('progress and permanent deletion can run concurrently without losing either change', async () => {
    const race = await coursesRepo.save(coursesRepo.create({ title: 'Khóa đồng thời giữ tiến độ', type: 'SOFT_SKILL', skillsProvided: ['TypeScript'], isArchived: true }));
    const row = await assignmentsRepo.save({ userId: actors.employee.id, courseId: race.id, progressPercent: 25, status: 'IN_PROGRESS', assignedByAi: false });
    const [progress, deletion] = await Promise.all([
      request(`/onboarding/trainings/${row.id}/progress`, 'PATCH', { progressPercent: 80 }, 'employee'),
      request(`/training/courses/${race.id}/permanent`, 'DELETE'),
    ]);
    assert.equal(progress.status, 200);
    assert.equal(deletion.status, 200);
    const saved = await assignmentsRepo.findOneBy({ id: row.id });
    assert.equal(saved.courseId, null);
    assert.equal(saved.courseSnapshot.title, race.title);
    assert.equal(saved.progressPercent, 80);
    assert.equal((await request(`/training/assignments/${row.id}/progress`, 'PATCH', { progressPercent: 100 })).status, 200);
    assert.equal((await assignmentsRepo.findOneBy({ id: row.id })).status, 'COMPLETED');
  });

  await t.test('failure to delete a catalog record rolls back the snapshot and relation changes', async () => {
    const blocked = await coursesRepo.save(coursesRepo.create({ title: 'Khóa kiểm thử rollback', type: 'SOFT_SKILL', skillsProvided: ['TypeScript'], isArchived: true }));
    const row = await assignmentsRepo.save({ userId: actors.employee.id, courseId: blocked.id, progressPercent: 65, status: 'IN_PROGRESS', assignedByAi: false });
    await db.query('CREATE TABLE tv4_course_delete_blocker (course_id INT PRIMARY KEY, FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE RESTRICT) ENGINE=InnoDB');
    try {
      await db.query('INSERT INTO tv4_course_delete_blocker (course_id) VALUES (?)', [blocked.id]);
      assert.equal((await request(`/training/courses/${blocked.id}/permanent`, 'DELETE')).status, 500);
      const unchanged = await assignmentsRepo.findOneBy({ id: row.id });
      assert.equal(unchanged.courseId, blocked.id);
      assert.equal(unchanged.courseSnapshot, null);
      assert.equal(unchanged.courseDeletedAt, null);
      assert.equal(unchanged.progressPercent, 65);
      assert.ok(await coursesRepo.findOneBy({ id: blocked.id }));
    } finally { await db.query('DROP TABLE tv4_course_delete_blocker'); }
  });
});
