const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readdir, readFile } = require('node:fs/promises');
const { startHarness, pdf } = require('./recruitment-harness.cjs');
const { RecruitmentAiService } = require('../dist/modules/jobs/recruitment-ai.service');
const { CvStorageService } = require('../dist/modules/applications/cv-storage.service');
const { SubmitRateGuard } = require('../dist/modules/applications/submit-rate.guard');
const { ApplicationsService } = require('../dist/modules/applications/applications.service');
const { assertStatusTransition } = require('../dist/modules/jobs/recruitment.policy');
const envelope = (data, mode = 'LIVE') => ({ ok: true, mode, data });
const score = {
  matchScore: 85,
  summary: 'Matching technical experience',
  skillsDetected: ['TypeScript'],
};

test('recruitment policies and SDK contracts', async (t) => {
  await t.test('generic PATCH cannot bypass interview or Hire', () => {
    for (const from of ['APPLIED', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED'])
      for (const to of ['INTERVIEWING', 'HIRED'])
        assert.throws(() => assertStatusTransition(from, to));
    assertStatusTransition('APPLIED', 'REJECTED');
    assertStatusTransition('INTERVIEWING', 'OFFERED');
  });
  await t.test('missing SDK explicitly unavailable', async () => {
    await assert.rejects(
      new RecruitmentAiService({}).score('CV', 'JD'),
      (e) => e.getStatus() === 503,
    );
  });
  await t.test('invalid AI scores and unknown provenance rejected', async () => {
    for (const value of [null, NaN, -1, 101, '85'])
      await assert.rejects(
        new RecruitmentAiService({
          scoreResume: async () => envelope({ ...score, matchScore: value }),
        }).score('CV', 'JD'),
        (e) => e.getStatus() === 502,
      );
    await assert.rejects(
      new RecruitmentAiService({ scoreResume: async () => score }).score('CV', 'JD'),
    );
  });
  await t.test('JD and question schema, bounded output, sanitized provider errors', async () => {
    const ai = new RecruitmentAiService({
      generateJobDescription: async () =>
        envelope({ description: 'Draft', requirements: 'Skills', benefits: '' }),
      generateInterviewQuestions: async () => envelope({ questions: ['One?', 'Two?', 'Three?'] }),
    });
    assert.equal((await ai.jd('a', 'b', 'c')).data.description, 'Draft');
    assert.equal((await ai.questions('a', 'b')).data.length, 3);
    await assert.rejects(
      new RecruitmentAiService({
        generateInterviewQuestions: async () => envelope({ questions: ['One?'] }),
      }).questions('a', 'b'),
    );
    await assert.rejects(
      new RecruitmentAiService({
        scoreResume: async () => {
          throw new Error('PRIVATE_PROVIDER_DETAIL');
        },
      }).score('a', 'b'),
      (e) => e.getStatus() === 502 && !e.message.includes('PRIVATE'),
    );
  });
  await t.test('lead SDK aiGenerated maps provenance, arrays and question objects', async () => {
    for (const live of [false, true]) {
      const ai = new RecruitmentAiService({
        generateJobDescription: async () => ({
          aiGenerated: live,
          summary: 'Role summary',
          responsibilities: ['Build APIs'],
          requirements: ['TypeScript'],
          benefits: ['Training'],
        }),
        scoreResume: async () => ({
          aiGenerated: live,
          matchScore: 82.5,
          summary: 'CV review',
          matchedSkills: ['SQL'],
        }),
        generateInterviewQuestions: async () => ({
          aiGenerated: live,
          questions: [{ question: 'One?' }, { question: 'Two?' }, { question: 'Three?' }],
        }),
      });
      const jd = await ai.jd('Backend', 'Engineering', 'Middle');
      assert.equal(jd.mode, live ? 'LIVE' : 'MOCK');
      assert.match(jd.data.description, /Build APIs/);
      assert.equal(jd.data.requirements, '- TypeScript');
      assert.equal((await ai.score('CV', 'JD')).data.matchScore, 82.5);
      assert.deepEqual((await ai.questions('CV', 'JD')).data, ['One?', 'Two?', 'Three?']);
    }
    await assert.rejects(
      new RecruitmentAiService({
        generateJobDescription: async () => ({
          aiGenerated: true,
          summary: 'JD',
          responsibilities: ['Tasks'],
          requirements: [null],
          benefits: [],
        }),
      }).jd('a', 'b', 'c'),
    );
  });
  await t.test('actual lead SDK without a key returns labelled MOCK previews', async () => {
    const { ConfigService } = require('@nestjs/config');
    const { GeminiService } = require('../dist/modules/core/ai/gemini.service');
    const config = new ConfigService({ GEMINI_API_KEY: '' });
    const ai = new RecruitmentAiService(new GeminiService(config));
    for (const result of [
      await ai.jd('Backend Engineer', 'Engineering', 'Middle'),
      await ai.score('TypeScript MySQL', 'Build APIs'),
      await ai.questions('TypeScript MySQL', 'Build APIs'),
    ]) {
      assert.equal(result.mode, 'MOCK');
    }
  });
  await t.test('AI timeout returns 503 without waiting indefinitely', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const pending = new RecruitmentAiService({ scoreResume: () => new Promise(() => {}) }).score(
      'CV',
      'JD',
    );
    const rejection = assert.rejects(pending, (e) => e.getStatus() === 503);
    context.mock.timers.tick(45001);
    await rejection;
  });
  await t.test(
    'CV required, extension, MIME, signature, size and corrupt PDF rejected',
    async () => {
      const storage = new CvStorageService();
      const valid = {
        originalname: 'cv.pdf',
        mimetype: 'application/pdf',
        size: pdf().length,
        buffer: pdf(),
      };
      for (const file of [
        undefined,
        { ...valid, originalname: 'cv.exe' },
        { ...valid, mimetype: 'text/plain' },
        { ...valid, size: 6 * 1024 * 1024 },
        { ...valid, buffer: Buffer.from('fake') },
        { ...valid, buffer: Buffer.from('%PDF-corrupt') },
      ])
        await assert.rejects(storage.parse(file));
      assert.match(await storage.parse(valid), /TypeScript/);
      assert.equal(await storage.parse({ ...valid, buffer: pdf(''), size: pdf('').length }), null);
      for (const name of ['cv-text.pdf', 'cv-vietnamese.pdf', 'cv-scan.pdf']) {
        const buffer = await readFile(require('node:path').join(__dirname, 'fixtures', name));
        const parsed = await storage.parse({ ...valid, buffer, size: buffer.length });
        if (name === 'cv-scan.pdf') assert.equal(parsed, null);
        else
          assert.match(parsed, name === 'cv-vietnamese.pdf' ? /Kỹ năng lập trình/ : /TypeScript/);
      }
      await assert.rejects(storage.read('../../secret'));
    },
  );
  await t.test('submission rate guard caps attempts and expires window', (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: 1000 });
    const guard = new SubmitRateGuard();
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ ip: '127.0.0.1' }) }) };
    for (let i = 0; i < 10; i++) assert.equal(guard.canActivate(ctx), true);
    assert.throws(
      () => guard.canActivate(ctx),
      (e) => e.getStatus() === 429,
    );
    context.mock.timers.tick(60001);
    assert.equal(guard.canActivate(ctx), true);
  });
});

