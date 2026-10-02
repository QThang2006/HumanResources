require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource } = require('typeorm');
const entities = require('../dist/entities');
const { JobsModule } = require('../dist/modules/jobs/jobs.module');
const { AuthModule } = require('../dist/modules/auth/auth.module');
const { AiModule } = require('../dist/modules/core/ai/ai.module');
const { GeminiService } = require('../dist/modules/core/ai/gemini.service');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

test('Jobs CRUD with real MySQL and JWT', { timeout: 60000 }, async t => {
  if (!process.env.ATS_TEST_DB_PASSWORD) throw new Error('Set ATS_TEST_DB_PASSWORD for disposable local MySQL.');
  const database = 'hr_jobs_test_' + randomBytes(8).toString('hex');
  const options = { host: '127.0.0.1', port: Number(process.env.ATS_TEST_DB_PORT || 13316), user: 'root', password: process.env.ATS_TEST_DB_PASSWORD };
  const admin = await mysql.createConnection(options);
  let app;
  t.after(async () => {
    if (app) await app.close();
    if (!/^hr_jobs_test_[a-f0-9]{16}$/.test(database)) throw new Error('Unexpected test database name.');
    await admin.query('DROP DATABASE IF EXISTS ' + database);
    await admin.end();
  });
  await admin.query('CREATE DATABASE ' + database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const module = await Test.createTestingModule({ imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TypeOrmModule.forRoot({ ...options, username: options.user, type: 'mysql', database, entities: Object.values(entities).filter(v => typeof v === 'function'), synchronize: true, timezone: 'Z', logging: false }),
    AiModule, AuthModule, JobsModule,
  ] }).overrideProvider(GeminiService).useValue({ isAvailable: () => false }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(0, '127.0.0.1');
  const db = app.get(DataSource);
  const departments = await db.getRepository(entities.Department).save([{ name: 'Engineering Test', code: 'ENG' }, { name: 'Finance Test', code: 'FIN' }]);
  const passwordHash = await bcrypt.hash('Test-only-password-2026', 4);
  const users = {};
  for (const [key, role, department] of [['hr', 'HR', 0], ['manager', 'MANAGER', 0], ['other', 'MANAGER', 1], ['employee', 'EMPLOYEE', 0], ['admin', 'SUPERADMIN', 0]]) {
    users[key] = await db.getRepository(entities.User).save({ email: key + '@example.test', fullName: key + ' Test', passwordHash, role, departmentId: departments[department].id, isActive: true });
  }
  const tokens = {};
  const base = await app.getUrl() + '/api';
  async function request(path, method = 'GET', body, actor) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(actor ? { Authorization: 'Bearer ' + tokens[actor] } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const content = await response.json();
    return { status: response.status, data: content.data ?? content };
  }
  for (const key of Object.keys(users)) {
    const result = await request('/auth/login', 'POST', { email: users[key].email, password: 'Test-only-password-2026' });
    assert.equal(result.status, 201);
    tokens[key] = result.data.accessToken;
  }
  const input = { title: ' Backend Developer ', departmentId: departments[0].id, description: ' Build APIs ', requirements: ' TypeScript ' };
  let job;
  await t.test('create trims fields, uses authenticated author and database defaults', async () => {
    const result = await request('/jobs', 'POST', input, 'hr');
    assert.equal(result.status, 201); job = result.data;
    assert.equal(job.title, 'Backend Developer'); assert.equal(job.departmentName, 'Engineering Test');
    assert.equal(job.location, 'Hà Nội'); assert.equal(job.status, 'OPEN');
    const stored = await db.getRepository(entities.Job).findOneByOrFail({ id: job.id });
    assert.equal(stored.createdBy, users.hr.id);
    assert.equal(job.createdBy, undefined); assert.equal(job.creator, undefined);
  });
  await t.test('create rejects missing auth, Employee, Manager and fake author', async () => {
    assert.equal((await request('/jobs', 'POST', input)).status, 401);
    for (const role of ['employee', 'manager']) assert.equal((await request('/jobs', 'POST', input, role)).status, 403);
    assert.equal((await request('/jobs', 'POST', { ...input, createdBy: users.manager.id }, 'hr')).status, 400);
  });
  await t.test('DTO and missing departments fail before database write', async () => {
    for (const invalid of [{ ...input, title: ' ' }, { ...input, title: 'x'.repeat(201) }, { ...input, departmentId: 999999 }, { ...input, departmentId: 0 }, { ...input, location: null }, { ...input, salaryRange: '' }]) {
      assert.equal((await request('/jobs', 'POST', invalid, 'hr')).status, 400);
    }
    assert.equal(await db.getRepository(entities.Job).count(), 1);
  });
  await t.test('public reads and protected internal reads enforce scope', async () => {
    assert.equal((await request('/jobs')).data.length, 1);
    assert.equal((await request('/jobs?all=true')).status, 400);
    assert.equal((await request('/jobs/admin')).status, 401);
    assert.equal((await request('/jobs/admin', 'GET', undefined, 'employee')).status, 403);
    assert.equal((await request('/jobs/admin', 'GET', undefined, 'manager')).data.length, 1);
    assert.equal((await request('/jobs/admin', 'GET', undefined, 'other')).data.length, 0);
    assert.equal((await request('/jobs/admin/' + job.id, 'GET', undefined, 'other')).status, 404);
    assert.equal((await request('/jobs/not-an-id')).status, 400);
  });
  await t.test('edit persists allowlisted fields and rejects stale updates', async () => {
    const body = { ...input, title: 'Senior Backend Developer', expectedUpdatedAt: job.updatedAt };
    const result = await request('/jobs/' + job.id, 'PATCH', body, 'hr');
    assert.equal(result.status, 200); assert.equal(result.data.title, 'Senior Backend Developer');
    assert.equal(result.data.location, 'Hà Nội');
    assert.equal((await request('/jobs/' + job.id, 'PATCH', body, 'hr')).status, 409);
    job = result.data;
  });
  await t.test('concurrent status updates accept one revision only', async () => {
    const body = { status: 'CLOSED', expectedUpdatedAt: job.updatedAt };
    const results = await Promise.all([1, 2].map(() => request('/jobs/' + job.id + '/status', 'PATCH', body, 'hr')));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    job = results.find(result => result.status === 200).data;
  });
  await t.test('closed jobs disappear publicly and remain readable internally', async () => {
    assert.equal((await request('/jobs')).data.length, 0);
    assert.equal((await request('/jobs/' + job.id)).status, 404);
    assert.equal((await request('/jobs/admin/' + job.id, 'GET', undefined, 'hr')).data.status, 'CLOSED');
    const result = await request('/jobs/' + job.id + '/status', 'PATCH', { status: 'OPEN', expectedUpdatedAt: job.updatedAt }, 'admin');
    assert.equal(result.status, 200); job = result.data;
    assert.equal((await request('/jobs')).data.length, 1);
  });
  await t.test('updates reject invalid status, stale DTO and non-operator role', async () => {
    const path = '/jobs/' + job.id + '/status';
    assert.equal((await request(path, 'PATCH', { status: 'ARCHIVED', expectedUpdatedAt: job.updatedAt }, 'hr')).status, 400);
    assert.equal((await request(path, 'PATCH', { status: 'CLOSED' }, 'hr')).status, 400);
    assert.equal((await request(path, 'PATCH', { status: 'CLOSED', expectedUpdatedAt: job.updatedAt }, 'manager')).status, 403);
    assert.equal((await request('/jobs/999999', 'PATCH', { ...input, expectedUpdatedAt: job.updatedAt }, 'hr')).status, 404);
  });
  await t.test('department transfer blocked after receiving an application; closing preserves it', async () => {
    await db.getRepository(entities.Application).save({ jobId: job.id, candidateName: 'Synthetic candidate', candidateEmail: 'candidate@example.test', cvFileUrl: 'fixture-only.pdf' });
    assert.equal((await request('/jobs/' + job.id, 'PATCH', { ...input, departmentId: departments[1].id, expectedUpdatedAt: job.updatedAt }, 'hr')).status, 400);
    assert.equal((await request('/jobs/' + job.id + '/status', 'PATCH', { status: 'CLOSED', expectedUpdatedAt: job.updatedAt }, 'hr')).status, 200);
    assert.equal(await db.getRepository(entities.Application).count(), 1);
  });

  let searchJobs;
  await t.test('title search trims keywords, preserves array responses and only returns OPEN jobs', async () => {
    const rows = [
      { title: 'Backend Search Engineer', departmentId: departments[0].id },
      { title: 'Backend Search Finance', departmentId: departments[1].id },
      { title: 'Backend Search Closed', departmentId: departments[0].id, status: 'CLOSED' },
      { title: 'Platform Reliability', departmentId: departments[0].id, description: 'Backend Search in description only' },
    ];
    searchJobs = await db.getRepository(entities.Job).save(rows.map(row => ({ ...input, status: 'OPEN', createdBy: users.hr.id, ...row })));
    const result = await request('/jobs?q=' + encodeURIComponent('  backend search  '));
    assert.equal(result.status, 200); assert.ok(Array.isArray(result.data));
    assert.deepEqual(result.data.map(item => item.id), [searchJobs[1].id, searchJobs[0].id]);
    assert.deepEqual((await request('/jobs?q=not-a-matching-title')).data, []);
    const all = (await request('/jobs')).data;
    assert.deepEqual((await request('/jobs?q=%20%20')).data, all);
    assert.deepEqual((await request('/jobs?all=false&q=')).data, all);
    assert.equal((await request('/jobs?all=true&q=Backend')).status, 400);
  });
  await t.test('search retains internal auth and Manager department scope', async () => {
    const path = '/jobs/admin?q=Backend%20Search';
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, 'GET', undefined, 'employee')).status, 403);
    assert.deepEqual((await request(path, 'GET', undefined, 'manager')).data.map(item => item.id), [searchJobs[2].id, searchJobs[0].id]);
    assert.deepEqual((await request(path, 'GET', undefined, 'other')).data.map(item => item.id), [searchJobs[1].id]);
    assert.equal((await request(path, 'GET', undefined, 'hr')).data.length, 3);
  });
  await t.test('search rejects oversized or structured keywords with production validation settings', async () => {
    for (const query of ['q=' + 'x'.repeat(151), 'q=a&q=b', 'q[name]=Backend', 'q[]=Backend']) {
      assert.equal((await request('/jobs?' + query)).status, 400, query);
      assert.equal((await request('/jobs/admin?' + query, 'GET', undefined, 'hr')).status, 400, query);
    }
    assert.equal((await request('/jobs?q=' + 'x'.repeat(150))).status, 200);
  });
  await t.test('search binds quotes safely and matches SQL wildcard characters literally', async () => {
    const special = await db.getRepository(entities.Job).save({ ...input, title: "O'Reilly 100% Data_Team! C\\Tools", createdBy: users.hr.id });
    for (const keyword of ["O'Reilly", '%', '_', '!', '\\']) {
      const result = await request('/jobs?q=' + encodeURIComponent(keyword));
      assert.equal(result.status, 200);
      assert.deepEqual(result.data.map(item => item.id), [special.id], keyword);
    }
    assert.deepEqual((await request('/jobs?q=' + encodeURIComponent("' OR 1=1 --"))).data, []);
  });
});
