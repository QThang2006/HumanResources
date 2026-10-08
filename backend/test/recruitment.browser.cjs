const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { startHarness, pdf } = require('./recruitment-harness.cjs');
const { chromium } = require(process.env.ATS_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const h = await startHarness();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const output = resolve(process.env.ATS_SCREENSHOT_DIR || '../docs/thanh-vien-2/evidence');
    await mkdir(output, { recursive: true });
    const errors = [];
    const origin = process.env.ATS_FRONTEND_URL || 'http://127.0.0.1:5173';
    async function pageFor(width = 1440, height = 960) {
      const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'Asia/Ho_Chi_Minh' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://localhost:3001/api/**', route => route.continue({ url: route.request().url().replace('http://localhost:3001/api', h.base) }));
      return page;
    }
    async function login(page, who) {
      await page.goto(origin + '/admin/recruitment');
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(who + '@example.test');
      await page.getByLabel('Mật khẩu', { exact: true }).fill('Test-only-password-2026');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.getByRole('heading', { name: 'Quản lý tuyển dụng', exact: true }).waitFor();
    }
    const hr = await pageFor();
    await login(hr, 'hr');
    let failDepartments = true;
    await hr.route('**/api/jobs/departments', route => failDepartments
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Department lookup unavailable' }) })
      : route.continue({ url: route.request().url().replace('http://localhost:3001/api', h.base) }));
    await hr.getByRole('button', { name: '+ Đăng tuyển', exact: true }).click();
    await hr.getByText(/Department lookup unavailable/).waitFor();
    failDepartments = false;
    await hr.getByRole('button', { name: 'Tải lại phòng ban', exact: true }).click();
    await hr.getByLabel('Tên vị trí', { exact: true }).fill('Browser Backend Engineer');
    await hr.getByLabel('Phòng ban', { exact: true }).selectOption(String(h.departments[0].id));
    await hr.getByLabel('Mô tả công việc', { exact: true }).fill('Build dependable recruitment APIs.');
    await hr.getByLabel('Yêu cầu ứng viên', { exact: true }).fill('TypeScript, React, MySQL.');
    assert.equal(await hr.getByRole('button', { name: 'Gợi ý JD bằng AI', exact: true }).isDisabled(), true);
    await hr.getByRole('button', { name: 'Đăng tuyển', exact: true }).click();
    await hr.getByRole('heading', { name: 'Browser Backend Engineer', exact: true }).waitFor();
    await hr.getByRole('button', { name: 'Sửa JD', exact: true }).click();
    await hr.getByLabel('Mô tả công việc', { exact: true }).fill('Updated description for browser smoke.');
    await hr.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await hr.getByRole('dialog').waitFor({ state: 'hidden' });
    await hr.getByRole('button', { name: 'Đóng tuyển', exact: true }).click();
    await hr.getByRole('button', { name: 'Mở lại', exact: true }).click();
    await hr.getByRole('button', { name: 'Đóng tuyển', exact: true }).waitFor();
    console.log('PASS browser: real HR login and create Job; unavailable AI disabled');
    await hr.getByLabel('Tìm vị trí tuyển dụng', { exact: true }).fill('does-not-exist');
    await hr.getByText('Chưa có vị trí phù hợp.', { exact: true }).waitFor();
    assert.equal(await hr.getByRole('heading', { name: 'Browser Backend Engineer', exact: true }).count(), 0);
    await hr.getByLabel('Tìm vị trí tuyển dụng', { exact: true }).fill('');
    await hr.getByRole('heading', { name: 'Browser Backend Engineer', exact: true }).waitFor();
    console.log('PASS browser: department lookup retry and empty job filter clears selected board');

    const publicPage = await pageFor(375, 812);
    const invalidRequests = [];
    publicPage.on('request', request => { if (/\/api\/jobs\/(0|9007199254740992)(\?|$)/.test(request.url())) invalidRequests.push(request.url()); });
    for (const id of ['0', 'abc', '9007199254740992']) {
      await publicPage.goto(origin + '/careers/' + id);
      await publicPage.getByText('Mã vị trí không hợp lệ.', { exact: true }).waitFor();
    }
    assert.deepEqual(invalidRequests, []);
    let failDetail = true;
    await publicPage.route(/\/api\/jobs\/\d+$/, route => failDetail
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Detail unavailable' }) })
      : route.continue({ url: route.request().url().replace('http://localhost:3001/api', h.base) }));
    await publicPage.goto(origin + '/careers');
    await publicPage.getByRole('link', { name: 'Browser Backend Engineer', exact: true }).click();
    await publicPage.getByText('Detail unavailable', { exact: false }).waitFor();
    failDetail = false;
    await publicPage.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await publicPage.getByLabel('Họ và tên', { exact: true }).fill('Browser Candidate');
    await publicPage.getByLabel('Email', { exact: true }).fill('browser-candidate@example.test');
    await publicPage.getByLabel('CV PDF · tối đa 5 MiB', { exact: true }).setInputFiles({ name: 'browser-cv.pdf', mimeType: 'application/pdf', buffer: pdf() });
    await publicPage.getByRole('button', { name: 'Bỏ CV đã chọn', exact: true }).click();
    assert.equal(await publicPage.getByRole('button', { name: 'Gửi hồ sơ ứng tuyển', exact: true }).isDisabled(), true);
    await publicPage.getByLabel('CV PDF · tối đa 5 MiB', { exact: true }).setInputFiles({ name: 'browser-cv.pdf', mimeType: 'application/pdf', buffer: pdf() });
    await publicPage.getByRole('button', { name: 'Gửi hồ sơ ứng tuyển', exact: true }).click();
    await publicPage.getByText('Hồ sơ đã được gửi. Bạn không cần nộp lại.', { exact: true }).waitFor();
    await publicPage.screenshot({ path: resolve(output, 'careers-mobile.png'), fullPage: true });
    assert.deepEqual(await publicPage.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0).map(el => ({ tag: el.tagName, class: el.className })).slice(0, 12)), []);
    console.log('PASS browser: mobile Careers, actual multipart upload and persisted receipt');
    console.log('PASS browser: invalid IDs make no request and failed detail can retry');

    await hr.reload();
    const card = hr.getByRole('button', { name: /Browser Candidate/ });
    await card.waitFor();
    const sameJobReload = hr.waitForResponse(response => response.url().includes('/api/applications?') && response.status() === 200);
    await hr.getByRole('button', { name: /Browser Backend Engineer.*hồ sơ/ }).click();
    await sameJobReload;
    await card.waitFor();
    await card.dragTo(hr.getByRole('region', { name: 'Đã nhận việc', exact: true }));
    await hr.getByText('Bước nhận việc đang chờ tích hợp tài khoản và onboarding. Hồ sơ chưa đổi trạng thái.', { exact: true }).waitFor();
    assert.equal((await h.db.getRepository(h.entities.Application).findOneByOrFail({ candidateEmail: 'browser-candidate@example.test' })).status, 'APPLIED');
    await card.dragTo(hr.getByRole('region', { name: 'Đang phỏng vấn / Đề xuất', exact: true }));
    await hr.getByRole('heading', { name: 'Browser Candidate', exact: true }).waitFor();
    await hr.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    assert.equal(await h.db.getRepository(h.entities.Interview).count(), 0);
    assert.equal(h.automation.calls.length, 0);
    let failPeople = true;
    await hr.route('**/api/applications/interviewers?**', route => failPeople
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Manager lookup unavailable' }) })
      : route.continue({ url: route.request().url().replace('http://localhost:3001/api', h.base) }));
    await card.dragTo(hr.getByRole('region', { name: 'Đang phỏng vấn / Đề xuất', exact: true }));
    await hr.getByRole('heading', { name: 'Browser Candidate', exact: true }).waitFor();
    await hr.getByText(/Manager lookup unavailable/).waitFor();
    failPeople = false;
    await hr.getByRole('button', { name: 'Tải lại Manager', exact: true }).click();
    const downloadPromise = hr.waitForEvent('download');
    await hr.getByRole('button', { name: 'Tải CV PDF', exact: true }).click();
    assert.match((await downloadPromise).suggestedFilename(), /^CV-\d+\.pdf$/);
    await hr.getByLabel('Manager cùng phòng ban', { exact: true }).selectOption(String(h.users.manager.id));
    await hr.getByLabel(/Thời gian \(/).fill('2099-01-01T10:30');
    await hr.getByRole('button', { name: 'Lưu lịch phỏng vấn', exact: true }).click();
    await hr.getByText(/Đã lưu lịch. SDK hiện chưa xác nhận/).waitFor();
    assert.equal(h.automation.calls.length, 1);
    const stored = await h.db.getRepository(h.entities.Interview).findOneByOrFail({ interviewerId: h.users.manager.id });
    assert.equal(stored.scheduledAt.toISOString(), '2099-01-01T03:30:00.000Z');
    await hr.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    await hr.getByRole('button', { name: /Browser Candidate/ }).waitFor();
    await hr.getByRole('button', { name: /Browser Backend Engineer.*hồ sơ/ }).waitFor();
    await hr.screenshot({ path: resolve(output, 'ats-desktop.png'), fullPage: true });
    console.log('PASS browser: private CV download, schedule, timezone UTC+7 and truthful dispatch status');
    console.log('PASS browser: same-job reselect reloads, Kanban drop/cancel is safe, Hire cannot be bypassed, Manager lookup retries');

    const manager = await pageFor(390, 844);
    await login(manager, 'manager');
    assert.equal(await manager.getByRole('button', { name: /Browser Candidate/ }).getAttribute('draggable'), 'false');
    await manager.getByRole('button', { name: /Browser Candidate/ }).click();
    await manager.getByLabel('Điểm phỏng vấn (0–100)', { exact: true }).fill('91');
    await manager.getByLabel('Nhận xét chuyên môn', { exact: true }).fill('Explains database transactions clearly.');
    await manager.getByRole('button', { name: 'Lưu kết quả vòng 1', exact: true }).click();
    await manager.getByText('Đã lưu kết quả phỏng vấn.', { exact: true }).waitFor();
    assert.equal(await manager.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await manager.getByRole('dialog').evaluate(el => { el.scrollTop = 0; el.lastElementChild.scrollTop = 0; });
    await manager.screenshot({ path: resolve(output, 'manager-mobile.png'), fullPage: true });
    await manager.keyboard.press('Escape'); await manager.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log('PASS browser: assigned Manager saves result on mobile; Escape closes dialog');

    await hr.getByRole('button', { name: /Browser Candidate/ }).click();
    await hr.getByRole('button', { name: 'Đề xuất nhận việc', exact: true }).click();
    await hr.getByText('Đã chuyển sang đề xuất nhận việc.', { exact: true }).waitFor();
    assert.equal(await hr.getByRole('button', { name: 'Nhận việc (Hire)', exact: true }).isDisabled(), true);
    await hr.getByRole('button', { name: 'Từ chối hồ sơ', exact: true }).click();
    await hr.getByRole('button', { name: 'Hủy', exact: true }).click();
    const app = await h.db.getRepository(h.entities.Application).findOneByOrFail({ candidateEmail: 'browser-candidate@example.test' });
    assert.equal(app.status, 'OFFERED'); assert.equal(app.hiredUserId, null);
    const errorPage = await pageFor(768, 1024);
    let fail = true;
    await errorPage.route('**/api/jobs?**', async route => {
      if (fail) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Test service unavailable' }) });
      else await route.continue({ url: route.request().url().replace('http://localhost:3001/api', h.base) });
    });
    await errorPage.goto(origin + '/careers');
    await errorPage.getByText('Test service unavailable', { exact: false }).waitFor();
    fail = false; await errorPage.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await errorPage.getByRole('link', { name: 'Browser Backend Engineer', exact: true }).waitFor();
    await errorPage.getByLabel('Tìm theo tên công việc', { exact: true }).fill('no-such-job');
    await errorPage.getByText('Không tìm thấy vị trí phù hợp với từ khóa.', { exact: true }).waitFor();
    await errorPage.goto(origin + '/careers/999999');
    await errorPage.getByRole('alert').filter({ hasText: 'Không tìm thấy vị trí tuyển dụng.' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS browser: HR sees real result, offers, cancellation leaves status intact, Hire blocked; no page errors');
    console.log('PASS browser: tablet API error/retry, empty search and invalid job have explicit states');

    h.sdk.generateJobDescription = async () => ({ ok: true, mode: 'MOCK', data: { description: 'Draft from SDK', requirements: 'SQL and TypeScript', benefits: 'Training' } });
    await hr.reload();
    await hr.getByRole('button', { name: '+ Đăng tuyển', exact: true }).click();
    await hr.getByLabel('Tên vị trí', { exact: true }).fill('Editable AI Draft');
    await hr.getByLabel('Phòng ban', { exact: true }).selectOption(String(h.departments[0].id));
    await hr.getByRole('button', { name: 'Gợi ý JD bằng AI', exact: true }).click();
    await hr.getByRole('heading', { name: 'Bản nháp AI · Dữ liệu mô phỏng', exact: true }).waitFor();
    assert.equal(await h.db.getRepository(h.entities.Job).count(), 1);
    await hr.getByRole('button', { name: 'Đưa vào biểu mẫu để chỉnh sửa', exact: true }).click();
    assert.match(await hr.getByLabel('Mô tả công việc', { exact: true }).inputValue(), /Draft from SDK/);
    await hr.getByLabel('Mô tả công việc', { exact: true }).fill('Human reviewed description');
    await hr.getByRole('button', { name: 'Đăng tuyển', exact: true }).click();
    await hr.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal((await h.db.getRepository(h.entities.Job).findOneByOrFail({ title: 'Editable AI Draft' })).description, 'Human reviewed description');
    assert.deepEqual(errors, []);
    console.log('PASS browser: AI MOCK draft is labelled, reviewed and explicitly saved (contract stub only)');
  } finally { if (browser) await browser.close(); await h.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
