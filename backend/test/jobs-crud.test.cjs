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

  await t.test('department filter combines OPEN and keyword conditions without changing the array contract', async () => {
    const path = '/jobs?departmentId=' + departments[0].id;
    const result = await request(path);
    assert.equal(result.status, 200); assert.ok(Array.isArray(result.data));
    assert.ok(result.data.length > 0);
    assert.ok(result.data.every(item => item.departmentId === departments[0].id && item.status === 'OPEN'));
    assert.deepEqual((await request(path + '&q=%20Backend%20Search%20')).data.map(item => item.id), [searchJobs[0].id]);
    assert.deepEqual((await request('/jobs?departmentId=' + departments[1].id + '&q=Backend')).data.map(item => item.id), [searchJobs[1].id]);
    assert.deepEqual((await request(path + '&q=missing-title')).data, []);
    assert.deepEqual((await request('/jobs?departmentId=2147483647')).data, []);
    assert.ok((await request('/jobs')).data.some(item => item.departmentId === departments[1].id));
    assert.deepEqual((await request(path + '&all=false')).data, result.data);
    assert.equal((await request(path + '&all=true')).status, 400);
  });
  await t.test('requested departments never override Manager scope or internal authentication', async () => {
    const own = '/jobs/admin?departmentId=' + departments[0].id + '&q=Backend%20Search';
    const other = '/jobs/admin?departmentId=' + departments[1].id + '&q=Backend%20Search';
    assert.equal((await request(own)).status, 401);
    assert.equal((await request(own, 'GET', undefined, 'employee')).status, 403);
    assert.deepEqual((await request(own, 'GET', undefined, 'manager')).data.map(item => item.id), [searchJobs[2].id, searchJobs[0].id]);
    assert.deepEqual((await request(other, 'GET', undefined, 'manager')).data, []);
    assert.deepEqual((await request(own, 'GET', undefined, 'other')).data, []);
    for (const actor of ['hr', 'admin', 'other']) {
      assert.deepEqual((await request(other, 'GET', undefined, actor)).data.map(item => item.id), [searchJobs[1].id]);
    }
  });
  await t.test('department validation rejects malformed numbers and structured queries', async () => {
    const invalid = ['', '0', '-1', '1.5', '1e0', '0x1', 'NaN', 'Infinity', 'abc', '2147483648', '9007199254740993', '%20', '%201%20'];
    for (const query of [...invalid.map(value => 'departmentId=' + value), 'departmentId=1&departmentId=2', 'departmentId[]=1', 'departmentId[id]=1']) {
      assert.equal((await request('/jobs?' + query)).status, 400, query);
      assert.equal((await request('/jobs/admin?' + query, 'GET', undefined, 'hr')).status, 400, query);
    }
  });
  await t.test('public lookup exposes unique id/name pairs only for departments with OPEN jobs and follows status changes', async () => {
    const [empty, closedOnly] = await db.getRepository(entities.Department).save([
      { name: 'Empty Test', code: 'EMPTY', description: 'Internal department metadata', managerId: users.hr.id },
      { name: 'Closed Only Test', code: 'CLOSED' },
    ]);
    let closed = await db.getRepository(entities.Job).save({ ...input, departmentId: closedOnly.id, status: 'CLOSED', createdBy: users.hr.id });
    const expected = departments.map(({ id, name }) => ({ id, name }));
    const lookup = await request('/jobs/filters');
    assert.equal(lookup.status, 200);
    assert.deepEqual(lookup.data, { departments: expected, locations: ['Hà Nội'] });
    for (const department of [empty, closedOnly]) assert.deepEqual((await request('/jobs?departmentId=' + department.id)).data, []);

    const opened = await request('/jobs/' + closed.id + '/status', 'PATCH', { status: 'OPEN', expectedUpdatedAt: closed.updatedAt.toISOString() }, 'hr');
    assert.equal(opened.status, 200); closed = opened.data;
    assert.deepEqual((await request('/jobs/filters')).data, { departments: [{ id: closedOnly.id, name: closedOnly.name }, ...expected], locations: ['Hà Nội'] });
    assert.deepEqual((await request('/jobs?departmentId=' + closedOnly.id)).data.map(item => item.id), [closed.id]);
    assert.equal((await request('/jobs/' + closed.id + '/status', 'PATCH', { status: 'CLOSED', expectedUpdatedAt: closed.updatedAt }, 'hr')).status, 200);
    assert.deepEqual((await request('/jobs/filters')).data, { departments: expected, locations: ['Hà Nội'] });
    await db.getRepository(entities.Job).createQueryBuilder().update().set({ status: 'CLOSED' }).execute();
    assert.deepEqual((await request('/jobs/filters')).data, { departments: [], locations: [] });
    assert.deepEqual((await request('/jobs')).data, []);
  });

  let locationJobs;
  await t.test('location combines with keyword, department and OPEN; empty values remove only location', async () => {
    const rows = [
      { title: 'Backend Location Engineer', departmentId: departments[0].id, location: '  Đà Nẵng  ' },
      { title: 'Frontend Location Engineer', departmentId: departments[0].id, location: 'Đà Nẵng' },
      { title: 'Backend Location Finance', departmentId: departments[1].id, location: 'Đà Nẵng' },
      { title: 'Backend Location Remote', departmentId: departments[0].id, location: 'Remote' },
      { title: 'Backend Location Closed', departmentId: departments[0].id, location: 'Đà Nẵng' },
    ];
    locationJobs = [];
    for (const row of rows) {
      const result = await request('/jobs', 'POST', { ...input, ...row }, 'hr');
      assert.equal(result.status, 201); locationJobs.push(result.data);
    }
    assert.equal(locationJobs[0].location, 'Đà Nẵng');
    const closed = await request('/jobs/' + locationJobs[4].id + '/status', 'PATCH', { status: 'CLOSED', expectedUpdatedAt: locationJobs[4].updatedAt }, 'hr');
    assert.equal(closed.status, 200);
    const locationQuery = 'location=' + encodeURIComponent('  Đà Nẵng  ');
    const all = await request('/jobs?' + locationQuery);
    assert.equal(all.status, 200); assert.ok(Array.isArray(all.data));
    assert.deepEqual(all.data.map(item => item.id).sort((a, b) => a - b), locationJobs.slice(0, 3).map(item => item.id));
    const filters = '&departmentId=' + departments[0].id + '&q=Backend%20Location';
    assert.deepEqual((await request('/jobs?' + locationQuery + filters)).data.map(item => item.id), [locationJobs[0].id]);
    assert.deepEqual((await request('/jobs?location=Remote' + filters)).data.map(item => item.id), [locationJobs[3].id]);
    assert.deepEqual((await request('/jobs?location=Rem' + filters)).data, []);
    assert.deepEqual((await request('/jobs?location=Unknown' + filters)).data, []);
    const unfiltered = (await request('/jobs?' + filters.slice(1))).data;
    for (const value of ['', '%20%20']) assert.deepEqual((await request('/jobs?location=' + value + filters)).data, unfiltered);
    assert.equal(unfiltered.length, 2);
    assert.equal((await request('/jobs?' + locationQuery + '&all=true')).status, 400);
    assert.deepEqual((await request('/jobs?' + locationQuery + '&all=false')).data, all.data);
  });
  await t.test('location filtering keeps admin authentication and intersects Manager department scope', async () => {
    const query = '?q=Backend%20Location&location=' + encodeURIComponent('Đà Nẵng');
    assert.equal((await request('/jobs/admin' + query)).status, 401);
    assert.equal((await request('/jobs/admin' + query, 'GET', undefined, 'employee')).status, 403);
    const own = await request('/jobs/admin' + query, 'GET', undefined, 'manager');
    assert.deepEqual(own.data.map(item => item.id).sort((a, b) => a - b), [locationJobs[0].id, locationJobs[4].id]);
    assert.deepEqual((await request('/jobs/admin' + query, 'GET', undefined, 'other')).data.map(item => item.id), [locationJobs[2].id]);
    assert.deepEqual((await request('/jobs/admin' + query + '&departmentId=' + departments[1].id, 'GET', undefined, 'manager')).data, []);
    for (const actor of ['hr', 'admin']) assert.equal((await request('/jobs/admin' + query, 'GET', undefined, actor)).data.length, 3);
  });
  await t.test('location validates query shape and length and binds special characters literally', async () => {
    for (const query of ['location=' + 'x'.repeat(151), 'location=a&location=b', 'location[]=Remote', 'location[name]=Remote']) {
      assert.equal((await request('/jobs?' + query)).status, 400, query);
      assert.equal((await request('/jobs/admin?' + query, 'GET', undefined, 'hr')).status, 400, query);
    }
    assert.equal((await request('/jobs?location=' + 'x'.repeat(150))).status, 200);
    const specialLocation = "O'Reilly 100%_! C\\Tools & Office";
    const special = await request('/jobs', 'POST', { ...input, location: specialLocation }, 'hr');
    assert.equal(special.status, 201);
    assert.deepEqual((await request('/jobs?location=' + encodeURIComponent(specialLocation))).data.map(item => item.id), [special.data.id]);
    for (const fragment of ['%', '_', '!', '\\', "' OR 1=1 --"]) {
      assert.deepEqual((await request('/jobs?location=' + encodeURIComponent(fragment))).data, []);
    }
  });
  await t.test('location lookup is unique, OPEN-only and reflects closing, reopening and editing a job', async () => {
    const lookup = (await request('/jobs/filters')).data;
    assert.deepEqual(Object.keys(lookup).sort(), ['departments', 'locations']);
    assert.deepEqual(lookup.departments, departments.map(({ id, name }) => ({ id, name })));
    assert.equal(lookup.locations.length, 3);
    assert.equal(new Set(lookup.locations).size, 3);
    assert.ok(lookup.locations.includes('Đà Nẵng')); assert.ok(lookup.locations.includes('Remote'));
    let remote = locationJobs[3];
    const closed = await request('/jobs/' + remote.id + '/status', 'PATCH', { status: 'CLOSED', expectedUpdatedAt: remote.updatedAt }, 'hr');
    assert.equal(closed.status, 200); remote = closed.data;
    assert.equal((await request('/jobs/filters')).data.locations.includes('Remote'), false);
    assert.deepEqual((await request('/jobs?location=Remote')).data, []);
    const reopened = await request('/jobs/' + remote.id + '/status', 'PATCH', { status: 'OPEN', expectedUpdatedAt: remote.updatedAt }, 'hr');
    assert.equal(reopened.status, 200); remote = reopened.data;
    assert.equal((await request('/jobs/filters')).data.locations.includes('Remote'), true);
    const edited = await request('/jobs/' + remote.id, 'PATCH', { ...input, title: remote.title, location: '  Huế  ', expectedUpdatedAt: remote.updatedAt }, 'hr');
    assert.equal(edited.status, 200); assert.equal(edited.data.location, 'Huế');
    const updated = (await request('/jobs/filters')).data.locations;
    assert.equal(updated.includes('Remote'), false); assert.equal(updated.includes('Huế'), true);
    assert.deepEqual((await request('/jobs?location=' + encodeURIComponent('Huế'))).data.map(item => item.id), [remote.id]);
    await db.getRepository(entities.Job).createQueryBuilder().update().set({ status: 'CLOSED' }).execute();
    assert.deepEqual((await request('/jobs/filters')).data, { departments: [], locations: [] });
  });

  let paginationJobs;
  await t.test('opt-in pagination returns totals and stable pages while legacy requests remain arrays', async () => {
    const sameTime = new Date('2026-10-04T00:00:00.000Z');
    const rows = [];
    for (let index = 1; index <= 10; index++) rows.push({
      ...input,
      title: 'Pagination Engineering ' + String(index).padStart(2, '0'),
      departmentId: departments[0].id,
      location: 'Đà Nẵng',
      status: 'OPEN',
      createdBy: users.hr.id,
      createdAt: sameTime,
      updatedAt: sameTime,
    });
    for (let index = 1; index <= 3; index++) rows.push({
      ...input,
      title: 'Pagination Finance ' + String(index).padStart(2, '0'),
      departmentId: departments[1].id,
      location: 'Remote',
      status: 'OPEN',
      createdBy: users.hr.id,
      createdAt: sameTime,
      updatedAt: sameTime,
    });
    rows.push({
      ...input,
      title: 'Pagination Engineering Closed',
      departmentId: departments[0].id,
      location: 'Đà Nẵng',
      status: 'CLOSED',
      createdBy: users.hr.id,
      createdAt: sameTime,
      updatedAt: sameTime,
    });
    paginationJobs = await db.getRepository(entities.Job).save(rows);
    const legacy = await request('/jobs?q=Pagination');
    assert.equal(legacy.status, 200); assert.ok(Array.isArray(legacy.data)); assert.equal(legacy.data.length, 13);

    const expectedIds = paginationJobs.slice(0, 13).map(item => item.id).sort((a, b) => b - a);
    const pages = [];
    for (const page of [1, 2, 3]) {
      const result = await request('/jobs?q=Pagination&page=' + page + '&pageSize=5');
      assert.equal(result.status, 200);
      assert.deepEqual({ total: result.data.total, page: result.data.page, pageSize: result.data.pageSize }, { total: 13, page, pageSize: 5 });
      assert.equal(result.data.items.length, page === 3 ? 3 : 5);
      pages.push(...result.data.items.map(item => item.id));
    }
    assert.deepEqual(pages, expectedIds);
    assert.equal(new Set(pages).size, 13);
    const beyond = await request('/jobs?q=Pagination&page=4&pageSize=5');
    assert.deepEqual(beyond.data, { items: [], total: 13, page: 4, pageSize: 5 });
    const falseCompat = await request('/jobs?q=Pagination&all=false&page=1&pageSize=5');
    assert.equal(falseCompat.status, 200); assert.equal(falseCompat.data.total, 13);
  });
  await t.test('pagination totals are calculated after all public filters and before page slicing', async () => {
    const engineering = await request('/jobs?q=Pagination&departmentId=' + departments[0].id + '&location=' + encodeURIComponent('Đà Nẵng') + '&page=2&pageSize=4');
    assert.equal(engineering.status, 200);
    assert.deepEqual({ total: engineering.data.total, page: engineering.data.page, pageSize: engineering.data.pageSize, count: engineering.data.items.length }, { total: 10, page: 2, pageSize: 4, count: 4 });
    assert.ok(engineering.data.items.every(item => item.departmentId === departments[0].id && item.location === 'Đà Nẵng' && item.status === 'OPEN'));
    const finance = await request('/jobs?q=Pagination&departmentId=' + departments[1].id + '&location=Remote&page=1&pageSize=2');
    assert.equal(finance.data.total, 3); assert.equal(finance.data.items.length, 2);
    const none = await request('/jobs?q=Pagination&departmentId=' + departments[1].id + '&location=' + encodeURIComponent('Đà Nẵng') + '&page=1&pageSize=6');
    assert.deepEqual(none.data, { items: [], total: 0, page: 1, pageSize: 6 });
  });
  await t.test('paginated internal lists preserve authentication and Manager scope', async () => {
    const path = '/jobs/admin?q=Pagination&page=1&pageSize=20';
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, 'GET', undefined, 'employee')).status, 403);
    const manager = await request(path, 'GET', undefined, 'manager');
    assert.equal(manager.status, 200); assert.equal(manager.data.total, 11); assert.equal(manager.data.items.length, 11);
    assert.ok(manager.data.items.every(item => item.departmentId === departments[0].id));
    assert.ok(manager.data.items.some(item => item.status === 'CLOSED'));
    const other = await request(path, 'GET', undefined, 'other');
    assert.equal(other.data.total, 3); assert.ok(other.data.items.every(item => item.departmentId === departments[1].id));
    const crossScope = await request(path + '&departmentId=' + departments[1].id, 'GET', undefined, 'manager');
    assert.deepEqual(crossScope.data, { items: [], total: 0, page: 1, pageSize: 20 });
    const hr = await request(path, 'GET', undefined, 'hr');
    assert.equal(hr.data.total, 14);
  });
  await t.test('pagination rejects partial, structured and out-of-range parameters', async () => {
    const invalid = [
      'page=1', 'pageSize=6', 'page=&pageSize=6', 'page=0&pageSize=6', 'page=-1&pageSize=6',
      'page=1.5&pageSize=6', 'page=1e1&pageSize=6', 'page=100001&pageSize=6',
      'page=1&pageSize=0', 'page=1&pageSize=101', 'page=1&pageSize=1.5',
      'page=1&page=2&pageSize=6', 'page[]=1&pageSize=6', 'page[id]=1&pageSize=6',
      'page=1&pageSize=6&pageSize=7', 'page=1&pageSize[]=6', 'page=1&pageSize[value]=6',
    ];
    for (const query of invalid) {
      assert.equal((await request('/jobs?' + query)).status, 400, query);
      assert.equal((await request('/jobs/admin?' + query, 'GET', undefined, 'hr')).status, 400, query);
    }
    assert.equal((await request('/jobs?page=100000&pageSize=100')).status, 200);
  });
  await t.test('closing a public job updates the total and final page without changing legacy behavior', async () => {
    const target = paginationJobs[0];
    const closed = await request('/jobs/' + target.id + '/status', 'PATCH', { status: 'CLOSED', expectedUpdatedAt: target.updatedAt.toISOString() }, 'hr');
    assert.equal(closed.status, 200);
    const last = await request('/jobs?q=Pagination&page=3&pageSize=5');
    assert.equal(last.data.total, 12); assert.equal(last.data.items.length, 2);
    assert.equal(last.data.items.some(item => item.id === target.id), false);
    const beyond = await request('/jobs?q=Pagination&page=4&pageSize=5');
    assert.deepEqual(beyond.data, { items: [], total: 12, page: 4, pageSize: 5 });
    const legacy = await request('/jobs?q=Pagination');
    assert.ok(Array.isArray(legacy.data)); assert.equal(legacy.data.length, 12);
  });
});
