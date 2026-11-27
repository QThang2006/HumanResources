require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { OffboardingService } = require('../dist/modules/offboarding/offboarding.service');
const { OffboardingLifecycleWorker } = require('../dist/modules/offboarding/offboarding-lifecycle.worker');
const { User, Department, OffboardingCase } = require('../dist/entities');

function fixture() {
  let state = {
    users: [
      { id: 1, role: 'EMPLOYEE', isActive: true },
      { id: 2, role: 'HR', isActive: true },
      { id: 3, role: 'MANAGER', isActive: true },
      { id: 4, role: 'EMPLOYEE', isActive: true },
      { id: 5, role: 'SUPERADMIN', isActive: true },
      { id: 6, role: 'EMPLOYEE', isActive: false },
    ].map(user => ({ ...user, fullName: `QA ${user.id}`, email: `qa${user.id}@example.invalid` })),
    cases: [], departments: [{ id: 1, name: 'Operations', managerId: 3 }, { id: 2, name: 'Support', managerId: 3 }],
  };
  const fail = { department: false, save: false };
  let calls = 0;
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && value._type) {
      if (value._type === 'isNull') return row[key] == null;
      if (value._type === 'in') return value._value.includes(row[key]);
      if (value._type === 'lessThan') return row[key] < value._value;
    }
    return row[key] === value;
  });
  function repository(entity) {
    const key = entity === User ? 'users' : entity === Department ? 'departments' : 'cases';
    return {
      manager,
      async find({ where } = {}) { return state[key].filter(row => matches(row, where)).map(hydrate); },
      async findOne({ where }) { const row = state[key].find(row => matches(row, where)); return row ? hydrate(row) : null; },
      create: value => value,
      async save(value) {
        if (fail.save) throw Error('save failed');
        const existing = state[key].findIndex(row => row.id === value.id);
        const saved = { ...value, id: value.id || state[key].length + 1 };
        if (existing < 0) state[key].push(saved); else state[key][existing] = saved;
        return saved;
      },
      async update(where, patch) {
        if (key === 'departments' && fail.department) throw Error('department failed');
        for (const row of state[key]) if (matches(row, typeof where === 'number' ? { id: where } : where)) Object.assign(row, patch);
      },
    };
    function hydrate(row) {
      if (key !== 'cases') return { ...row };
      return { ...row, user: state.users.find(user => user.id === row.userId), approvedBy: state.users.find(user => user.id === row.approvedById) };
    }
  }
  const manager = {
    getRepository: repository,
    async transaction(action) {
      const before = structuredClone(state);
      try { return await action(manager); } catch (error) { state = before; throw error; }
    },
  };
  const service = new OffboardingService(repository(OffboardingCase), repository(User), {
    async triggerOffboardingApproved() { calls++; return true; },
  });
  function addCase(userId = 4, patch = {}) {
    const record = { id: state.cases.length + 1, userId, approvedById: 2, status: 'IN_PROGRESS', lastWorkingDate: '2030-04-20', finalizedAt: null, ...patch };
    state.cases.push(record); return record.id;
  }
  return { service, addCase, fail, get state() { return state; }, get calls() { return calls; } };
}
const approved = userId => ({ userId, lastWorkingDate: '2099-04-20', personalEmail: 'person@example.invalid' });
const result = { runId: 'qa-delivery-1', itNotified: true, financeNotified: true, employeeNotified: true, telegramNotified: true, status: 'SENT' };
const today = new Date('2030-04-20T02:00:00Z');
const rejects = (fn, status) => assert.rejects(fn, error => error.getStatus?.() === status);

test('EMPLOYEE, MANAGER and HR are eligible; root ID, SUPERADMIN and inactive accounts are protected', async () => {
  for (const id of [2, 3, 4]) {
    const f = fixture(), response = await f.service.approve(2, approved(id));
    assert.equal(response.offboarding.employee.id, id); assert.equal(f.calls, 1);
    assert.ok(f.state.users.find(user => user.id === id).isActive);
    if (id === 3) assert.equal(response.offboarding.managesDepartments.length, 2);
  }
  for (const [id, status] of [[1, 400], [5, 400], [6, 404], [999, 404], [undefined, 400]]) {
    const f = fixture(); await rejects(() => f.service.approve(2, approved(id)), status);
    assert.equal(f.calls, 0); assert.equal(f.state.cases.length, 0);
  }
});

test('invalid calendar dates are rejected; an unfinished or legacy-delivered case prevents duplicate approval', async () => {
  const f = fixture(); await rejects(() => f.service.approve(2, { ...approved(4), lastWorkingDate: '2099-02-30' }), 400);
  for (const status of ['APPROVED', 'IN_PROGRESS', 'PARTIAL', 'FAILED', 'COMPLETED']) {
    const f = fixture(); f.addCase(4, { status });
    await rejects(() => f.service.approve(2, approved(4)), 409); assert.equal(f.calls, 0);
  }
});

