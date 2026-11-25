const assert = require('node:assert/strict');
const test = require('node:test');
const { ConflictException, BadRequestException } = require('@nestjs/common');
const { ApplicationsService } = require('../dist/modules/applications/applications.service.js');
const { Application, ApplicationStatus } = require('../dist/entities/application.entity.js');
const { Department } = require('../dist/entities/department.entity.js');
const { Job } = require('../dist/entities/job.entity.js');
const { Interview, InterviewResult } = require('../dist/entities/interview.entity.js');
const { InterviewDelivery } = require('../dist/modules/applications/interview-delivery.entity.js');
const { User, UserRole } = require('../dist/entities/user.entity.js');

function createFixture() {
  const stores = new Map([
    [Department, [{ id: 1, name: 'Kỹ thuật', code: 'ENG', managerId: null }]],
    [
      User,
      [
        {
          id: 2,
          fullName: 'HR Operator',
          email: 'hr@example.test',
          role: UserRole.HR,
          departmentId: 1,
          isActive: true,
        },
        {
          id: 3,
          fullName: 'Manager A',
          email: 'manager-a@example.test',
          role: UserRole.MANAGER,
          departmentId: 1,
          isActive: true,
        },
        {
          id: 4,
          fullName: 'Manager B',
          email: 'manager-b@example.test',
          role: UserRole.MANAGER,
          departmentId: 1,
          isActive: true,
        },
      ],
    ],
    [Job, [{ id: 10, departmentId: 1, title: 'Backend Engineer' }]],
    [
      Application,
      [
        {
          id: 101,
          jobId: 10,
          candidateName: 'Ứng viên 1',
          candidateEmail: 'uv1@example.test',
          status: ApplicationStatus.APPLIED,
          matchScore: null,
          updatedAt: new Date('2026-11-20T00:00:00Z'),
        },
        {
          id: 102,
          jobId: 10,
          candidateName: 'Ứng viên 2',
          candidateEmail: 'uv2@example.test',
          status: ApplicationStatus.APPLIED,
          matchScore: null,
          updatedAt: new Date('2026-11-20T00:00:00Z'),
        },
      ],
    ],
    [Interview, []],
    [InterviewDelivery, []],
  ]);

  const matches = (row, where) =>
    (Array.isArray(where) ? where : [where || {}]).some((cond) =>
      Object.entries(cond).every(([key, value]) => row[key] === value),
    );

  const repositories = new Map();
  for (const [entity, rows] of stores) {
    repositories.set(entity, {
      create: (data) => ({ ...data }),
      async save(row) {
        if (!row.id) {
          row.id = Math.max(0, ...rows.map((r) => r.id || 0)) + 1;
          row.updatedAt ||= new Date('2026-11-25T00:00:00Z');
          rows.push(row);
        } else {
          const idx = rows.findIndex((r) => r.id === row.id);
          if (idx >= 0) rows[idx] = row;
          else rows.push(row);
        }
        return row;
      },
      async find({ where } = {}) {
        return rows.filter((row) => matches(row, where));
      },
      async findOneBy(where) {
        return rows.find((row) => matches(row, where)) || null;
      },
      async findOne(options = {}) {
        let matched = rows.filter((item) => matches(item, options.where));
        if (options.order?.round === 'DESC') {
          matched = [...matched].sort((a, b) => b.round - a.round);
        }
        const row = matched[0] || null;
        if (row && entity === Job && options.relations) {
          row.department = stores.get(Department).find((d) => d.id === row.departmentId);
        }
        if (row && entity === Application && options.relations) {
          row.job = stores.get(Job).find((j) => j.id === row.jobId);
          row.interviews = stores
            .get(Interview)
            .filter((i) => i.applicationId === row.id)
            .map((i) => ({
              ...i,
              interviewer: stores.get(User).find((u) => u.id === i.interviewerId),
            }));
        }
        return row;
      },
      async delete(where) {
        for (let idx = rows.length - 1; idx >= 0; idx--) {
          if (matches(rows[idx], where)) rows.splice(idx, 1);
        }
        return { affected: 1 };
      },
      async countBy(where) {
        return rows.filter((row) => matches(row, where)).length;
      },
    });
  }

  const db = {
    getRepository: (entity) => repositories.get(entity),
    transaction: async (fn) => fn(db),
  };
  const n8nCalls = [];
  const preparedDeliveries = [];
  const delivery = {
    prepare: async (_m, payload) => {
      preparedDeliveries.push(payload);
      return { requestId: 'req-' + preparedDeliveries.length, token: 'tok', callbackUrl: 'http://localhost' };
    },
    views: async () => new Map(),
    dispatchFailed: async () => {},
  };
  const n8n = {
    triggerInterviewScheduled: async (payload) => {
      n8nCalls.push(payload);
      return true;
    },
  };
  const service = new ApplicationsService(
    db.getRepository(Application),
    db,
    {},
    {},
    n8n,
    delivery,
    { get: () => 'hr@company.test' },
    {},
    {},
  );
  const hrActor = { id: 2, role: UserRole.HR, departmentId: 1 };
  return { service, stores, n8nCalls, preparedDeliveries, hrActor };
}

