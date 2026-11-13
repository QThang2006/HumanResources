// Offline regression tests for the published TV2 workflow exports.
// No credentials, database, provider, or network calls are used.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'workflows', name)));
const intake = load('candidate-intake-ai.json');
const interview = load('interview-schedule-ai.json');
const find = (workflow, prefix) => workflow.nodes.find(node => node.name.startsWith(prefix + '.'));
const destinations = (workflow, prefix, output = 0) => workflow.connections[find(workflow, prefix).name].main[output].map(edge => edge.node);
const run = (node, json, context = { interviewId: 2, requestId: 'test-request' }) =>
  new Function('$json', '$', '$execution', node.parameters.jsCode)(
    json, () => ({ item: { json: context } }), { id: 'test-execution' },
  ).json;
let cases = 0;

for (const workflow of [intake, interview]) {
  assert.equal(workflow.active, false);
  const names = new Set(workflow.nodes.map(node => node.name));
  assert.equal(names.size, workflow.nodes.length);
  assert.equal(new Set(workflow.nodes.map(node => node.id)).size, workflow.nodes.length);
  for (const [from, ports] of Object.entries(workflow.connections)) {
    assert(names.has(from));
    for (const branches of Object.values(ports)) for (const edges of branches)
      for (const edge of edges || []) assert(names.has(edge.node), edge.node);
  }
  for (const node of workflow.nodes)
    if (node.type === 'n8n-nodes-base.code') new Function('$json', '$', '$execution', '$input', node.parameters.jsCode);
  assert(!workflow.staticData && !workflow.pinData);
  cases++;
}

// Intake ownership: Backend scores the saved application; n8n only acknowledges it.
assert.deepEqual(destinations(intake, '07'), [find(intake, '08').name]);
assert.equal(intake.nodes.some(node => node.name.startsWith('AI-')), false);
cases += 2;

// Interview AI remains an explicit, separate workflow.
assert.deepEqual(destinations(interview, '04'), [find(interview, '05').name, find(interview, 'AI-Q02').name]);
assert.deepEqual(destinations(interview, 'AI-Q01'), [find(interview, 'AI-Q02').name]);
assert.deepEqual(destinations(interview, 'AI-Q10', 1), [find(interview, 'AI-Q12').name]);
assert.deepEqual(destinations(interview, 'AI-Q12'), [find(interview, 'AI-Q13').name]);
const native = find(interview, 'AI-Q07');
assert.equal(native.type, '@n8n/n8n-nodes-langchain.googleGemini');
assert.equal(native.typeVersion, 1.2);
assert(native.credentials.googlePalmApi);
assert.equal(native.parameters.jsonOutput, true);
assert.equal(native.retryOnFail, false);
cases += 8;

const questions = { questions: Array.from({ length: 5 }, (_, i) => ({ question: `Question ${i + 1}: explain the API design trade-offs in your project.` })) };
const parsed = run(find(interview, 'AI-Q08'), { mergedResponse: JSON.stringify(questions) });
assert.equal(parsed.valid, true);
assert.equal(parsed.questions.length, 5);
assert.equal(parsed.interviewId, 2);
assert.equal(parsed.requestId, 'test-request');
cases++;
for (const input of [{ questions: [] }, { questions: ['short'] }, { text: 'not JSON' }, { error: 'Service unavailable' }]) {
  assert.equal(run(find(interview, 'AI-Q08'), input).valid, false);
  cases++;
}
console.log(`${cases} workflow regression cases passed; no external calls.`);
