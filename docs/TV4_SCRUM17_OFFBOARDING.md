# SCRUM-17 — Offboarding lifecycle

## Scope

Only TV4 offboarding is changed. HR and SUPERADMIN retain permission to create, cancel and finalize cases. Active EMPLOYEE, MANAGER and HR accounts may be selected as offboarding targets. SUPERADMIN accounts and user ID 1 are protected, including pre-existing cases.

## Lifecycle

- Approval saves a case and queues the existing n8n workflow. It does not lock the account.
- n8n records delivery results independently. Successful email/Telegram delivery leaves the case IN_PROGRESS; it does not prove handover or end employment.
- `PATCH /api/offboarding/:id/cancel` cancels an unfinished case without changing the account or department leadership. A repeated cancel is harmless. Previously sent notices cannot be recalled.
- `PATCH /api/offboarding/:id/finalize` is allowed from the last working date, using the Vietnam calendar. It atomically sets `User.isActive=false`, clears every `Department.managerId` pointing to that person, and records `COMPLETED` with `finalizedAt`. Future dates and cancelled cases are rejected. Repeating an already completed finalization is harmless.
- A worker checks every minute while the backend is running. It automatically finalizes cases whose last working date is **before today in Asia/Ho_Chi_Minh**. A person remains active throughout their last day unless HR explicitly finalizes that day. Cases missed while the backend is stopped are processed after startup on the next check.
- Late n8n callbacks cannot reopen a cancelled or finalized case. Existing delivery timestamps are preserved.

The worker uses the same transaction and root-account protection as manual closure. No n8n nodes, shared credentials, TV1–TV3 screens or authentication implementation are changed. Existing JWT validation and login already reject inactive accounts with HTTP 401.

## UI

The existing case wizard supports active Employee/Manager/HR targets. HR/SuperAdmin access is unchanged. The drawer shows departments led by the departing person, a handover warning, and confirmation screens for Cancel and Close & Lock. Closing early is disabled in the UI and rejected by the backend. A cancelled case can be replaced; a finalized inactive person cannot be selected again without a separate account reactivation.

This task does not add the IT/Finance handover checklist (SCRUM-31), employee resignation requests or manager approval rights.

## Schema and compatibility

`OffboardingCase.finalizedAt` is a nullable DATETIME column. Where TypeORM synchronization is disabled, run `backend/migrations/20261127_tv4_offboarding_lifecycle.sql` once before deploying. Where synchronization is enabled, TypeORM adds it at startup.

Historical `COMPLETED` rows meant delivery completion, not account closure. When `finalizedAt` is NULL, the API presents them as IN_PROGRESS and they can be cancelled/finalized. Their notification history is retained. Historical unfinished/past-date cases participate in the automatic closure rule as well; review their last working dates and cancel any abandoned cases before deploying the worker. Finalized cases have a non-null timestamp and remain terminal.

## Verification

```bash
cd backend
npm test
npm run typecheck
npm run lint
npm run test:offboarding
node --test test/tv4-automation-workflows.test.cjs

# Optional real localhost HTTP/JWT/MySQL integration test:
TV4_LOCAL_MYSQL_TEST=1 npm run test:offboarding:http

cd ../frontend
npm test
npm run build
npm run lint
```

The integration test uses the normal application account from backend/.env, requires localhost, creates randomly prefixed tables, and removes only those tables afterward. n8n is stubbed, so the test sends no email or Telegram and changes no application records. It checks role permissions, eligible targets, root protection, duplicate approvals, early closure, cancellation, transaction rollback, concurrent cancel/finalize, old JWT rejection, login rejection, Vietnam midnight and legacy delivery-only records.
