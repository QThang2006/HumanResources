const assert = require('node:assert/strict');
const test = require('node:test');
const { UsersService } = require('../dist/modules/users/users.service.js');
const { UserRole } = require('../dist/entities/user.entity.js');

function setup(id = 2) {
  const user = { id, fullName: 'Nhân viên mẫu', role: id === 1 ? UserRole.SUPERADMIN : UserRole.EMPLOYEE };
  const writes = [];
  const repository = {
    findOne: async () => user,
    save: async value => { writes.push(value); return value; },
  };
  return { service: new UsersService(repository, {}), writes };
}

test('không tạo thêm Super Admin', async () => {
  const { service, writes } = setup();
  await assert.rejects(service.createUser({ role: UserRole.SUPERADMIN }), /chỉ có một Super Admin/);
  assert.equal(writes.length, 0);
});

for (const method of ['updateRole', 'updateUser']) {
  test(`${method} không nâng tài khoản khác thành Super Admin`, async () => {
    const { service, writes } = setup();
    await assert.rejects(service[method](2, method === 'updateRole' ? UserRole.SUPERADMIN : { role: UserRole.SUPERADMIN }), /chỉ có một Super Admin/);
    assert.equal(writes.length, 0);
  });
  test(`${method} không hạ quyền Super Admin gốc`, async () => {
    const { service, writes } = setup(1);
    await assert.rejects(service[method](1, method === 'updateRole' ? UserRole.HR : { role: UserRole.HR }), /Quản trị viên gốc/);
    assert.equal(writes.length, 0);
  });
  test(`${method} vẫn cho phép gán vai trò thông thường`, async () => {
    const { service, writes } = setup();
    await service[method](2, method === 'updateRole' ? UserRole.MANAGER : { role: UserRole.MANAGER });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].role, UserRole.MANAGER);
  });
}
