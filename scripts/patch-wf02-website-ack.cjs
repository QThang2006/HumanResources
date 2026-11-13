// Add an independent website receipt branch to a WF-02 export. Existing nodes stay intact.
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const NAMES = [
  'WEB-01. Receive Website Application',
  'WEB-02. Claim Website Acknowledgment in ATS',
  'WEB-03. Check Website Acknowledgment Claim',
  'WEB-04. Draft Website Acknowledgment',
  'WEB-05. Send Website Acknowledgment',
  'WEB-06. Record Website Acknowledgment',
];
const expr = code => '={{ ' + code + ' }}';
function addWebsiteAcknowledgement(original, options = {}) {
  const workflow = structuredClone(original);
  if (!Array.isArray(workflow.nodes) || !workflow.connections) throw Error('Invalid WF-02 export');
  const hooks = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.webhook' && n.parameters.path === 'application-received');
  if (hooks.length) {
    if (hooks.length !== 1 || hooks[0].name !== NAMES[0] || !NAMES.every(name => workflow.nodes.some(n => n.name === name)))
      throw Error('application-received already exists with a different branch; inspect before patching');
    return workflow;
  }
  if (workflow.nodes.some(n => NAMES.includes(n.name))) throw Error('Website node name collision');
  const nodes = workflow.nodes;
  const incoming = name => nodes.filter(n => Object.values(workflow.connections[n.name] || {}).some(groups => groups.some(group => group.some(edge => edge.node === name))));
  const callbacks = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest' && String(n.parameters.url).includes('/acknowledgement'));
  if (callbacks.length !== 1) throw Error('Expected one existing acknowledgement callback');
  const callback = callbacks[0];
  const senders = incoming(callback.name).filter(n => n.type === 'n8n-nodes-base.emailSend');
  if (senders.length !== 1) throw Error('Cannot identify existing acknowledgement SMTP node');
  const sender = senders[0];
  const drafts = incoming(sender.name).filter(n => n.type === 'n8n-nodes-base.code');
  if (drafts.length !== 1 || !drafts[0].parameters.jsCode) throw Error('Cannot identify existing acknowledgement renderer');
  const draft = drafts[0];
  if (/\$\s*\(|\$node\s*\[|\$items\s*\(/.test(draft.parameters.jsCode))
    throw Error('Existing renderer depends on other nodes; review its input before patching');
  new Function(draft.parameters.jsCode);
  const upload = nodes.find(n => n.type === 'n8n-nodes-base.httpRequest' && String(n.parameters.url).endsWith('/recruitment/intake'));
  const api = String(options.apiBaseUrl || upload?.parameters.url?.replace(/\/recruitment\/intake$/, '') || '').replace(/\/+$/, '');
  let parsed;
  try { parsed = new URL(api); } catch { throw Error('Supply --api-base-url, including /api'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash)
    throw Error('Invalid backend API base URL');
  const intakeCredential = callback.credentials?.httpHeaderAuth || upload?.credentials?.httpHeaderAuth ||
    (options.allowPlaceholders ? { id: 'hrTv2IntakeHeader', name: 'TV2 Backend Intake Key' } : undefined);
  const smtpCredential = sender.credentials?.smtp ||
    (options.allowPlaceholders ? { id: 'tv2Smtp', name: 'SMTP account' } : undefined);
  if (!intakeCredential?.id || !smtpCredential?.id)
    throw Error('Missing configured Header Auth or SMTP credential; no live workflow was changed');
  const startX = Math.min(...nodes.map(n => n.position?.[0] || 0));
  const y = Math.max(...nodes.map(n => n.position?.[1] || 0)) + 400;
  function add(index, type, parameters, version) {
    const n = { id: 'tv2-website-ack-' + (index + 1), name: NAMES[index], type: 'n8n-nodes-base.' + type,
      typeVersion: version, position: [startX + index * 280, y], parameters };
    if (nodes.some(old => old.id === n.id)) throw Error('Website node id collision');
    nodes.push(n);
    return n;
  }
  const receive = add(0, 'webhook', { httpMethod: 'POST', path: 'application-received', authentication: 'headerAuth', responseMode: 'onReceived', options: {} }, 2);
  receive.webhookId = 'application-received';
  receive.credentials = { httpHeaderAuth: structuredClone(intakeCredential) };
  const claim = add(1, 'httpRequest', {
    method: 'POST',
    url: expr(`(() => { const raw = $json.body || $json; const p = raw.data || raw; const id = Number(p.applicationId); if (!Number.isSafeInteger(id) || id < 1) throw Error('Invalid applicationId'); return ${JSON.stringify(api + '/recruitment/intake/')} + id + '/acknowledgement/claim'; })()`),
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: { timeout: 20000 },
  }, 4.2);
  claim.credentials = { httpHeaderAuth: structuredClone(intakeCredential) };
  claim.retryOnFail = false;
  add(2, 'if', { conditions: { options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
    conditions: [{ id: 'website-claim', leftValue: expr('($json.data || $json).shouldSend === true'), rightValue: true,
      operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, 2.2);
  add(3, 'code', structuredClone(draft.parameters), draft.typeVersion);
  const send = add(4, 'emailSend', {
    operation: 'send', fromEmail: expr('$json.fromEmail'), toEmail: expr('$json.candidateEmail'),
    subject: expr('$json.subject'), emailFormat: 'html', html: expr('$json.html'), options: { appendAttribution: false },
  }, sender.typeVersion);
  send.credentials = { smtp: structuredClone(smtpCredential) };
  send.retryOnFail = false;
  send.onError = 'stopWorkflow';
  const record = add(5, 'httpRequest', {
    method: 'POST', url: expr(`${JSON.stringify(api + '/recruitment/intake/')} + $('${NAMES[3]}').item.json.applicationId + '/acknowledgement'`),
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json',
    jsonBody: expr('{ accepted: $json.accepted, messageId: $json.messageId }'), options: { timeout: 20000 },
  }, 4.2);
  record.credentials = { httpHeaderAuth: structuredClone(intakeCredential) };
  record.retryOnFail = true;
  record.maxTries = 3;
  record.waitBetweenTries = 2000;
  for (let index = 0; index < NAMES.length - 1; index++)
    workflow.connections[NAMES[index]] = { main: [[{ node: NAMES[index + 1], type: 'main', index: 0 }]] };
  // WEB-03 false output has no connection: an existing claim ends without another SMTP send.
  return workflow;
}

function patchSources() {
  const root = path.resolve(__dirname, '..');
  for (const filename of ['workflows/candidate-intake-omnichannel.json', 'workflows/candidate-intake-ai.json',
    'workflows/tv2_recruitment/02_candidate_intake_omnichannel.json', 'workflows/all_tv2_workflows.json',
    'workflows/tv2_recruitment/all_tv2_workflows.json']) {
    const file = path.join(root, filename), content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const patch = workflow => workflow.nodes?.some(n => String(n.parameters?.url).endsWith('/recruitment/intake'))
      ? addWebsiteAcknowledgement(workflow, { allowPlaceholders: true }) : workflow;
    fs.writeFileSync(file, JSON.stringify(Array.isArray(content) ? content.map(patch) : patch(content), null, 2) + '\n');
    console.log('Updated ' + filename);
  }
}
if (require.main === module) {
  try {
    const { values } = parseArgs({ options: {
      sources: { type: 'boolean' }, input: { type: 'string' }, output: { type: 'string' },
      'api-base-url': { type: 'string' }, 'nodes-only': { type: 'boolean' },
    } });
    if (values.sources) patchSources();
    else {
      if (!values.input || !values.output || path.resolve(values.input) === path.resolve(values.output))
        throw Error('Use --input backup.json --output patched.json (a new file)');
      const original = JSON.parse(fs.readFileSync(values.input, 'utf8'));
      if (Array.isArray(original) && original.length !== 1) throw Error('Export exactly one WF-02 workflow');
      const updated = addWebsiteAcknowledgement(Array.isArray(original) ? original[0] : original, {
        apiBaseUrl: values['api-base-url'],
      });
      let output = Array.isArray(original) ? [updated] : updated;
      if (values['nodes-only']) {
        const before = Array.isArray(original) ? original[0] : original;
        if (before.nodes.some(n => n.name === NAMES[0])) throw Error('Website branch is already present; do not paste it twice');
        output = { nodes: updated.nodes.filter(n => NAMES.includes(n.name)),
          connections: Object.fromEntries(Object.entries(updated.connections).filter(([name]) => NAMES.includes(name))), pinData: {} };
      }
      fs.writeFileSync(values.output, JSON.stringify(output, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log('Prepared website acknowledgement branch; existing nodes, credentials and positions preserved. Publish after review.');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { addWebsiteAcknowledgement, NAMES };
