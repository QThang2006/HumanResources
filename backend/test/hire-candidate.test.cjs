const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { Repository } = require('typeorm');
const { startHarness } = require('./recruitment-harness.cjs');

test(
  'TV2 hires through lead service with real JWT/MySQL and stub automation',
  { timeout: 120000 },
  async (t) => {
    const h = await startHarness();
    t.after(() => h.close());
    const { db, entities: e } = h;
    const job = await db.getRepository(e.Job).save({
      departmentId: h.departments[0].id,
      createdBy: h.users.hr.id,
      title: 'Backend Engineer',
      description: 'Demo JD',
      requirements: 'NestJS',
      status: 'OPEN',
    });
    let sequence = 0;
    async function candidate({
      status = 'OFFERED',
      result = 'PASSED',
      email,
      jobId = job.id,
    } = {}) {
      const n = ++sequence;
      const app = await db.getRepository(e.Application).save({
        jobId,
        candidateName: 'Hire Demo ' + n,
        candidateEmail: email || 'hire-' + n + '@example.test',
        cvFileUrl: 'fixture-no-cv',
        status,
      });
      await db.getRepository(e.Interview).save({
        applicationId: app.id,
        interviewerId: h.users.manager.id,
        round: 1,
        scheduledAt: new Date('2026-10-05T02:00:00Z'),
        result,
        score: result === 'PASSED' ? 90 : null,
      });
      return app;
    }
    const hire = (app, who = 'hr') =>
      h.request('/applications/' + app.id + '/hire', { method: 'POST', who });
    const users = () => db.getRepository(e.User).count();
    const tasks = () => db.getRepository(e.OnboardingTask).count();

    await t.test('lead auth fix rejects role-only and missing-password sign-in', async () => {
      for (const body of [
        { role: 'HR' },
        { email: 'hr@example.test', role: 'HR' },
        { email: 'hr@example.test' },
      ]) {
        assert.equal((await h.request('/auth/login', { method: 'POST', body })).status, 400);
      }
    });
    await t.test('JWT and HR/Admin required; generic PATCH cannot hire', async () => {
      const app = await candidate();
      const before = await users();
      assert.equal((await hire(app, null)).status, 401);
      for (const who of ['manager', 'other', 'employee'])
        assert.equal((await hire(app, who)).status, 403);
      assert.equal(
        (
          await h.request('/applications/' + app.id + '/status', {
            method: 'PATCH',
            who: 'hr',
            body: { expectedStatus: 'OFFERED', status: 'HIRED' },
          })
        ).status,
        409,
      );
      assert.equal(await users(), before);
      assert.equal(h.automation.hireCalls.length, 0);
    });
    await t.test('preconditions include latest round, including a passed older round', async () => {
      const before = await users();
      const tasksBefore = await tasks();
      for (const options of [
        { status: 'APPLIED' },
        { status: 'REJECTED' },
        { result: 'FAILED' },
        { result: 'PENDING' },
      ])
        assert.equal((await hire(await candidate(options))).status, 409);
      const app = await candidate();
      await db.getRepository(e.Interview).save({
        applicationId: app.id,
        interviewerId: h.users.manager.id,
        round: 2,
        scheduledAt: new Date('2026-10-06T02:00:00Z'),
        result: 'PENDING',
      });
      assert.equal((await hire(app)).status, 409);
      assert.equal(
        (await h.request('/applications/999999/hire', { method: 'POST', who: 'hr' })).status,
        404,
      );
      assert.equal(await users(), before);
      assert.equal(await tasks(), tasksBefore);
    });
    await t.test(
      'creates employee, bcrypt credential, five lead tasks, HIRED link and safe receipt',
      async () => {
        const app = await candidate({ status: 'INTERVIEWING' });
        const response = await hire(app);
        assert.equal(response.status, 201);
        const receipt = response.data;
        assert.equal(receipt.success, true);
        assert.equal(receipt.alreadyHired, false);
        assert.equal(receipt.onboardingTasksCount, 5);
        assert.equal(receipt.welcomeEmailStatus, 'DISPATCHED_UNVERIFIED');
        assert.equal(receipt.jobAutoClosed, true);
        assert.equal(receipt.jobStatus, 'CLOSED');
        assert.equal(receipt.hiredCount, 1);
        assert.equal(receipt.headcount, 1);
        assert.match(receipt.jobAutoClosedMessage, /1\/1/);
        assert.deepEqual(
          Object.keys(receipt).sort(),
          [
            'success',
            'alreadyHired',
            'hiredUserId',
            'email',
            'fullName',
            'onboardingTasksCount',
            'welcomeEmailStatus',
            'jobAutoClosed',
            'jobStatus',
            'hiredCount',
            'headcount',
            'jobAutoClosedMessage',
          ].sort(),
        );
        const updatedJob = await db.getRepository(e.Job).findOneByOrFail({ id: job.id });
        assert.equal(updatedJob.status, 'CLOSED');
        const user = await db.getRepository(e.User).findOneByOrFail({ id: receipt.hiredUserId });
        assert.equal(user.role, 'EMPLOYEE');
        assert.equal(user.departmentId, job.departmentId);
        assert.equal(user.jobTitle, job.title);
        assert.equal(user.email, app.candidateEmail);
        const notification = h.automation.hireCalls.find((payload) => payload.userId === user.id);
        assert.ok(notification.tempPassword.length >= 24);
        assert.equal(await bcrypt.compare(notification.tempPassword, user.passwordHash), true);
        assert.equal(JSON.stringify(receipt).includes(notification.tempPassword), false);
        assert.equal(JSON.stringify(receipt).includes(user.passwordHash), false);
        const checklist = await db.getRepository(e.OnboardingTask).findBy({ userId: user.id });
        assert.equal(checklist.length, 5);
        assert.deepEqual(
          checklist.map((row) => row.dueDay).sort((a, b) => a - b),
          [1, 2, 3, 7, 30],
        );
        assert.ok(checklist.every((row) => !row.isCompleted));
        const detail = (await h.request('/applications/' + app.id, { who: 'hr' })).data;
        assert.equal(detail.status, 'HIRED');
        assert.equal(detail.hiredUserId, user.id);
        const board = (await h.request('/applications?jobId=' + job.id, { who: 'hr' })).data;
        assert.equal(board.items.find((row) => row.id === app.id).status, 'HIRED');
        assert.ok(board.counts.HIRED >= 1);
        const login = await h.request('/auth/login', {
          method: 'POST',
          body: { email: user.email, password: notification.tempPassword },
        });
        assert.equal(login.status, 201);
        assert.equal(login.data.user.role, 'EMPLOYEE');
        const calls = h.automation.hireCalls.length;
        const count = await tasks();
        const again = await hire(app, 'admin');
        assert.equal(again.data.alreadyHired, true);
        assert.equal(again.data.hiredUserId, user.id);
        assert.equal(again.data.welcomeEmailStatus, 'NOT_RETRIED');
        assert.equal(await tasks(), count);
        assert.equal(h.automation.hireCalls.length, calls);
      },
    );
    await t.test('concurrent clicks create one employee/checklist/dispatch', async () => {
      const app = await candidate();
      const before = await users();
      const count = await tasks();
      const calls = h.automation.hireCalls.length;
      const responses = await Promise.all([hire(app), hire(app)]);
      assert.deepEqual(
        responses.map((row) => row.status),
        [201, 201],
      );
      assert.deepEqual(responses.map((row) => row.data.alreadyHired).sort(), [false, true]);
      assert.equal(responses[0].data.hiredUserId, responses[1].data.hiredUserId);
      assert.equal(await users(), before + 1);
      assert.equal(await tasks(), count + 5);
      assert.equal(h.automation.hireCalls.length, calls + 1);
    });
    await t.test(
      'existing accounts are neither rebound nor sent a fabricated password',
      async () => {
        const app = await candidate({ email: h.users.hr.email });
        const before = await users();
        const count = await tasks();
        const calls = h.automation.hireCalls.length;
        assert.equal((await hire(app)).status, 409);
        assert.equal(
          (await db.getRepository(e.User).findOneByOrFail({ id: h.users.hr.id })).passwordHash,
          h.users.hr.passwordHash,
        );
        assert.equal(
          (await db.getRepository(e.Application).findOneByOrFail({ id: app.id })).status,
          'OFFERED',
        );
        assert.equal(await users(), before);
        assert.equal(await tasks(), count);
        assert.equal(h.automation.hireCalls.length, calls);
      },
    );
    await t.test(
      'two applications sharing email cannot create duplicate or orphan data',
      async () => {
        const secondJob = await db
          .getRepository(e.Job)
          .save({ ...job, id: undefined, title: 'Second position' });
        const email = 'same-hire@example.test';
        const apps = [await candidate({ email }), await candidate({ email, jobId: secondJob.id })];
        const before = await users();
        const count = await tasks();
        const responses = await Promise.all(apps.map((app) => hire(app)));
        assert.deepEqual(responses.map((row) => row.status).sort(), [201, 409]);
        assert.equal(await users(), before + 1);
        assert.equal(await tasks(), count + 5);
        const rows = await db.getRepository(e.Application).findBy({ candidateEmail: email });
        assert.deepEqual(rows.map((row) => row.status).sort(), ['HIRED', 'OFFERED']);
      },
    );
    await t.test(
      'task failure rolls back employee/status and never dispatches',
      async (context) => {
        const app = await candidate();
        const before = await users();
        const count = await tasks();
        const calls = h.automation.hireCalls.length;
        const save = Repository.prototype.save;
        context.mock.method(Repository.prototype, 'save', function (...args) {
          if (this.metadata.target === e.OnboardingTask)
            throw new Error('Synthetic task write failure');
          return save.apply(this, args);
        });
        assert.equal((await hire(app)).status, 500);
        assert.equal(await users(), before);
        assert.equal(await tasks(), count);
        assert.equal(h.automation.hireCalls.length, calls);
        const row = await db.getRepository(e.Application).findOneByOrFail({ id: app.id });
        assert.equal(row.status, 'OFFERED');
        assert.equal(row.hiredUserId, null);
      },
    );
    await t.test(
      'automation false/exception preserves completed provisioning with honest warning',
      async (context) => {
        h.automation.hireAccepted = false;
        const app = await candidate();
        const response = await hire(app);
        assert.equal(response.status, 201);
        assert.equal(response.data.welcomeEmailStatus, 'FAILED');
        const calls = h.automation.hireCalls.length;
        const replay = await hire(app);
        assert.equal(replay.data.alreadyHired, true);
        assert.equal(h.automation.hireCalls.length, calls);
        h.automation.hireAccepted = true;
        context.mock.method(h.automation, 'triggerEmployeeHired', async () => {
          throw new Error('Synthetic dispatcher failure');
        });
        const second = await candidate();
        const failed = await hire(second);
        assert.equal(failed.status, 201);
        assert.equal(failed.data.welcomeEmailStatus, 'FAILED');
        assert.equal(
          (await db.getRepository(e.Application).findOneByOrFail({ id: second.id })).status,
          'HIRED',
        );
        assert.equal(
          await db.getRepository(e.OnboardingTask).countBy({ userId: failed.data.hiredUserId }),
          5,
        );
      },
    );
  },
);
