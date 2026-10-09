require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { JobsService } = require('../dist/modules/jobs/jobs.service');
const { ApplicationsService } = require('../dist/modules/applications/applications.service');
const { CreateDepartmentDto } = require('../dist/modules/jobs/dto/create-department.dto');
const { AssignDepartmentManagerDto } = require('../dist/modules/jobs/dto/assign-department-manager.dto');
const { Department } = require('../dist/entities/department.entity');
const { User } = require('../dist/entities/user.entity');
const { Job } = require('../dist/entities/job.entity');
const { Interview } = require('../dist/entities/interview.entity');
const { Application } = require('../dist/entities/application.entity');

// Service unit tests: repositories and automation are isolated doubles.
// Real transaction/HTTP behavior is covered by the optional MySQL test below.
function fixture() {
  const stores = new Map([
    [Department, [{ id: 1, name: 'Engineering', code: 'ENG', managerId: null }]],
    [User, [
      { id: 1, fullName: 'Employee', email: 'employee@example.test', role: 'EMPLOYEE', jobTitle: 'Developer', departmentId: 1, isActive: true },
      { id: 2, fullName: 'HR', email: 'hr@example.test', role: 'HR', jobTitle: 'HR Specialist', departmentId: 1, isActive: true },
      { id: 3, fullName: 'Manager', email: 'manager@example.test', role: 'MANAGER', departmentId: 1, isActive: true },
      { id: 4, fullName: 'Root', email: 'root@example.test', role: 'SUPERADMIN', isActive: true },
      { id: 5, fullName: 'Inactive', role: 'EMPLOYEE', isActive: false },
      { id: 6, fullName: 'Other manager', role: 'MANAGER', departmentId: 2, isActive: true },
    ]],
    [Job, [{ id: 1, departmentId: 1 }]],
    [Application, [{ id: 1, jobId: 1, status: 'APPLIED', updatedAt: new Date('2026-01-01T00:00:00Z') }]],
    [Interview, []],
  ]);
  const matches = (row, where) => (Array.isArray(where) ? where : [where || {}])
    .some((condition) => Object.entries(condition).every(([key, value]) => row[key] === value));
  const repositories = new Map();
  for (const [entity, rows] of stores) {
    repositories.set(entity, {
      create: (data) => ({ ...data }),
      async save(row) {
        if (!row.id) { row.id = Math.max(0, ...rows.map((r) => r.id)) + 1; rows.push(row); }
        return row;
      },
      async find({ where } = {}) { return rows.filter((row) => matches(row, where)); },
      async findOneBy(where) { return rows.find((row) => matches(row, where)) || null; },
      async findOne(options) {
        const row = rows.find((item) => matches(item, options.where));
        if (row && entity === Job && options.relations) {
          row.department = stores.get(Department).find((d) => d.id === row.departmentId);
        }
        if (row && entity === Application && options.relations) {
          row.job = stores.get(Job).find((job) => job.id === row.jobId);
          row.interviews = stores.get(Interview).filter((interview) => interview.applicationId === row.id);
        }
        return row || null;
      },
      createQueryBuilder() {
        let personId, departmentId;
        return {
          update() { return this; }, set() { return this; },
          where(_, input) { personId = input.managerId; return this; },
          andWhere(_, input) { departmentId = input.departmentId; return this; },
          async execute() {
            for (const row of rows) if (row.managerId === personId && row.id !== departmentId) row.managerId = null;
          },
        };
      },
    });
  }
  const db = {
    getRepository: (entity) => repositories.get(entity),
    transaction: async (fn) => fn(db),
  };
  const jobs = new JobsService(db.getRepository(Job), db.getRepository(Department), {}, db);
  const automation = { calls: [], async triggerInterviewScheduled(payload) { this.calls.push(payload); return true; } };
  const applications = new ApplicationsService(db.getRepository(Application), db, {}, {}, automation,
    { prepare: async () => null, views: async () => new Map() }, { get: () => undefined });
  return { stores, db, jobs, applications, automation, actor: { id: 2, role: 'HR', departmentId: 1 } };
}

test('department DTO accepts omitted/null manager and rejects invalid IDs', async () => {
  for (const Dto of [CreateDepartmentDto, AssignDepartmentManagerDto]) {
    for (const managerId of [undefined, null, 2]) {
      const errors = await validate(plainToInstance(Dto, { name: 'Design', code: 'DSN', managerId }));
      assert.equal(errors.length, 0);
    }
    for (const managerId of [0, -1, 1.5, 'invalid']) {
      const errors = await validate(plainToInstance(Dto, { name: 'Design', code: 'DSN', managerId }));
      assert.ok(errors.some((error) => error.property === 'managerId'));
    }
  }
});

test('create without manager, promote Employee, preserve HR/Manager roles and move both links', async () => {
  const empty = fixture();
  const department = await empty.jobs.createDepartment({ name: ' Design ', code: ' dsn ' });
  assert.equal(department.managerId, null);
  assert.equal(department.name, 'Design');
  assert.equal(department.code, 'DSN');
  assert.equal(empty.stores.get(User)[0].role, 'EMPLOYEE');
  for (const managerId of [1, 2, 3]) {
    const f = fixture();
    const person = f.stores.get(User).find((user) => user.id === managerId);
    const previousRole = person.role;
    f.stores.get(Department)[0].managerId = managerId;
    const created = await f.jobs.createDepartment({ name: 'Design', code: 'DSN', managerId });
    assert.equal(created.managerId, managerId);
    assert.equal(person.departmentId, created.id);
    assert.equal(person.role, previousRole === 'EMPLOYEE' ? 'MANAGER' : previousRole);
    if (previousRole === 'EMPLOYEE') assert.equal(person.jobTitle, 'Manager');
    assert.equal(f.stores.get(Department)[0].managerId, null);
  }
});

