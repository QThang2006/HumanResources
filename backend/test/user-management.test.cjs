require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const entities = require('../dist/entities');
const { InterviewDelivery } = require('../dist/modules/applications/interview-delivery.entity');
const { UsersModule } = require('../dist/modules/users/users.module');
const { AuthModule } = require('../dist/modules/auth/auth.module');
const { N8nService } = require('../dist/modules/core/automation/n8n.service');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');

test('TV4 account management with isolated database and real authenticated HTTP', { timeout: 60000 }, async t => {
  if (!process.env.TV4_TEST_DB_PASSWORD) throw Error('Set TV4_TEST_DB_PASSWORD for disposable localhost tests.');
  const database = 'hr_tv4_users_test_' + randomBytes(8).toString('hex');
  const options = { host: '127.0.0.1', port: Number(process.env.TV4_TEST_DB_PORT || 3307), user: 'root', password: process.env.TV4_TEST_DB_PASSWORD };
  const admin = await mysql.createConnection(options);
  let app;
  t.after(async () => {
    if (app) await app.close();
    if (!/^hr_tv4_users_test_[a-f0-9]{16}$/.test(database)) throw Error('Refuse unknown cleanup target');
    await admin.query('DROP DATABASE IF EXISTS `' + database + '`');
    await admin.end();
  });
  await admin.query('CREATE DATABASE `' + database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const module = await Test.createTestingModule({ imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TypeOrmModule.forRoot({ type: 'mysql', host: options.host, port: options.port, username: options.user, password: options.password, database,
      entities: [...Object.values(entities).filter(value => typeof value === 'function'), InterviewDelivery], synchronize: true, logging: false }),
    AuthModule, UsersModule,
  ] }).overrideProvider(N8nService).useValue({}).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(0, '127.0.0.1');
  const db = app.get(DataSource);
  const users = db.getRepository(entities.User);
  const departments = db.getRepository(entities.Department);
  const deptA = await departments.save({ name: 'Phòng kiểm thử A', code: 'USER_A' });
  const deptB = await departments.save({ name: 'Phòng kiểm thử B', code: 'USER_B' });
  const password = randomBytes(18).toString('hex');
  const passwordHash = await bcrypt.hash(password, 4);
  const actors = {};
  for (const [name, role] of Object.entries({ admin: 'SUPERADMIN', hr: 'HR', manager: 'MANAGER', employee: 'EMPLOYEE', target: 'EMPLOYEE' })) {
    actors[name] = await users.save({ email: `${name}@example.invalid`, fullName: `Kiểm thử ${name}`, passwordHash, role, isActive: true, departmentId: deptA.id, jobTitle: 'Kỹ sư' });
  }
  const tokens = {};
  const base = await app.getUrl() + '/api';
  async function request(path, method = 'GET', body, actor = 'admin') {
    const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(tokens[actor] ? { Authorization: 'Bearer ' + tokens[actor] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const json = await response.json();
    return { status: response.status, data: json.data ?? json };
  }
  for (const [name, actor] of Object.entries(actors)) {
    const login = await request('/auth/login', 'POST', { email: actor.email, password }, null);
    assert.equal(login.status, 201);
    tokens[name] = login.data.accessToken;
  }
  const targetPath = `/users/${actors.target.id}`;

  await t.test('only Super Admin can mutate accounts; HR retains read access', async () => {
    assert.equal((await request('/users', 'GET', undefined, 'hr')).status, 200);
    for (const actor of [null, 'hr', 'manager', 'employee']) {
      const expected = actor ? 403 : 401;
      assert.equal((await request(targetPath, 'PATCH', { jobTitle: 'Không lưu' }, actor)).status, expected);
      assert.equal((await request(targetPath + '/role', 'PATCH', { role: 'HR' }, actor)).status, expected);
      assert.equal((await request(targetPath, 'DELETE', undefined, actor)).status, expected);
    }
  });
  await t.test('one request updates the intended fields and rejects invalid data without partial writes', async () => {
    const result = await request(targetPath, 'PATCH', { departmentId: deptB.id, jobTitle: '  Kỹ sư chính  ', role: 'MANAGER' });
    assert.equal(result.status, 200);
    let saved = await users.findOneBy({ id: actors.target.id });
    assert.equal(saved.departmentId, deptB.id);
    assert.equal(saved.jobTitle, 'Kỹ sư chính');
    assert.equal(saved.role, 'MANAGER');
    for (const body of [{}, { role: 'OWNER' }, { isActive: 'false' }, { departmentId: '1' }, { departmentId: 0 }, { jobTitle: 123 }, { jobTitle: 'x'.repeat(101) }, { email: 'changed@example.invalid' }, { managerId: 3 }, { departmentId: deptA.id, role: 'NO_ROLE' }]) {
      assert.equal((await request(targetPath, 'PATCH', body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await request(targetPath + '/role', 'PATCH', { role: 'OWNER' })).status, 400);
    saved = await users.findOneBy({ id: actors.target.id });
    assert.equal(saved.departmentId, deptB.id);
    assert.equal(saved.role, 'MANAGER');
    assert.equal(saved.isActive, true);
    assert.equal((await request(targetPath, 'PATCH', { departmentId: 999999 })).status, 404);
  });
  await t.test('root identity and the current administrator cannot be disabled, downgraded or deleted', async () => {
    assert.equal((await request('/users/1', 'PATCH', { isActive: false })).status, 400);
    assert.equal((await request('/users/1', 'PATCH', { role: 'EMPLOYEE' })).status, 400);
    assert.equal((await request('/users/1', 'DELETE')).status, 400);
    assert.equal((await request(targetPath, 'PATCH', { role: 'SUPERADMIN' })).status, 400);
  });
  await t.test('old JWT uses the current role and disabling immediately rejects protected requests and login', async () => {
    assert.equal((await request('/users', 'GET', undefined, 'target')).status, 403);
    assert.equal((await request(targetPath, 'PATCH', { role: 'HR' })).status, 200);
    assert.equal((await request('/users', 'GET', undefined, 'target')).status, 200);
    assert.equal((await request(targetPath, 'PATCH', { role: 'EMPLOYEE' })).status, 200);
    assert.equal((await request('/users', 'GET', undefined, 'target')).status, 403);
    assert.equal((await request(targetPath, 'PATCH', { isActive: false })).status, 200);
    assert.equal((await request('/auth/profile', 'GET', undefined, 'target')).status, 401);
    const login = await request('/auth/login', 'POST', { email: actors.target.email, password }, null);
    assert.equal(login.status, 401);
    assert.equal((await request(targetPath, 'PATCH', { isActive: true })).status, 200);
    assert.equal((await request('/auth/profile', 'GET', undefined, 'target')).status, 200);
  });
  await t.test('deletion requires disabled status and preserves cascade-linked learning history', async () => {
    assert.equal((await request(targetPath, 'DELETE')).status, 400);
    const course = await db.getRepository(entities.TrainingCourse).save({ title: 'Lịch sử cần giữ', type: 'SOFT_SKILL', skillsProvided: ['Excel'], durationHours: 2 });
    const learning = await db.getRepository(entities.EmployeeTraining).save({ userId: actors.target.id, courseId: course.id, progressPercent: 75, status: 'IN_PROGRESS' });
    const before = JSON.stringify(await db.getRepository(entities.EmployeeTraining).findOneBy({ id: learning.id }));
    assert.equal((await request(targetPath, 'PATCH', { isActive: false })).status, 200);
    assert.equal((await request(targetPath, 'DELETE')).status, 409);
    assert.equal(JSON.stringify(await db.getRepository(entities.EmployeeTraining).findOneBy({ id: learning.id })), before);
    assert.ok(await users.findOneBy({ id: actors.target.id }));
  });
  await t.test('deletion also preserves SET NULL links to a manager and department owner', async () => {
    const manager = await users.save({ email: 'linked-manager@example.invalid', fullName: 'Quản lý có liên kết', passwordHash, role: 'MANAGER', isActive: false });
    await users.update(actors.employee.id, { managerId: manager.id });
    assert.equal((await request(`/users/${manager.id}`, 'DELETE')).status, 409);
    assert.equal((await users.findOneBy({ id: actors.employee.id })).managerId, manager.id);
    await users.update(actors.employee.id, { managerId: null });
    await departments.update(deptB.id, { managerId: manager.id });
    assert.equal((await request(`/users/${manager.id}`, 'DELETE')).status, 409);
    assert.equal((await departments.findOneBy({ id: deptB.id })).managerId, manager.id);
  });
  await t.test('an unused disabled account can be deleted without changing other accounts', async () => {
    const empty = await users.save({ email: 'unused@example.invalid', fullName: 'Tài khoản tạo nhầm', passwordHash, role: 'EMPLOYEE', isActive: false });
    const snapshot = JSON.stringify(await users.find({ order: { id: 'ASC' } }));
    assert.equal((await request(`/users/${empty.id}`, 'DELETE')).status, 200);
    assert.equal(await users.findOneBy({ id: empty.id }), null);
    const expected = JSON.parse(snapshot).filter(user => user.id !== empty.id);
    assert.deepEqual(JSON.parse(JSON.stringify(await users.find({ order: { id: 'ASC' } }))), expected);
  });
});
