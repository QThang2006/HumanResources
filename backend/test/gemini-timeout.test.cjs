const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { GeminiService } = require('../dist/modules/core/ai/gemini.service');

function provider() {
  const instance = new GeminiService(new ConfigService({ GEMINI_API_KEY: randomUUID(), GEMINI_MODEL: 'test-model' }));
  instance.logger = { warn() {}, error() {}, log() {} };
  return instance;
}

test('a stalled SDK request is aborted within the supplied operation budget', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  let aborted = false;
  global.fetch = async (_url, options) => {
    calls++;
    assert.ok(options.signal);
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('synthetic stalled request aborted'));
    }, { once: true }));
  };
  try {
    const result = await provider().generateJson('Synthetic connection probe.', undefined, { timeoutMs: 50 });
    assert.equal(result, null);
    assert.equal(aborted, true);
    assert.ok(calls >= 1);
  } finally { global.fetch = originalFetch; }
});

test('fallback model receives only the remaining budget after the first model fails', async t => {
  let now = 1000;
  const timeouts = [];
  t.mock.method(Date, 'now', () => now);
  const ai = provider();
  ai.genAI = {
    getGenerativeModel: () => ({
      generateContent: async (_prompt, options) => {
        timeouts.push(options.timeout);
        if (timeouts.length === 1) {
          now += 25;
          throw new Error('Synthetic unavailable model');
        }
        return { response: { text: () => '{"ok":true}' } };
      },
    }),
  };
  assert.deepEqual(await ai.generateJson('Synthetic probe.', undefined, { timeoutMs: 80 }), { ok: true });
  assert.deepEqual(timeouts, [80, 55]);
});

test('callers without a deadline retain their existing SDK behavior and parse successful responses', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    assert.equal(options.signal, undefined);
    return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await provider().generateJson('Synthetic connection probe.'), { ok: true });
  } finally { global.fetch = originalFetch; }
});
