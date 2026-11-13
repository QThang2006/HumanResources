require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ApplicationAcknowledgementService } = require('../dist/modules/applications/application-acknowledgement.service');
const { ApplicationsService } = require('../dist/modules/applications/applications.service');
const { IntakeController } = require('../dist/modules/applications/intake.controller');
const { Application } = require('../dist/entities/application.entity');
const { Job } = require('../dist/entities/job.entity');
const { N8nService } = require('../dist/modules/core/automation/n8n.service');
const config = values => ({ get: key => values[key] });
function harness(settings = {}) {
  const values = { N8N_ACKNOWLEDGEMENT_ENABLED: 'true', MAIL_FROM: 'hr@example.test', ...settings };
  const row = { id: 41, jobId: 17, intakeChannel: null, acknowledgementStatus: 'PENDING',
    candidateName: 'Synthetic Candidate', candidateEmail: 'candidate@example.test', aiScoreStatus: 'PENDING' };
  let tail = Promise.resolve(), reads = 0;
  const repo = {
    async findOne(options) { assert.equal(options.lock.mode, 'pessimistic_write'); return row.id === options.where.id ? structuredClone(row) : null; },
    async save(value) { Object.assign(row, value); return value; },
    createQueryBuilder() {
      reads++;
      const builder = new Proxy({}, { get(_, name) {
        if (name === 'getMany') return async () => !row.intakeChannel && row.acknowledgementStatus === 'PENDING' ? [{ id: row.id }] : [];
        return () => builder;
      }});
      return builder;
    },
  };
  const manager = { getRepository() { return repo; } };
  const db = { ...manager, transaction(fn) {
    const run = tail.then(() => fn(manager)); tail = run.catch(() => {}); return run;
  } };
  const calls = [];
  const n8n = { async triggerApplicationCreated(payload) { calls.push(payload); return true; } };
  const service = new ApplicationAcknowledgementService(db, config(values), n8n);
  return { row, values, repo, db, calls, n8n, service, reads: () => reads };
}

test('concurrent website executions get one SMTP authorization from authoritative stored data', async () => {
  const h = harness();
  const second = new ApplicationAcknowledgementService(h.db, config(h.values), h.n8n);
  const claims = await Promise.all(Array.from({ length: 25 }, (_, i) => (i % 2 ? second : h.service).claim(41)));
  const allowed = claims.filter(c => c.shouldSend);
  assert.equal(allowed.length, 1);
  assert.equal(allowed[0].candidateEmail, 'candidate@example.test');
  assert.equal(allowed[0].channel, 'WEBSITE');
  assert.equal(h.row.acknowledgementStatus, 'CLAIMED');
  assert.equal(h.row.aiScoreStatus, 'PENDING');
});

test('disabled rollout and invalid MAIL_FROM never consume a pending receipt', async () => {
  const disabled = harness({ N8N_ACKNOWLEDGEMENT_ENABLED: 'false' });
  await disabled.service.dispatch(41); await disabled.service.processPending();
  assert.equal(disabled.calls.length, 0); assert.equal(disabled.reads(), 0);
  await assert.rejects(disabled.service.claim(41), e => e.getStatus() === 503);
  const invalid = harness({ MAIL_FROM: '' });
  await assert.rejects(invalid.service.claim(41), e => e.getStatus() === 503);
  assert.equal(invalid.row.acknowledgementStatus, 'PENDING');
});

test('Form/Gmail and legacy unqueued website applications cannot acquire website authorization', async () => {
  for (const channel of ['GOOGLE_FORM', 'GMAIL']) {
    const h = harness(); h.row.intakeChannel = channel;
    await assert.rejects(h.service.claim(41), e => e.getStatus() === 409);
  }
  const h = harness();
  await assert.rejects(h.service.claim(999), e => e.getStatus() === 409);
  for (const state of [null, 'CLAIMED', 'SMTP_ACCEPTED']) {
    h.row.acknowledgementStatus = state;
    assert.deepEqual(await h.service.claim(41), { shouldSend: false });
  }
});

test('a failed dispatch stays durable and is retried only while unclaimed', async () => {
  const h = harness();
  h.n8n.triggerApplicationCreated = async payload => { h.calls.push(payload); throw Error('Synthetic outage'); };
  await h.service.dispatch(41);
  assert.equal(h.row.acknowledgementStatus, 'PENDING');
  const restarted = new ApplicationAcknowledgementService(h.db, config(h.values), h.n8n);
  await restarted.processPending();
  assert.equal(h.calls.length, 2);
  h.row.acknowledgementStatus = 'CLAIMED';
  await restarted.processPending();
  h.row.acknowledgementStatus = 'SMTP_ACCEPTED';
  await restarted.processPending();
  assert.equal(h.calls.length, 2, 'SMTP uncertainty or accepted mail must never trigger an automatic resend');
});

