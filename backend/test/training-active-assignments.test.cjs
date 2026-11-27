const test = require('node:test');
const assert = require('node:assert/strict');
const { TrainingService } = require('../dist/modules/training/training.service');
const { TrainingCourseType } = require('../dist/entities/training-course.entity');

function setup(users = [
  { id: 10, role: 'EMPLOYEE', isActive: true },
  { id: 11, role: 'EMPLOYEE', isActive: false },
  { id: 12, role: 'MANAGER', isActive: true },
  { id: 13, role: 'HR', isActive: true },
  { id: 14, role: 'EMPLOYEE', isActive: true },
]) {
  const history = [{ id: 1, userId: 11, courseId: 20, progressPercent: 75,
    status: 'IN_PROGRESS', dueAt: new Date('2026-11-30T16:59:59Z'), reminderCount: 2 }];
  const rows = [...history], courses = [{ id: 30, isArchived: false }];
  let writes = 0, transactions = 0;
  const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
  const trainingRepository = {
    findOne: async ({ where }) => rows.find(row => matches(row, where)) ?? null,
    create: value => ({ ...value }),
    save: async value => {
      writes++;
      const saved = (Array.isArray(value) ? value : [value]).map((row, index) => ({ id: rows.length + index + 1, ...row }));
      rows.push(...saved);
      return Array.isArray(value) ? saved : saved[0];
    },
  };
  const courseRepository = {
    create: value => ({ ...value }),
    save: async value => { const saved = { id: 31, ...value }; courses.push(saved); return saved; },
    findOne: async ({ where }) => courses.find(course => matches(course, where)) ?? null,
    manager: { transaction: async action => {
      transactions++;
      return action({ getRepository: entity => entity.name === 'TrainingCourse' ? courseRepository : trainingRepository });
    } },
  };
  const userRepository = {
    find: async ({ where }) => users.filter(user => matches(user, where)),
    findOne: async ({ where }) => users.find(user => matches(user, where)) ?? null,
  };
  return { service: new TrainingService(courseRepository, trainingRepository, userRepository, {}),
    rows, users, courses, history: JSON.stringify(history), get writes() { return writes; },
    get transactions() { return transactions; } };
}

const courseInput = type => ({ title: 'Khóa học kiểm thử', type, skillsProvided: [], durationHours: 4 });

test('new mandatory courses are assigned only to active employees and preserve inactive learning history', async () => {
  const h = setup();
  const course = await h.service.createCourse(courseInput(TrainingCourseType.MANDATORY));
  assert.deepEqual(h.rows.filter(row => row.courseId === course.id).map(row => row.userId), [10, 14]);
  assert.equal(h.writes, 1);
  assert.equal(JSON.stringify(h.rows.filter(row => row.courseId === 20)), h.history);
});

test('mandatory course creation still succeeds when no active employees are eligible', async () => {
  const h = setup([{ id: 11, role: 'EMPLOYEE', isActive: false }, { id: 12, role: 'MANAGER', isActive: true }]);
  const course = await h.service.createCourse(courseInput(TrainingCourseType.MANDATORY));
  assert.equal(course.type, TrainingCourseType.MANDATORY);
  assert.equal(h.courses.length, 2);
  assert.equal(h.writes, 0);
  assert.equal(JSON.stringify(h.rows), h.history);
});

test('non-mandatory course creation does not automatically assign employees', async () => {
  for (const type of [TrainingCourseType.SOFT_SKILL, TrainingCourseType.AI_SKILL_GAP]) {
    const h = setup();
    await h.service.createCourse(courseInput(type));
    assert.equal(h.writes, 0);
    assert.equal(JSON.stringify(h.rows), h.history);
  }
});

test('manual assignment rejects inactive, non-employee and nonexistent accounts before any assignment write', async () => {
  for (const userId of [11, 12, 13, 999]) {
    const h = setup();
    await assert.rejects(h.service.assignCourse({ userId, courseId: 30 }), error => error.getStatus() === 404);
    assert.equal(h.transactions, 0);
    assert.equal(h.writes, 0);
    assert.equal(JSON.stringify(h.rows), h.history);
  }
});

test('active employees can still be assigned; duplicate assignment remains blocked', async () => {
  const h = setup();
  const result = await h.service.assignCourse({ userId: 10, courseId: 30 });
  assert.equal(result.userId, 10);
  assert.equal(result.status, 'ASSIGNED');
  assert.equal(result.progressPercent, 0);
  assert.ok(result.dueAt > new Date());
  await assert.rejects(h.service.assignCourse({ userId: 10, courseId: 30 }), error => error.getStatus() === 409);
  assert.equal(h.writes, 1);
});

test('reactivation allows a new assignment without altering previous learning history', async () => {
  const h = setup();
  h.users.find(user => user.id === 11).isActive = true;
  assert.equal((await h.service.assignCourse({ userId: 11, courseId: 30 })).userId, 11);
  assert.equal(JSON.stringify(h.rows.filter(row => row.courseId === 20)), h.history);
  const previousTransactions = h.transactions;
  h.users.find(user => user.id === 11).isActive = false;
  await assert.rejects(h.service.assignCourse({ userId: 11, courseId: 31 }), error => error.getStatus() === 404);
  assert.equal(h.transactions, previousTransactions);
  assert.equal(h.writes, 1);
});
