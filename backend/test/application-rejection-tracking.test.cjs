const assert = require('node:assert/strict');
const test = require('node:test');
const { NotFoundException } = require('@nestjs/common');
const { ApplicationsService } = require('../dist/modules/applications/applications.service.js');
const { ApplicationAcknowledgementService } = require('../dist/modules/applications/application-acknowledgement.service.js');
const { N8nService } = require('../dist/modules/core/automation/n8n.service.js');
const { Application, ApplicationStatus, AiRecommendation } = require('../dist/entities/application.entity.js');
const { Department } = require('../dist/entities/department.entity.js');
const { Job, JobStatus } = require('../dist/entities/job.entity.js');
const { Interview, InterviewResult } = require('../dist/entities/interview.entity.js');
const { UserRole } = require('../dist/entities/user.entity.js');

function createFixture(options = {}) {
  const stores = new Map([
    [Department, [{ id: 1, name: 'Kỹ thuật phần mềm', code: 'ENG', managerId: null }]],
    [
      Job,
      [
        {
          id: 10,
          departmentId: 1,
          title: 'Senior Fullstack Engineer',
          location: 'Đà Nẵng (Hybrid)',
          status: JobStatus.OPEN,
          deadline: '2099-12-31',
        },
      ],
    ],
    [
      Application,
      [
        {
          id: 201,
          jobId: 10,
          candidateName: 'Nguyễn Minh Quân',
          candidateEmail: 'quan.nguyen@example.test',
          candidatePhone: '0901234567',
          trackingCode: 'APP-A1B2C3D4E5F6',
          rejectionReason: null,
          cvFileUrl: '11111111-1111-1111-1111-111111111111.pdf',
          rawCvText: 'Sensitive raw CV text with salary expectations',
          matchScore: 88.5,
          aiSummary: 'Internal AI summary: strong candidate',
          aiRecommendation: AiRecommendation.STRONG_HIRE,
          aiScoreStatus: 'COMPLETED',
          skillsDetected: ['TypeScript', 'NestJS', 'React'],
          status: ApplicationStatus.INTERVIEWING,
          hiredUserId: null,
          createdAt: new Date('2026-11-20T08:00:00Z'),
          updatedAt: new Date('2026-11-21T09:30:00Z'),
        },
      ],
    ],
    [
      Interview,
      [
        {
          id: 301,
          applicationId: 201,
          interviewerId: 3,
          round: 1,
          scheduledAt: new Date('2099-12-01T02:00:00Z'),
          meetingLink: 'https://meet.google.com/private-room',
          aiSuggestedQuestions: ['Private internal question 1'],
          score: 85,
          interviewerFeedback: 'Confidential interviewer feedback note',
          result: InterviewResult.PASSED,
          updatedAt: new Date('2026-11-21T09:00:00Z'),
        },
        {
          id: 302,
          applicationId: 201,
          interviewerId: 3,
          round: 2,
          scheduledAt: new Date('2099-12-05T07:00:00Z'),
          meetingLink: 'https://meet.google.com/private-room-2',
          aiSuggestedQuestions: ['Private round 2 question'],
          score: null,
          interviewerFeedback: null,
          result: InterviewResult.PENDING,
          updatedAt: new Date('2026-11-21T09:30:00Z'),
        },
      ],
    ],
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
          row.createdAt ||= new Date('2026-11-25T08:00:00Z');
          row.updatedAt ||= new Date('2026-11-25T08:00:00Z');
          rows.push(row);
        } else {
          const idx = rows.findIndex((r) => r.id === row.id);
          if (idx >= 0) rows[idx] = row;
          else rows.push(row);
        }
        return row;
      },
      async findOneBy(where) {
        return rows.find((row) => matches(row, where)) || null;
      },
      async findOne(opts = {}) {
        const matched = rows.filter((item) => matches(item, opts.where));
        const row = matched[0] || null;
        if (!row) return null;
        const copy = { ...row };
        if (entity === Job && opts.relations?.includes('department')) {
          copy.department = stores.get(Department).find((d) => d.id === copy.departmentId);
        }
        if (entity === Application && opts.relations) {
          const job = stores.get(Job).find((j) => j.id === copy.jobId);
          copy.job = job
            ? {
                ...job,
                ...(opts.relations.includes('job.department')
                  ? { department: stores.get(Department).find((d) => d.id === job.departmentId) }
                  : {}),
              }
            : undefined;
          copy.interviews = stores
            .get(Interview)
            .filter((i) => i.applicationId === copy.id)
            .map((i) => ({ ...i }));
        }
        return copy;
      },
    });
  }

  const db = {
    getRepository: (entity) => repositories.get(entity),
    transaction: async (fn) => fn(db),
  };

  const rejectedPayloads = [];
  const n8n = {
    async triggerApplicationRejected(payload) {
      rejectedPayloads.push(payload);
      if (options.n8nThrows) throw new Error('n8n timeout');
      return options.n8nReturns ?? true;
    },
  };
  const delivery = { views: async () => new Map() };
  const files = {
    async parse() {
      return 'Parsed candidate CV text';
    },
    async save() {
      return '22222222-2222-2222-2222-222222222222.pdf';
    },
    async remove() {},
  };
  const configValues = {
    PUBLIC_WEB_BASE_URL: 'https://ats.example.test',
    MAIL_FROM: 'hr@example.test',
    N8N_ACKNOWLEDGEMENT_ENABLED: 'true',
  };
  const config = { get: (key) => configValues[key] };
  const dispatchedAckIds = [];
  const acknowledgements = {
    async dispatch(applicationId) {
      dispatchedAckIds.push(applicationId);
    },
  };

  const service = new ApplicationsService(
    db.getRepository(Application),
    db,
    files,
    {},
    n8n,
    delivery,
    config,
    {},
    acknowledgements,
  );
  const hrActor = { id: 2, role: UserRole.HR, departmentId: 1 };
  return { service, stores, db, config, rejectedPayloads, dispatchedAckIds, hrActor };
}

