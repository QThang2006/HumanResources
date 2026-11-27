const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const build = process.env.TV4_TEST_DIST || path.resolve(__dirname, '../dist');
const { OnboardingService } = require(path.join(build, 'modules/onboarding/onboarding.service'));

function harness(initial = []) {
  const courses = [
    { id: 1, title: 'Active mandatory', type: 'MANDATORY', isArchived: false },
    { id: 2, title: 'Archived mandatory', type: 'MANDATORY', isArchived: true },
    { id: 3, title: 'Soft skill', type: 'SOFT_SKILL', isArchived: false },
  ];
  const rows = [...initial]; let saves = 0;
  const courseRepository = { find: async ({ where }) => courses.filter(course => Object.entries(where).every(([key, value]) => course[key] === value)) };
  const trainingRepository = {
    find: async ({ select }) => select ? rows.map(row => ({ courseId: row.courseId })) : rows.map(row => ({ ...row, course: courses.find(course => course.id === row.courseId) || null })),
    create: value => ({ id: rows.length + 1, createdAt: new Date(), ...value }),
    save: async values => { saves++; rows.push(...values); return values; },
  };
  const service = new OnboardingService({}, {}, {}, trainingRepository, courseRepository, { findOne: async () => ({ id: 4, role: 'EMPLOYEE', isActive: true }) }, {}, {}, {}, {});
  return { service, rows, get saves() { return saves; } };
}

test('archived mandatory courses never reappear; repeated workspace reads do not reassign', async () => {
  const h = harness();
  assert.deepEqual((await h.service.getTrainings(4)).map(row => row.courseId), [1]);
  assert.deepEqual((await h.service.getTrainings(4)).map(row => row.courseId), [1]);
  assert.equal(h.saves, 1); assert.equal(h.rows[0].dueAt instanceof Date, true);
});

test('existing archived/deleted course history, progress and deadlines are preserved', async () => {
  const dueAt = new Date('2026-11-30T16:59:59Z');
  const h = harness([
    { id: 1, courseId: 1, status: 'IN_PROGRESS', progressPercent: 25, dueAt },
    { id: 2, courseId: 2, status: 'COMPLETED', progressPercent: 100, dueAt: null },
    { id: 3, courseId: null, status: 'COMPLETED', progressPercent: 100, courseSnapshot: { id: 99, title: 'Deleted course', type: 'MANDATORY' } },
  ]);
  const response = await h.service.getTrainings(4);
  assert.equal(h.saves, 0); assert.equal(response.length, 3);
  assert.equal(response[0].dueAt, dueAt); assert.equal(response[0].progressPercent, 25);
  assert.equal(response[1].dueAt, null); assert.equal(response[1].progressPercent, 100);
  assert.equal(response[2].title, 'Deleted course'); assert.equal(response[2].isCourseDeleted, true);
  assert.equal(response[2].dueAt, null);
});

test('new assignments expire 30 Vietnam calendar days later at 23:59:59, including year/leap boundaries', async () => {
  const OriginalDate = global.Date, originalTZ = process.env.TZ;
  try {
    for (const tz of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
      process.env.TZ = tz;
      for (const [now, expected] of [
        ['2026-11-27T00:00:00Z', '2026-12-27T16:59:59.000Z'],
        ['2026-12-31T17:00:00Z', '2027-01-31T16:59:59.000Z'],
        ['2028-02-28T17:00:00Z', '2028-03-30T16:59:59.000Z'],
      ]) {
        global.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return OriginalDate.parse(now); } };
        const h = harness(); const [response] = await h.service.getTrainings(4);
        assert.equal(response.dueAt.toISOString(), expected, `${tz}, ${now}`);
        assert.equal(response.dueAt.getMilliseconds(), 0);
        global.Date = OriginalDate;
      }
    }
  } finally { global.Date = OriginalDate; if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
});
