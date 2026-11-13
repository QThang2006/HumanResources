// Real Nest HTTP, isolated MySQL-compatible DB, CV storage and loopback SMTP.
// n8n transport/engine and AI provider are explicit contract fixtures, never live services.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodemailer = require('nodemailer');
const { startHarness } = require('./recruitment-harness.cjs');
const { CvScoreQueueService } = require('../dist/modules/applications/cv-score-queue.service');
const { ApplicationAcknowledgementService } = require('../dist/modules/applications/application-acknowledgement.service');
const { CvStorageService } = require('../dist/modules/applications/cv-storage.service');
const { NAMES } = require('../../scripts/patch-wf02-website-ack.cjs');

async function smtpSink() {
  const messages = [], sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    let buffer = '', collecting = false, data = [], recipients = [];
    socket.write('220 localhost isolated test SMTP\r\n');
    socket.on('data', chunk => {
      buffer += chunk.toString(); let index;
      while ((index = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (collecting) {
          if (line === '.') { messages.push({ recipients: [...recipients], raw: data.join('\r\n') }); collecting = false; data = []; socket.write('250 accepted by loopback sink\r\n'); }
          else data.push(line);
          continue;
        }
        if (/^(EHLO|HELO)/i.test(line)) socket.write('250 localhost\r\n');
        else if (/^MAIL FROM:/i.test(line)) { recipients = []; socket.write('250 OK\r\n'); }
        else if (/^RCPT TO:/i.test(line)) {
          const email = line.match(/<([^>]+)>/)?.[1];
          if (!email?.endsWith('@example.test')) socket.write('550 Synthetic recipients only\r\n');
          else { recipients.push(email); socket.write('250 OK\r\n'); }
        } else if (line === 'DATA') { collecting = true; socket.write('354 End with dot\r\n'); }
        else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { messages, port: server.address().port, async close() { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); } };
}

test('website receipt: real apply API, MySQL claims, unchanged BE AI queue, SMTP and callbacks', { timeout: 120000 }, async t => {
  process.env.N8N_ACKNOWLEDGEMENT_ENABLED = 'true';
  process.env.MAIL_FROM = 'hr@example.test';
  process.env.N8N_INTAKE_KEY = 'isolated-acknowledgement-key-'.repeat(3);
  const h = await startHarness();
  t.after(() => h.close());
  const worker = h.app.get(ApplicationAcknowledgementService);
  const ai = h.app.get(CvScoreQueueService);
  // Advance workers explicitly; no test race with the 3/30 second production intervals.
  await worker.onModuleDestroy(); await ai.onModuleDestroy();
  h.automation.triggerApplicationCreated = async payload => { h.automation.acknowledgementCalls.push(payload); throw Error('Synthetic n8n outage'); };
  const job = (await h.request('/jobs', { method: 'POST', who: 'hr', body: {
    title: '[ATS TEST] isolated website receipt', departmentId: h.departments[0].id,
    description: 'Build APIs', requirements: 'TypeScript NestJS',
  } })).data;
  let applicationId;
  async function internal(route, body, key = process.env.N8N_INTAKE_KEY) {
    const response = await fetch(h.base + route, { method: 'POST', headers: {
      ...(key ? { 'x-intake-key': key } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, body: body ? JSON.stringify(body) : undefined });
    const content = await response.json();
    return { status: response.status, data: content.data ?? content };
  }
  await t.test('HTTP 201 and CV persist despite n8n outage; AI still completes through BE', async () => {
    const submitted = await h.request('/applications/apply', { method: 'POST', body: h.upload(job.id, 'website@example.test') });
    assert.equal(submitted.status, 201, JSON.stringify(submitted.data));
    applicationId = submitted.data.applicationId;
    let row = await h.db.getRepository(h.entities.Application).findOneByOrFail({ id: applicationId });
    assert.equal(row.acknowledgementStatus, 'PENDING'); assert.equal(row.intakeChannel, null);
    assert.equal(row.aiScoreStatus, 'PENDING'); assert.match(row.aiScoreRequestId, /^be:/);
    assert.ok((await h.app.get(CvStorageService).read(row.cvFileUrl)).length > 100);
    h.sdk.scoreResume = async () => ({ ok: true, mode: 'LIVE', data: { matchScore: 81, summary: 'Synthetic CV review', skillsDetected: ['TypeScript'] } });
    await ai.processNext();
    row = await h.db.getRepository(h.entities.Application).findOneByOrFail({ id: applicationId });
    assert.equal(row.aiScoreStatus, 'COMPLETED'); assert.equal(Number(row.matchScore), 81);
    assert.equal(row.acknowledgementStatus, 'PENDING');
    await worker.processPending();
    assert.equal(h.automation.acknowledgementCalls.length, 2);
  });
  let claim;
  await t.test('internal key is required and parallel MySQL transactions authorize exactly one execution', async () => {
    const route = `/recruitment/intake/${applicationId}/acknowledgement/claim`;
    assert.equal((await internal(route, undefined, '')).status, 401);
    assert.equal((await internal(route, undefined, 'wrong')).status, 401);
    const results = await Promise.all(Array.from({ length: 12 }, () => internal(route, { candidateEmail: 'ignored@example.test' })));
    assert.ok(results.every(r => r.status === 201), JSON.stringify(results));
    const allowed = results.filter(r => r.data.shouldSend);
    assert.equal(allowed.length, 1); claim = allowed[0].data;
    assert.equal(claim.candidateEmail, 'website@example.test');
    assert.equal(claim.applicationId, applicationId);
    assert.equal((await h.db.getRepository(h.entities.Application).findOneByOrFail({ id: applicationId })).acknowledgementStatus, 'CLAIMED');
    const count = h.automation.acknowledgementCalls.length;
    await worker.processPending(); assert.equal(h.automation.acknowledgementCalls.length, count);
  });
  await t.test('workflow renderer -> real local SMTP -> protected callback; duplicate deliveries do not resend', async () => {
    const sink = await smtpSink();
    try {
      const w = JSON.parse(fs.readFileSync(path.join(__dirname, '../../workflows/candidate-intake-omnichannel.json'), 'utf8'));
      const renderer = w.nodes.find(n => n.name === NAMES[3]);
      const rendered = vm.runInNewContext('(function(){' + renderer.parameters.jsCode + '\n})()', { $json: { data: claim } }, { timeout: 1000 }).json;
      const transport = nodemailer.createTransport({ host: '127.0.0.1', port: sink.port, secure: false, ignoreTLS: true, connectionTimeout: 5000 });
      const info = await transport.sendMail({ from: rendered.fromEmail, to: rendered.candidateEmail, subject: rendered.subject, html: rendered.html });
      transport.close();
      assert.equal(sink.messages.length, 1);
      assert.deepEqual(sink.messages[0].recipients, ['website@example.test']);
      assert.doesNotMatch(sink.messages[0].raw, /^(Cc|Bcc):/mi);
      const route = `/recruitment/intake/${applicationId}/acknowledgement`;
      assert.equal((await internal(route, { accepted: ['other@example.test'], messageId: info.messageId })).status, 409);
      const body = { accepted: info.accepted, messageId: info.messageId };
      assert.equal((await internal(route, body)).status, 201);
      assert.equal((await internal(route, body)).status, 201);
      assert.equal((await internal(route, { ...body, messageId: '<conflicting@loopback.test>' })).status, 409);
      assert.equal((await internal(route + '/claim')).data.shouldSend, false);
      const row = await h.db.getRepository(h.entities.Application).findOneByOrFail({ id: applicationId });
      assert.equal(row.acknowledgementStatus, 'SMTP_ACCEPTED'); assert.equal(row.acknowledgementMessageId, info.messageId);
      assert.equal(row.aiScoreStatus, 'COMPLETED'); assert.equal(sink.messages.length, 1);
    } finally { await sink.close(); }
  });
  await t.test('duplicate public submission and existing Form path keep their deduplication rules', async () => {
    const count = h.automation.acknowledgementCalls.length;
    const duplicate = await h.request('/applications/apply', { method: 'POST', body: h.upload(job.id, 'website@example.test') });
    assert.equal(duplicate.status, 409); assert.equal(h.automation.acknowledgementCalls.length, count);
    const upload = h.upload(job.id, 'form@example.test'); upload.set('channel', 'GOOGLE_FORM'); upload.set('sourceId', 'isolated-sheet-row-1');
    const response = await fetch(h.base + '/recruitment/intake', { method: 'POST', headers: { 'x-intake-key': process.env.N8N_INTAKE_KEY }, body: upload });
    const content = await response.json(), result = content.data ?? content;
    assert.equal(response.status, 201, JSON.stringify(content)); assert.equal(result.shouldSend, true);
    const row = await h.db.getRepository(h.entities.Application).findOneByOrFail({ id: result.applicationId });
    assert.equal(row.intakeChannel, 'GOOGLE_FORM'); assert.equal(row.acknowledgementStatus, 'CLAIMED');
    assert.equal(h.automation.acknowledgementCalls.length, count);
    assert.equal((await internal(`/recruitment/intake/${row.id}/acknowledgement/claim`)).status, 409);
    assert.equal((await internal(`/recruitment/intake/${row.id}/acknowledgement`, { accepted: ['form@example.test'], messageId: '<existing-form@loopback.test>' })).status, 201);
  });
  await t.test('legacy NULL receipts are not backfilled or automatically mailed', async () => {
    const count = h.automation.acknowledgementCalls.length;
    await h.db.getRepository(h.entities.Application).update(applicationId, { acknowledgementStatus: null, acknowledgementMessageId: null });
    await worker.processPending();
    assert.equal(h.automation.acknowledgementCalls.length, count);
    assert.equal((await internal(`/recruitment/intake/${applicationId}/acknowledgement/claim`)).data.shouldSend, false);
  });
});