test('cancellation is idempotent, preserves the active account and permits a replacement case', async () => {
  const f = fixture(), id = f.addCase(3);
  await f.service.cancel(id); await f.service.cancel(id);
  assert.equal(f.state.cases[0].status, 'CANCELLED'); assert.equal(f.state.users[2].isActive, true);
  assert.equal(f.state.departments[0].managerId, 3);
  await f.service.approve(2, approved(3)); assert.equal(f.state.cases.length, 2);
  await rejects(() => f.service.finalize(id, today), 400);
});

test('finalization cannot run early and atomically locks the account and clears every department led by it', async () => {
  const f = fixture(), id = f.addCase(3);
  await rejects(() => f.service.finalize(id, new Date('2030-04-19T16:59:59Z')), 400);
  assert.equal(f.state.users[2].isActive, true);
  const response = await f.service.finalize(id, today);
  assert.equal(response.offboarding.status, 'COMPLETED'); assert.ok(response.offboarding.finalizedAt);
  assert.equal(f.state.users[2].isActive, false); assert.ok(f.state.departments.every(department => department.managerId === null));
  await f.service.finalize(id, today);
  await rejects(() => f.service.cancel(id), 400);
  await rejects(() => f.service.retry(id), 400);
});

test('a department or case save failure rolls back account deactivation and all other writes', async () => {
  for (const failure of ['department', 'save']) {
    const f = fixture(), id = f.addCase(3), before = structuredClone(f.state);
    f.fail[failure] = true; await assert.rejects(() => f.service.finalize(id, today));
    assert.deepEqual(f.state, before);
  }
});

test('even a pre-existing case cannot finalize the root ID or a SUPERADMIN', async () => {
  for (const userId of [1, 5]) {
    const f = fixture(), id = f.addCase(userId);
    await rejects(() => f.service.finalize(id, today), 400);
    assert.equal(f.state.users.find(user => user.id === userId).isActive, true);
  }
});

test('delivery completion never locks the account or marks the employment case completed', async () => {
  const f = fixture(), id = f.addCase();
  const response = await f.service.recordAutomationResult(id, result);
  assert.equal(response.status, 'IN_PROGRESS'); assert.equal(f.state.users[3].isActive, true);
  assert.deepEqual(response.channels, { it: true, finance: true, employee: true, telegram: true });
  assert.equal((await f.service.recordAutomationResult(id, result)).duplicate, true);
});

test('late callbacks cannot resurrect cancelled or finalized cases and cannot start another execution', async () => {
  for (const action of ['cancel', 'finalize']) {
    const f = fixture(), id = f.addCase(); await f.service[action](id, today);
    const before = structuredClone(f.state);
    assert.equal((await f.service.recordAutomationResult(id, result)).ignored, true);
    assert.deepEqual(f.state, before);
    await rejects(() => f.service.getAutomationCase(id), 400);
    await rejects(() => f.service.retry(id), 400);
  }
});

test('legacy COMPLETED delivery rows remain open until explicitly or automatically finalized', async () => {
  const f = fixture(), id = f.addCase(4, { status: 'COMPLETED' });
  assert.equal((await f.service.findAll())[0].status, 'IN_PROGRESS');
  assert.equal((await f.service.findAll())[0].finalizedAt, null);
  await f.service.finalize(id, today); assert.ok(f.state.cases[0].finalizedAt);
});

test('automatic closure waits until the last working day ends in Vietnam and excludes cancelled cases', async () => {
  const f = fixture(); f.addCase(); f.addCase(3, { status: 'CANCELLED' });
  assert.equal((await f.service.finalizeOverdue(new Date('2030-04-20T16:59:59Z'))).completed, 0);
  assert.equal((await f.service.finalizeOverdue(new Date('2030-04-20T17:00:00Z'))).completed, 1);
  assert.equal(f.state.users[3].isActive, false); assert.equal(f.state.users[2].isActive, true);
  assert.equal((await f.service.finalizeOverdue(new Date('2030-04-21T17:00:00Z'))).completed, 0);
});

test('worker runs once per minute without overlapping checks and stops on module shutdown', async () => {
  const originalSet = global.setInterval, originalClear = global.clearInterval;
  let tick, cleared = false, count = 0, resolve;
  global.setInterval = (callback, ms) => { tick = callback; assert.equal(ms, 60_000); return { unref() {} }; };
  global.clearInterval = () => { cleared = true; };
  try {
    const worker = new OffboardingLifecycleWorker({ finalizeOverdue: () => { count++; return new Promise(done => { resolve = done; }); } });
    worker.onModuleInit(); tick(); tick(); assert.equal(count, 1);
    resolve(); await new Promise(done => setImmediate(done));
    tick(); assert.equal(count, 2); resolve(); await worker.onModuleDestroy(); assert.equal(cleared, true);
  } finally { global.setInterval = originalSet; global.clearInterval = originalClear; }
});
