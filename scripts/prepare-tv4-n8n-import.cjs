// Prepare safe, inactive TV4 workflow imports without writing credentials to Git.
const { readFile, readdir, mkdir, writeFile } = require('node:fs/promises');
const { resolve, join } = require('node:path');

const workflows = [
  ['01_tv4_knowledge_rag.json', 'tv4KnowledgeRagV1'],
  ['02_mandatory_training_reminder.json', 'tv4MandatoryTrainingReminderV1'],
  ['03_monthly_performance_review_reminder.json', 'tv4PerformanceReviewReminderV1'],
  ['04_offboarding_workflow.json', 'tv4OffboardingV1'],
];

function validate(workflow, filename) {
  if (!Array.isArray(workflow.nodes) || !workflow.connections) {
    throw new Error(`Workflow không hợp lệ: ${filename}`);
  }

  const names = new Set(workflow.nodes.map((node) => node.name));
  if (names.size !== workflow.nodes.length) {
    throw new Error(`Workflow có tên node trùng nhau: ${filename}`);
  }

  for (const [source, outputs] of Object.entries(workflow.connections)) {
    if (!names.has(source)) throw new Error(`Không tìm thấy node nguồn: ${source}`);
    for (const groups of Object.values(outputs)) {
      for (const group of groups) {
        for (const edge of group) {
          if (!names.has(edge.node)) {
            throw new Error(`Không tìm thấy node đích: ${edge.node}`);
          }
        }
      }
    }
  }
}

async function loadCredentialReferences(directory) {
  if (!directory) return new Map();

  const references = new Map();
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith('.json')) continue;
    const raw = JSON.parse(await readFile(join(directory, filename), 'utf8'));
    const workflow = Array.isArray(raw) ? raw[0] : raw;
    if (!workflow?.name || !Array.isArray(workflow.nodes)) continue;

    for (const node of workflow.nodes) {
      if (
        !node.credentials ||
        !['n8n-nodes-base.emailSend', 'n8n-nodes-base.telegram'].includes(
          node.type,
        )
      ) {
        continue;
      }

      const key = `${workflow.name}\u0000${node.name}`;
      const candidateSize = Object.keys(node.credentials).length;
      const existingSize = Object.keys(references.get(key) || {}).length;
      if (candidateSize > existingSize) references.set(key, node.credentials);
    }
  }

  return references;
}

async function loadMailRouting(filename) {
  if (!filename) return null;
  const routing = JSON.parse(await readFile(resolve(filename), 'utf8'));
  const fields = [
    'senderEmail', 'testEmployeeEmail', 'testManagerEmail',
    'testInternalEmail', 'itEmail', 'accountingEmail',
  ];
  for (const field of fields) {
    const address = String(routing[field] || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      throw new Error(`Thiếu hoặc sai địa chỉ nhận đã xác nhận: ${field}`);
    }
    routing[field] = address;
  }
  const selected = Object.fromEntries(fields.map(field => [field, routing[field]]));
  if (routing.telegramChatId !== undefined) {
    const chatId = String(routing.telegramChatId).trim();
    if (!/^-?\d+$/.test(chatId) || !Number.isSafeInteger(Number(chatId))) {
      throw new Error('telegramChatId phải là ID số hợp lệ đã được xác nhận.');
    }
    selected.telegramChatId = chatId;
  }
  return selected;
}

(async () => {
  const root = resolve(__dirname, '..');
  const sourceDir = join(root, 'workflows', 'tv4_admin_training');
  const outputDir = join(root, '.temp', 'tv4-n8n-import');
  const credentialReferences = await loadCredentialReferences(
    process.env.TV4_N8N_CREDENTIAL_SOURCE_DIR,
  );
  const mailRouting = await loadMailRouting(
    process.env.TV4_N8N_MAIL_CONFIG_FILE,
  );
  await mkdir(outputDir, { recursive: true });

  for (const [filename, id] of workflows) {
    const workflow = JSON.parse(await readFile(join(sourceDir, filename), 'utf8'));
    validate(workflow, filename);
    workflow.id = id;
    workflow.active = false;
    delete workflow.versionId;
    delete workflow.activeVersionId;
    for (const node of workflow.nodes) {
      const credentials = credentialReferences.get(
        `${workflow.name}\u0000${node.name}`,
      );
      if (credentials) node.credentials = credentials;
      if (mailRouting && node.type === 'n8n-nodes-base.set') {
        for (const assignment of node.parameters.assignments?.assignments || []) {
          if (Object.hasOwn(mailRouting, assignment.name)) {
            assignment.value = mailRouting[assignment.name];
          }
        }
      }
    }
    await writeFile(
      join(outputDir, filename),
      `${JSON.stringify(workflow, null, 2)}\n`,
      'utf8',
    );
    console.log(`Prepared inactive TV4 import: ${filename}`);
  }

  console.log(`TV4 import directory: ${outputDir}`);
  if (credentialReferences.size > 0) {
    console.log('Preserved local SMTP/Telegram credential references.');
  }
  if (mailRouting) console.log('Applied local TV4 mail routing to inactive imports.');
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
