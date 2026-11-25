const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');
const { ConflictException } = require('@nestjs/common');
const { OfferService } = require('../dist/modules/applications/offer.service.js');
const { Application, ApplicationStatus } = require('../dist/entities/application.entity.js');
const { Interview, InterviewResult } = require('../dist/entities/interview.entity.js');
const { Offer, OfferStatus } = require('../dist/entities/offer.entity.js');
const { UserRole } = require('../dist/entities/user.entity.js');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function createHarness() {
  const hrActor = { id: 1, role: UserRole.HR, departmentId: 1 };
  const app = {
    id: 55,
    jobId: 10,
    candidateName: 'Nguyen Minh An',
    candidateEmail: 'an.nguyen@example.test',
    status: ApplicationStatus.INTERVIEWING,
  };
  let nextOfferId = 1;
  const offersStore = [];
  const dispatched = [];

  const sortByVersionDesc = (rows) =>
    [...rows].sort((a, b) => b.version - a.version || b.id - a.id);

  const matchWhere = (row, where) => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => row[key] === value);
  };

  const offerRepo = {
    create: (value) => ({
      deliveryStatus: 'PENDING',
      claimedAt: null,
      sentAt: null,
      remindedAt: null,
      respondedAt: null,
      createdAt: new Date(),
      ...value,
    }),
    save: async (row) => {
      if (!row.id) {
        row.id = nextOfferId++;
        offersStore.push(row);
      } else {
        const index = offersStore.findIndex((item) => item.id === row.id);
        if (index >= 0) offersStore[index] = row;
        else offersStore.push(row);
      }
      return row;
    },
    findOne: async ({ where, order } = {}) => {
      let rows = offersStore.filter((row) => matchWhere(row, where));
      if (order?.version === 'DESC') rows = sortByVersionDesc(rows);
      return rows[0] || null;
    },
    findOneBy: async (where) => offersStore.find((row) => matchWhere(row, where)) || null,
    findOneByOrFail: async (where) => {
      const found = offersStore.find((row) => matchWhere(row, where));
      if (!found) throw new Error('Offer not found');
      return found;
    },
    find: async ({ where, order } = {}) => {
      let rows = offersStore.filter((row) => matchWhere(row, where));
      if (order?.version === 'DESC') rows = sortByVersionDesc(rows);
      return rows;
    },
    createQueryBuilder: () => {
      let updateFields = {};
      let whereSql = '';
      let params = {};
      return {
        update() { return this; },
        set(fields) { updateFields = fields; return this; },
        where(sql, p) { whereSql = sql; params = p || {}; return this; },
        execute: async () => {
          for (const row of offersStore) {
            if (whereSql.includes('claimedAt IS NULL')) {
              if (row.id === params.id && !row.claimedAt) {
                Object.assign(row, updateFields);
              }
            } else if (whereSql.includes('expires_at <= :now')) {
              const matchesId = params.id ? row.id === params.id : true;
              const matchesApp = params.applicationId
                ? row.applicationId === params.applicationId
                : true;
              if (
                matchesId &&
                matchesApp &&
                row.status === params.status &&
                row.sentAt &&
                row.expiresAt.getTime() <= params.now.getTime()
              ) {
                Object.assign(row, updateFields);
              }
            }
          }
          return { affected: 1 };
        },
      };
    },
  };

  const manager = {
    getRepository: (entity) => {
      if (entity === Application) {
        return {
          findOne: async ({ where }) => (where?.id === app.id ? app : null),
          findOneBy: async (where) => (where?.id === app.id ? app : null),
          save: async (row) => Object.assign(app, row),
        };
      }
      if (entity === Interview) {
        return {
          findOne: async () => ({ id: 9, applicationId: app.id, round: 1, result: InterviewResult.PASSED }),
        };
      }
      if (entity === Offer) return offerRepo;
      throw new Error('Unexpected entity: ' + entity?.name);
    },
  };

  const db = { transaction: async (fn) => fn(manager) };
  const n8n = {
    triggerOfferIssued: async (payload) => {
      dispatched.push(payload);
      return true;
    },
  };
  const config = {
    get: (key) =>
      ({
        MAIL_FROM: 'hr@company.test',
        HR_EMAIL: 'hr@company.test',
        PUBLIC_WEB_BASE_URL: 'https://hr.company.test',
      })[key],
  };

  const service = new OfferService(offerRepo, db, n8n, config);
  return { service, hrActor, app, offersStore, dispatched };
}

