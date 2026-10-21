// Portable, offline regression tests: no credentials, database or provider calls.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'workflows', name)));
const score = load('candidate-intake-ai.json');
const interview = load('interview-schedule-ai.json');
const find = (workflow, prefix) => workflow.nodes.find(node => node.name.startsWith(prefix + '.'));
const origin = { applicationId: 1, interviewId: 2, requestId: 'test-request' };
const run = (node, json, context = origin) => new Function('$json', '$', '$execution', node.parameters.jsCode)(
  json, () => ({ item: { json: context } }), { id: 'test-execution' },
).json;
let cases = 0;
for (const workflow of [score, interview]) {
  assert.equal(workflow.active, false);
  const names = new Set(workflow.nodes.map(node => node.name));
  assert.equal(names.size, workflow.nodes.length);
  assert.equal(new Set(workflow.nodes.map(node => node.id)).size, workflow.nodes.length);
  for (const [from, ports] of Object.entries(workflow.connections)) {
    assert(names.has(from));
    for (const branches of Object.values(ports)) for (const edges of branches) {
      for (const edge of edges || []) assert(names.has(edge.node), edge.node);
    }
  }
  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.code') new Function('$json', '$', '$execution', '$input', node.parameters.jsCode);
  }
  assert(!workflow.staticData && !workflow.pinData, 'Exports must not include execution or polling data');
  cases++;
}
const destinations = (w, prefix, output = 0) => w.connections[find(w, prefix).name].main[output].map(edge => edge.node);
assert.deepEqual(destinations(score, '07'), [find(score, '08').name, find(score, 'AI-02').name]);
assert.deepEqual(destinations(score, 'AI-01'), [find(score, 'AI-02').name]);
assert.deepEqual(destinations(interview, '04'), [find(interview, '05').name, find(interview, 'AI-Q02').name]);
assert.deepEqual(destinations(interview, 'AI-Q01'), [find(interview, 'AI-Q02').name]);
assert.deepEqual(destinations(interview, 'AI-Q10', 1), [find(interview, 'AI-Q12').name]);
assert.deepEqual(destinations(interview, 'AI-Q12'), [find(interview, 'AI-Q13').name]);
cases += 6;
const good = { matchScore: 85.125, summary: 'Relevant skills and experience match this position.', skillsDetected: ['NestJS'], extractedText: 'Synthetic CV' };
const wrappers = payload => [payload, { mergedResponse: payload }, { mergedResponse: JSON.stringify(payload) }, { text: JSON.stringify(payload) }, { content: { parts: [{ text: JSON.stringify(payload) }] } }, { candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }, { text: '```json\n' + JSON.stringify(payload) + '\n```' }];
for (const input of wrappers(good)) {
  const parsed = run(find(score, 'AI-08'), input);
  const result = run(find(score, 'AI-09'), parsed);
  assert(result.valid); assert.equal(result.matchScore, 85.13); assert.equal(result.requestId, origin.requestId); cases++;
}
for (const input of [{ summary: good.summary, skillsDetected: [] }, { ...good, matchScore: null }, { ...good, matchScore: '' }, { ...good, matchScore: 101 }, { ...good, summary: 'short' }, { ...good, skillsDetected: 'NestJS' }, { error: 'Provider unavailable' }]) {
  assert.equal(run(find(score, 'AI-09'), run(find(score, 'AI-08'), input)).valid, false); cases++;
}
const questions = { questions: Array.from({ length: 5 }, (_, i) => ({ question: `Question ${i + 1}: explain the API design trade-offs in your project.` })) };
for (const input of wrappers(questions)) {
  const result = run(find(interview, 'AI-Q08'), input);
  assert(result.valid); assert.equal(result.questions.length, 5); assert.equal(result.interviewId, 2); cases++;
}
for (const input of [{ questions: [] }, { questions: ['short'] }, { text: '```json\n{}\n```' }, { error: 'Service unavailable' }]) {
  assert.equal(run(find(interview, 'AI-Q08'), input).valid, false); cases++;
}
for (const input of [{ body: { data: { interviewId: 2, requestId: 'test-request' } } }, origin, { data: origin }]) {
  assert.deepEqual(run(find(interview, 'AI-Q02'), input), { interviewId: 2, requestId: 'test-request' }); cases++;
}
for (const attachment of [null, { mimeType: 'application/pdf', data: 'JVBERi0=' }]) {
  const result = run(find(score, 'AI-06'), { ...origin, cvText: attachment ? '' : 'Synthetic CV', cvAttachment: attachment, job: { requirements: 'NestJS' } });
  assert.equal(result.geminiRequest.generationConfig.temperature, 0.2);
  assert.equal(result.geminiRequest.contents[0].parts.length, attachment ? 2 : 1);
  if (attachment) assert.deepEqual(result.geminiRequest.contents[0].parts[1].inlineData, attachment);
  cases++;
}
const native = find(interview, 'AI-Q07');
assert.equal(native.type, '@n8n/n8n-nodes-langchain.googleGemini');
assert.equal(native.typeVersion, 1.2);
assert(native.credentials.googlePalmApi);
assert.equal(native.parameters.operation, 'message');
assert.equal(native.parameters.jsonOutput, true);
assert.equal(native.parameters.modelId, '={{ $json.geminiModel }}');
assert.equal(find(score, 'AI-07').parameters.jsonBody, '={{ $json.geminiRequest }}');
assert.equal(find(score, 'AI-11').parameters.jsonBody, '={{ $json.callbackResult }}');
cases++;
const prepare = find(interview, 'AI-QR01');
const classify = find(interview, 'AI-QR02');
assert.equal(native.retryOnFail, false, 'The explicit loop owns the total call budget');
assert.deepEqual(destinations(interview, 'AI-QR03'), [find(interview, 'AI-QR04').name]);
assert.deepEqual(destinations(interview, 'AI-QR03', 1), [find(interview, 'AI-Q08').name]);
assert.deepEqual(destinations(interview, 'AI-QR04'), [prepare.name]);
let context = { ...origin, geminiPrompt: 'Synthetic prompt', systemPrompt: 'Synthetic system prompt' };
for (let attempt = 1; attempt <= 4; attempt++) {
  context = run(prepare, attempt === 1 ? context : { retryContext: context });
  assert.equal(context.geminiAttempt, attempt);
  assert.equal(context.requestId, origin.requestId);
  assert.equal(context.geminiModel, attempt <= 2 ? 'models/gemini-3.5-flash-lite' : 'models/gemini-3.1-flash-lite');
  assert.equal(context.geminiFallbackUsed, attempt > 2);
  const result = run(classify, { error: 'Service unavailable' }, context);
  assert.equal(result.shouldRetry, attempt < 4);
  assert.equal(result.retryDelaySeconds, [15, 30, 60, 0][attempt - 1]);
  assert.equal(result.retryExhausted, attempt === 4);
  cases++;
}
assert.throws(() => run(prepare, { retryContext: context }), /limit/);
for (const status of [400, 401, 403, 404]) {
  assert.equal(run(classify, { error: { status, message: 'Rejected request' } }, { ...origin, geminiAttempt: 1 }).shouldRetry, false);
  cases++;
}
for (const error of ['API key invalid', 'Invalid API key', 'Permission denied', 'Bad request']) {
  assert.equal(run(classify, { error }, { ...origin, geminiAttempt: 1 }).shouldRetry, false);
  cases++;
}
for (const status of [429, 502, 503, 504]) {
  assert.equal(run(classify, { error: { status, message: 'Transient failure' } }, { ...origin, geminiAttempt: 1 }).shouldRetry, true);
  cases++;
}
const successfulProvider = run(classify, { mergedResponse: JSON.stringify(questions) }, { ...origin, geminiAttempt: 3 });
assert.equal(successfulProvider.shouldRetry, false);
const success = run(find(interview, 'AI-Q08'), successfulProvider);
assert.equal(success.valid, true); assert.equal(success.geminiAttempts, 3); assert.equal(success.requestId, origin.requestId);
const malformedProvider = run(classify, { mergedResponse: 'not JSON' }, { ...origin, geminiAttempt: 1 });
assert.equal(malformedProvider.shouldRetry, false);
assert.equal(run(find(interview, 'AI-Q08'), malformedProvider).valid, false);
cases += 3;
// A request cannot select its own model or skip the attempt budget.
const untrusted = run(prepare, { ...origin, geminiModel: 'attacker-model', geminiFallbackUsed: true });
assert.equal(untrusted.geminiModel, 'models/gemini-3.5-flash-lite');
assert.equal(untrusted.geminiFallbackUsed, false);
const fallbackContext = run(prepare, { retryContext: { ...origin, geminiAttempt: 2 } });
const fallbackOutput = run(classify, { mergedResponse: JSON.stringify(questions) }, fallbackContext);
const fallbackParsed = run(find(interview, 'AI-Q08'), fallbackOutput);
assert.equal(fallbackParsed.geminiModel, 'models/gemini-3.1-flash-lite');
assert.equal(fallbackParsed.geminiFallbackUsed, true);
assert.equal(fallbackParsed.geminiAttempts, 3);
assert.equal(fallbackParsed.requestId, origin.requestId);
assert.equal(fallbackParsed.valid, true);
for (const status of [400, 401, 403, 404]) {
  assert.equal(run(classify, { error: { status, message: 'Rejected' } }, fallbackContext).shouldRetry, false);
  cases++;
}
cases += 2;
for (const error of ['The connection to the server was closed unexpectedly, perhaps it is offline.', 'socket hang up', 'ECONNRESET']) {
  const first = run(classify, { error }, { ...origin, geminiAttempt: 1 });
  assert.equal(first.shouldRetry, true);
  const last = run(classify, { error }, { ...origin, geminiAttempt: 4 });
  assert.equal(last.shouldRetry, false);
  assert.equal(last.retryExhausted, true);
  cases++;
}
console.log(`${cases} workflow regression cases passed; no external calls.`);