test('appointment later and null removal; reject SuperAdmin/inactive/nonexistent candidates', async () => {
  const f = fixture();
  const assigned = await f.jobs.assignDepartmentManager(1, 1);
  assert.equal(assigned.managerId, 1);
  assert.equal(f.stores.get(User)[0].role, 'MANAGER');
  assert.equal((await f.jobs.assignDepartmentManager(1, null)).managerId, null);
  for (const id of [4, 5, 999]) {
    await assert.rejects(f.jobs.assignDepartmentManager(1, id), (error) => error.getStatus() === 400);
  }
  await assert.rejects(f.jobs.assignDepartmentManager(999, 1), (error) => error.getStatus() === 404);
});

test('lookup exposes only active Employee/HR/Manager, with identity details', async () => {
  const f = fixture();
  const people = await f.jobs.departmentManagers();
  assert.deepEqual(people.map((user) => user.id), [1, 2, 3, 6]);
  assert.equal(people[0].email, 'employee@example.test');
  assert.equal(people[0].jobTitle, 'Developer');
  assert.equal(people[0].role, 'EMPLOYEE');
});

test('interviewer lookup includes fallback only without a manager and includes designated HR', async () => {
  const f = fixture();
  const fallback = await f.applications.interviewers(1, f.actor);
  assert.deepEqual(fallback.map((user) => user.id), [3, 2, 4]);
  f.stores.get(Department)[0].managerId = 2;
  const designated = await f.applications.interviewers(1, f.actor);
  assert.deepEqual(designated.map((user) => user.id), [2]);
});

test('schedule permits HR/SuperAdmin fallback and designated HR, rejects unrelated or inactive users', async () => {
  for (const [managerId, interviewerId, allowed] of [
    [null, 2, true], [null, 4, true], [null, 3, true],
    [3, 2, false], [3, 4, false], [2, 2, true],
    [null, 1, false], [null, 5, false], [null, 6, false],
  ]) {
    const f = fixture();
    f.stores.get(Department)[0].managerId = managerId;
    const pending = f.applications.schedule(1, {
      interviewerId, round: 1, scheduledAt: '2099-01-01T03:30:00Z',
    }, f.actor);
    if (allowed) {
      const result = await pending;
      assert.equal(result.interview.interviewerId, interviewerId);
      assert.equal(f.stores.get(Application)[0].status, 'INTERVIEWING');
      assert.equal(f.automation.calls.length, 1);
    } else {
      await assert.rejects(pending, (error) => error.getStatus() === 400);
      assert.equal(f.stores.get(Interview).length, 0);
      assert.equal(f.automation.calls.length, 0);
    }
  }
});

test('assigned interviewer can save regardless of role and get the saved result', async () => {
  for (const role of ['HR', 'SUPERADMIN', 'MANAGER', 'EMPLOYEE']) {
    const f = fixture();
    const updatedAt = new Date('2026-01-01T00:00:00Z');
    f.stores.get(Application)[0].status = 'INTERVIEWING';
    f.stores.get(Interview).push({ id: 1, applicationId: 1, interviewerId: 2, result: 'PENDING', updatedAt });
    const input = { score: 85, feedback: 'Good', result: 'PASSED', expectedResult: 'PENDING', expectedUpdatedAt: updatedAt.toISOString() };
    await assert.rejects(f.applications.result(1, input, { id: 99, role, departmentId: 1 }),
      (error) => error.getStatus() === 403);
    const response = await f.applications.result(1, input, { id: 2, role, departmentId: 999 });
    assert.equal(response.interviews[0].result, 'PASSED');
    assert.equal(f.stores.get(Interview)[0].result, 'PASSED');
    assert.equal(f.stores.get(Interview)[0].score, 85);
  }
});

test('real MySQL: invalid appointment rolls back new department and protected API filters candidates',
  { skip: !process.env.ATS_TEST_DB_PASSWORD }, async (t) => {
    const { startHarness } = require('./recruitment-harness.cjs');
    const h = await startHarness();
    t.after(() => h.close());
    const list = await h.request('/jobs/departments/managers', { who: 'hr' });
    assert.equal(list.status, 200);
    assert.ok(list.data.some((user) => user.id === h.users.employee.id));
    assert.ok(!list.data.some((user) => user.id === h.users.admin.id));
    assert.equal((await h.request('/jobs/departments/managers', { who: 'employee' })).status, 403);
    const invalid = await h.request('/jobs/departments', {
      who: 'hr', method: 'POST', body: { name: 'Invalid', code: 'INVALID', managerId: h.users.admin.id },
    });
    assert.equal(invalid.status, 400);
    assert.equal(await h.db.getRepository(Department).countBy({ code: 'INVALID' }), 0);
    const created = await h.request('/jobs/departments', {
      who: 'hr', method: 'POST', body: { name: 'Design', code: 'DSN', managerId: h.users.employee.id },
    });
    assert.equal(created.status, 201);
    const person = await h.db.getRepository(User).findOneByOrFail({ id: h.users.employee.id });
    assert.equal(person.role, 'MANAGER');
    assert.equal(person.departmentId, created.data.id);
    assert.equal(created.data.managerId, person.id);
  });