test('SMTP callback accepts a claimed website receipt, repeats idempotently, and rejects wrong data', async () => {
  const h = harness(); const controller = new IntakeController({}, h.db, config(h.values), h.service);
  const accepted = { accepted: ['CANDIDATE@example.test'], messageId: '<synthetic@loopback.test>' };
  await assert.rejects(controller.acknowledge(41, accepted), e => e.getStatus() === 409);
  await h.service.claim(41);
  await assert.rejects(controller.acknowledge(41, { ...accepted, accepted: ['other@example.test'] }), e => e.getStatus() === 409);
  assert.deepEqual(await controller.acknowledge(41, accepted), { recorded: true });
  assert.deepEqual(await controller.acknowledge(41, accepted), { recorded: true });
  assert.equal(h.row.acknowledgementStatus, 'SMTP_ACCEPTED');
  await assert.rejects(controller.acknowledge(41, { ...accepted, messageId: '<other@loopback.test>' }), e => e.getStatus() === 409);
  assert.equal(h.row.acknowledgementMessageId, accepted.messageId);
  assert.deepEqual(await h.service.claim(41), { shouldSend: false });
});

test('existing Form/Gmail acknowledgement callbacks remain valid', async () => {
  for (const channel of ['GOOGLE_FORM', 'GMAIL']) {
    const h = harness(); h.row.intakeChannel = channel; h.row.acknowledgementStatus = 'CLAIMED';
    const controller = new IntakeController({}, h.db, config(h.values), h.service);
    await controller.acknowledge(41, { accepted: ['candidate@example.test'], messageId: '<form@loopback.test>' });
    assert.equal(h.row.acknowledgementStatus, 'SMTP_ACCEPTED');
  }
});

test('real apply service saves a website CV and BE scoring work even while dispatch fails', async () => {
  let saved, removed = 0, calls = 0;
  const appRepo = { create(value) { return value; }, async save(value) { saved = { ...value, id: 51, createdAt: new Date() }; return saved; } };
  const jobs = { async findOneBy() { return { status: 'OPEN' }; }, async findOne() { return { status: 'OPEN' }; } };
  const manager = { getRepository(type) { return type === Application ? appRepo : jobs; } };
  const db = { ...manager, async transaction(fn) { return fn(manager); } };
  const files = { async parse() { return 'Synthetic TypeScript CV'; }, async save() { return 'private/cv.pdf'; }, async remove() { removed++; } };
  const ack = new ApplicationAcknowledgementService(db, config({ N8N_ACKNOWLEDGEMENT_ENABLED: 'true' }), {
    async triggerApplicationCreated() { calls++; throw Error('Synthetic n8n outage'); },
  });
  const service = new ApplicationsService(appRepo, db, files, {}, {}, {}, {}, {}, ack);
  const input = { jobId: 17, candidateEmail: 'Candidate@example.test', candidateName: 'Synthetic CV' };
  const result = await service.apply(input, {});
  assert.equal(result.applicationId, 51);
  assert.equal(saved.acknowledgementStatus, 'PENDING');
  assert.equal(saved.aiScoreStatus, 'PENDING'); assert.match(saved.aiScoreRequestId, /^be:/);
  assert.equal(saved.candidateEmail, 'candidate@example.test');
  assert.equal(removed, 0); assert.equal(calls, 1);
  await service.apply(input, {}, { key: 'form-source', channel: 'GOOGLE_FORM' });
  assert.equal(saved.acknowledgementStatus, 'CLAIMED'); assert.equal(calls, 1);
  appRepo.save = async () => { throw { code: 'ER_DUP_ENTRY' }; };
  await assert.rejects(service.apply(input, {}), e => e.getStatus() === 409);
  assert.equal(removed, 1); assert.equal(calls, 1);
});

test('website dispatch authenticates, sends an ID only, and fails closed without a key', async () => {
  const original = global.fetch; let captured, calls = 0;
  global.fetch = async (url, options) => { calls++; captured = { url, options }; return { ok: true, status: 200 }; };
  try {
    const n8n = new N8nService(config({ N8N_WEBHOOK_URL: 'http://n8n.test/webhook/', N8N_INTAKE_KEY: 'synthetic-intake-key-'.repeat(3) }));
    assert.equal(await n8n.triggerApplicationCreated({ applicationId: 41 }), true);
    assert.equal(captured.url, 'http://n8n.test/webhook/application-received');
    assert.equal(captured.options.headers['x-intake-key'], 'synthetic-intake-key-'.repeat(3));
    assert.equal(captured.options.headers['x-n8n-ai-key'], undefined);
    assert.deepEqual(JSON.parse(captured.options.body).data, { applicationId: 41 });
    assert.equal(captured.options.body.includes('synthetic-intake-key-'), false);
    assert.equal(captured.options.body.includes('candidateEmail'), false);
    assert.equal(await new N8nService(config({})).triggerApplicationCreated({ applicationId: 41 }), false);
    assert.equal(calls, 1);
  } finally { global.fetch = original; }
});
