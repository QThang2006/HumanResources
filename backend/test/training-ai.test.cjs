const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { TrainingService } = require('../dist/modules/training/training.service');
const { SystemConfigService } = require('../dist/modules/system-config/system-config.service');
const { GeminiService } = require('../dist/modules/core/ai/gemini.service');
const { ConfigService } = require('@nestjs/config');

const employee = { id: 10, fullName: 'Nhân viên giả lập', jobTitle: 'Kỹ sư', department: { name: 'Kỹ thuật' }, trainings: [], performanceReviews: [] };
const course = { id: 5, title: 'TypeScript cơ bản', skillsProvided: ['TypeScript'], durationHours: 8 };
const analysis = { missingSkills: ['TypeScript'], summary: 'Phân tích sơ bộ: kỹ năng cần phát triển theo vị trí.' };
const recommendation = { recommendedCourses: [], skillGapsIdentified: ['TypeScript'], summary: 'Khuyến nghị học TypeScript.', careerAdvice: 'Thực hành mỗi tuần.', readinessScore: 70, aiGenerated: true };
function service(overrides = {}) {
  return new TrainingService({ find: async () => [course] }, {}, { findOne: async () => employee }, {
    isAvailable: () => true,
    generateJson: async () => analysis,
    recommendSkillGapCourse: async () => recommendation,
    ...overrides,
  });
}

test('missing Gemini configuration gives an actionable error without invoking AI', async () => {
  const training = service({ isAvailable: () => false, generateJson: async () => assert.fail('Must not invoke an unavailable provider') });
  await assert.rejects(training.suggestCourseForEmployee(10), error => error.getStatus() === 400 && /backend/.test(error.message) && /Tích hợp/.test(error.message));
});

test('null and malformed AI analyses return controlled errors instead of crashing on filter/trim', async () => {
  for (const output of [null, {}, { missingSkills: 'TypeScript', summary: 'Test' }, { missingSkills: ['TypeScript'], summary: {} }]) {
    await assert.rejects(service({ generateJson: async () => output }).suggestCourseForEmployee(10), error => error.getStatus() === 503 && /hợp lệ/.test(error.message));
  }
});

test('provider exceptions do not expose provider details or become unhandled server errors', async () => {
  for (const stage of ['generateJson', 'recommendSkillGapCourse']) {
    await assert.rejects(service({ [stage]: async () => { throw Error('private-provider-detail'); } }).suggestCourseForEmployee(10), error => error.getStatus() === 503 && !error.message.includes('private-provider-detail'));
  }
});

test('malformed recommendation fields cannot reach React as objects or invalid arrays', async () => {
  for (const field of [{ recommendedCourses: {} }, { skillGapsIdentified: 'TypeScript' }, { skillGapsIdentified: [{}] }, { careerAdvice: {} }, { summary: {} }, { readinessScore: {} }, { readinessScore: 101 }]) {
    await assert.rejects(service({ recommendSkillGapCourse: async () => ({ ...recommendation, ...field }) }).suggestCourseForEmployee(10), error => error.getStatus() === 503);
  }
});

test('valid analysis resolves a real catalog course and is ready to display', async () => {
  const result = await service().suggestCourseForEmployee(10);
  assert.equal(result.employeeId, employee.id);
  assert.equal(result.analysisMode, 'PRELIMINARY');
  assert.deepEqual(result.skillGaps, ['TypeScript']);
  assert.equal(result.courseId, course.id);
  assert.equal(result.hasMatchingCourse, true);
  assert.match(result.summary, /^Phân tích sơ bộ/);
  assert.equal(typeof result.careerAdvice, 'string');
});

test('connection test reports missing, invalid and failed connections as unsuccessful', async () => {
  for (const output of [null, { ok: false }, new Error('provider failure')]) {
    const config = new SystemConfigService({}, { isAvailable: () => true, getModelName: () => 'test-model', generateJson: async () => { if (output instanceof Error) throw output; return output; } });
    assert.equal((await config.testGemini()).success, false);
  }
  const unavailable = new SystemConfigService({}, { isAvailable: () => false, getModelName: () => 'test-model' });
  assert.equal((await unavailable.testGemini()).success, false);
  const available = new SystemConfigService({}, { isAvailable: () => true, getModelName: () => 'test-model', generateJson: async () => ({ ok: true, message: 'OK' }) });
  assert.equal((await available.testGemini()).success, true);
});

test('saving a new key refreshes the running provider; a masked key does not overwrite it', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tv4-ai-config-'));
  const previousCwd = process.cwd();
  const previousKey = process.env.GEMINI_API_KEY;
  const runtimeFixture = randomUUID();
  let refreshes = 0;
  try {
    process.chdir(directory);
    const config = new SystemConfigService({}, { refreshConfiguration: () => { refreshes++; assert.equal(process.env.GEMINI_API_KEY, runtimeFixture); } });
    config.updateConfig(runtimeFixture);
    assert.equal(refreshes, 1);
    assert.equal(require('dotenv').parse(fs.readFileSync('.env')).GEMINI_API_KEY, runtimeFixture);
    config.updateConfig('********masked');
    assert.equal(refreshes, 1);
    assert.equal(process.env.GEMINI_API_KEY, runtimeFixture);
  } finally {
    process.chdir(previousCwd);
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Gemini provider can be initialized and cleared after configuration changes without network calls', () => {
  const settings = { GEMINI_API_KEY: '', GEMINI_MODEL: 'test-model' };
  const provider = new GeminiService(new ConfigService(settings));
  assert.equal(provider.isAvailable(), false);
  settings.GEMINI_API_KEY = randomUUID();
  provider.refreshConfiguration();
  assert.equal(provider.isAvailable(), true);
  settings.GEMINI_API_KEY = 'your_gemini_api_key_here';
  provider.refreshConfiguration();
  assert.equal(provider.isAvailable(), false);
});

