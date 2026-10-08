// Run from backend after build. Uses actual lead SDKs and an isolated test database.
const assert = require('node:assert/strict');
const { startHarness } = require('./recruitment-harness.cjs');
const { ConfigService } = require('@nestjs/config');

(async () => {
  const checkN8n = process.env.ATS_RUNTIME_N8N === '1';
  const h = await startHarness({ realServices: true });
  const evidence = { providers: 'ACTUAL_LEAD_SDK', ai: {}, n8n: 'NOT_REQUESTED', aiLiveAcceptance: false, workflowDeliveryAcceptance: false };
  const retryLimit = Math.min(2, Math.max(0, Number(process.env.ATS_AI_TRANSIENT_RETRIES) || 0));
  evidence.attempts = {};
  evidence.providerFailures = [];
  let currentStage;
  // Collect only HTTP status codes, never provider messages or credentials.
  const sdkLogger = h.sdk.logger;
  const logError = sdkLogger.error;
  sdkLogger.error = function (...args) {
    const match = String(args[0]).match(/\[(429|500|502|503|504)\s/);
    if (match) evidence.providerFailures.push({ stage: currentStage, status: Number(match[1]) });
    return logError.apply(this, args);
  };
  async function aiRequest(stage, route, options) {
    currentStage = stage;
    for (let attempt = 1; ; attempt++) {
      evidence.attempts[stage] = attempt;
      const failuresBefore = evidence.providerFailures.length;
      const response = await h.request(route, options);
      const temporaryFailure = evidence.providerFailures.slice(failuresBefore).some(error => [500, 502, 503, 504].includes(error.status));
      // Retry only a completed MOCK response after a transient server error.
      // Never repeat a LIVE result, a pending timeout, or a quota/auth error.
      if (response.status !== 201 || response.data.mode !== 'MOCK' || !temporaryFailure || attempt > retryLimit) return response;
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  try {
    if (checkN8n) {
      const url = new URL(h.app.get(ConfigService).get('N8N_WEBHOOK_URL') || 'http://localhost:5678/webhook');
      if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Runtime test only dispatches to local n8n.');
    }
    const jd = await aiRequest('jd', '/jobs/ai-generate', { method: 'POST', who: 'hr', body: { title: 'Backend Engineer', departmentName: 'Engineering Test', level: 'Middle' } });
    assert.equal(jd.status, 201); assert.ok(['LIVE', 'MOCK'].includes(jd.data.mode));
    evidence.ai.jd = jd.data.mode;
    const job = await h.request('/jobs', { method: 'POST', who: 'hr', body: { title: 'Runtime Integration Test', departmentId: h.departments[0].id, description: jd.data.data.description, requirements: jd.data.data.requirements } });
    assert.equal(job.status, 201);
    const submit = await h.request('/applications/apply', { method: 'POST', body: h.upload(job.data.id, 'runtime-candidate@example.invalid') });
    assert.equal(submit.status, 201);
    const id = submit.data.applicationId;
    const score = await aiRequest('score', '/applications/' + id + '/score', { method: 'POST', who: 'hr' });
    assert.equal(score.status, 201); assert.equal(score.data.saved, score.data.mode === 'LIVE');
    evidence.ai.score = score.data.mode;
    if (score.data.mode === 'MOCK') assert.equal((await h.request('/applications/' + id, { who: 'hr' })).data.matchScore, null);
    else assert.equal(Number((await h.request('/applications/' + id, { who: 'hr' })).data.matchScore), score.data.data.matchScore);

    // The no-n8n run creates only a DB fixture, so it never invokes a webhook.
    let interview;
    if (checkN8n) {
      await h.db.getRepository(h.entities.User).update(h.users.manager.id, { email: 'runtime-interviewer@example.invalid' });
      const schedule = await h.request('/applications/' + id + '/interview', { method: 'POST', who: 'hr', body: { interviewerId: h.users.manager.id, round: 1, scheduledAt: '2099-01-01T03:30:00Z' } });
      assert.equal(schedule.status, 201);
      interview = schedule.data.interview;
      evidence.n8n = schedule.data.dispatch;
      evidence.n8nNotice = 'UNVERIFIED only means the helper queued a fetch; inspect actual n8n execution. No mail/Meet completion is asserted.';
    } else {
      interview = await h.db.getRepository(h.entities.Interview).save({ applicationId: id, interviewerId: h.users.manager.id, round: 1, scheduledAt: new Date('2099-01-01T03:30:00Z'), result: 'PENDING' });
      await h.db.getRepository(h.entities.Application).update(id, { status: 'INTERVIEWING' });
    }
    const questions = await aiRequest('questions', '/applications/interviews/' + interview.id + '/questions', { method: 'POST', who: 'hr' });
    assert.equal(questions.status, 201); assert.equal(questions.data.saved, questions.data.mode === 'LIVE');
    assert.ok(questions.data.data.length >= 3 && questions.data.data.length <= 5);
    evidence.ai.questions = questions.data.mode;
    if (questions.data.mode === 'LIVE') {
      const detail = await h.request('/applications/' + id, { who: 'hr' });
      assert.deepEqual(detail.data.interviews.find(item => item.id === interview.id).questions, questions.data.data);
    }
    evidence.aiLiveAcceptance = Object.values(evidence.ai).every(mode => mode === 'LIVE');
    console.log(JSON.stringify(evidence, null, 2));
    if (process.env.ATS_REQUIRE_LIVE === '1' && !evidence.aiLiveAcceptance) {
      console.error('LIVE acceptance failed: one or more SDK calls used MOCK fallback. Do not push as live-verified.');
      process.exitCode = 2;
    }
  } finally { sdkLogger.error = logError; await h.close(); }
})().catch(error => { console.error('Runtime verification failed: ' + error.message); process.exitCode = 1; });