test('SCRUM-28: apply() generates unique APP-* trackingCode, returns trackingPath/trackingUrl, and claim() exposes it for confirmation email', async () => {
  const { service, stores, db, config, dispatchedAckIds } = createFixture();
  const receipt = await service.apply(
    {
      jobId: 10,
      candidateName: 'Trần Thảo Vy',
      candidateEmail: 'vy.tran@example.test',
      candidatePhone: '0911222333',
    },
    {},
  );

  assert.match(receipt.trackingCode, /^APP-[A-F0-9]{12}$/);
  assert.equal(receipt.trackingPath, `/track/${receipt.trackingCode}`);
  assert.equal(receipt.trackingUrl, `https://ats.example.test/track/${receipt.trackingCode}`);
  assert.deepEqual(dispatchedAckIds, [receipt.applicationId]);

  const saved = stores.get(Application).find((a) => a.id === receipt.applicationId);
  assert.equal(saved.trackingCode, receipt.trackingCode);

  const ackService = new ApplicationAcknowledgementService(db, config, {
    async triggerApplicationCreated() {
      return true;
    },
  });
  const claimed = await ackService.claim(receipt.applicationId);
  assert.equal(claimed.shouldSend, true);
  assert.equal(claimed.trackingCode, receipt.trackingCode);
  assert.equal(claimed.trackingUrl, `https://ats.example.test/track/${receipt.trackingCode}`);
});

test('SCRUM-28: rejecting with sendRejectionEmail=true saves reason, triggers polite webhook with candidate/job info, and handles failures safely', async () => {
  const { service, stores, rejectedPayloads, hrActor } = createFixture();
  const updated = await service.status(
    201,
    {
      expectedStatus: ApplicationStatus.INTERVIEWING,
      status: ApplicationStatus.REJECTED,
      rejectionReason: 'Kinh nghiệm hệ thống phân tán chưa khớp yêu cầu hiện tại.',
      sendRejectionEmail: true,
    },
    hrActor,
  );

  assert.equal(updated.status, ApplicationStatus.REJECTED);
  assert.equal(
    updated.rejectionReason,
    'Kinh nghiệm hệ thống phân tán chưa khớp yêu cầu hiện tại.',
  );
  assert.equal(updated.rejectionEmailStatus, 'DISPATCHED_UNVERIFIED');
  assert.equal(rejectedPayloads.length, 1);
  assert.equal(rejectedPayloads[0].candidateName, 'Nguyễn Minh Quân');
  assert.equal(rejectedPayloads[0].candidateEmail, 'quan.nguyen@example.test');
  assert.equal(rejectedPayloads[0].jobTitle, 'Senior Fullstack Engineer');
  assert.equal(rejectedPayloads[0].departmentName, 'Kỹ thuật phần mềm');
  assert.equal(rejectedPayloads[0].trackingCode, 'APP-A1B2C3D4E5F6');
  assert.equal(
    rejectedPayloads[0].trackingUrl,
    'https://ats.example.test/track/APP-A1B2C3D4E5F6',
  );
  assert.equal(
    stores.get(Application)[0].rejectionReason,
    'Kinh nghiệm hệ thống phân tán chưa khớp yêu cầu hiện tại.',
  );

  // When n8n fails/throws, rejection still commits and reports FAILED
  const failing = createFixture({ n8nThrows: true });
  const failedEmailRes = await failing.service.status(
    201,
    {
      expectedStatus: ApplicationStatus.INTERVIEWING,
      status: ApplicationStatus.REJECTED,
      rejectionReason: 'Đã tuyển đủ ứng viên phù hợp hơn.',
      sendRejectionEmail: true,
    },
    hrActor,
  );
  assert.equal(failedEmailRes.status, ApplicationStatus.REJECTED);
  assert.equal(failedEmailRes.rejectionEmailStatus, 'FAILED');
});

