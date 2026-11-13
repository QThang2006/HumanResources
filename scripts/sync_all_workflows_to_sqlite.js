const fs = require('fs');
const path = require('path');
const sqlite3 = require('C:/laragon/bin/nodejs/node-v22/node_modules/n8n/node_modules/sqlite3');

const db = new sqlite3.Database('C:/Users/Lenovo/.n8n/database.sqlite');
const rootDir = 'f:/HumanResources';

const workflows = [
  { id: 'wJrOeNTxp2yTn4hT', file: 'workflows/tv3_onboarding/01_burnout_crisis_escalation.json' },
  { id: 'TV3WF02DailyMood', file: 'workflows/tv3_onboarding/02_daily_mood_omnichannel.json' },
  { id: 'TV3WF03SLAGuard', file: 'workflows/tv3_onboarding/03_onboarding_sla_guardian.json' },
  { id: 'TV3WF04MoraleDig', file: 'workflows/tv3_onboarding/04_weekly_morale_digest.json' },
];

(async () => {
  for (const wfInfo of workflows) {
    const fullPath = path.join(rootDir, wfInfo.file);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const nodesStr = JSON.stringify(content.nodes);
    const connsStr = JSON.stringify(content.connections);
    const updatedAt = new Date().toISOString();

    await new Promise((resolve) => {
      db.get('SELECT versionId FROM workflow_entity WHERE id = ?', [wfInfo.id], (err, row) => {
        if (!row) {
          console.warn('Workflow not found:', wfInfo.id);
          return resolve();
        }
        const versionId = row.versionId;
        db.run(
          'UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = ? WHERE id = ?',
          [nodesStr, connsStr, updatedAt, wfInfo.id],
          (e1) => {
            if (e1) console.error('Error updating workflow_entity:', e1);
            db.run(
              'UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?',
              [nodesStr, connsStr, versionId],
              (e2) => {
                if (e2) console.error('Error updating workflow_history:', e2);
                console.log(`Synced ${wfInfo.id} (versionId: ${versionId}) to workflow_entity AND workflow_history.`);
                resolve();
              }
            );
          }
        );
      });
    });
  }
  db.close();
  console.log('ALL WORKFLOWS FULLY SYNCED!');
})();
