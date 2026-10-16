const assert = require('node:assert/strict');
const { test } = require('node:test');
const { startHarness } = require('./recruitment-harness.cjs');
const { InterviewDelivery } = require('../dist/modules/applications/interview-delivery.entity');

test(
  'TV2 authenticated delivery readback (real HTTP/MySQL, provider contract fixture)',
  { timeout: 120000 },
  async (t) => {
    const previous = process.env.RECRUITMENT_CALLBACK_BASE_URL;
    process.env.RECRUITMENT_CALLBACK_BASE_URL = 'http://localhost:3011/api';
    process.env.MAIL_FROM = 'sender@example.test';
    const h = await startHarness();
    t.after(async () => {
      await h.close();
      if (previous === undefined) delete process.env.RECRUITMENT_CALLBACK_BASE_URL;
      else process.env.RECRUITMENT_CALLBACK_BASE_URL = previous;
      delete process.env.MAIL_FROM;
    });
    const { request: req, db, entities: e } = h;
    const job = (
      await req('/jobs', {
        method: 'POST',
        who: 'hr',
        body: {
          title: 'Delivery test',
          departmentId: h.departments[0].id,
          description: 'Synthetic',
          requirements: 'TypeScript',
        },
      })
    ).data;
    async function schedule(email) {
      const app = (
        await req('/applications/apply', { method: 'POST', body: h.upload(job.id, email) })
      ).data;
      const input = {
        interviewerId: h.users.manager.id,
        scheduledAt: '2099-01-01T03:30:00Z',
        round: 1,
      };
      const scheduled = await req('/applications/' + app.applicationId + '/interview', {
        method: 'POST',
        who: 'hr',
        body: input,
      });
      assert.equal(scheduled.status, 201);
      const p = h.automation.calls.at(-1);
      const url = '/applications/interviews/' + p.interviewId + '/delivery';
      async function machine(path, body, token = p.delivery.token) {
        const response = await fetch(h.base + url + path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-interview-callback-token': token } : {}),
          },
          body: JSON.stringify(body),
        });
        const content = await response.json();
        return { status: response.status, data: content.data ?? content };
      }
      return { p, input, url, machine, appId: app.applicationId, scheduled: scheduled.data };
    }
    const a = await schedule('candidate@example.test');
    const calendar = {
      requestId: a.p.delivery.requestId,
      applicationId: a.appId,
      event: 'CALENDAR_CONFIRMED',
      eventId: a.p.delivery.eventId,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      scheduledAt: a.p.scheduledAt,
    };
    const email = {
      requestId: a.p.delivery.requestId,
      applicationId: a.appId,
      event: 'SMTP_ACCEPTED',
      eventId: a.p.delivery.eventId,
      recipient: a.p.candidateEmail,
      acceptedRecipients: [a.p.candidateEmail, a.p.interviewerEmail],
      messageId: '<test-one@example.test>',
    };
    await t.test(
      'tokens are hashed and absent from browser DTO; dispatch alone stays pending',
      async () => {
        const row = await db
          .getRepository(InterviewDelivery)
          .createQueryBuilder('d')
          .addSelect('d.tokenHash')
          .where('d.interviewId=:id', { id: a.p.interviewId })
          .getOne();
        assert.equal(row.tokenHash.length, 64);
        assert.notEqual(row.tokenHash, a.p.delivery.token);
        const dto = JSON.stringify((await req('/applications/' + a.appId, { who: 'hr' })).data);
        assert.equal(dto.includes(a.p.delivery.token), false);
        assert.equal(dto.includes('tokenHash'), false);
        assert.equal(dto.includes('payloadSnapshot'), false);
        assert.equal(a.scheduled.interview.automation.status, 'PENDING');
        assert.equal(a.scheduled.interview.meetingLink, null);
      },
    );
    await t.test('unauthenticated/wrong capability and unclaimed result are rejected', async () => {
      assert.equal((await req('/applications/interviews/' + a.p.interviewId + '/meeting-link', {
        method: 'POST', body: { meetingLink: 'https://meet.google.com/abc-defg-hij' },
      })).status, 401);
      assert.equal(
        (await a.machine('/claim', { requestId: a.p.delivery.requestId }, null)).status,
        401,
      );
      assert.equal(
        (await a.machine('/claim', { requestId: a.p.delivery.requestId }, '0'.repeat(64))).status,
        401,
      );
      assert.equal((await a.machine('', calendar)).status, 409);
      const claims = await Promise.all(
        [1, 2].map(() => a.machine('/claim', { requestId: a.p.delivery.requestId })),
      );
      assert.deepEqual(claims.map((r) => r.status).sort(), [201, 409]);
      assert.equal(
        claims.find((r) => r.status === 201).data.payload.candidateEmail,
        'candidate@example.test',
      );
    });
    await t.test(
      'out-of-order email, wrong app/time/event and arbitrary link are rejected',
      async () => {
        assert.equal((await a.machine('', email)).status, 409);
        for (const body of [
          { ...calendar, applicationId: 99999 },
          { ...calendar, scheduledAt: '2099-01-01T04:30:00Z' },
          { ...calendar, eventId: 'hrtv2different' },
        ])
          assert.equal((await a.machine('', body)).status, 409);
        for (const meetingLink of [
          'javascript:alert(1)',
          'https://meet.google.com.evil.test/abc-defg-hij',
          'https://meet.google.com/new',
        ])
          assert.equal((await a.machine('', { ...calendar, meetingLink })).status, 400);
        assert.equal(
          (await a.machine('', { ...calendar, password: 'should-not-be-accepted' })).status,
          400,
        );
      },
    );
    await t.test(
      'Calendar and SMTP callbacks persist, with concurrent duplicate callback idempotency',
      async () => {
        const before = (await req('/applications/' + a.appId, { who: 'hr' })).data.interviews[0]
          .updatedAt;
        const results = await Promise.all([1, 2].map(() => a.machine('', calendar)));
        assert.deepEqual(results.map((r) => r.data.duplicate).sort(), [false, true]);
        assert.equal(
          (await a.machine('', { ...email, recipient: 'someone-else@example.test' })).status,
          409,
        );
        assert.equal((await a.machine('', email)).status, 201);
        assert.equal((await a.machine('', email)).data.duplicate, true);
        assert.equal(
          (await a.machine('', { ...email, messageId: '<another@example.test>' })).status,
          409,
        );
        assert.equal(
          (
            await a.machine('', {
              ...calendar,
              meetingLink: 'https://meet.google.com/xyz-abcd-efg',
            })
          ).status,
          409,
        );
        const detail = (await req('/applications/' + a.appId, { who: 'hr' })).data.interviews[0];
        assert.equal(detail.meetingLink, calendar.meetingLink);
        assert.equal(detail.automation.status, 'COMPLETED');
        assert.equal(detail.automation.emailStatus, 'SMTP_ACCEPTED');
        assert.equal(detail.updatedAt, before);
        const replay = await req('/applications/' + a.appId + '/interview', {
          method: 'POST',
          who: 'hr',
          body: a.input,
        });
        assert.equal(replay.data.dispatch, 'NOT_RETRIED');
        assert.equal(h.automation.calls.length, 1);
        assert.equal((await req('/applications/' + a.appId, { who: 'other' })).status, 404);
        assert.equal((await req('/applications/' + a.appId, { who: 'employee' })).status, 403);
      },
    );
    await t.test('late failure cannot downgrade completed Meet/mail', async () => {
      assert.equal(
        (
          await a.machine('', {
            requestId: email.requestId,
            applicationId: a.appId,
            event: 'FAILED',
            stage: 'EMAIL',
            code: 'SMTP_ERROR',
          })
        ).status,
        409,
      );
      assert.equal((await a.machine('/claim', { requestId: email.requestId })).status, 409);
    });
    await t.test(
      'email error preserves Meet; later confirmed SMTP recovers without new dispatch',
      async () => {
        const b = await schedule('second@example.test');
        await b.machine('/claim', { requestId: b.p.delivery.requestId });
        const meet = {
          ...calendar,
          requestId: b.p.delivery.requestId,
          applicationId: b.appId,
          eventId: b.p.delivery.eventId,
        };
        await b.machine('', meet);
        const failure = {
          requestId: b.p.delivery.requestId,
          applicationId: b.appId,
          event: 'FAILED',
          stage: 'EMAIL',
          code: 'SMTP_ERROR',
        };
        assert.equal((await b.machine('', failure)).status, 201);
        assert.equal((await b.machine('', failure)).data.duplicate, true);
        let view = (await req('/applications/' + b.appId, { who: 'hr' })).data.interviews[0];
        assert.equal(view.meetingLink, calendar.meetingLink);
        assert.equal(view.automation.status, 'FAILED');
        assert.equal(view.automation.emailStatus, 'UNKNOWN');
        assert.equal(
          (
            await b.machine('', {
              ...email,
              requestId: b.p.delivery.requestId,
              applicationId: b.appId,
              eventId: b.p.delivery.eventId,
              recipient: b.p.candidateEmail,
              acceptedRecipients: [b.p.candidateEmail, b.p.interviewerEmail],
            })
          ).status,
          201,
        );
        view = (await req('/applications/' + b.appId, { who: 'hr' })).data.interviews[0];
        assert.equal(view.automation.status, 'COMPLETED');
        assert.equal(h.automation.calls.length, 2);
        // A token from a different interview cannot authorize this result.
        assert.equal((await b.machine('', meet, a.p.delivery.token)).status, 401);
      },
    );
    await t.test('expired capabilities and missing callbacks remain uncertain', async () => {
      const c = await schedule('third@example.test');
      await db.getRepository(InterviewDelivery).update(c.p.interviewId, {
        expiresAt: new Date(Date.now() - 60000),
        createdAt: new Date(Date.now() - 11 * 60000),
      });
      assert.equal((await c.machine('/claim', { requestId: c.p.delivery.requestId })).status, 401);
      const view = (await req('/applications/' + c.appId, { who: 'hr' })).data.interviews[0];
      assert.equal(view.automation.status, 'UNKNOWN');
      assert.equal(view.automation.emailStatus, 'PENDING');
    });
    await t.test(
      'invalid callback configuration or absent sender rolls scheduling back without dispatch',
      async () => {
        const app = (
          await req('/applications/apply', {
            method: 'POST',
            body: h.upload(job.id, 'config-test@example.test'),
          })
        ).data;
        const before = await db.getRepository(e.Interview).count();
        const calls = h.automation.calls.length;
        for (const invalidBase of [
          'http://public.example.test/api',
          'https://user:password@example.test/api',
          'https://example.test/api?token=x',
        ]) {
          process.env.RECRUITMENT_CALLBACK_BASE_URL = invalidBase;
          assert.equal(
            (
              await req('/applications/' + app.applicationId + '/interview', {
                method: 'POST',
                who: 'hr',
                body: a.input,
              })
            ).status,
            503,
          );
        }
        process.env.RECRUITMENT_CALLBACK_BASE_URL = 'http://localhost:3011/api';
        delete process.env.MAIL_FROM;
        assert.equal(
          (
            await req('/applications/' + app.applicationId + '/interview', {
              method: 'POST',
              who: 'hr',
              body: a.input,
            })
          ).status,
          503,
        );
        process.env.MAIL_FROM = 'sender@example.test';
        assert.equal(await db.getRepository(e.Interview).count(), before);
        assert.equal(h.automation.calls.length, calls);
        assert.equal(
          (await req('/applications/' + app.applicationId, { who: 'hr' })).data.status,
          'APPLIED',
        );
      },
    );
  },
);