test('SCRUM-25: blocks double-booking same interviewer within +/- 45 minutes and allows >= 45 minutes or another interviewer', async () => {
  const { service, hrActor } = createFixture();

  // Schedule candidate 101 with Manager A at 10:00Z
  const first = await service.schedule(
    101,
    { interviewerId: 3, round: 1, scheduledAt: '2099-05-01T10:00:00Z' },
    hrActor,
  );
  assert.equal(first.interview.round, 1);

  // Candidate 102 with SAME interviewer at conflicting times (10:00, 10:30, 09:16, 10:44) -> 409 Conflict
  for (const conflictingTime of [
    '2099-05-01T10:00:00Z',
    '2099-05-01T10:30:00Z',
    '2099-05-01T09:16:00Z',
    '2099-05-01T10:44:00Z',
  ]) {
    await assert.rejects(
      () =>
        service.schedule(
          102,
          { interviewerId: 3, round: 1, scheduledAt: conflictingTime },
          hrActor,
        ),
      (err) => err instanceof ConflictException && /45 phút/.test(err.message),
      conflictingTime,
    );
  }

  // Candidate 102 with DIFFERENT interviewer at exact same time 10:00Z -> allowed
  const differentInterviewer = await service.schedule(
    102,
    { interviewerId: 4, round: 1, scheduledAt: '2099-05-01T10:00:00Z' },
    hrActor,
  );
  assert.equal(differentInterviewer.interview.interviewerId, 4);

  // Back-to-back exactly +45 minutes with Manager A (10:45Z) -> allowed on reschedule
  const backToBack = await service.reschedule(
    differentInterviewer.interview.id,
    { interviewerId: 3, scheduledAt: '2099-05-01T10:45:00Z' },
    hrActor,
  );
  assert.equal(backToBack.interview.interviewerId, 3);
  assert.equal(new Date(backToBack.interview.scheduledAt).toISOString(), '2099-05-01T10:45:00.000Z');
});

test('SCRUM-25: HR reschedules round 1 in place without creating round 2, resets Meet link, and dispatches n8n', async () => {
  const { service, stores, n8nCalls, hrActor } = createFixture();

  const created = await service.schedule(
    101,
    { interviewerId: 3, round: 1, scheduledAt: '2099-06-01T03:00:00Z' },
    hrActor,
  );
  const interviewRow = stores.get(Interview)[0];
  interviewRow.meetingLink = 'https://meet.google.com/old-meet-lnk';
  interviewRow.googleCalendarEventId = 'old-event-id';

  // Shift round 1 by +20 minutes (must NOT conflict with itself!) and switch to Manager B
  const rescheduled = await service.reschedule(
    created.interview.id,
    { interviewerId: 4, scheduledAt: '2099-06-01T03:20:00Z' },
    hrActor,
  );

  assert.equal(stores.get(Interview).length, 1);
  assert.equal(rescheduled.interview.id, created.interview.id);
  assert.equal(rescheduled.interview.round, 1);
  assert.equal(rescheduled.interview.interviewerId, 4);
  assert.equal(new Date(rescheduled.interview.scheduledAt).toISOString(), '2099-06-01T03:20:00.000Z');
  assert.equal(rescheduled.interview.meetingLink, null);

  assert.equal(n8nCalls.length, 2);
  assert.equal(n8nCalls[1].action, 'RESCHEDULED');
  assert.equal(n8nCalls[1].previousEventId, 'old-event-id');
  assert.equal(n8nCalls[1].previousScheduledAt, '2099-06-01T03:00:00.000Z');

  // Cannot reschedule a past time
  await assert.rejects(
    () =>
      service.reschedule(
        created.interview.id,
        { scheduledAt: '2020-01-01T03:00:00Z' },
        hrActor,
      ),
    (err) => err instanceof BadRequestException,
  );

  // Cannot reschedule once graded (PASSED)
  interviewRow.result = InterviewResult.PASSED;
  await assert.rejects(
    () =>
      service.reschedule(
        created.interview.id,
        { scheduledAt: '2099-06-02T03:00:00Z' },
        hrActor,
      ),
    (err) => err instanceof ConflictException,
  );
});

test('SCRUM-25: cancelling last PENDING round reverts application to APPLIED; keeping earlier round preserves INTERVIEWING', async () => {
  const { service, stores, hrActor } = createFixture();

  // Case 1: Only round 1 PENDING -> cancel reverts status to APPLIED and frees time slot
  const r1 = await service.schedule(
    101,
    { interviewerId: 3, round: 1, scheduledAt: '2099-07-01T09:00:00Z' },
    hrActor,
  );
  assert.equal(stores.get(Application)[0].status, ApplicationStatus.INTERVIEWING);

  const cancelled = await service.cancelInterview(r1.interview.id, hrActor);
  assert.equal(cancelled.revertedToApplied, true);
  assert.equal(cancelled.remainingInterviewsCount, 0);
  assert.equal(cancelled.applicationStatus, ApplicationStatus.APPLIED);
  assert.equal(stores.get(Application)[0].status, ApplicationStatus.APPLIED);
  assert.equal(stores.get(Interview).length, 0);

  // Slot 09:00Z is now free for candidate 102 with Manager A
  const freed = await service.schedule(
    102,
    { interviewerId: 3, round: 1, scheduledAt: '2099-07-01T09:00:00Z' },
    hrActor,
  );
  assert.equal(freed.interview.applicationId, 102);

  // Case 2: Candidate 102 has round 1 PASSED + round 2 PENDING -> cancel round 2 keeps INTERVIEWING
  stores.get(Interview)[0].result = InterviewResult.PASSED;
  const r2 = await service.schedule(
    102,
    { interviewerId: 4, round: 2, scheduledAt: '2099-07-02T09:00:00Z' },
    hrActor,
  );

  // Cannot cancel PASSED round 1
  await assert.rejects(
    () => service.cancelInterview(freed.interview.id, hrActor),
    (err) => err instanceof ConflictException,
  );

  // Cancelling PENDING round 2 succeeds and keeps application INTERVIEWING
  const cancelledR2 = await service.cancelInterview(r2.interview.id, hrActor);
  assert.equal(cancelledR2.revertedToApplied, false);
  assert.equal(cancelledR2.remainingInterviewsCount, 1);
  assert.equal(cancelledR2.applicationStatus, ApplicationStatus.INTERVIEWING);
});
