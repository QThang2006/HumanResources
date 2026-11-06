// Run after backend build. Uses synthetic keys and a mocked HTTP client only.
require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { N8nService } = require('../dist/modules/core/automation/n8n.service');

const config = values => ({ get: key => values[key] });
const base = { N8N_WEBHOOK_URL: 'http://n8n.test/webhook', N8N_AI_KEY: 'synthetic-shared-key' };

test('interview dispatch authenticates and preserves its payload', async () => {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200 }; };
  try {
    const payload = {
      interviewId: 17, applicationId: 21, candidateName: 'Test Candidate',
      candidateEmail: 'candidate@example.test', interviewerName: 'Test Manager',
      interviewerEmail: 'manager@example.test', scheduledAt: '2026-11-12T03:00:00Z', round: 1,
    };
    assert.equal(await new N8nService(config(base)).triggerInterviewScheduled(payload), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://n8n.test/webhook/interview-schedule');
    assert.equal(calls[0].options.headers['x-n8n-ai-key'], base.N8N_AI_KEY);
    assert.equal(calls[0].options.headers['X-Automation-Secret'], undefined);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.interviewId, payload.interviewId);
    assert.equal(body.data.interviewId, payload.interviewId);
    assert.equal(JSON.stringify(body).includes(base.N8N_AI_KEY), false);
  } finally { global.fetch = original; }
});

test('offer dispatch can use its own n8n Header Auth credential', async () => {
  const original = global.fetch;
  let captured;
  global.fetch = async (url, options) => { captured = { url, options }; return { ok: true, status: 200 }; };
  try {
    const payload = { offerId: 6, token: 'synthetic-delivery-token', responseToken: 'synthetic-response-token' };
    const settings = { ...base, N8N_OFFER_WEBHOOK_KEY: ' synthetic-offer-key ' };
    assert.equal(await new N8nService(config(settings)).triggerOfferIssued(payload), true);
    assert.equal(captured.url, 'http://n8n.test/webhook/offer-issued');
    assert.equal(captured.options.headers['x-n8n-ai-key'], 'synthetic-offer-key');
    assert.deepEqual(JSON.parse(captured.options.body).data, payload);
    assert.equal(captured.options.body.includes('synthetic-offer-key'), false);
  } finally { global.fetch = original; }
});

test('interview override is independent of the offer fallback', async () => {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200 }; };
  try {
    const service = new N8nService(config({ ...base, N8N_INTERVIEW_WEBHOOK_KEY: 'interview-only-key' }));
    assert.equal(await service.triggerInterviewScheduled({ interviewId: 1 }), true);
    assert.equal(await service.triggerOfferIssued({ offerId: 2, token: 't', responseToken: 'r' }), true);
    assert.deepEqual(calls.map(call => call.options.headers['x-n8n-ai-key']), [
      'interview-only-key', base.N8N_AI_KEY,
    ]);
  } finally { global.fetch = original; }
});

test('protected TV2 dispatch fails closed without a key or when n8n rejects it', async () => {
  const original = global.fetch;
  let count = 0;
  global.fetch = async () => { count++; return { ok: false, status: 403 }; };
  try {
    const missing = new N8nService(config({ N8N_WEBHOOK_URL: base.N8N_WEBHOOK_URL }));
    assert.equal(await missing.triggerInterviewScheduled({ interviewId: 1 }), false);
    assert.equal(await missing.triggerOfferIssued({ offerId: 2, token: 't', responseToken: 'r' }), false);
    assert.equal(count, 0);
    const configured = new N8nService(config(base));
    assert.equal(await configured.triggerInterviewScheduled({ interviewId: 3 }), false);
    assert.equal(await configured.triggerOfferIssued({ offerId: 4, token: 't', responseToken: 'r' }), false);
    assert.equal(count, 2);
  } finally { global.fetch = original; }
});
