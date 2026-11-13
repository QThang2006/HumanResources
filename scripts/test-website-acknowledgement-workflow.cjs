const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { addWebsiteAcknowledgement, NAMES } = require('./patch-wf02-website-ack.cjs');
const root = path.resolve(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const template = load('workflows/candidate-intake-omnichannel.json');
function withoutBranch(workflow) {
  const result = structuredClone(workflow);
  result.nodes = result.nodes.filter(n => !NAMES.includes(n.name));
  for (const name of NAMES) delete result.connections[name];
  return result;
}
function configuredOriginal() {
  const w = withoutBranch(template);
  w.nodes.find(n => n.type === 'n8n-nodes-base.httpRequest' && String(n.parameters.url).includes('/acknowledgement')).credentials = { httpHeaderAuth: { id: 'configured-intake', name: 'Live intake' } };
  w.nodes.find(n => n.type === 'n8n-nodes-base.emailSend').credentials = { smtp: { id: 'configured-smtp', name: 'Live SMTP' } };
  return w;
}
function evaluate(expression, context) {
  return vm.runInNewContext(expression.slice(3, -2), context, { timeout: 1000 });
}

test('patch preserves every existing node, credential, position, connection and workflow setting', () => {
  const original = configuredOriginal();
  original.active = true; original.id = 'live-wf2'; original.staticData = { lastRow: 27 };
  const snapshot = structuredClone(original);
  const patched = addWebsiteAcknowledgement(original, { webhookCredential: { id: 'configured-ai', name: 'TV2 ATS AI Key' } });
  assert.deepEqual(original, snapshot);
  assert.deepEqual(withoutBranch(patched), snapshot);
  assert.equal(patched.nodes.length, original.nodes.length + 6);
  assert.deepEqual(addWebsiteAcknowledgement(patched), patched);
  const oldMax = Math.max(...original.nodes.map(n => n.position[1]));
  assert.ok(patched.nodes.filter(n => NAMES.includes(n.name)).every(n => n.position[1] > oldMax));
});

test('English node names preserve live intake credentials independently of existing AI credentials', () => {
  const original = configuredOriginal();
  for (const node of original.nodes) {
    const old = node.name, changed = 'English ' + node.id;
    node.name = changed;
    if (original.connections[old]) { original.connections[changed] = original.connections[old]; delete original.connections[old]; }
    for (const c of Object.values(original.connections)) for (const group of c.main) for (const edge of group) if (edge.node === old) edge.node = changed;
  }
  original.nodes.push({ id: 'existing-ai', name: 'AI-01 English', type: 'n8n-nodes-base.webhook', position: [0, 100],
    parameters: { path: 'ai-resume-score' }, credentials: { httpHeaderAuth: { id: 'configured-ai', name: 'Existing live credential' } } });
  const updated = addWebsiteAcknowledgement(original);
  assert.deepEqual(withoutBranch(updated), original);
  assert.equal(updated.nodes.find(n => n.name === NAMES[0]).credentials.httpHeaderAuth.id, 'configured-intake');
});

test('new branch stops on a duplicate claim, never retries SMTP, and has no CC/BCC', () => {
  const node = name => template.nodes.find(n => n.name === name);
  assert.equal(node(NAMES[0]).parameters.authentication, 'headerAuth');
  assert.equal(node(NAMES[0]).parameters.path, 'application-received');
  assert.equal(node(NAMES[1]).retryOnFail, false);
  assert.equal(node(NAMES[4]).retryOnFail, false);
  assert.equal(node(NAMES[4]).onError, 'stopWorkflow');
  assert.deepEqual(node(NAMES[4]).parameters.options, { appendAttribution: false });
  assert.equal(node(NAMES[4]).parameters.toEmail, '={{ $json.candidateEmail }}');
  assert.equal(node(NAMES[5]).retryOnFail, true);
  assert.equal(template.connections[NAMES[2]].main[1]?.length || 0, 0);
  const condition = node(NAMES[2]).parameters.conditions.conditions[0].leftValue;
  assert.equal(evaluate(condition, { $json: { data: { shouldSend: false } } }), false);
  assert.equal(evaluate(condition, { $json: { data: { shouldSend: true } } }), true);
});

test('claim URL ignores caller supplied recipients/URLs and rejects invalid IDs', () => {
  const expression = template.nodes.find(n => n.name === NAMES[1]).parameters.url;
  assert.match(evaluate(expression, { $json: { body: { applicationId: 41, candidateEmail: 'ignored@example.test', callbackUrl: 'http://untrusted.invalid' } } }), /\/recruitment\/intake\/41\/acknowledgement\/claim$/);
  assert.match(evaluate(expression, { $json: { body: { data: { applicationId: 42 } } } }), /\/42\/acknowledgement\/claim$/);
  for (const applicationId of ['../other', -1, 0, 1.2, null, undefined])
    assert.throws(() => evaluate(expression, { $json: { body: { applicationId } } }), /Invalid applicationId/);
});

test('website renderer reuses the current email design and escapes candidate input', () => {
  const renderer = template.nodes.find(n => n.name === NAMES[3]);
  const original = withoutBranch(template).nodes.find(n => n.type === 'n8n-nodes-base.code' && n.name.startsWith('09.'));
  assert.equal(renderer.parameters.jsCode, original.parameters.jsCode);
  const result = vm.runInNewContext('(function(){' + renderer.parameters.jsCode + '\n})()', {
    $json: { data: { applicationId: 41, candidateName: '<img src=x onerror=alert(1)>', candidateEmail: 'candidate@example.test', fromEmail: 'hr@example.test' } },
  }, { timeout: 1000 }).json;
  assert.match(result.html, /41/); assert.match(result.html, /&lt;img/); assert.doesNotMatch(result.html, /<img\b/);
  assert.equal(result.candidateEmail, 'candidate@example.test');
});

test('patch fails safely on missing credentials, conflicting paths or node-dependent renderers', () => {
  const original = configuredOriginal();
  const missing = withoutBranch(template);
  assert.throws(() => addWebsiteAcknowledgement(missing), /Missing configured/);
  const dependent = structuredClone(original);
  dependent.nodes.find(n => n.type === 'n8n-nodes-base.code' && n.name.startsWith('09.')).parameters.jsCode += "\n$('Some other branch');";
  assert.throws(() => addWebsiteAcknowledgement(dependent, { allowPlaceholders: true }), /depends on other nodes/);
  const collision = structuredClone(original);
  collision.nodes.push({ name: 'Some other webhook', type: 'n8n-nodes-base.webhook', parameters: { path: 'application-received' } });
  assert.throws(() => addWebsiteAcknowledgement(collision), /already exists/);
});

test('all WF-02 source exports have valid website branches and existing code still compiles', () => {
  for (const file of ['workflows/candidate-intake-omnichannel.json', 'workflows/candidate-intake-ai.json',
    'workflows/tv2_recruitment/02_candidate_intake_omnichannel.json', 'workflows/all_tv2_workflows.json', 'workflows/tv2_recruitment/all_tv2_workflows.json']) {
    const content = load(file), candidates = (Array.isArray(content) ? content : [content]).filter(w => w.nodes.some(n => n.name === NAMES[0]));
    assert.equal(candidates.length, 1, file);
    for (const w of candidates) {
      const names = new Set(w.nodes.map(n => n.name)); assert.equal(names.size, w.nodes.length);
      for (const [source, output] of Object.entries(w.connections)) {
        assert.ok(names.has(source));
        for (const group of output.main) for (const edge of group) assert.ok(names.has(edge.node));
      }
      for (const n of w.nodes.filter(n => n.type === 'n8n-nodes-base.code')) new Function(n.parameters.jsCode);
    }
  }
});

test('CLI prepares six pasteable nodes from a live export without overwriting the backup', t => {
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ats-ack-cli-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'before.json'), output = path.join(directory, 'website-nodes.json');
  const original = configuredOriginal(); original.active = true;
  fs.writeFileSync(input, JSON.stringify([original]));
  const result = spawnSync(process.execPath, [path.join(__dirname, 'patch-wf02-website-ack.cjs'), '--input', input, '--output', output, '--nodes-only'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(input, 'utf8')), [original]);
  const nodes = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(nodes.nodes.length, 6); assert.equal(nodes.active, undefined);
  assert.equal(nodes.nodes[0].credentials.httpHeaderAuth.id, 'configured-intake');
  assert.equal(nodes.nodes[4].credentials.smtp.id, 'configured-smtp');
  assert.equal(nodes.connections[NAMES[2]].main[1]?.length || 0, 0);
  if (process.platform !== 'win32') assert.equal(fs.statSync(output).mode & 0o777, 0o600);
  const retry = spawnSync(process.execPath, [path.join(__dirname, 'patch-wf02-website-ack.cjs'), '--input', input, '--output', output, '--nodes-only'], { encoding: 'utf8' });
  assert.notEqual(retry.status, 0, 'existing output must not be overwritten');
});
