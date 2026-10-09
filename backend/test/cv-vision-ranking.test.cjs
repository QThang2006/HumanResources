const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { startHarness } = require('./recruitment-harness.cjs');
const { RecruitmentAiService } = require('../dist/modules/jobs/recruitment-ai.service');
const { CvStorageService } = require('../dist/modules/applications/cv-storage.service');

// One pixel synthetic PNG. No real candidate data or provider calls.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9V8AAAAASUVORK5CYII=', 'base64');
const vision = {
  aiGenerated: true, extractedText: 'Synthetic CV: communication, marketing, event planning.',
  matchScore: 91, summary: 'Demonstrated communication and marketing experience.',
  matchedSkills: ['communication', 'marketing'],
};

test('Vision contract rejects simulated OCR, malformed responses and provider details', async () => {
  const ai = (value) => new RecruitmentAiService({ scoreResumeFile: async () => value });
  assert.equal((await ai(vision).scoreFile(png, 'image/png', 'JD')).mode, 'LIVE');
  await assert.rejects(ai({ ...vision, aiGenerated: false }).scoreFile(png, 'image/png', 'JD'), e => e.getStatus() === 503);
  for (const value of [
    { ...vision, extractedText: '' }, { ...vision, matchScore: 101 },
    { ...vision, matchedSkills: ['x'.repeat(151)] },
  ]) await assert.rejects(ai(value).scoreFile(png, 'image/png', 'JD'), e => e.getStatus() === 502);
  await assert.rejects(new RecruitmentAiService({ scoreResumeFile: async () => { throw Error('PRIVATE'); } }).scoreFile(png, 'image/png', 'JD'), e => !e.message.includes('PRIVATE'));
  const storage = new CvStorageService();
  assert.equal(await storage.parse({ buffer: png, size: png.length, mimetype: 'image/png', originalname: 'cv.png' }), null);
  await assert.rejects(storage.parse({ buffer: Buffer.from('fake'), size: 4, mimetype: 'image/png', originalname: 'cv.png' }));
});

test('CV images/scans, persisted Vision text, scoped downloads and score ranking with pagination', { timeout: 120000 }, async t => {
  const h = await startHarness();
  t.after(() => h.close());
  const job = await h.request('/jobs', { method: 'POST', who: 'hr', body: {
    title: 'Marketing test', departmentId: h.departments[0].id,
    description: 'Marketing and events', requirements: 'Communication',
  } });
  assert.equal(job.status, 201);
  async function apply(buffer, mime, filename, email) {
    const form = h.upload(job.data.id, email);
    form.set('cv', new Blob([buffer], { type: mime }), filename);
    const res = await h.request('/applications/apply', { method: 'POST', body: form });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    return res.data.applicationId;
  }
  const imageId = await apply(png, 'image/png', 'cv.png', 'image@example.test');
  const scan = await fs.readFile(path.join(__dirname, 'fixtures/cv-scan.pdf'));
  const scanId = await apply(scan, 'application/pdf', 'scan.pdf', 'scan@example.test');
  assert.equal((await h.request('/applications/' + imageId, { who: 'hr' })).data.hasCvText, false);
  const download = await h.request('/applications/' + imageId + '/cv', { who: 'hr', raw: true });
  assert.equal(download.headers.get('content-type'), 'image/png');
  assert.deepEqual(download.data, png);
  assert.equal((await h.request('/applications/' + imageId + '/cv', { who: 'other', raw: true })).status, 404);
  h.sdk.scoreResumeFile = async (buffer, mime) => {
    assert.ok(buffer.equals(mime === 'image/png' ? png : scan));
    return { ...vision };
  };
  for (const id of [imageId, scanId]) {
    const score = await h.request('/applications/' + id + '/score', { method: 'POST', who: 'hr' });
    assert.equal(score.status, 201, JSON.stringify(score.data));
    assert.equal(score.data.saved, true);
    const saved = await h.db.getRepository(h.entities.Application).findOneByOrFail({ id });
    assert.equal(saved.rawCvText, vision.extractedText);
    assert.equal(Number(saved.matchScore), 91);
  }
  // Subsequent scoring uses the persisted extracted text, not Vision again.
  h.sdk.scoreResume = async text => {
    assert.equal(text, vision.extractedText);
    return { aiGenerated: true, ...vision };
  };
  assert.equal((await h.request('/applications/' + imageId + '/score', { method: 'POST', who: 'hr' })).data.saved, true);
  const failedId = await apply(png, 'image/png', 'cv.png', 'mock@example.test');
  h.sdk.scoreResumeFile = async () => ({ ...vision, aiGenerated: false });
  assert.equal((await h.request('/applications/' + failedId + '/score', { method: 'POST', who: 'hr' })).status, 503);
  const failed = await h.db.getRepository(h.entities.Application).findOneByOrFail({ id: failedId });
  assert.equal(failed.rawCvText, null);
  assert.equal(failed.matchScore, null);
  const zeroId = await apply(png, 'image/png', 'cv.png', 'zero@example.test');
  const unscoredId = await apply(png, 'image/png', 'cv.png', 'unscored@example.test');
  const apps = h.db.getRepository(h.entities.Application);
  await apps.update(imageId, { matchScore: 91, createdAt: new Date('2026-01-01T00:00:00Z') });
  await apps.update(scanId, { matchScore: 91, createdAt: new Date('2026-01-02T00:00:00Z') });
  await apps.update(zeroId, { matchScore: 0 });
  const first = await h.request('/applications?jobId=' + job.data.id + '&page=1&pageSize=2', { who: 'hr' });
  const second = await h.request('/applications?jobId=' + job.data.id + '&page=2&pageSize=2', { who: 'hr' });
  const third = await h.request('/applications?jobId=' + job.data.id + '&page=3&pageSize=2', { who: 'hr' });
  assert.deepEqual(first.data.items.map(row => row.id), [scanId, imageId]);
  assert.equal(second.data.items[0].id, zeroId);
  assert.deepEqual([...second.data.items.slice(1), ...third.data.items].map(row => row.id).sort(), [failedId, unscoredId].sort());
});