function withConfigFixture(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tv4-ai-save-failure-'));
  const previousCwd = process.cwd();
  const previousKey = process.env.GEMINI_API_KEY;
  const previousWebhook = process.env.N8N_WEBHOOK_URL;
  const originalKey = randomUUID();
  const originalWebhook = 'http://localhost:5678/webhook';
  const originalContent = `GEMINI_API_KEY=${originalKey}\nN8N_WEBHOOK_URL=${originalWebhook}\n`;
  let refreshes = 0;
  try {
    process.chdir(directory);
    fs.writeFileSync('.env', originalContent);
    process.env.GEMINI_API_KEY = originalKey;
    process.env.N8N_WEBHOOK_URL = originalWebhook;
    const config = new SystemConfigService({}, { refreshConfiguration: () => { refreshes++; } });
    run({ config, directory, originalKey, originalWebhook, originalContent, refreshes: () => refreshes });
  } finally {
    process.chdir(previousCwd);
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousWebhook === undefined) delete process.env.N8N_WEBHOOK_URL;
    else process.env.N8N_WEBHOOK_URL = previousWebhook;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('invalid webhook leaves the saved key, runtime configuration and active provider unchanged', () => {
  withConfigFixture(({ config, originalKey, originalWebhook, originalContent, refreshes }) => {
    assert.throws(() => config.updateConfig(randomUUID(), 'ftp://localhost/webhook'), error => error.getStatus() === 400);
    assert.equal(process.env.GEMINI_API_KEY, originalKey);
    assert.equal(process.env.N8N_WEBHOOK_URL, originalWebhook);
    assert.equal(fs.readFileSync('.env', 'utf8'), originalContent);
    assert.equal(refreshes(), 0);
  });
});

test('a website or n8n URL in the Gemini key field is rejected without changing saved or runtime configuration', () => {
  withConfigFixture(({ config, originalKey, originalWebhook, originalContent, refreshes }) => {
    for (const pastedUrl of ['https://example.invalid/n8n', 'http://localhost:5678/', ' HTTPS://example.invalid/ ', '//example.invalid/n8n']) {
      assert.throws(() => config.updateConfig(pastedUrl, 'http://localhost:5679/webhook'), error => error.getStatus() === 400 && /không phải đường dẫn website hoặc địa chỉ n8n/.test(error.message));
      assert.equal(process.env.GEMINI_API_KEY, originalKey);
      assert.equal(process.env.N8N_WEBHOOK_URL, originalWebhook);
      assert.equal(fs.readFileSync('.env', 'utf8'), originalContent);
      assert.equal(refreshes(), 0);
    }
  });
});

test('configuration reads show an empty key for a previously saved URL rather than a misleading mask', () => {
  withConfigFixture(({ config, originalKey, originalContent, refreshes }) => {
    assert.equal(config.getConfig().geminiApiKey, `********${originalKey.slice(-4)}`);
    for (const storedValue of ['your_gemini_api_key_here', 'https://example.invalid/n8n', ' http://localhost:5678/ ', '//example.invalid/n8n']) {
      process.env.GEMINI_API_KEY = storedValue;
      assert.equal(config.getConfig().geminiApiKey, '');
      assert.equal(process.env.GEMINI_API_KEY, storedValue);
    }
    assert.equal(fs.readFileSync('.env', 'utf8'), originalContent);
    assert.equal(refreshes(), 0);
  });
});

test('newlines in a new Gemini key cannot add or change environment entries', () => {
  withConfigFixture(({ config, originalKey, originalWebhook, originalContent, refreshes }) => {
    for (const pastedKey of [randomUUID() + '\nANOTHER_SETTING=value', randomUUID() + '\r\nANOTHER_SETTING=value', '\n' + randomUUID(), randomUUID() + '\n']) {
      assert.throws(() => config.updateConfig(pastedKey, 'http://localhost:5679/webhook'), error => error.getStatus() === 400 && /một dòng/.test(error.message));
      assert.equal(process.env.GEMINI_API_KEY, originalKey);
      assert.equal(process.env.N8N_WEBHOOK_URL, originalWebhook);
      assert.equal(fs.readFileSync('.env', 'utf8'), originalContent);
      assert.equal(refreshes(), 0);
    }
  });
});

test('failed persistence leaves both runtime values and active provider unchanged', () => {
  withConfigFixture(({ config, directory, originalKey, originalWebhook, originalContent, refreshes }) => {
    const writeFile = fs.writeFileSync;
    try {
      fs.writeFileSync = (filename, ...args) => {
        if (filename === path.join(directory, '.env')) {
          const failure = new Error('Simulated configuration write failure');
          failure.code = 'EACCES';
          throw failure;
        }
        return writeFile(filename, ...args);
      };
      assert.throws(() => config.updateConfig(randomUUID(), 'http://localhost:5679/webhook'), error => error.code === 'EACCES');
    } finally {
      fs.writeFileSync = writeFile;
    }
    assert.equal(process.env.GEMINI_API_KEY, originalKey);
    assert.equal(process.env.N8N_WEBHOOK_URL, originalWebhook);
    assert.equal(fs.readFileSync('.env', 'utf8'), originalContent);
    assert.equal(refreshes(), 0);
  });
});
