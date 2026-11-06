const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('TV4 demo seed endpoint requires SuperAdmin authentication', () => {
  const source = read('backend/src/modules/users/users.controller.ts');
  assert.match(
    source,
    /@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Roles\(UserRole\.SUPERADMIN\)\s+@Post\('seed'\)/,
  );
});

test('shared backup endpoint requires automation secret and avoids shell execution', () => {
  const source = read('backend/src/modules/system-config/system-config.controller.ts');
  assert.match(
    source,
    /@UseGuards\(AutomationSecretGuard\)\s+@Post\('trigger-backup'\)/,
  );
  assert.doesNotMatch(source, /execSync\(/);
  assert.match(source, /execFileSync\(/);
  assert.match(source, /path\.basename\(filename\) !== filename/);
  assert.match(source, /gzipSync\(Buffer\.from\(fullContent/);
});

test('intentional crash endpoint is restricted to SuperAdmin', () => {
  const source = read('backend/src/modules/system-config/system-config.controller.ts');
  assert.match(
    source,
    /@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Roles\(UserRole\.SUPERADMIN\)\s+@Get\('test-crash'\)/,
  );
});

test('n8n uses the current webhook URL variable and backup workflow sends its secret', () => {
  const compose = read('docker-compose.yml');
  assert.match(compose, /N8N_WEBHOOK_URL=https?:\/\//);
  assert.match(compose, /N8N_LISTEN_ADDRESS=0\.0\.0\.0/);

  const workflow = JSON.parse(
    read('workflows/tv1_core_security/02_db_health_automated_backup.json'),
  );
  const node = workflow.nodes.find(
    (item) => item.name === '7. Trigger DB Snapshot Dump',
  );
  const headers = node.parameters.headerParameters.parameters;
  assert.ok(
    headers.some(
      (item) =>
        item.name === 'X-Automation-Secret' &&
        item.value === '={{ $env.N8N_AUTOMATION_SECRET }}',
    ),
  );
});

test('TV4 automation workflows read the secret from n8n environment', () => {
  for (const filename of [
    '02_mandatory_training_reminder.json',
    '03_monthly_performance_review_reminder.json',
    '04_offboarding_workflow.json',
  ]) {
    const workflow = JSON.parse(
      read(`workflows/tv4_admin_training/${filename}`),
    );
    const configNode = workflow.nodes.find((node) =>
      ['Load Workflow Configuration', 'Load Offboarding Configuration'].includes(node.name),
    );
    const secret = configNode.parameters.assignments.assignments.find(
      (item) => item.name === 'automationSecret',
    );
    assert.equal(secret.value, '={{ $env.N8N_AUTOMATION_SECRET }}');
  }
});
