const assert = require('node:assert/strict');
const test = require('node:test');
const { TrainingService } = require('../dist/modules/training/training.service.js');
const { parseTrainingDueDate } = require('../dist/modules/training/training-due-date.js');

test('reject nonexistent calendar deadlines instead of silently moving to next month', async () => {
  const service = new TrainingService({}, {}, { findOne: async () => ({ id: 2 }) }, {});
  for (const dueAt of ['2099-02-29', '2099-02-30', '2099-04-31', '2099-13-01', '2099-00-10', 'not-a-date']) {
    assert.ok(Number.isNaN(parseTrainingDueDate(dueAt).getTime()));
    await assert.rejects(service.assignCourse({ userId: 2, courseId: 1, dueAt }), /ngày hợp lệ/);
    await assert.rejects(service.updateDueDate(1, dueAt), /ngày hợp lệ/);
  }
  assert.equal(parseTrainingDueDate('2096-02-29').toISOString(), '2096-02-29T16:59:59.000Z');
  assert.equal(parseTrainingDueDate('2099-11-30T12:00:00Z').toISOString(), '2099-11-30T12:00:00.000Z');
});

// DATETIME(0) rounds fractional seconds. The service must send whole seconds
// so the selected calendar day survives the database round trip.
function assertDueDate(date, selected) {
  assert.equal(date.getMilliseconds(), 0);
  assert.equal(date.toISOString(), `${selected}T16:59:59.000Z`);
  const rounded = new Date(Math.round(date.getTime() / 1000) * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(rounded);
  const fields = Object.fromEntries(parts.map(p => [p.type, p.value]));
  assert.equal(`${fields.year}-${fields.month}-${fields.day}`, selected);
}

for (const selected of ['2096-02-29', '2099-11-30', '2099-12-31']) {
  test(`gán và đổi hạn giữ đúng ngày ${selected} qua DATETIME không có mili giây`, async () => {
    const originalZone = process.env.TZ;
    try {
      for (const zone of ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
        process.env.TZ = zone;
        const assignment = { id: 1, reminderCount: 2, lastReminderAt: new Date(), lastReminderRunId: 'old', managerEscalatedAt: new Date() };
        const trainings = { findOne: async () => null, create: value => value, save: async value => value };
        const courses = {
          findOne: async () => ({ id: 1, isArchived: false }),
          manager: { transaction: async action => action({
            getRepository: entity => entity.name === 'TrainingCourse' ? courses : trainings,
          }) },
        };
        const service = new TrainingService(
          courses,
          trainings,
          { findOne: async () => ({ id: 2 }) },
          {},
        );
        const created = await service.assignCourse({ userId: 2, courseId: 1, dueAt: selected });
        assertDueDate(created.dueAt, selected);
        service.employeeTrainingRepository.findOne = async () => assignment;
        service.employeeTrainingRepository.update = async (_id, values) => Object.assign(assignment, values);
        service.employeeTrainingRepository.findOneBy = async () => assignment;
        const updated = await service.updateDueDate(1, selected);
        assertDueDate(updated.dueAt, selected);
        assert.equal(updated.reminderCount, 0);
        assert.equal(updated.lastReminderAt, null);
      }
    } finally {
      if (originalZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalZone;
    }
  });
}
