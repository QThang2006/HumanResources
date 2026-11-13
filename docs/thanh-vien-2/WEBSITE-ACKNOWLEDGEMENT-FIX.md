# WF-02 website acknowledgement fix

Website submissions now persist `acknowledgementStatus = PENDING` and dispatch only the application ID to n8n at `POST /webhook/application-received`. The n8n branch claims the receipt atomically through `POST /api/recruitment/intake/:id/acknowledgement/claim`, sends the existing acknowledgement template through SMTP, and records the SMTP `accepted` list and `messageId` through the existing callback.

Form and Gmail intake keep their existing `CLAIMED` flow. CV scoring remains owned by the backend queue; the website receipt branch does not call an AI node. A repeated claim returns `shouldSend: false`, so it cannot send a second SMTP message. A missing or rejected n8n response leaves a website row `PENDING` for the worker to retry. A claimed row is not automatically resent because SMTP delivery may have succeeded before a callback failure.

## Deploy order

1. Export the **published WF-02** from n8n and keep the export as a read-only backup.
2. Run `scripts/patch-wf02-website-ack.cjs` against that export. The script discovers the existing intake Header Auth and SMTP credentials and fails without writing output when either is missing. Review the six `WEB-*` nodes and publish the patched workflow as the replacement WF-02.
3. Set `N8N_ACKNOWLEDGEMENT_ENABLED=true` in the backend environment only after the patched workflow is published. Set it to `false` while the workflow is being edited.
4. Build and restart the PM2 backend. The backend uses `N8N_INTAKE_KEY` for the new webhook and callback; no secret is stored in the workflow JSON.
5. Submit one new website CV to the dedicated test mailbox. Verify the n8n execution, one SMTP message, `SMTP_ACCEPTED`, and the AI queue result separately.

Example patch command (run on a workstation with the exported file):

```bash
node scripts/patch-wf02-website-ack.cjs \
  --input /secure/path/wf02-live-backup.json \
  --output /secure/path/wf02-live-patched.json \
  --api-base-url https://<backend-host>/api
```

The command never overwrites the input export. Do not bulk-import the repository template over a live workflow; patch the current published export so its credential IDs and current node names remain intact.
