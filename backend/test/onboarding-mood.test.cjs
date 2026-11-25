const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ConflictException } = require('@nestjs/common');
const {
  VIETNAM_TIME_ZONE,
  getVietnamDateParts,
  getVietnamDayBounds,
  getVietnamDayRange,
  getVietnamCalendarDayDiff,
  getVietnamRecentDays,
} = require('../dist/modules/onboarding/vietnam-time.js');
const { OnboardingService } = require('../dist/modules/onboarding/onboarding.service.js');
const { MoodType } = require('../dist/entities/employee-mood.entity.js');
const { UserRole } = require('../dist/entities/user.entity.js');

/**
 * Helper to execute a test callback under an explicit process.env.TZ value
 * and restore the original TZ afterwards.
 */
async function withTimezone(tz, fn) {
  const originalTz = process.env.TZ;
  process.env.TZ = tz;
  try {
    return await fn();
  } finally {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  }
}

/**
 * Evaluates a TypeORM FindOperator (Between / In / Not) or primitive match
 * against an in-memory row for realistic repository testing.
 */
function matchesFilter(value, filter) {
  if (filter && typeof filter === 'object' && '_type' in filter) {
    if (filter._type === 'between') {
      const [start, end] = filter._value;
      const t = new Date(value).getTime();
      return t >= new Date(start).getTime() && t <= new Date(end).getTime();
    }
    if (filter._type === 'in') {
      return Array.isArray(filter._value) && filter._value.includes(value);
    }
    if (filter._type === 'not') {
      return value !== filter._value;
    }
  }
  return value === filter;
}

