const assert = require('node:assert/strict');
const test = require('node:test');
const { ConflictException, NotFoundException, BadRequestException } = require('@nestjs/common');
const {
  todayVietnamDate,
  normalizeJobDeadline,
  parseJobDeadlineInput,
  isJobDeadlineExpired,
} = require('../dist/modules/jobs/job-deadline.js');
const { JobsService } = require('../dist/modules/jobs/jobs.service.js');
const { ApplicationsService } = require('../dist/modules/applications/applications.service.js');
const { Job, JobStatus } = require('../dist/entities/job.entity.js');
const { Department } = require('../dist/entities/department.entity.js');
const { Application, ApplicationStatus } = require('../dist/entities/application.entity.js');
const { Offer } = require('../dist/entities/offer.entity.js');
const { Interview, InterviewResult } = require('../dist/entities/interview.entity.js');
const { User, UserRole } = require('../dist/entities/user.entity.js');
const { OnboardingTask } = require('../dist/entities/onboarding-task.entity.js');

test('job deadline helpers respect Vietnam calendar day across timezones', () => {
  const originalZone = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      // 2026-11-25T16:59:59Z is 2026-11-25 23:59:59 +07:00
      const beforeVnMidnight = new Date('2026-11-25T16:59:59Z');
      // 2026-11-25T17:00:00Z is 2026-11-26 00:00:00 +07:00
      const afterVnMidnight = new Date('2026-11-25T17:00:00Z');

      assert.equal(todayVietnamDate(beforeVnMidnight), '2026-11-25');
      assert.equal(todayVietnamDate(afterVnMidnight), '2026-11-26');

      assert.equal(isJobDeadlineExpired('2026-11-25', beforeVnMidnight), false);
      assert.equal(isJobDeadlineExpired('2026-11-25', afterVnMidnight), true);
      assert.equal(isJobDeadlineExpired('2026-11-24', beforeVnMidnight), true);
      assert.equal(isJobDeadlineExpired('2026-11-26', afterVnMidnight), false);
      assert.equal(isJobDeadlineExpired(null, afterVnMidnight), false);
      assert.equal(isJobDeadlineExpired(undefined, afterVnMidnight), false);
      assert.equal(isJobDeadlineExpired(new Date('2026-11-25T00:00:00.000Z'), afterVnMidnight), true);
    }

    assert.equal(normalizeJobDeadline(new Date('2026-12-01T00:00:00.000Z')), '2026-12-01');
    assert.equal(normalizeJobDeadline('2026-12-01'), '2026-12-01');
    assert.equal(normalizeJobDeadline(''), null);

    assert.equal(parseJobDeadlineInput('2026-12-31').toISOString(), '2026-12-31T00:00:00.000Z');
    for (const invalid of ['2026-02-29', '2026-02-30', '2026-04-31', 'not-a-date']) {
      assert.ok(Number.isNaN(parseJobDeadlineInput(invalid).getTime()), invalid);
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test('JobsService hides expired jobs publicly, rejects invalid deadlines, and includes hiredCount for ATS', async () => {
  const capturedWhere = [];
  const sampleJob = {
    id: 10,
    title: 'Backend Engineer',
    departmentId: 1,
    department: { id: 1, name: 'Kỹ thuật' },
    location: 'Hà Nội',
    salaryRange: '20-30 triệu',
    description: 'Build APIs',
    requirements: 'NestJS',
    headcount: 2,
    deadline: '2020-01-01',
    status: JobStatus.OPEN,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
  };

  const jobsRepo = {
    find: async (opts) => {
      capturedWhere.push(opts.where);
      return [sampleJob];
    },
    findOne: async () => sampleJob,
    create: (value) => value,
    save: async (value) => ({ ...value, id: 10 }),
  };

  const departmentsRepo = {
    existsBy: async () => true,
  };

  const appQb = {
    select() { return this; },
    addSelect() { return this; },
    where() { return this; },
    setParameter() { return this; },
    groupBy() { return this; },
    getRawMany: async () => [{ jobId: 10, applicationCount: '5', hiredCount: '1' }],
  };

  const db = {
    getRepository: (entity) => {
      if (entity === Application) {
        return { createQueryBuilder: () => appQb };
      }
      throw new Error('Unexpected repository: ' + entity?.name);
    },
  };

  const service = new JobsService(jobsRepo, departmentsRepo, {}, db);

  // Public findAll applies deadline filter on where clause
  await service.findAll(undefined);
  assert.equal(capturedWhere.length, 1);
  assert.equal(capturedWhere[0].status, JobStatus.OPEN);
  assert.ok(capturedWhere[0].deadline, 'public findAll must filter by deadline');

  // Public findById rejects expired OPEN job
  await assert.rejects(
    () => service.findById(10),
    (err) => err instanceof NotFoundException,
  );

  // Internal ATS findAll & findById still show expired job with applicationCount + hiredCount
  const hrActor = { id: 1, role: UserRole.HR, departmentId: 1 };
  const internalList = await service.findAll(hrActor);
  assert.equal(internalList[0].applicationCount, 5);
  assert.equal(internalList[0].hiredCount, 1);
  assert.equal(internalList[0].headcount, 2);

  const internalDetail = await service.findById(10, hrActor);
  assert.equal(internalDetail.hiredCount, 1);
  assert.equal(internalDetail.applicationCount, 5);

  // Invalid deadline rejected on create
  await assert.rejects(
    () =>
      service.create(
        {
          title: 'Test',
          departmentId: 1,
          description: 'Desc',
          requirements: 'Req',
          deadline: '2026-02-30',
        },
        1,
      ),
    (err) => err instanceof BadRequestException,
  );
});

test('ApplicationsService.apply returns 409 Conflict for expired job before saving CV', async () => {
  let savedFileCalled = false;
  const expiredJob = {
    id: 7,
    status: JobStatus.OPEN,
    deadline: '2020-01-01',
  };
  const db = {
    getRepository: (entity) => {
      if (entity === Job) {
        return { findOneBy: async () => expiredJob };
      }
      throw new Error('Unexpected repo');
    },
  };
  const files = {
    parse: async () => 'cv text',
    save: async () => {
      savedFileCalled = true;
      return 'should-not-save.pdf';
    },
    remove: async () => {},
  };

  const service = new ApplicationsService(
    {},
    db,
    files,
    {},
    {},
    {},
    { get: () => '' },
    {},
    {},
  );

  await assert.rejects(
    () =>
      service.apply(
        {
          jobId: 7,
          candidateName: 'Nguyen Van A',
          candidateEmail: 'a@example.test',
        },
        { originalname: 'cv.pdf', buffer: Buffer.from('%PDF') },
      ),
    (err) => err instanceof ConflictException && /hết hạn/i.test(err.message),
  );
  assert.equal(savedFileCalled, false);
});

test('ApplicationsService.hireCandidate auto-closes job only once hiredCount >= headcount', async () => {
  const hrActor = { id: 1, role: UserRole.HR, departmentId: 1 };

  async function runHireScenario({ headcount, existingHiredCount }) {
    const job = {
      id: 42,
      title: 'Senior NodeJS Engineer',
      departmentId: 3,
      status: JobStatus.OPEN,
      headcount,
      deadline: '2099-12-31',
      updatedAt: new Date('2026-11-20T00:00:00Z'),
    };
    const app = {
      id: 101,
      jobId: job.id,
      candidateName: 'Tran Thi B',
      candidateEmail: 'b@example.test',
      candidatePhone: '0901234567',
      status: ApplicationStatus.OFFERED,
      hiredUserId: null,
      updatedAt: new Date('2026-11-20T00:00:00Z'),
    };
    const jobsChangedCalls = [];
    const savedJobs = [];
    let hiredCountInDb = existingHiredCount;

    const manager = {
      getRepository: (entity) => {
        if (entity === Application) {
          return {
            findOne: async () => app,
            save: async (row) => {
              if (row.status === ApplicationStatus.HIRED) {
                hiredCountInDb += 1;
              }
              return row;
            },
            countBy: async ({ status }) => (status === ApplicationStatus.HIRED ? hiredCountInDb : 0),
          };
        }
        if (entity === Job) {
          return {
            findOneBy: async () => job,
            findOne: async () => job,
            save: async (row) => {
              savedJobs.push({ ...row });
              return row;
            },
          };
        }
        if (entity === Department) {
          return { findOneBy: async () => ({ id: 3, name: 'Kỹ thuật' }) };
        }
        if (entity === Offer) {
          return { findOne: async () => null };
        }
        if (entity === Interview) {
          return { findOne: async () => ({ id: 5, round: 1, result: InterviewResult.PASSED }) };
        }
        if (entity === User) {
          return {
            findOneBy: async () => null,
            create: (value) => value,
            save: async (value) => ({ ...value, id: 88 }),
          };
        }
        if (entity === OnboardingTask) {
          return {
            create: (value) => value,
            save: async (rows) => rows,
          };
        }
        throw new Error('Unexpected entity: ' + entity?.name);
      },
    };

    const db = { transaction: async (fn) => fn(manager) };
    const n8n = {
      triggerEmployeeHired: async () => true,
      triggerJobsChanged: async (payload) => {
        jobsChangedCalls.push(payload);
        return true;
      },
    };

    const service = new ApplicationsService({}, db, {}, {}, n8n, {}, { get: () => '' }, {}, {});
    const receipt = await service.hireCandidate(app.id, hrActor);
    return { receipt, job, savedJobs, jobsChangedCalls };
  }

  // Scenario 1: headcount = 2, hiring 1st candidate -> stays OPEN
  const first = await runHireScenario({ headcount: 2, existingHiredCount: 0 });
  assert.equal(first.receipt.jobAutoClosed, false);
  assert.equal(first.receipt.jobStatus, JobStatus.OPEN);
  assert.equal(first.receipt.hiredCount, 1);
  assert.equal(first.receipt.headcount, 2);
  assert.equal(first.receipt.jobAutoClosedMessage, null);
  assert.equal(first.job.status, JobStatus.OPEN);
  assert.equal(first.savedJobs.length, 0);
  assert.equal(first.jobsChangedCalls.length, 0);

  // Scenario 2: headcount = 2, hiring 2nd candidate -> auto-closes to CLOSED
  const second = await runHireScenario({ headcount: 2, existingHiredCount: 1 });
  assert.equal(second.receipt.jobAutoClosed, true);
  assert.equal(second.receipt.jobStatus, JobStatus.CLOSED);
  assert.equal(second.receipt.hiredCount, 2);
  assert.equal(second.receipt.headcount, 2);
  assert.match(second.receipt.jobAutoClosedMessage, /2\/2/);
  assert.equal(second.job.status, JobStatus.CLOSED);
  assert.equal(second.savedJobs.length, 1);
  assert.equal(second.jobsChangedCalls.length, 1);
  assert.equal(second.jobsChangedCalls[0].action, 'STATUS_CHANGED');
  assert.equal(second.jobsChangedCalls[0].job.status, JobStatus.CLOSED);
});
