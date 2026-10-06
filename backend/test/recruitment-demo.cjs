const { startHarness } = require('./recruitment-harness.cjs');
process.env.ATS_TEST_API_PORT ||= '3001';

(async () => {
  const h = await startHarness();
  let closing = false;
  async function close() {
    if (closing) return; closing = true;
    await h.close(); process.exit(0);
  }
  process.on('SIGINT', close); process.on('SIGTERM', close);
  const result = await h.request('/jobs', { who: 'hr', method: 'POST', body: {
    title: 'Backend Developer', departmentId: h.departments[0].id,
    description: 'Develop recruitment APIs with NestJS and MySQL.',
    requirements: 'TypeScript, REST APIs, database transactions and teamwork.',
    location: 'Ho Chi Minh City', salaryRange: 'Negotiable',
  } });
  if (result.status !== 201) { await h.close(); throw new Error('Cannot create demo job.'); }
  console.log('Disposable recruitment demo API: ' + h.base);
  console.log('Accounts: hr@example.test / manager@example.test / other@example.test');
  console.log('Fixture password: Test-only-password-2026');
  console.log('AI methods are unavailable; no external n8n call or email is sent.');
  console.log('Ctrl+C removes this demo database and uploaded fixtures.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