test(
  'recruitment HTTP + real MySQL integration (AI/n8n are contract stubs)',
  { timeout: 120000 },
  async (t) => {
    const h = await startHarness();
    t.after(() => h.close());
    const { request: req, db, entities: e } = h;
    let job, candidate, interview;
    const jobInput = {
      title: 'Backend Engineer',
      departmentId: h.departments[0].id,
      description: 'Build APIs',
      requirements: 'TypeScript MySQL',
      location: 'HCM',
      salaryRange: 'Negotiable',
    };
    await t.test('real password login rejects wrong password', async () => {
      assert.equal(
        (
          await req('/auth/login', {
            method: 'POST',
            body: { email: 'hr@example.test', password: 'wrong' },
          })
        ).status,
        401,
      );
    });
    await t.test('protected APIs require auth and reject employee/manager mutations', async () => {
      assert.equal((await req('/jobs/admin')).status, 401);
      assert.equal((await req('/jobs/admin', { who: 'employee' })).status, 403);
      assert.equal(
        (await req('/jobs', { who: 'manager', method: 'POST', body: jobInput })).status,
        403,
      );
    });
    await t.test('create validates DTO, rejects mass assignment and null location', async () => {
      for (const body of [
        { ...jobInput, createdBy: h.users.manager.id },
        { ...jobInput, departmentId: 999999 },
        { ...jobInput, title: ' ' },
        { ...jobInput, location: null },
      ])
        assert.equal((await req('/jobs', { who: 'hr', method: 'POST', body })).status, 400);
      const result = await req('/jobs', { who: 'hr', method: 'POST', body: jobInput });
      assert.equal(result.status, 201);
      job = result.data;
      assert.equal(job.departmentName, 'Engineering Test');
    });
    await t.test('public search/filter/paging and manager department scoping', async () => {
      assert.equal((await req('/jobs?q=Backend&location=HCM&page=1&pageSize=1')).data.total, 1);
      assert.equal((await req('/jobs?q=Absent&page=1&pageSize=20')).data.total, 0);
      assert.equal((await req('/jobs/filters')).data.departments[0].id, job.departmentId);
      assert.equal((await req('/jobs/admin?page=1&pageSize=20', { who: 'other' })).data.total, 0);
      assert.equal((await req('/jobs/admin/' + job.id, { who: 'other' })).status, 404);
      assert.equal((await req('/jobs?pageSize=1000')).status, 400);
      assert.equal((await req('/jobs?all=true')).status, 400);
    });
    await t.test('close hides public detail; stale writes cannot reopen silently', async () => {
      const body = { status: 'CLOSED', expectedUpdatedAt: job.updatedAt };
      const closed = await req('/jobs/' + job.id + '/status', { who: 'hr', method: 'PATCH', body });
      assert.equal(closed.status, 200);
      assert.equal((await req('/jobs/' + job.id)).status, 404);
      assert.equal((await req('/jobs')).data.length, 0);
      assert.equal(
        (await req('/jobs/' + job.id + '/status', { who: 'hr', method: 'PATCH', body })).status,
        409,
      );
      assert.equal(
        (
          await req('/applications/apply', {
            method: 'POST',
            body: h.upload(job.id, 'closed@example.test'),
          })
        ).status,
        404,
      );
      job = (
        await req('/jobs/' + job.id + '/status', {
          who: 'hr',
          method: 'PATCH',
          body: { status: 'OPEN', expectedUpdatedAt: closed.data.updatedAt },
        })
      ).data;
    });
    await t.test(
      'multipart CV creates private file, extracted text, normalized email and minimal receipt',
      async () => {
        const result = await req('/applications/apply', {
          method: 'POST',
          body: h.upload(job.id, 'Candidate@EXAMPLE.test'),
        });
        assert.equal(result.status, 201, JSON.stringify(result.data));
        assert.equal(result.data.warning, null);
        assert.equal(result.data.rawCvText, undefined);
        candidate = await db
          .getRepository(e.Application)
          .findOneByOrFail({ id: result.data.applicationId });
        assert.equal(candidate.candidateEmail, 'candidate@example.test');
        assert.match(candidate.rawCvText, /TypeScript/);
        assert.equal(candidate.matchScore, null);
        assert.equal((await readdir(h.directory)).length, 1);
      },
    );
    await t.test(
      'duplicate/concurrent submission stores one row and cleans rolled-back files',
      async () => {
        assert.equal(
          (
            await req('/applications/apply', {
              method: 'POST',
              body: h.upload(job.id, 'CANDIDATE@example.test'),
            })
          ).status,
          409,
        );
        const results = await Promise.all(
          [1, 2].map(() =>
            req('/applications/apply', {
              method: 'POST',
              body: h.upload(job.id, 'concurrent@example.test'),
            }),
          ),
        );
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
        assert.equal((await readdir(h.directory)).length, 2);
        assert.equal(await db.getRepository(e.Application).count(), 2);
      },
    );
    await t.test('multipart rejects arbitrary CV URL/text and oversized file', async () => {
      assert.equal(
        (
          await req('/applications/apply', {
            method: 'POST',
            body: {
              jobId: job.id,
              candidateName: 'A',
              candidateEmail: 'a@example.test',
              cvFileUrl: 'http://127.0.0.1',
              rawCvText: 'fake',
            },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await req('/applications/apply', {
            method: 'POST',
            body: h.upload(job.id, 'large@example.test', Buffer.alloc(6 * 1024 * 1024)),
          })
        ).status,
        413,
      );
    });
    await t.test(
      'list/detail/CV enforce department and omit private storage/text/user fields',
      async () => {
        for (const path of [
          '/applications?jobId=' + job.id,
          '/applications/' + candidate.id,
          '/applications/' + candidate.id + '/cv',
        ]) {
          assert.equal((await req(path, { who: 'other' })).status, 404);
          assert.equal((await req(path, { who: 'employee' })).status, 403);
        }
        const detail = (await req('/applications/' + candidate.id, { who: 'manager' })).data;
        for (const key of ['rawCvText', 'cvFileUrl', 'passwordHash'])
          assert.equal(detail[key], undefined);
        const file = await req('/applications/' + candidate.id + '/cv', { who: 'hr', raw: true });
        assert.equal(file.status, 200);
        assert.equal(file.headers.get('content-type'), 'application/pdf');
        assert.deepEqual(file.data, pdf());
        assert.equal((await req('/applications', { who: 'hr' })).status, 400);
        const page = (await req('/applications?jobId=' + job.id + '&pageSize=1', { who: 'hr' }))
          .data;
        assert.equal(page.items.length, 1);
        assert.equal(page.total, 2);
        assert.equal(page.counts.APPLIED, 2);
      },
    );
    await t.test(
      'admin job counts, state filter and lookups remain scoped and private',
      async () => {
        const page = await req('/jobs/admin?page=1&pageSize=10&status=OPEN', { who: 'manager' });
        assert.equal(page.status, 200);
        assert.equal(page.data.items[0].applicationCount, 2);
        assert.equal(
          (await req('/jobs/admin?page=1&pageSize=10&status=CLOSED', { who: 'hr' })).data.total,
          0,
        );
        assert.equal((await req('/jobs/admin?status[]=OPEN', { who: 'hr' })).status, 400);
        assert.equal((await req('/jobs/departments')).status, 401);
        assert.equal((await req('/jobs/departments', { who: 'manager' })).status, 403);
        const departments = (await req('/jobs/departments', { who: 'hr' })).data;
        assert.deepEqual(Object.keys(departments[0]).sort(), ['code', 'id', 'managerId', 'name']);
        const capabilities = (await req('/jobs/capabilities', { who: 'manager' })).data;
        assert.equal(capabilities.hire, true);
        assert.equal(capabilities.jd, false);
      },
    );
    await t.test('cannot transfer department after receiving candidates', async () => {
      assert.equal(
        (
          await req('/jobs/' + job.id, {
            who: 'hr',
            method: 'PATCH',
            body: {
              ...jobInput,
              departmentId: h.departments[1].id,
              expectedUpdatedAt: job.updatedAt,
            },
          })
        ).status,
        400,
      );
    });
    await t.test('SDK absent is 503; MOCK score preview does not mutate persistence', async () => {
      assert.equal(
        (await req('/applications/' + candidate.id + '/score', { method: 'POST', who: 'hr' }))
          .status,
        503,
      );
      h.sdk.scoreResume = async () => envelope(score, 'MOCK');
      const result = await req('/applications/' + candidate.id + '/score', {
        method: 'POST',
        who: 'hr',
      });
      assert.equal(result.data.saved, false);
      assert.equal(
        (await db.getRepository(e.Application).findOneByOrFail({ id: candidate.id })).matchScore,
        null,
      );
    });
    await t.test(
      'LIVE contract stub score persists, filters by score and computes recommendation',
      async () => {
        h.sdk.scoreResume = async () => envelope(score);
        assert.equal(
          (await req('/applications/' + candidate.id + '/score', { method: 'POST', who: 'hr' }))
            .data.saved,
          true,
        );
        const app = await db.getRepository(e.Application).findOneByOrFail({ id: candidate.id });
        assert.equal(Number(app.matchScore), 85);
        assert.equal(app.aiRecommendation, 'STRONG_HIRE');
        assert.equal(
          (await req('/applications?jobId=' + job.id + '&minScore=80', { who: 'hr' })).data.total,
          1,
        );
      },
    );
    await t.test(
      'in-flight duplicate score rejected and stale JD result cannot overwrite',
      async () => {
        let release, entered;
        const started = new Promise((resolve) => {
          entered = resolve;
        });
        h.sdk.scoreResume = () => {
          entered();
          return new Promise((resolve) => {
            release = resolve;
          });
        };
        const service = h.app.get(ApplicationsService);
        const pending = service.score(candidate.id, h.users.hr);
        const rejected = assert.rejects(pending, (error) => error.getStatus() === 409);
        await started;
        await assert.rejects(
          service.score(candidate.id, h.users.hr),
          (error) => error.getStatus() === 409,
        );
        await db.getRepository(e.Job).update(job.id, { requirements: 'Changed requirements' });
        release(envelope(score));
        await rejected;
        h.sdk.scoreResume = async () => envelope(score);
      },
    );
    await t.test('state endpoint cannot bypass interview/Hire', async () => {
      for (const status of ['INTERVIEWING', 'OFFERED', 'HIRED'])
        assert.equal(
          (
            await req('/applications/' + candidate.id + '/status', {
              who: 'hr',
              method: 'PATCH',
              body: { expectedStatus: 'APPLIED', status },
            })
          ).status,
          409,
        );
    });
    await t.test(
      'schedule validates future timezone, department and contiguous round',
      async () => {
        const scheduledAt = new Date(Date.now() + 86400000)
          .toISOString()
          .replace(/\.\d{3}Z$/, '.000Z');
        const valid = { interviewerId: h.users.manager.id, scheduledAt, round: 1 };
        for (const body of [
          { ...valid, scheduledAt: '2020-01-01T12:00:00Z' },
          { ...valid, scheduledAt: '2099-01-01T12:00:00' },
          { ...valid, interviewerId: h.users.other.id },
        ])
          assert.equal(
            (
              await req('/applications/' + candidate.id + '/interview', {
                who: 'hr',
                method: 'POST',
                body,
              })
            ).status,
            400,
          );
        assert.equal(
          (
            await req('/applications/' + candidate.id + '/interview', {
              who: 'hr',
              method: 'POST',
              body: { ...valid, round: 3 },
            })
          ).status,
          409,
        );
        const results = await Promise.all(
          [1, 2].map(() =>
            req('/applications/' + candidate.id + '/interview', {
              who: 'hr',
              method: 'POST',
              body: valid,
            }),
          ),
        );
        assert.ok(
          results.every((r) => r.status === 201),
          JSON.stringify(results),
        );
        assert.deepEqual(results.map((r) => r.data.dispatch).sort(), ['NOT_RETRIED', 'UNVERIFIED']);
        assert.equal(await db.getRepository(e.Interview).count(), 1);
        assert.equal(h.automation.calls.length, 1);
        interview = results[0].data.interview;
        assert.equal(
          (await req('/applications/' + candidate.id, { who: 'hr' })).data.status,
          'INTERVIEWING',
        );
      },
    );
    await t.test('AI questions use snapshot, MOCK never persists', async () => {
      h.sdk.generateInterviewQuestions = async () =>
        envelope({ questions: ['One?', 'Two?', 'Three?'] }, 'MOCK');
      assert.equal(
        (
          await req('/applications/interviews/' + interview.id + '/questions', {
            who: 'hr',
            method: 'POST',
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await req('/applications/interviews/' + interview.id + '/questions', {
            who: 'manager',
            method: 'POST',
          })
        ).data.saved,
        false,
      );
      assert.equal(
        (await db.getRepository(e.Interview).findOneByOrFail({ id: interview.id }))
          .aiSuggestedQuestions,
        null,
      );
      h.sdk.generateInterviewQuestions = async () =>
        envelope({ questions: ['One?', 'Two?', 'Three?'] });
      assert.equal(
        (
          await req('/applications/interviews/' + interview.id + '/questions', {
            who: 'manager',
            method: 'POST',
          })
        ).data.saved,
        true,
      );
      interview = (await req('/applications/' + candidate.id, { who: 'hr' })).data.interviews[0];
      assert.equal(interview.questions.length, 3);
    });
    await t.test(
      'duplicate question generation is rejected and failures release the lock',
      async () => {
        let release, entered;
        const started = new Promise((resolve) => {
          entered = resolve;
        });
        h.sdk.generateInterviewQuestions = () => {
          entered();
          return new Promise((resolve) => {
            release = resolve;
          });
        };
        const service = h.app.get(ApplicationsService);
        const pending = service.questions(interview.id, h.users.manager);
        await started;
        try {
          await assert.rejects(
            service.questions(interview.id, h.users.manager),
            (error) => error.getStatus() === 409,
          );
        } finally {
          release(envelope({ questions: ['One?', 'Two?', 'Three?'] }, 'MOCK'));
        }
        assert.equal((await pending).saved, false);
        h.sdk.generateInterviewQuestions = async () => {
          throw new Error('Temporary provider failure');
        };
        await assert.rejects(
          service.questions(interview.id, h.users.manager),
          (error) => error.getStatus() === 502,
        );
        h.sdk.generateInterviewQuestions = async () =>
          envelope({ questions: ['One?', 'Two?', 'Three?'] }, 'MOCK');
        assert.equal((await service.questions(interview.id, h.users.manager)).saved, false);
      },
    );
    await t.test('late AI questions cannot overwrite revised interview', async () => {
      let release, entered;
      const started = new Promise((resolve) => {
        entered = resolve;
      });
      h.sdk.generateInterviewQuestions = () => {
        entered();
        return new Promise((resolve) => {
          release = resolve;
        });
      };
      const pending = h.app.get(ApplicationsService).questions(interview.id, h.users.manager);
      const rejected = assert.rejects(pending, (error) => error.getStatus() === 409);
      await started;
      await db.getRepository(e.Interview).update(interview.id, {
        updatedAt: new Date(new Date(interview.updatedAt).getTime() + 1000),
      });
      release(envelope({ questions: ['Late one?', 'Late two?', 'Late three?'] }));
      await rejected;
      interview = (await req('/applications/' + candidate.id, { who: 'hr' })).data.interviews[0];
      assert.equal(interview.questions[0], 'One?');
    });
    await t.test(
      'result only assigned Manager; validation and stale concurrent writes',
      async () => {
        const body = {
          score: 88,
          feedback: 'Strong implementation',
          result: 'PASSED',
          expectedResult: interview.result,
          expectedUpdatedAt: interview.updatedAt,
        };
        const path = '/applications/interviews/' + interview.id + '/result';
        assert.equal((await req(path, { who: 'hr', method: 'PATCH', body })).status, 403);
        assert.equal((await req(path, { who: 'peer', method: 'PATCH', body })).status, 403);
        assert.equal((await req(path, { who: 'other', method: 'PATCH', body })).status, 403);
        for (const invalid of [
          { ...body, score: 101 },
          { ...body, feedback: ' ' },
          { ...body, result: 'PENDING' },
        ])
          assert.equal(
            (await req(path, { who: 'manager', method: 'PATCH', body: invalid })).status,
            400,
          );
        const results = await Promise.all(
          [1, 2].map(() => req(path, { who: 'manager', method: 'PATCH', body })),
        );
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        const detail = (await req('/applications/' + candidate.id, { who: 'hr' })).data;
        assert.equal(detail.interviews[0].score, 88);
      },
    );
    await t.test(
      'OFFERED follows passing result; Hire provisions user and five tasks',
      async () => {
        const usersBefore = await db.getRepository(e.User).count();
        const tasksBefore = await db.getRepository(e.OnboardingTask).count();
        assert.equal(
          (
            await req('/applications/' + candidate.id + '/status', {
              who: 'hr',
              method: 'PATCH',
              body: { expectedStatus: 'INTERVIEWING', status: 'OFFERED' },
            })
          ).status,
          200,
        );
        const hired = await req('/applications/' + candidate.id + '/hire', {
          who: 'hr',
          method: 'POST',
        });
        assert.equal(hired.status, 201);
        assert.equal(hired.data.onboardingTasksCount, 5);
        assert.equal(hired.data.welcomeEmailStatus, 'DISPATCHED_UNVERIFIED');
        assert.equal(await db.getRepository(e.User).count(), usersBefore + 1);
        assert.equal(await db.getRepository(e.OnboardingTask).count(), tasksBefore + 5);
        assert.equal(
          (await req('/applications/' + candidate.id, { who: 'hr' })).data.status,
          'HIRED',
        );
        assert.equal(
          (
            await req('/applications/interviews/' + interview.id + '/questions', {
              who: 'manager',
              method: 'POST',
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      'rejected applications have separate filter and no further score/schedule/result',
      async () => {
        assert.equal(
          (
            await req('/applications/' + candidate.id + '/status', {
              who: 'hr',
              method: 'PATCH',
              body: { expectedStatus: 'HIRED', status: 'REJECTED' },
            })
          ).status,
          409,
        );
        const rejected = await db.getRepository(e.Application).save({
          jobId: job.id,
          candidateName: 'Separate rejection fixture',
          candidateEmail: 'reject@example.test',
          cvFileUrl: 'fixture-no-cv',
          rawCvText: 'Synthetic CV',
          status: 'OFFERED',
        });
        const rejectedInterview = await db.getRepository(e.Interview).save({
          applicationId: rejected.id,
          interviewerId: h.users.manager.id,
          round: 1,
          scheduledAt: new Date('2026-10-01T02:00:00Z'),
          result: 'PASSED',
          score: 80,
        });
        assert.equal(
          (
            await req('/applications/' + rejected.id + '/status', {
              who: 'hr',
              method: 'PATCH',
              body: { expectedStatus: 'OFFERED', status: 'REJECTED' },
            })
          ).status,
          200,
        );
        assert.equal((await req('/applications?jobId=' + job.id, { who: 'hr' })).data.total, 2);
        assert.equal(
          (await req('/applications?jobId=' + job.id + '&status=REJECTED', { who: 'hr' })).data
            .total,
          1,
        );
        assert.equal(
          (await req('/applications/' + rejected.id + '/score', { who: 'hr', method: 'POST' }))
            .status,
          409,
        );
        assert.equal(
          (
            await req('/applications/' + rejected.id + '/interview', {
              who: 'hr',
              method: 'POST',
              body: {
                interviewerId: h.users.manager.id,
                scheduledAt: '2099-01-01T03:30:00Z',
                round: 2,
              },
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req('/applications/interviews/' + rejectedInterview.id + '/result', {
              who: 'manager',
              method: 'PATCH',
              body: {
                score: 1,
                feedback: 'Stale',
                result: 'FAILED',
                expectedResult: 'PASSED',
                expectedUpdatedAt: rejectedInterview.updatedAt,
              },
            })
          ).status,
          409,
        );
      },
    );
    await t.test('automation false keeps saved interview and does not claim delivery', async () => {
      const next = await db
        .getRepository(e.Application)
        .findOneByOrFail({ candidateEmail: 'concurrent@example.test' });
      h.automation.accepted = false;
      const result = await req('/applications/' + next.id + '/interview', {
        method: 'POST',
        who: 'hr',
        body: { interviewerId: h.users.manager.id, round: 1, scheduledAt: '2099-01-01T03:30:00Z' },
      });
      assert.equal(result.status, 201);
      assert.equal(result.data.dispatch, 'FAILED');
      assert.equal(
        (await db.getRepository(e.Application).findOneByOrFail({ id: next.id })).status,
        'INTERVIEWING',
      );
    });
    await t.test(
      'job closes during parsing/storage: recheck and rollback remove new file',
      async (context) => {
        const target = (
          await req('/jobs', {
            who: 'hr',
            method: 'POST',
            body: { ...jobInput, title: 'Close race' },
          })
        ).data;
        const storage = h.app.get(CvStorageService);
        const save = storage.save.bind(storage);
        const before = (await readdir(h.directory)).length;
        context.mock.method(storage, 'save', async (file) => {
          const key = await save(file);
          await db.getRepository(e.Job).update(target.id, { status: 'CLOSED' });
          return key;
        });
        const buffer = pdf();
        await assert.rejects(
          h.app
            .get(ApplicationsService)
            .apply(
              { jobId: target.id, candidateName: 'Race', candidateEmail: 'race@example.test' },
              { buffer, size: buffer.length, originalname: 'cv.pdf', mimetype: 'application/pdf' },
            ),
          (err) => err.getStatus() === 409,
        );
        assert.equal((await readdir(h.directory)).length, before);
        assert.equal(await db.getRepository(e.Application).countBy({ jobId: target.id }), 0);
      },
    );
    await t.test('database transaction failure cleans uploaded CV', async (context) => {
      const before = (await readdir(h.directory)).length;
      context.mock.method(db, 'transaction', async () => {
        throw new Error('Synthetic DB failure');
      });
      const buffer = pdf();
      await assert.rejects(
        h.app
          .get(ApplicationsService)
          .apply(
            { jobId: job.id, candidateName: 'DB error', candidateEmail: 'db-error@example.test' },
            { buffer, size: buffer.length, originalname: 'cv.pdf', mimetype: 'application/pdf' },
          ),
        /Synthetic DB failure/,
      );
      assert.equal((await readdir(h.directory)).length, before);
    });
    await t.test('100 jobs and 500 candidate fixtures retain pagination and counts', async () => {
      const jobs = await db.getRepository(e.Job).save(
        Array.from({ length: 100 }, (_, i) => ({
          ...jobInput,
          title: 'Scale job ' + i,
          createdBy: h.users.hr.id,
        })),
      );
      const target = jobs[0];
      await db.getRepository(e.Application).insert(
        Array.from({ length: 500 }, (_, i) => ({
          jobId: target.id,
          candidateName: 'Scale Candidate ' + i,
          candidateEmail: 'scale-' + i + '@example.test',
          cvFileUrl: 'fixture-no-cv',
          status: i % 2 ? 'APPLIED' : 'INTERVIEWING',
        })),
      );
      const start = performance.now();
      const page = (
        await req('/applications?jobId=' + target.id + '&page=17&pageSize=30', { who: 'hr' })
      ).data;
      assert.equal(page.items.length, 20);
      assert.equal(page.total, 500);
      assert.equal(page.counts.APPLIED, 250);
      assert.equal(page.counts.INTERVIEWING, 250);
      const list = (await req('/jobs/admin?q=Scale&page=10&pageSize=10', { who: 'hr' })).data;
      assert.equal(list.items.length, 10);
      assert.equal(list.total, 100);
      console.log(
        'Pagination fixture: two HTTP list requests, ' +
          Math.round(performance.now() - start) +
          ' ms; local single-run measurement.',
      );
    });
  },
);
