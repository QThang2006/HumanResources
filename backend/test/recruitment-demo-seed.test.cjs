const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readdir } = require('node:fs/promises');
const { startHarness, pdf } = require('./recruitment-harness.cjs');
const { seedRecruitmentDemo, DemoSeedError } = require('../dist/seeds/recruitment-demo.seed');
const { CvStorageService } = require('../dist/modules/applications/cv-storage.service');
const NOW = new Date('2026-10-07T20:00:00Z'); // Already October 8 in Vietnam.
const EXPECTED = { jobs: 12, applications: 108, interviews: 90, cvs: 108 };

async function counts(h) {
  const result = {};
  for (const metadata of h.db.entityMetadatas)
    result[metadata.tableName] = await h.db.getRepository(metadata.target).count();
  return result;
}

test(
  'TV2 demo seed: scoped data, usable API/CVs, idempotency and preflight',
  { timeout: 120000 },
  async (t) => {
    const h = await startHarness();
    t.after(() => h.close());
    const { db, entities: e } = h;
    const options = {
      creatorId: h.users.hr.id,
      managerId: h.users.manager.id,
      departmentId: h.departments[0].id,
      now: NOW,
    };
    const storage = new CvStorageService();
    const originalUsers = await db.getRepository(e.User).find({ order: { id: 'ASC' } });
    const originalDepartments = await db.getRepository(e.Department).find({ order: { id: 'ASC' } });

    await t.test('invalid actors/IDs and dry-run never write rows or PDFs', async () => {
      const before = await counts(h);
      for (const override of [
        { creatorId: -1 },
        { creatorId: h.users.employee.id },
        { managerId: h.users.hr.id },
        { departmentId: h.departments[1].id },
        { now: new Date('invalid') },
      ]) {
        await assert.rejects(seedRecruitmentDemo(db, { ...options, ...override }), DemoSeedError);
      }
      const plan = await seedRecruitmentDemo(db, { ...options, dryRun: true });
      assert.equal(plan.mode, 'DRY_RUN');
      assert.deepEqual(plan.created, EXPECTED);
      assert.deepEqual(await counts(h), before);
      assert.deepEqual(await readdir(h.directory), []);
    });

    // A non-demo record and private file must survive all seed/rerun operations.
    const originalFile = await storage.save({ buffer: pdf('Existing candidate - preserve me') });
    const realJob = await db.getRepository(e.Job).save({
      departmentId: options.departmentId,
      createdBy: options.creatorId,
      title: 'Existing position',
      location: 'HCM',
      salaryRange: 'Negotiable',
      description: 'Existing JD',
      requirements: 'Existing requirements',
      status: 'CLOSED',
    });
    const realApp = await db.getRepository(e.Application).save({
      jobId: realJob.id,
      candidateName: 'Existing Candidate',
      candidateEmail: 'existing@example.test',
      cvFileUrl: originalFile,
    });
    const originalJob = await db.getRepository(e.Job).findOneBy({ id: realJob.id });
    const originalApplication = await db.getRepository(e.Application).findOneBy({ id: realApp.id });
    const before = await counts(h);
    let report, apps, interviews;
    await t.test(
      'adds exactly 12 jobs, 108 applications/CVs and 90 interviews; no other tables',
      async () => {
        report = await seedRecruitmentDemo(db, options);
        assert.deepEqual(report.created, EXPECTED);
        const after = await counts(h);
        for (const table of Object.keys(before))
          assert.equal(
            after[table] - before[table],
            { jobs: 12, applications: 108, interviews: 90 }[table] || 0,
            table,
          );
        assert.deepEqual(
          await db.getRepository(e.User).find({ order: { id: 'ASC' } }),
          originalUsers,
        );
        assert.deepEqual(
          await db.getRepository(e.Department).find({ order: { id: 'ASC' } }),
          originalDepartments,
        );
        assert.deepEqual(await db.getRepository(e.Job).findOneBy({ id: realJob.id }), originalJob);
        assert.deepEqual(
          await db.getRepository(e.Application).findOneBy({ id: realApp.id }),
          originalApplication,
        );
        assert.deepEqual(await storage.read(originalFile), pdf('Existing candidate - preserve me'));
        assert.equal((await readdir(h.directory)).length, 109);
        assert.deepEqual(h.automation.calls, []);
      },
    );
    await t.test(
      'synthetic labels, varied pipeline states, consistent rounds and Vietnam dates',
      async () => {
        apps = (await db.getRepository(e.Application).find({ order: { id: 'ASC' } })).filter(
          (a) => a.id !== realApp.id,
        );
        interviews = await db.getRepository(e.Interview).find({ order: { id: 'ASC' } });
        assert.equal(new Set(apps.map((a) => a.candidateName)).size, 108);
        const phases = {};
        for (const a of apps) {
          phases[a.status] = (phases[a.status] || 0) + 1;
          assert.match(a.candidateEmail, /^tv2\.demo\..+@example\.test$/);
          assert.equal(a.candidatePhone, null);
          assert.equal(a.hiredUserId, null);
          assert.match(a.cvFileUrl, /^[a-f0-9-]{36}\.pdf$/);
          assert.match(a.rawCvText, /SYNTHETIC CV/);
          if (a.matchScore !== null) {
            assert.ok(Number(a.matchScore) >= 42 && Number(a.matchScore) <= 97);
            assert.match(a.aiSummary, /\[DEMO TV2\]/);
          }
          const rounds = interviews.filter((i) => i.applicationId === a.id);
          assert.deepEqual(
            rounds.map((i) => i.round),
            rounds.map((_, n) => n + 1),
          );
          if (a.status === 'OFFERED') assert.equal(rounds.at(-1).result, 'PASSED');
          if (a.status === 'REJECTED') assert.equal(rounds.at(-1).result, 'FAILED');
          if (a.status === 'INTERVIEWING') assert.equal(rounds.at(-1).result, 'PENDING');
        }
        assert.deepEqual(phases, { APPLIED: 36, INTERVIEWING: 36, OFFERED: 18, REJECTED: 18 });
        assert.equal(new Set(interviews.map((i) => i.scheduledAt.getTime())).size, 90);
        const pending = interviews.filter((i) => i.result === 'PENDING');
        assert.equal(pending.length, 36);
        // Tomorrow at 09:00 Vietnam (02:00 UTC), anchored to the Vietnam date, not UTC date.
        assert.equal(pending[0].scheduledAt.toISOString(), '2026-10-09T02:00:00.000Z');
        for (const i of interviews) {
          assert.equal(i.interviewerId, options.managerId);
          assert.equal(i.meetingLink, null);
          assert.equal(i.googleCalendarEventId, null);
          assert.ok(i.scheduledAt > apps.find((a) => a.id === i.applicationId).createdAt);
          assert.match(i.aiSuggestedQuestions[0], /\[DEMO TV2\]/);
          if (i.result === 'PENDING') {
            assert.ok(i.scheduledAt > NOW);
            assert.equal(i.score, null);
            assert.equal(i.interviewerFeedback, null);
          } else {
            assert.ok(i.scheduledAt < NOW);
            assert.match(i.interviewerFeedback, /\[DEMO TV2\]/);
          }
        }
      },
    );
    await t.test(
      'public/admin filters and ATS pagination work with downloadable one-page PDF',
      async () => {
        assert.equal((await h.request('/jobs?page=1&pageSize=20')).data.total, 10);
        assert.equal(
          (await h.request('/jobs/admin?page=1&pageSize=20', { who: 'hr' })).data.total,
          13,
        );
        assert.equal(
          (await h.request('/jobs/admin?page=1&pageSize=20', { who: 'other' })).data.total,
          0,
        );
        const jobId = report.jobs[0].id;
        const first = await h.request('/applications?jobId=' + jobId + '&page=1&pageSize=20', {
          who: 'hr',
        });
        const second = await h.request('/applications?jobId=' + jobId + '&page=2&pageSize=20', {
          who: 'hr',
        });
        assert.equal(first.data.total, 35);
        assert.equal(first.data.items.length, 20);
        assert.equal(second.data.items.length, 15);
        assert.deepEqual(first.data.counts, { APPLIED: 14, INTERVIEWING: 14, OFFERED: 7 });
        assert.equal(
          (await h.request('/applications?jobId=' + jobId + '&status=REJECTED', { who: 'hr' })).data
            .total,
          7,
        );
        const a = apps.find((a) => a.status === 'INTERVIEWING');
        const detail = await h.request('/applications/' + a.id, { who: 'manager' });
        assert.equal(detail.status, 200);
        assert.ok(detail.data.interviews.length);
        assert.equal((await h.request('/applications/' + a.id, { who: 'other' })).status, 404);
        assert.equal((await h.request('/applications/' + a.id + '/cv')).status, 401);
        const cv = await h.request('/applications/' + a.id + '/cv', { who: 'hr', raw: true });
        assert.equal(cv.status, 200);
        assert.match(cv.headers.get('content-type'), /application\/pdf/);
        const parse = require('pdf-parse/lib/pdf-parse');
        const parsed = await parse(Uint8Array.from(cv.data));
        assert.equal(parsed.numpages, 1);
        assert.match(parsed.text, /SYNTHETIC CV/);
        assert.match(parsed.text, /NestJS/);
      },
    );
    await t.test(
      'reruns serialize and preserve edited demo data without duplicate rows/files',
      async () => {
        const jobId = report.jobs[0].id,
          a = apps[0];
        await db.getRepository(e.Job).update(jobId, { title: 'Demo title edited by HR' });
        await db
          .getRepository(e.Application)
          .update(a.id, { aiSummary: 'Edited assessment', matchScore: 77 });
        const beforeCounts = await counts(h),
          beforeFiles = (await readdir(h.directory)).sort();
        const reruns = await Promise.all([
          seedRecruitmentDemo(db, options),
          seedRecruitmentDemo(db, options),
        ]);
        for (const r of reruns) {
          assert.deepEqual(r.created, { jobs: 0, applications: 0, interviews: 0, cvs: 0 });
          assert.deepEqual(r.existing, { jobs: 12, applications: 108 });
        }
        assert.deepEqual(await counts(h), beforeCounts);
        assert.deepEqual((await readdir(h.directory)).sort(), beforeFiles);
        assert.equal(
          (await db.getRepository(e.Job).findOneBy({ id: jobId })).title,
          'Demo title edited by HR',
        );
        assert.equal(
          (await db.getRepository(e.Application).findOneBy({ id: a.id })).aiSummary,
          'Edited assessment',
        );
        await assert.rejects(
          seedRecruitmentDemo(db, {
            ...options,
            managerId: h.users.other.id,
            departmentId: h.departments[1].id,
          }),
          DemoSeedError,
        );
        assert.deepEqual(await counts(h), beforeCounts);
        assert.deepEqual(h.automation.calls, []);
      },
    );
    await t.test(
      'partial rerun restores a missing candidate with the original stable interview slots',
      async () => {
        const a = apps.find((a) => interviews.filter((i) => i.applicationId === a.id).length === 2);
        const originalTimes = interviews
          .filter((i) => i.applicationId === a.id)
          .map((i) => i.scheduledAt.toISOString());
        await db.getRepository(e.Application).delete(a.id);
        await storage.remove(a.cvFileUrl);
        const repaired = await seedRecruitmentDemo(db, options);
        assert.deepEqual(repaired.created, { jobs: 0, applications: 1, interviews: 2, cvs: 1 });
        const replacement = await db
          .getRepository(e.Application)
          .findOneByOrFail({ jobId: a.jobId, candidateEmail: a.candidateEmail });
        const restored = await db
          .getRepository(e.Interview)
          .find({ where: { applicationId: replacement.id }, order: { round: 'ASC' } });
        assert.deepEqual(
          restored.map((i) => i.scheduledAt.toISOString()),
          originalTimes,
        );
        assert.equal(
          new Set((await db.getRepository(e.Interview).find()).map((i) => i.scheduledAt.getTime()))
            .size,
          90,
        );
      },
    );
  },
);

test(
  'TV2 demo seed rolls back database and only its newly saved CVs on failure',
  { timeout: 120000 },
  async (t) => {
    const h = await startHarness();
    t.after(() => h.close());
    const storage = new CvStorageService();
    const kept = await storage.save({ buffer: pdf('Untouched private file') });
    const before = await counts(h);
    let calls = 0;
    const failingStorage = {
      save: async (file) => {
        if (++calls === 4) throw new Error('Simulated disk failure');
        return storage.save(file);
      },
      remove: (key) => storage.remove(key),
    };
    await assert.rejects(
      seedRecruitmentDemo(h.db, { now: NOW }, failingStorage),
      /Simulated disk failure/,
    );
    assert.deepEqual(await counts(h), before);
    assert.deepEqual(await readdir(h.directory), [kept]);
    assert.deepEqual(await storage.read(kept), pdf('Untouched private file'));
    // Rollback also released its connection/lock, so a subsequent dry-run works.
    assert.deepEqual(
      (await seedRecruitmentDemo(h.db, { now: NOW, dryRun: true })).created,
      EXPECTED,
    );
  },
);