function createInMemoryMoodRepo(initialRows = []) {
  const rows = initialRows.map((row, idx) => ({ id: idx + 1, isBurnoutRisk: false, isResolved: false, ...row }));
  let nextId = rows.length + 1;

  function query(where = {}, order = {}) {
    let matched = rows.filter((row) =>
      Object.entries(where).every(([key, cond]) => matchesFilter(row[key], cond)),
    );
    if (order.createdAt === 'DESC') {
      matched = [...matched].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (order.createdAt === 'ASC') {
      matched = [...matched].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return matched;
  }

  return {
    rows,
    async findOne({ where, order } = {}) {
      const list = query(where, order);
      return list[0] || null;
    },
    async find({ where, order, take } = {}) {
      const list = query(where, order);
      return typeof take === 'number' ? list.slice(0, take) : list;
    },
    create(payload) {
      return {
        isBurnoutRisk: false,
        isResolved: false,
        ...payload,
      };
    },
    async save(entity) {
      const saved = {
        id: nextId++,
        createdAt: entity.createdAt || new Date(),
        ...entity,
      };
      rows.push(saved);
      return saved;
    },
  };
}

function createOnboardingService({ moodRows = [], users = [], departments = [], n8nCalls = [] } = {}) {
  const moodRepo = createInMemoryMoodRepo(moodRows);
  const userRepo = {
    async findOne({ where } = {}) {
      return users.find((u) => u.id === where?.id) || null;
    },
    async find({ where } = {}) {
      return users.filter((u) =>
        Object.entries(where || {}).every(([k, cond]) => matchesFilter(u[k], cond)),
      );
    },
  };
  const deptRepo = {
    async find() {
      return departments;
    },
  };
  const n8nService = {
    async triggerBurnoutAlert(payload) {
      n8nCalls.push(payload);
      return true;
    },
  };

  const service = new OnboardingService(
    {}, // taskRepository
    moodRepo,
    {}, // docRepository
    {}, // trainingRepository
    {}, // courseRepository
    userRepo,
    deptRepo,
    {}, // geminiService
    {}, // vectorService
    n8nService,
  );

  return { service, moodRepo, n8nCalls };
}

test('vietnam-time helpers produce identical Asia/Ho_Chi_Minh bounds across UTC, VN, and US timezones', async () => {
  for (const tz of ['UTC', VIETNAM_TIME_ZONE, 'America/Los_Angeles']) {
    await withTimezone(tz, async () => {
      // 06:30 VN on 2026-11-25 is 23:30 UTC on 2026-11-24
      const vn0630 = new Date('2026-11-24T23:30:00.000Z');
      // 07:10 VN on 2026-11-25 is 00:10 UTC on 2026-11-25
      const vn0710 = new Date('2026-11-25T00:10:00.000Z');
      // 23:59:59.999 VN on 2026-11-25 is 16:59:59.999 UTC on 2026-11-25
      const vnEndOfDay = new Date('2026-11-25T16:59:59.999Z');
      // 00:00:00.000 VN on 2026-11-26 is 17:00:00.000 UTC on 2026-11-25
      const vnNextDay = new Date('2026-11-25T17:00:00.000Z');

      const b1 = getVietnamDayBounds(vn0630);
      const b2 = getVietnamDayBounds(vn0710);
      const b3 = getVietnamDayBounds(vnEndOfDay);
      const b4 = getVietnamDayBounds(vnNextDay);

      assert.equal(b1.dateKey, '2026-11-25');
      assert.equal(b2.dateKey, '2026-11-25');
      assert.equal(b3.dateKey, '2026-11-25');
      assert.equal(b4.dateKey, '2026-11-26');

      assert.equal(b1.startOfDay.toISOString(), '2026-11-24T17:00:00.000Z');
      assert.equal(b1.endOfDay.toISOString(), '2026-11-25T16:59:59.999Z');
      assert.equal(b2.startOfDay.toISOString(), b1.startOfDay.toISOString());
      assert.equal(b2.endOfDay.toISOString(), b1.endOfDay.toISOString());

      // 2026-11-25 is Wednesday -> dayOfWeek = 3 (T4)
      assert.equal(getVietnamDateParts(vn0630).dayOfWeek, 3);
      assert.equal(getVietnamDateParts(vn0630).displayDate, '25/11');

      // Same Vietnam day -> 0; consecutive across UTC midnight -> 1
      assert.equal(getVietnamCalendarDayDiff(vn0710, vn0630), 0);
      assert.equal(getVietnamCalendarDayDiff(vnNextDay, vnEndOfDay), 1);

      // 7-day range at 06:30 VN on 2026-11-25 must span 2026-11-19 .. 2026-11-25
      const range = getVietnamDayRange(7, vn0630);
      assert.equal(range.startDateKey, '2026-11-19');
      assert.equal(range.endDateKey, '2026-11-25');
      assert.equal(range.startDate.toISOString(), '2026-11-18T17:00:00.000Z');
      assert.equal(range.endDate.toISOString(), '2026-11-25T16:59:59.999Z');

      const recent = getVietnamRecentDays(7, vn0630);
      assert.equal(recent.length, 7);
      assert.equal(recent[0].dateKey, '2026-11-19');
      assert.equal(recent[6].dateKey, '2026-11-25');
      assert.equal(recent[6].isToday, true);
    });
  }
});

test('UTC environment: check-in at 06:30 VN and 07:10 VN on the same day is blocked with 409 Conflict', async () => {
  await withTimezone('UTC', async () => {
    const vn0630 = new Date('2026-11-24T23:30:00.000Z'); // 2026-11-25 06:30:00+07:00
    const vn0710 = new Date('2026-11-25T00:10:00.000Z'); // 2026-11-25 07:10:00+07:00
    const vnNextDay0005 = new Date('2026-11-25T17:05:00.000Z'); // 2026-11-26 00:05:00+07:00

    const { service, moodRepo } = createOnboardingService();
    // Simulate DB assigning the exact UTC timestamp at check-in time
    const origSave = moodRepo.save.bind(moodRepo);
    let currentClock = vn0630;
    moodRepo.save = async (entity) => origSave({ ...entity, createdAt: currentClock });

    // 1st check-in at 06:30 VN succeeds and preserves payload fields
    const first = await service.recordMood(6, MoodType.NORMAL, 'Bắt đầu ngày mới', vn0630);
    assert.equal(first.mood, MoodType.NORMAL);
    assert.equal(first.feedbackText, 'Bắt đầu ngày mới');

    // getTodayMood at 07:10 VN finds the 06:30 VN record
    const todayFound = await service.getTodayMood(6, vn0710);
    assert.ok(todayFound);
    assert.equal(todayFound.id, first.id);

    // 2nd check-in at 07:10 VN on the same Vietnam calendar day MUST throw 409 Conflict
    currentClock = vn0710;
    await assert.rejects(
      () => service.recordMood(6, MoodType.GREAT, 'Thử check-in lần 2', vn0710),
      (err) => err instanceof ConflictException,
    );

    // Next Vietnam day at 00:05 VN (17:05 UTC) is allowed
    currentClock = vnNextDay0005;
    const nextDay = await service.recordMood(6, MoodType.GREAT, 'Ngày mới vui vẻ', vnNextDay0005);
    assert.equal(nextDay.mood, MoodType.GREAT);
  });
});

test('UTC environment: recordMood computes consecutive Burnout streak using Vietnam calendar days', async () => {
  await withTimezone('UTC', async () => {
    const users = [
      { id: 6, fullName: 'Trần Viết Đạt', department: { id: 1, name: 'Kỹ Thuật & AI' } },
    ];
    // Existing STRESSED check-ins on 2026-11-23 (06:30 VN) and 2026-11-24 (23:30 VN)
    const moodRows = [
      {
        userId: 6,
        mood: MoodType.STRESSED,
        feedbackText: 'Ngày 1 áp lực',
        createdAt: new Date('2026-11-22T23:30:00.000Z'), // 2026-11-23 06:30+07:00
      },
      {
        userId: 6,
        mood: MoodType.STRESSED,
        feedbackText: 'Ngày 2 áp lực',
        createdAt: new Date('2026-11-24T16:30:00.000Z'), // 2026-11-24 23:30+07:00
      },
    ];

    const { service, n8nCalls } = createOnboardingService({ moodRows, users });
    // 3rd STRESSED check-in on 2026-11-25 at 06:15 VN (2026-11-24T23:15:00.000Z)
    const vnDay3 = new Date('2026-11-24T23:15:00.000Z');
    const saved = await service.recordMood(6, MoodType.STRESSED, 'Ngày 3 quá tải', vnDay3);

    assert.equal(saved.isBurnoutRisk, true);
    assert.equal(n8nCalls.length, 1);
    assert.equal(n8nCalls[0].stressDays, 3);
    assert.equal(n8nCalls[0].userId, 6);
  });
});

test('UTC environment: getMoodHistory and getTeamMood 7-day history align strictly to Vietnam calendar dates', async () => {
  await withTimezone('UTC', async () => {
    // Current moment: 2026-11-25 06:30:00+07:00 (2026-11-24T23:30:00.000Z)
    const nowVn0630 = new Date('2026-11-24T23:30:00.000Z');

    const departments = [{ id: 1, name: 'Kỹ Thuật & AI' }];
    const users = [
      {
        id: 7,
        fullName: 'Vũ Trần',
        role: UserRole.MANAGER,
        departmentId: 1,
        department: departments[0],
        isActive: true,
      },
      {
        id: 6,
        fullName: 'Trần Viết Đạt',
        jobTitle: 'AI Engineer',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
        department: departments[0],
        isActive: true,
      },
    ];

    const moodRows = [
      // Outside 7-day window: 2026-11-18 23:59 VN -> 2026-11-18T16:59:00.000Z
      {
        userId: 6,
        mood: MoodType.STRESSED,
        createdAt: new Date('2026-11-18T16:59:00.000Z'),
      },
      // Inside window (first day: 2026-11-19 00:05 VN -> 2026-11-18T17:05:00.000Z)
      {
        userId: 6,
        mood: MoodType.NORMAL,
        createdAt: new Date('2026-11-18T17:05:00.000Z'),
      },
      // Inside window (today: 2026-11-25 06:15 VN -> 2026-11-24T23:15:00.000Z)
      {
        userId: 6,
        mood: MoodType.GREAT,
        feedbackText: 'Rất tốt',
        createdAt: new Date('2026-11-24T23:15:00.000Z'),
      },
    ];

    const { service } = createOnboardingService({ moodRows, users, departments });

    // getMoodHistory should return exactly the 2 records within 2026-11-19 .. 2026-11-25 VN
    const history = await service.getMoodHistory(6, 7, nowVn0630);
    assert.equal(history.length, 2);
    assert.equal(history[0].mood, MoodType.NORMAL);
    assert.equal(history[1].mood, MoodType.GREAT);

    // getTeamMood should map the 06:15 VN check-in to 2026-11-25 ("Hôm nay"), NOT 2026-11-24
    const team = await service.getTeamMood(7, UserRole.MANAGER, undefined, nowVn0630);
    assert.equal(team.checkedInCount, 1);
    assert.equal(team.stats.great, 1);

    const trend = team.weeklySummary.daysTrend;
    assert.equal(trend.length, 7);
    assert.equal(trend[0].date, '2026-11-19');
    assert.equal(trend[0].stats.normal, 1);
    assert.equal(trend[6].date, '2026-11-25');
    assert.equal(trend[6].isToday, true);
    assert.equal(trend[6].dayLabel, 'Hôm nay');
    assert.equal(trend[6].dayName, 'T4');
    assert.equal(trend[6].stats.great, 1);

    const memberHistory = team.teamOverview[0].history7Days;
    assert.equal(memberHistory.length, 7);
    assert.equal(memberHistory[0].date, '2026-11-19');
    assert.equal(memberHistory[0].mood, MoodType.NORMAL);
    assert.equal(memberHistory[6].date, '2026-11-25');
    assert.equal(memberHistory[6].isToday, true);
    assert.equal(memberHistory[6].hasCheckedIn, true);
    assert.equal(memberHistory[6].mood, MoodType.GREAT);
  });
});

test('docker-compose.app.yml configures TZ=Asia/Ho_Chi_Minh for hr_backend', () => {
  const composePath = path.resolve(__dirname, '../../docker-compose.app.yml');
  const content = fs.readFileSync(composePath, 'utf8');
  assert.match(content, /container_name:\s*hr_backend/);
  assert.match(content, /TZ=Asia\/Ho_Chi_Minh/);
});
