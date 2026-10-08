// Prepare CLI imports without modifying the lead's shared workflow templates.
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { resolve, join } = require('node:path');

function validateConnections(workflow) {
  const names = new Set(workflow.nodes.map(node => node.name));
  if (names.size !== workflow.nodes.length) throw new Error('Duplicate node names: ' + workflow.name);
  for (const [source, outputs] of Object.entries(workflow.connections)) {
    if (!names.has(source)) throw new Error('Unknown connection source: ' + source);
    for (const groups of Object.values(outputs)) {
      for (const group of groups) {
        for (const edge of group) {
          if (!names.has(edge.node)) throw new Error('Unknown connection target: ' + edge.node);
        }
      }
    }
  }
}

(async () => {
  const root = resolve(__dirname, '..');
  const output = join(root, '.temp', 'n8n-import');
  await mkdir(output, { recursive: true });
  for (const [file, id] of [
    ['interview-schedule.json', 'hrTv2Interview01'],
    ['interview-schedule-readback.json', 'hrTv2Delivery01'],
    ['employee-hired.json', 'hrTv2Employee01'],
    ['burnout-alert.json', 'hrBurnoutAlert01'],
    ['master-hr-ecosystem.json', 'hrMasterEcosystem01'],
  ]) {
    const source = JSON.parse(await readFile(join(root, 'workflows', file), 'utf8'));
    if (!Array.isArray(source.nodes) || !source.connections) throw new Error('Invalid workflow template: ' + file);
    // n8n 2.42 CLI import requires workflow_entity.id; UI exports may omit it.
    // Inactive imports cannot send notifications until configured and activated.
    const workflow = { ...source, id: source.id || id, active: false };
    if (file === 'master-hr-ecosystem.json') {
      // The merged template has three responders with the same name. n8n
      // resolves connections by name, so give each branch its own responder.
      for (const [trigger, responderId, responderName] of [
        ['Webhook: Xếp lịch phỏng vấn', 'respond-webhook-interview', 'Respond HTTP 200 - Interview'],
        ['Webhook: Cảnh báo kiệt sức', 'respond-webhook-burnout', 'Respond HTTP 200 - Burnout'],
        ['Webhook: 1-Click Hired', 'respond-webhook-hired', 'Respond HTTP 200 - Hired'],
      ]) {
        const responder = workflow.nodes.find(node => node.id === responderId);
        if (!responder) throw new Error('Missing responder: ' + responderId);
        responder.name = responderName;
        for (const group of workflow.connections[trigger].main) {
          for (const edge of group) {
            if (edge.node === 'Respond HTTP 200') edge.node = responderName;
          }
        }
      }
    }
    validateConnections(workflow);
    const path = join(output, file);
    await writeFile(path, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
    console.log('Prepared inactive import: ' + path);
  }
  const localTest = JSON.parse(await readFile(join(output, 'interview-schedule.json'), 'utf8'));
  localTest.id = 'hrTv2LocalTest01';
  localTest.name = 'TV2 - LOCAL TEST - Interview (no external delivery)';
  localTest.active = false;
  for (const node of localTest.nodes) {
    delete node.credentials;
    if (node.type === 'n8n-nodes-base.stickyNote') {
      node.parameters.content = '### LOCAL TEST: Thành viên 2\nWebhook và Code chạy thật trong n8n. Google Meet là dữ liệu mẫu; email/Telegram chỉ kiểm tra nội dung, không gửi. Luồng này không chứng minh tích hợp Google/SMTP/Telegram đã chạy.';
    } else if (node.type === 'n8n-nodes-base.webhook') {
      node.parameters.path = 'hr-tv2-local-test/interview-schedule';
      node.webhookId = 'hr-tv2-local-test-interview';
    } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
      node.parameters.responseBody = "={{ { success: true, mode: 'LOCAL_TEST', delivery: 'NOT_SENT' } }}";
    } else if (node.type === 'n8n-nodes-base.googleCalendar') {
      node.type = 'n8n-nodes-base.code';
      node.typeVersion = 2;
      node.parameters = { jsCode: "const raw = $input.first().json; const body = raw.body || raw; const payload = body.data || body; if (!payload.candidateName || !payload.candidateEmail || !payload.scheduledAt || Number.isNaN(Date.parse(payload.scheduledAt))) throw new Error('Missing or invalid interview test fields'); return [{ json: { hangoutLink: 'https://example.invalid/meet/local-test', integration: 'MOCK_GOOGLE_CALENDAR' } }];" };
    } else if (node.type === 'n8n-nodes-base.emailSend') {
      node.type = 'n8n-nodes-base.code';
      node.typeVersion = 2;
      node.parameters = { jsCode: "const data = $input.first().json; if (!data.candidateEmail.endsWith('.invalid') || !data.emailSubject || !data.emailHtml.includes(data.candidateName) || !data.emailHtml.includes('https://example.invalid/meet/local-test')) throw new Error('Invalid local email preview'); return [{ json: { result: 'PASS', channel: 'EMAIL_PREVIEW', delivery: 'NOT_SENT', to: data.candidateEmail, subject: data.emailSubject, html: data.emailHtml } }];" };
    } else if (node.type === 'n8n-nodes-base.telegram') {
      node.type = 'n8n-nodes-base.code';
      node.typeVersion = 2;
      node.parameters = { jsCode: "const data = $input.first().json; if (!data.telegramAlert || !data.telegramAlert.includes(data.candidateName)) throw new Error('Invalid local Telegram preview'); return [{ json: { result: 'PASS', channel: 'TELEGRAM_PREVIEW', delivery: 'NOT_SENT', text: data.telegramAlert } }];" };
    }
  }
  validateConnections(localTest);
  if (localTest.nodes.some(node => !['n8n-nodes-base.stickyNote', 'n8n-nodes-base.webhook', 'n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.code'].includes(node.type))) throw new Error('Local test contains an external integration');
  const testPath = join(output, 'tv2-interview-local-test.json');
  await writeFile(testPath, JSON.stringify(localTest, null, 2) + '\n', 'utf8');
  console.log('Prepared local test without external delivery: ' + testPath);
  console.log('Activate either master or the individual workflows; their production webhook paths overlap. The local test has a separate path.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
