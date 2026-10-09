// Browser test runtime: real TV2 Auth/MySQL/N8nService; only synthetic data.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const mysql = require('mysql2/promise');
const { startHarness } = require('./recruitment-harness.cjs');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const output = path.join(root, '.temp/tv2-web-test');
  const importDir = path.join(root, '.temp/n8n-import');
  const runtime = JSON.parse(await fs.readFile(path.join(output, 'mysql-runtime.json'), 'utf8'));
  const self = JSON.parse(
    await fs.readFile(path.join(importDir, 'tv2-self-test-config.json'), 'utf8'),
  ).selfEmail;
  if (!/^[^\s@]+@gmail\.com$/i.test(self))
    throw new Error('Personal Gmail test configuration required');
  const mysqlPassword = crypto.randomBytes(24).toString('hex');
  const bootstrap = await mysql.createConnection({
    host: '127.0.0.1',
    port: runtime.port,
    user: 'root',
  });
  await bootstrap.query(
    "ALTER USER 'root'@'localhost' IDENTIFIED BY " + bootstrap.escape(mysqlPassword),
  );
  await bootstrap.end();
  Object.assign(process.env, {
    ATS_TEST_DB_PORT: String(runtime.port),
    ATS_TEST_DB_PASSWORD: mysqlPassword,
    ATS_TEST_API_PORT: '3011',
    MAIL_FROM: self,
    HR_EMAIL: self,
    N8N_WEBHOOK_URL: 'http://localhost:5678/webhook-test/hr-tv2-readback-test',
    RECRUITMENT_CALLBACK_BASE_URL: 'http://127.0.0.1:3011/api',
  });
  const h = await startHarness({ realServices: true });
  let dispatchCount = 0;
  const actualTrigger = h.automation.triggerInterviewScheduled.bind(h.automation);
  h.automation.triggerInterviewScheduled = (payload) => {
    dispatchCount++;
    return actualTrigger(payload);
  };
  await h.db
    .getRepository(h.entities.User)
    .update(h.users.manager.id, { email: self, fullName: 'TV2 WEB TEST - Manager' });
  const job = await h.request('/jobs', {
    method: 'POST',
    who: 'hr',
    body: {
      title: 'TV2 WEB TEST - Backend Engineer',
      departmentId: h.departments[0].id,
      description: 'Du lieu gia de test xep lich tu website TV2.',
      requirements: 'TypeScript, React, NestJS, MySQL.',
    },
  });
  if (job.status !== 201) throw new Error('Test Job creation failed');
  const form = h.upload(job.data.id, self);
  form.set('candidateName', 'TV2 WEB TEST - Ung vien gia');
  const applied = await h.request('/applications/apply', { method: 'POST', body: form });
  if (applied.status !== 201) throw new Error('Test application upload failed');
  const applicationId = applied.data.applicationId;
  const reference = 'TV2-WEB-20261007-' + crypto.randomBytes(5).toString('hex');
  const controlToken = crypto.randomBytes(24).toString('hex');
  const config = {
    selfEmail: self,
    scheduledAt: runtime.scheduledAt,
    testReference: reference,
    applicationId,
    interviewerId: h.users.manager.id,
    callbackBaseUrl: 'http://127.0.0.1:3011/api',
  };
  await fs.writeFile(
    path.join(importDir, 'tv2-web-test-config.json'),
    JSON.stringify(config, null, 2) + '\n',
  );
  const publicInfo = {
    ready: true,
    api: h.base,
    frontend: 'http://localhost:5173/admin/recruitment',
    control: 'http://127.0.0.1:3012',
    applicationId,
    jobId: job.data.id,
    interviewerId: h.users.manager.id,
    testReference: reference,
    scheduledAt: runtime.scheduledAt,
    mysqlPort: runtime.port,
    database: h.db.options.database,
    processId: process.pid,
  };
  let closing = false;
  const control = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      if (req.method === 'GET' && req.url === '/status') {
        const detail = await h.request('/applications/' + applicationId, { who: 'hr' });
        const rows = await h.db
          .getRepository(h.entities.Interview)
          .find({ where: { applicationId }, order: { round: 'ASC' } });
        res.end(
          JSON.stringify({
            ...publicInfo,
            status: detail.data.status,
            interviewCount: rows.length,
            dispatchCount,
            interviews: detail.data.interviews,
          }),
        );
      } else if (
        req.method === 'POST' &&
        req.headers['x-tv2-test-token'] === controlToken &&
        req.url === '/verify-duplicate'
      ) {
        const before = dispatchCount;
        const stored = await h.db
          .getRepository(h.entities.Interview)
          .findOneBy({ applicationId, round: 1 });
        if (!stored) throw new Error('Schedule from the website first');
        const payload = {
          interviewerId: stored.interviewerId,
          round: stored.round,
          scheduledAt: stored.scheduledAt.toISOString(),
        };
        const replay = await h.request('/applications/' + applicationId + '/interview', {
          who: 'hr',
          method: 'POST',
          body: payload,
        });
        const denied = await h.request('/applications/' + applicationId + '/interview', {
          who: 'other',
          method: 'POST',
          body: payload,
        });
        const count = await h.db.getRepository(h.entities.Interview).countBy({ applicationId });
        const ok =
          replay.status === 201 &&
          replay.data.dispatch === 'NOT_RETRIED' &&
          denied.status === 403 &&
          count === 1 &&
          dispatchCount === before;
        res.end(
          JSON.stringify({
            verified: ok,
            replayStatus: replay.status,
            replayDispatch: replay.data.dispatch,
            unauthorizedStatus: denied.status,
            interviewCount: count,
            dispatchCount,
          }),
        );
      } else if (
        req.method === 'POST' &&
        req.headers['x-tv2-test-token'] === controlToken &&
        req.url === '/stop' &&
        !closing
      ) {
        closing = true;
        await h.close();
        const admin = await mysql.createConnection({
          host: '127.0.0.1',
          port: runtime.port,
          user: 'root',
          password: mysqlPassword,
        });
        try {
          await admin.query('SHUTDOWN');
        } catch (e) {
          if (!['PROTOCOL_CONNECTION_LOST', 'ECONNRESET'].includes(e.code)) throw e;
        }
        await admin.end().catch(() => {});
        res.end(JSON.stringify({ stopped: true, testDatabaseRemoved: true }));
        control.close(() => process.exit(0));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'TV2 test control operation failed' }));
    }
  });
  await new Promise((resolve) => control.listen(3012, '127.0.0.1', resolve));
  await fs.writeFile(
    path.join(output, 'runtime-state.json'),
    JSON.stringify({ ...publicInfo, controlToken }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      ...publicInfo,
      data: 'SYNTHETIC',
      sdk: 'REAL',
      providersInvoked: 'NONE_UNTIL_WEBSITE_SCHEDULE',
    }),
  );
})().catch((error) => {
  console.error('TV2 web runtime failed: ' + error.message);
  process.exitCode = 1;
});
