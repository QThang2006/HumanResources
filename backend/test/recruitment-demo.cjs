const { startHarness } = require('./recruitment-harness.cjs');
const { seedRecruitmentDemo } = require('../dist/seeds/recruitment-demo.seed');
process.env.ATS_TEST_API_PORT ||= '3001';

(async () => {
  const h = await startHarness();
  let closing = false;
  async function close() {
    if (closing) return; closing = true;
    await h.close(); process.exit(0);
  }
  process.on('SIGINT', close); process.on('SIGTERM', close);
  // These are disposable harness actors, never the team's real users/departments.
  await h.db.getRepository(h.entities.Department).update(h.departments[0].id, { name: 'Công nghệ & Sản phẩm' });
  await h.db.getRepository(h.entities.User).update(h.users.hr.id, { fullName: 'Trần Minh Anh (HR demo)' });
  await h.db.getRepository(h.entities.User).update(h.users.manager.id, { fullName: 'Nguyễn Hoàng Phúc (Manager demo)' });
  let report;
  try { report = await seedRecruitmentDemo(h.db, { creatorId: h.users.hr.id, managerId: h.users.manager.id }); }
  catch (error) { await h.close(); throw error; }
  console.log('Disposable recruitment demo API: ' + h.base);
  console.log(JSON.stringify(report.created));
  console.log('Accounts: hr@example.test / manager@example.test / other@example.test');
  console.log('Fixture password: Test-only-password-2026');
  console.log('Scores/feedback are synthetic demo data. LIVE AI methods are unavailable; no external n8n call or email is sent.');
  console.log('Ctrl+C removes this demo database and uploaded fixtures.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
