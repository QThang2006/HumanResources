const assert = require('node:assert/strict');
const test = require('node:test');
const { HealthController } = require('../dist/modules/health/health.controller.js');

test('HealthController returns ok when DataSource is connected', async () => {
  const mockDataSource = {
    isInitialized: true,
    query: async (sql) => {
      assert.equal(sql, 'SELECT 1');
      return [{ 1: 1 }];
    },
  };

  const controller = new HealthController(mockDataSource);
  const result = await controller.check();

  assert.equal(result.status, 'ok');
  assert.equal(result.database, 'connected');
  assert.equal(typeof result.uptime, 'number');
  assert.ok(result.timestamp);
});

test('HealthController throws HttpException 503 when DataSource fails', async () => {
  const mockDataSource = {
    isInitialized: true,
    query: async () => {
      throw new Error('Database connection failed');
    },
  };

  const controller = new HealthController(mockDataSource);
  await assert.rejects(
    async () => await controller.check(),
    (err) => {
      assert.equal(err.getStatus(), 503);
      assert.equal(err.getResponse().status, 'error');
      assert.equal(err.getResponse().database, 'disconnected');
      return true;
    }
  );
});
