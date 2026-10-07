require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource } = require('typeorm');
const mysql = require('mysql2/promise');
const { randomBytes } = require('node:crypto');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const bcrypt = require('bcrypt');
const entities = require('../dist/entities');
const { JobsModule } = require('../dist/modules/jobs/jobs.module');
const { ApplicationsModule } = require('../dist/modules/applications/applications.module');
const { AuthModule } = require('../dist/modules/auth/auth.module');
const { AiModule } = require('../dist/modules/core/ai/ai.module');
const { AutomationModule } = require('../dist/modules/core/automation/automation.module');
const { GeminiService } = require('../dist/modules/core/ai/gemini.service');
const { N8nService } = require('../dist/modules/core/automation/n8n.service');
const { InterviewDelivery } = require('../dist/modules/applications/interview-delivery.entity');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { HttpExceptionFilter } = require('../dist/common/filters/http-exception.filter');

function pdf(text = 'Candidate CV - TypeScript NestJS React MySQL experience') {
  const stream = 'BT /F1 14 Tf 50 750 Td (' + text.replace(/[()\\]/g, '') + ') Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let body = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(body)); body += (i + 1) + ' 0 obj\n' + object + '\nendobj\n'; });
  const xref = Buffer.byteLength(body);
  body += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  body += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(body);
}

async function startHarness({ realServices = false, frontendOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'] } = {}) {
  if (!process.env.ATS_TEST_DB_PASSWORD) throw new Error('Set ATS_TEST_DB_PASSWORD for a disposable local MySQL instance.');
  const options = { host: '127.0.0.1', port: Number(process.env.ATS_TEST_DB_PORT || 13316), user: 'root', password: process.env.ATS_TEST_DB_PASSWORD };
  const name = 'hr_ats_test_' + randomBytes(8).toString('hex');
  const admin = await mysql.createConnection(options);
  const directory = await mkdtemp(join(tmpdir(), 'hr-ats-test-'));
  process.env.ATS_UPLOAD_DIR = directory;
  let app;
  const sdk = {};
  const automation = { calls: [], hireCalls: [], accepted: true, hireAccepted: true,
    async triggerInterviewScheduled(payload) { this.calls.push(payload); return this.accepted; },
    async triggerEmployeeHired(payload) { this.hireCalls.push(payload); return this.hireAccepted; } };
  async function close() {
    if (app) await app.close();
    // Only the random database created by this harness can be removed.
    if (!/^hr_ats_test_[a-f0-9]{16}$/.test(name)) throw new Error('Invalid test database name');
    await admin.query('DROP DATABASE IF EXISTS ' + name);
    await admin.end();
    await rm(directory, { recursive: true, force: true });
  }
  try {
    await admin.query('CREATE DATABASE ' + name + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    let builder = Test.createTestingModule({ imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: !realServices }),
      TypeOrmModule.forRoot({ ...options, username: options.user, type: 'mysql', database: name, entities: [...Object.values(entities).filter(v => typeof v === 'function'), InterviewDelivery], synchronize: true, timezone: 'Z', logging: false }),
      AiModule, AutomationModule, AuthModule, JobsModule, ApplicationsModule,
    ] });
    if (!realServices) builder = builder.overrideProvider(GeminiService).useValue(sdk).overrideProvider(N8nService).useValue(automation);
    const module = await builder.compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api'); app.enableCors({ origin: frontendOrigins });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new TransformInterceptor()); app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(Number(process.env.ATS_TEST_API_PORT || 0), '127.0.0.1');
    const db = app.get(DataSource);
    const departments = await db.getRepository(entities.Department).save([{ name: 'Engineering Test', code: 'ENG' }, { name: 'Finance Test', code: 'FIN' }]);
    const passwordHash = await bcrypt.hash('Test-only-password-2026', 4);
    const users = {};
    for (const [key, role, dept] of [['hr', 'HR', 0], ['manager', 'MANAGER', 0], ['peer', 'MANAGER', 0], ['other', 'MANAGER', 1], ['employee', 'EMPLOYEE', 0], ['admin', 'SUPERADMIN', 0]]) {
      users[key] = await db.getRepository(entities.User).save({ email: key + '@example.test', passwordHash, fullName: key + ' Test', role, departmentId: departments[dept].id, isActive: true });
    }
    const base = await app.getUrl() + '/api';
    const tokens = {};
    async function request(path, { method = 'GET', body, who, raw = false } = {}) {
      const headers = {}; if (who) headers.Authorization = 'Bearer ' + tokens[who];
      if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
      const response = await fetch(base + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
      const content = raw ? Buffer.from(await response.arrayBuffer()) : await response.json();
      return { status: response.status, data: content.data ?? content, headers: response.headers };
    }
    for (const key of Object.keys(users)) {
      const login = await request('/auth/login', { method: 'POST', body: { email: users[key].email, password: 'Test-only-password-2026' } });
      if (login.status !== 201) throw new Error('Fixture login failed: ' + JSON.stringify(login.data));
      tokens[key] = login.data.accessToken;
    }
    function upload(jobId, email, buffer = pdf()) {
      const body = new FormData(); body.set('jobId', String(jobId)); body.set('candidateName', 'Test Candidate'); body.set('candidateEmail', email); body.set('candidatePhone', '0900000000');
      body.set('cv', new Blob([buffer], { type: 'application/pdf' }), 'test-cv.pdf'); return body;
    }
    return { app, db, sdk: realServices ? app.get(GeminiService) : sdk, automation: realServices ? app.get(N8nService) : automation, users, departments, tokens, base, request, upload, directory, close, entities };
  } catch (error) { await close(); throw error; }
}
module.exports = { startHarness, pdf };