test('SCRUM-28: rejecting with sendRejectionEmail=false saves reason and skips webhook', async () => {
  const { service, rejectedPayloads, hrActor } = createFixture();
  const updated = await service.status(
    201,
    {
      expectedStatus: ApplicationStatus.INTERVIEWING,
      status: ApplicationStatus.REJECTED,
      rejectionReason: 'Ứng viên rút hồ sơ',
      sendRejectionEmail: false,
    },
    hrActor,
  );

  assert.equal(updated.status, ApplicationStatus.REJECTED);
  assert.equal(updated.rejectionReason, 'Ứng viên rút hồ sơ');
  assert.equal(updated.rejectionEmailStatus, 'SKIPPED');
  assert.equal(rejectedPayloads.length, 0);
});

test('SCRUM-28: trackByCode() returns safe public status without leaking AI scores, feedback, rejectionReason, or PII', async () => {
  const { service, stores } = createFixture();
  // Case-insensitive & trimmed lookup
  const result = await service.trackByCode('  app-a1b2c3d4e5f6  ');

  assert.equal(result.trackingCode, 'APP-A1B2C3D4E5F6');
  assert.equal(result.candidateName, 'Nguyễn Minh Quân');
  assert.equal(result.jobTitle, 'Senior Fullstack Engineer');
  assert.equal(result.departmentName, 'Kỹ thuật phần mềm');
  assert.equal(result.location, 'Đà Nẵng (Hybrid)');
  assert.equal(result.status, ApplicationStatus.INTERVIEWING);
  assert.deepEqual(result.upcomingInterview, {
    round: 2,
    scheduledAt: new Date('2099-12-05T07:00:00Z'),
  });

  // Strict allowlist check: zero sensitive/AI/internal keys exposed
  const serialized = JSON.stringify(result);
  for (const forbiddenKey of [
    'matchScore',
    'aiSummary',
    'aiRecommendation',
    'aiScoreStatus',
    'skillsDetected',
    'rawCvText',
    'cvFileUrl',
    'interviewerFeedback',
    'aiSuggestedQuestions',
    'rejectionReason',
    'candidateEmail',
    'candidatePhone',
    'meetingLink',
    'hiredUserId',
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(result, forbiddenKey), false, forbiddenKey);
    assert.equal(serialized.includes(forbiddenKey), false, forbiddenKey);
  }
  assert.equal(serialized.includes('Confidential interviewer feedback'), false);
  assert.equal(serialized.includes('Internal AI summary'), false);

  // After rejection with an internal reason, public tracking updates status and hides upcomingInterview & rejectionReason
  stores.get(Application)[0].status = ApplicationStatus.REJECTED;
  stores.get(Application)[0].rejectionReason = 'Internal HR rejection note';
  const rejectedTrack = await service.trackByCode('APP-A1B2C3D4E5F6');
  assert.equal(rejectedTrack.status, ApplicationStatus.REJECTED);
  assert.equal(rejectedTrack.upcomingInterview, null);
  assert.equal(JSON.stringify(rejectedTrack).includes('Internal HR rejection note'), false);

  // Unknown or malformed tracking codes return 404 NotFoundException
  for (const badCode of ['', 'short', 'INVALID CODE!!', 'APP-000000000000']) {
    await assert.rejects(() => service.trackByCode(badCode), NotFoundException, badCode);
  }
});

test('SCRUM-28: N8nService.triggerApplicationRejected posts HTML-escaped polite email payload to /application-rejected', async () => {
  const originalFetch = global.fetch;
  let captured;
  global.fetch = async (url, init) => {
    captured = { url, init };
    return { ok: true, status: 200 };
  };
  try {
    const n8n = new N8nService({
      get: (key) =>
        ({
          N8N_WEBHOOK_URL: 'http://n8n.test/webhook/',
          N8N_AI_KEY: 'test-ai-key',
          MAIL_FROM: 'hr@company.test',
        })[key],
    });
    const ok = await n8n.triggerApplicationRejected({
      applicationId: 201,
      candidateName: 'Lê <script>alert(1)</script> An',
      candidateEmail: 'an@example.test',
      jobTitle: 'Backend Engineer',
      departmentName: 'Engineering',
      rejectionReason: 'Chưa khớp <b>Node.js</b>',
      trackingCode: 'APP-A1B2C3D4E5F6',
      trackingUrl: 'https://ats.example.test/track/APP-A1B2C3D4E5F6',
    });
    assert.equal(ok, true);
    assert.equal(captured.url, 'http://n8n.test/webhook/application-rejected');
    assert.equal(captured.init.headers['x-n8n-ai-key'], 'test-ai-key');
    const body = JSON.parse(captured.init.body);
    assert.match(body.subject, /Backend Engineer/);
    assert.match(body.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(body.html, /<script>/);
    assert.match(body.html, /&lt;b&gt;Node\.js&lt;\/b&gt;/);
    assert.match(body.html, /APP-A1B2C3D4E5F6/);
  } finally {
    global.fetch = originalFetch;
  }
});