test('SCRUM-26: decline v1 -> reissue v2 -> v1 link cannot accept while v2 link accepts cleanly', async () => {
  const { service, hrActor, app, offersStore, dispatched } = createHarness();
  const baseInput = { roleTitle: 'Backend Engineer', salary: '20.000.000 VND', startDate: '2099-03-01' };

  // 1. Issue Offer v1
  const v1 = await service.create(app.id, baseInput, hrActor);
  assert.equal(v1.version, 1);
  assert.equal(v1.status, OfferStatus.PENDING);
  assert.equal(dispatched.length, 1);
  const v1Dispatch = dispatched[0];

  // Blocking: cannot create v2 while v1 is PENDING
  await assert.rejects(
    () => service.create(app.id, { ...baseInput, salary: '25.000.000 VND' }, hrActor),
    (err) => err instanceof ConflictException && /v1/.test(err.message),
  );

  // Mark v1 as sent, then candidate declines v1
  offersStore[0].sentAt = new Date();
  const declined = await service.respond(v1Dispatch.responseToken, OfferStatus.DECLINED);
  assert.equal(declined.status, OfferStatus.DECLINED);
  assert.equal(declined.version, 1);

  // 2. HR negotiates higher salary and issues Offer v2
  const v2 = await service.create(
    app.id,
    { roleTitle: 'Backend Engineer', salary: '25.000.000 VND', startDate: '2099-03-10' },
    hrActor,
  );
  assert.equal(v2.version, 2);
  assert.equal(v2.status, OfferStatus.PENDING);
  assert.equal(v2.salary, '25.000.000 VND');
  assert.equal(dispatched.length, 2);
  const v2Dispatch = dispatched[1];
  assert.notEqual(v2Dispatch.responseToken, v1Dispatch.responseToken);
  assert.notEqual(v2Dispatch.token, v1Dispatch.token);
  assert.equal(offersStore[1].tokenHash, sha256(v2Dispatch.responseToken));

  // 3. Old v1 link cannot be accepted (or re-acted on)
  await assert.rejects(
    () => service.respond(v1Dispatch.responseToken, OfferStatus.ACCEPTED),
    (err) => err instanceof ConflictException,
  );

  // 4. Mark v2 as sent -> candidate accepts v2
  offersStore[1].sentAt = new Date();
  const accepted = await service.respond(v2Dispatch.responseToken, OfferStatus.ACCEPTED);
  assert.equal(accepted.version, 2);
  assert.equal(accepted.status, OfferStatus.ACCEPTED);

  // 5. Blocking: cannot create v3 once v2 is ACCEPTED
  await assert.rejects(
    () => service.create(app.id, { ...baseInput, salary: '28.000.000 VND' }, hrActor),
    (err) => err instanceof ConflictException && /v2/.test(err.message),
  );

  // 6. list() returns newest first with version metadata [v2, v1]
  const history = await service.list(app.id, hrActor);
  assert.deepEqual(
    history.map((item) => ({ version: item.version, status: item.status, salary: item.salary })),
    [
      { version: 2, status: OfferStatus.ACCEPTED, salary: '25.000.000 VND' },
      { version: 1, status: OfferStatus.DECLINED, salary: '20.000.000 VND' },
    ],
  );
});

test('SCRUM-26: expired v1 (including lazy expiry) allows v2 and retry targets latest v2', async () => {
  const { service, hrActor, app, offersStore, dispatched } = createHarness();
  const input = { roleTitle: 'QA Engineer', salary: '18.000.000 VND', startDate: '2099-04-01' };

  await service.create(app.id, input, hrActor);
  // Simulate v1 was sent and is now past expiresAt without callback yet
  offersStore[0].sentAt = new Date(Date.now() - 49 * 3600000);
  offersStore[0].expiresAt = new Date(Date.now() - 1000);

  // list() lazily marks v1 as EXPIRED
  const listed = await service.list(app.id, hrActor);
  assert.equal(listed[0].status, OfferStatus.EXPIRED);

  // Reset to PENDING past expiry to verify create() also lazily expires v1 atomically
  offersStore[0].status = OfferStatus.PENDING;
  const v2 = await service.create(app.id, { ...input, salary: '19.500.000 VND' }, hrActor);
  assert.equal(offersStore[0].status, OfferStatus.EXPIRED);
  assert.equal(v2.version, 2);
  assert.equal(v2.status, OfferStatus.PENDING);

  // Retry must target v2 (latest), not v1
  const beforeRetryHash = offersStore[1].tokenHash;
  const retried = await service.retry(app.id, hrActor);
  assert.equal(retried.offerId, v2.offerId);
  assert.equal(retried.version, 2);
  assert.notEqual(offersStore[1].tokenHash, beforeRetryHash);
  assert.equal(dispatched.length, 3);
  assert.equal(dispatched[2].offerId, v2.offerId);
});
