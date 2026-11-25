const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadHelpers() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/features/recruitment/offer-helpers.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = {};
  new vm.Script('(function(exports) {\n' + compiled.outputText + '\n})').runInThisContext()(mod);
  return mod;
}

test('SCRUM-26 offer helpers allow reissuing only after DECLINED/EXPIRED and compute next version', () => {
  const h = loadHelpers();
  const baseOffer = {
    offerId: 1,
    version: 1,
    candidateName: 'Candidate',
    jobTitle: 'Backend Engineer',
    salary: '20M VND',
    startDate: '2099-03-01',
    deliveryStatus: 'SMTP_ACCEPTED',
    expiresAt: '2099-02-01T00:00:00Z',
    sentAt: '2099-01-30T00:00:00Z',
    remindedAt: null,
    respondedAt: null,
  };

  assert.equal(h.canIssueNewOffer(null, true), true);
  assert.equal(h.canIssueNewOffer(null, false), false);
  assert.equal(h.canIssueNewOffer({ ...baseOffer, status: 'PENDING' }, true), false);
  assert.equal(h.canIssueNewOffer({ ...baseOffer, status: 'ACCEPTED' }, true), false);
  assert.equal(h.canIssueNewOffer({ ...baseOffer, status: 'DECLINED' }, true), true);
  assert.equal(h.canIssueNewOffer({ ...baseOffer, status: 'EXPIRED' }, true), true);
  assert.equal(h.canIssueNewOffer({ ...baseOffer, status: 'DECLINED' }, false), false);

  assert.equal(h.nextOfferVersion([]), 1);
  assert.equal(h.nextOfferVersion([{ ...baseOffer, version: 1, status: 'DECLINED' }]), 2);
  assert.equal(
    h.nextOfferVersion([
      { ...baseOffer, offerId: 2, version: 2, status: 'EXPIRED' },
      { ...baseOffer, offerId: 1, version: 1, status: 'DECLINED' },
    ]),
    3,
  );

  // Fallback version resolution when legacy payload omits version
  assert.equal(h.resolveOfferVersion({ ...baseOffer, version: undefined }, 0, 2), 2);
  assert.equal(h.resolveOfferVersion({ ...baseOffer, version: undefined }, 1, 2), 1);

  // Vietnam date for date input min attribute
  assert.equal(h.todayOfferInputDate(new Date('2026-11-25T16:59:59Z')), '2026-11-25');
  assert.equal(h.todayOfferInputDate(new Date('2026-11-25T17:00:00Z')), '2026-11-26');
});
