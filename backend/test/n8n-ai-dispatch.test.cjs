// Run after backend build. No database, network or real credentials.
require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { N8nAiGuard } = require('../dist/modules/applications/n8n-ai.guard');
const { N8nService } = require('../dist/modules/core/automation/n8n.service');
const settings = { N8N_WEBHOOK_URL: 'http://n8n.test/webhook', N8N_AI_KEY: 'synthetic-ai-key', N8N_AUTOMATION_SECRET: 'synthetic-automation-key' };
const config = values => ({ get: key => values[key] });
const context = header => ({ switchToHttp: () => ({ getRequest: () => ({ headers: header === undefined ? {} : { 'x-n8n-ai-key': header } }) }) });
test('AI callback guard rejects missing/wrong key and accepts configured key', () => {
  const guard = new N8nAiGuard(config(settings));
  assert.throws(() => guard.canActivate(context()), /credential/);
  assert.throws(() => guard.canActivate(context('wrong-key')), /credential/);
  assert.equal(guard.canActivate(context(settings.N8N_AI_KEY)), true);
});
test('AI callback guard rejects unconfigured secret and accepts fallback key', () => {
  assert.throws(() => new N8nAiGuard(config({})).canActivate(context('anything')), /credential/);
  assert.equal(new N8nAiGuard(config({ N8N_INTAKE_KEY: 'synthetic-fallback' })).canActivate(context('synthetic-fallback')), true);
});
test('AI dispatch adds only AI header and preserves request data', async () => {
  const original = global.fetch; const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200 }; };
  try {
    const service = new N8nService(config(settings));
    const score = { applicationId: 1, requestId: 'score-request' };
    const questions = { interviewId: 2, requestId: 'questions-request' };
    assert.equal(await service.triggerAiResumeScore(score), true);
    assert.equal(await service.triggerAiInterviewQuestions(questions), true);
    assert.deepEqual(calls.map(call => call.url), ['http://n8n.test/webhook/ai-resume-score', 'http://n8n.test/webhook/ai-interview-questions']);
    for (let i = 0; i < calls.length; i++) {
      assert.equal(calls[i].options.headers['x-n8n-ai-key'], settings.N8N_AI_KEY);
      assert.equal(calls[i].options.headers['X-Automation-Secret'], undefined);
      assert.deepEqual(JSON.parse(calls[i].options.body).data, [score, questions][i]);
    }
  } finally { global.fetch = original; }
});
test('jobs-changed uses the shared TV2 Header Auth key', async () => {
  const original = global.fetch; let captured;
  global.fetch = async (url, options) => { captured = { url, options }; return { ok: true, status: 200 }; };
  try {
    assert.equal(await new N8nService(config(settings)).triggerJobsChanged({ action: 'UPDATED', job: { id: 7 } }), true);
    assert.equal(captured.url, 'http://n8n.test/webhook/jobs-changed');
    assert.equal(captured.options.headers['x-n8n-ai-key'], settings.N8N_AI_KEY);
  } finally { global.fetch = original; }
});
test('TV4 automation header survives integration and does not receive AI key', async () => {
  const original = global.fetch; let captured;
  global.fetch = async (url, options) => { captured = { url, options }; return { ok: true, status: 200 }; };
  try {
    assert.equal(await new N8nService(config(settings)).triggerOffboardingApproved({ caseId: 3 }), true);
    assert.equal(captured.options.headers['X-Automation-Secret'], settings.N8N_AUTOMATION_SECRET);
    assert.equal(captured.options.headers['x-n8n-ai-key'], undefined);
  } finally { global.fetch = original; }
});
test('non-OK webhook response is reported as dispatch failure', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });
  try { assert.equal(await new N8nService(config(settings)).triggerAiResumeScore({ applicationId: 1 }), false); }
  finally { global.fetch = original; }
});
