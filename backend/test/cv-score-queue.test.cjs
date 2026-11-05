require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CvScoreQueueService } = require('../dist/modules/applications/cv-score-queue.service');
const { Application } = require('../dist/entities/application.entity');
function harness(score) {
  const row = { id: 1, jobId: 2, status: 'NEW', rawCvText: 'Synthetic CV: TypeScript, NestJS, MySQL; two years experience.', cvFileUrl: 'private/test.pdf', aiScoreStatus: 'PENDING', aiScoreRequestId: 'be:test', aiScoreAvailableAt: new Date(0), aiScoreAttempts: 0 };
  const repo = {
    async findOne() { return structuredClone(row); },
    async save(value) { Object.assign(row, value); return value; },
    async update(where, values) { if (where.aiScoreRequestId === row.aiScoreRequestId) Object.assign(row, values); },
    createQueryBuilder() {
      const q = new Proxy({}, { get(_, key) {
        if (key === 'getOne') return async () => ['PENDING','PROCESSING'].includes(row.aiScoreStatus) && row.aiScoreAvailableAt <= new Date() ? structuredClone(row) : null;
        return () => q;
      }}); return q;
    },
  };
  const jobs = { async findOneByOrFail() { return { description: 'Backend', requirements: 'NestJS' }; }, async findOne() { return this.findOneByOrFail(); } };
  const manager = { getRepository(entity) { return entity === Application ? repo : jobs; } };
  const db = { async transaction(fn) { return fn(manager); }, ...manager };
  let calls = 0;
  const ai = { async score(...args) { calls++; return score(row, ...args); }, async scoreFile(...args) { calls++; return score(row, ...args); } };
  const worker = new CvScoreQueueService(db, ai, { async read() { return Buffer.from('test'); }, mimeType() { return 'application/pdf'; } });
  return { row, worker, calls: () => calls };
}
const live = () => ({ mode: 'LIVE', data: { matchScore: 82.5, summary: 'Relevant experience', skillsDetected: ['NestJS'] } });
test('one synthetic CV is scored automatically; completed work is not scored twice', async () => {
  const h = harness(live);
  await h.worker.processNext(); await h.worker.processNext();
  assert.equal(h.calls(), 1); assert.equal(h.row.matchScore, 82.5);
  assert.equal(h.row.aiScoreStatus, 'COMPLETED'); assert.equal(h.row.aiScoreError, null);
});
test('MOCK fallback never becomes a score; retries stop after three attempts', async () => {
  const h = harness(() => ({ mode: 'MOCK', data: { matchScore: 99 } }));
  for (let i = 0; i < 3; i++) { h.row.aiScoreAvailableAt = new Date(0); await h.worker.processNext(); }
  assert.equal(h.row.aiScoreStatus, 'FAILED'); assert.equal(h.row.matchScore, undefined); assert.equal(h.calls(), 3);
});
test('late worker result cannot overwrite a new request', async () => {
  const h = harness(row => { row.aiScoreRequestId = 'be:newer'; return live(); });
  await h.worker.processNext(); assert.equal(h.row.matchScore, undefined);
});
test('manual clicks deduplicate pending BE work and can take over old n8n work', async () => {
  const h = harness(live);
  await h.worker.enqueue(1); assert.equal(h.row.aiScoreRequestId, 'be:test');
  h.row.aiScoreRequestId = 'n8n:old'; await h.worker.enqueue(1);
  assert.match(h.row.aiScoreRequestId, /^be:/); assert.equal(h.row.aiScoreAttempts, 0);
});
test('an expired lease is recovered and scanned CV uses file scoring', async () => {
  const h = harness(live); h.row.rawCvText = ''; h.row.aiScoreStatus = 'PROCESSING';
  await h.worker.processNext(); assert.equal(h.row.aiScoreStatus, 'COMPLETED'); assert.equal(h.calls(), 1);
});
