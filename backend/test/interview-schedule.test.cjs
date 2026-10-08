const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startHarness } = require('./recruitment-harness.cjs');
const route = '/applications/interviews/schedule';
const range = '?from=2026-10-08T00%3A00%3A00%2B07%3A00&to=2026-10-09T00%3A00%3A00%2B07%3A00';
const meet = 'https://meet.google.com/abc-defg-hij'; // Navigation-format fixture; never join this room.

test('interview schedule: real MySQL/JWT, date range, filters, privacy and Meet readback', { timeout: 120000 }, async t => {
  const h = await startHarness(); t.after(() => h.close());
  const { db, entities: e } = h;
  const jobs = await db.getRepository(e.Job).save(h.departments.map((dept, n) => ({
    departmentId: dept.id, createdBy: h.users.hr.id, title: n ? 'Finance Analyst' : 'Backend Engineer',
    description: 'Test JD', requirements: 'Test requirements', status: n ? 'OPEN' : 'CLOSED',
  })));
  const apps = await db.getRepository(e.Application).save(jobs.map((job, n) => ({
    jobId: job.id, candidateName: n ? 'Finance Candidate' : 'Nguyễn Minh Anh', candidateEmail: n ? 'finance@example.test' : 'candidate@example.test',
    cvFileUrl: 'private-file.pdf', rawCvText: 'PRIVATE CV', aiSummary: 'PRIVATE ASSESSMENT', status: 'INTERVIEWING',
  })));
  const repo = db.getRepository(e.Interview);
  const own = await repo.save([
    { scheduledAt: new Date('2026-10-07T16:59:59Z'), result: 'PENDING' }, // Before VN midnight.
    { scheduledAt: new Date('2026-10-07T17:00:00Z'), result: 'PENDING' }, // Exactly from.
    { scheduledAt: new Date('2026-10-08T02:00:00Z'), result: 'PENDING' },
    { scheduledAt: new Date('2026-10-08T02:00:00Z'), result: 'PASSED', score: 85 }, // Tie ordered by ID.
    { scheduledAt: new Date('2026-10-08T16:59:59Z'), result: 'FAILED', score: 45 },
    { scheduledAt: new Date('2026-10-08T17:00:00Z'), result: 'PENDING' }, // Exactly to, excluded.
  ].map((value, n) => ({ ...value, applicationId: apps[0].id, interviewerId: h.users.manager.id, round: n + 1 })));
  const foreign = await repo.save({ scheduledAt: new Date('2026-10-08T04:00:00Z'), result: 'PENDING', applicationId: apps[1].id, interviewerId: h.users.other.id, round: 1 });

  await t.test('requires JWT and correct role, route cannot fall through to application detail', async () => {
    for (const path of [route + range, route + '/filters', route + '/' + own[2].id]) {
      assert.equal((await h.request(path)).status, 401);
      assert.equal((await h.request(path, { who: 'employee' })).status, 403);
    }
  });
  await t.test('inclusive start/exclusive end, stable pagination and historical/closed jobs', async () => {
    const all = await h.request(route + range, { who: 'hr' }); assert.equal(all.status, 200); assert.equal(all.data.total, 5);
    assert.deepEqual(all.data.items.map(row => row.id), [own[1].id, own[2].id, own[3].id, foreign.id, own[4].id]);
    const pages = [];
    for (let page = 1; page <= 3; page++) pages.push(...(await h.request(route + range + '&pageSize=2&page=' + page, { who: 'hr' })).data.items);
    assert.deepEqual(pages.map(row => row.id), all.data.items.map(row => row.id));
    assert.equal((await h.request(route + range, { who: 'admin' })).data.total, 5);
  });
  await t.test('manager department scope applies to data, detail, filters and arbitrary IDs', async () => {
    const ownPage = await h.request(route + range, { who: 'manager' }); assert.equal(ownPage.data.total, 4);
    assert.ok(ownPage.data.items.every(row => row.departmentId === h.departments[0].id));
    assert.equal((await h.request(route + range + '&jobId=' + jobs[1].id, { who: 'manager' })).data.total, 0);
    assert.equal((await h.request(route + '/' + foreign.id, { who: 'manager' })).status, 404);
    assert.equal((await h.request(route + '/' + own[2].id, { who: 'other' })).status, 404);
    const filters = (await h.request(route + '/filters', { who: 'manager' })).data;
    assert.deepEqual(filters.jobs, [{ id: jobs[0].id, name: jobs[0].title }]);
    assert.deepEqual(filters.interviewers, [{ id: h.users.manager.id, name: h.users.manager.fullName }]);
  });
  await t.test('result, job, interviewer and candidate/job text filters combine', async () => {
    for (const [suffix, total] of [
      ['&result=PENDING', 3], ['&result=PASSED', 1], ['&jobId=' + jobs[0].id, 4],
      ['&interviewerId=' + h.users.other.id, 1], ['&q=' + encodeURIComponent('Nguyễn Minh'), 4],
      ['&q=finance', 1], ['&jobId=' + jobs[0].id + '&result=FAILED', 1], ['&q=Absent', 0],
    ]) assert.equal((await h.request(route + range + suffix, { who: 'hr' })).data.total, total, suffix);
  });
  await t.test('validates range/timezone/page/filter values; rejects unbounded or extra queries', async () => {
    for (const query of [
      '', '?from=2026-10-08&to=2026-10-09', '?from=2026-10-08T00:00:00Z&to=2026-10-07T00:00:00Z',
      '?from=2026-10-08T00:00:00Z&to=2026-10-08T00:00:00Z', '?from=2026-10-01T00:00:00Z&to=2027-01-01T00:00:00Z',
      '?from=invalid&to=2026-10-09T00:00:00Z', '?from=2026-02-30T00:00:00Z&to=2026-03-02T00:00:00Z',
      range + '&page=0', range + '&pageSize=101', range + '&jobId=0', range + '&interviewerId=-1',
      range + '&result=CANCELLED', range + '&all=true',
    ]) assert.equal((await h.request(route + query, { who: 'hr' })).status, 400, query);
    for (const id of ['invalid', '0', '-1', '1.5']) assert.equal((await h.request(route + '/' + id, { who: 'hr' })).status, 400);
    assert.equal((await h.request(route + '/999999', { who: 'hr' })).status, 404);
  });
  await t.test('stored Meet appears after readback; unsafe links and private fields are excluded', async () => {
    const id = own[2].id;
    assert.equal((await h.request(route + '/' + id, { who: 'hr' })).data.meetingLink, null);
    await repo.update(id, { meetingLink: meet });
    const detail = (await h.request(route + '/' + id, { who: 'hr' })).data;
    assert.equal(detail.meetingLink, meet); assert.equal(detail.scheduledAt, '2026-10-08T02:00:00.000Z');
    assert.equal((await h.request(route + range, { who: 'hr' })).data.items.find(row => row.id === id).meetingLink, meet);
    assert.deepEqual(Object.keys(detail).sort(), ['id','applicationId','candidateName','candidateEmail','applicationStatus','jobId','jobTitle','departmentId','departmentName','interviewerId','interviewerName','round','scheduledAt','result','score','meetingLink','updatedAt'].sort());
    assert.ok(!JSON.stringify(detail).includes('PRIVATE')); assert.deepEqual(h.automation.calls, []);
    for (const value of ['javascript:alert(1)', 'https://meet.google.com.evil.test/abc-defg-hij', 'https://meet.google.com/abc-defg-hij?token=private', 'https://user:password@meet.google.com/abc-defg-hij']) {
      await repo.update(id, { meetingLink: value }); assert.equal((await h.request(route + '/' + id, { who: 'hr' })).data.meetingLink, null);
    }
  });
});
