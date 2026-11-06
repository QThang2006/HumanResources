const fs = require('fs');
const path = require('path');
const sqlite3 = require('C:/laragon/bin/nodejs/node-v22/node_modules/n8n/node_modules/sqlite3');

const rootDir = 'f:/HumanResources';
const wf1Path = path.join(rootDir, 'workflows/tv3_onboarding/01_burnout_crisis_escalation.json');
const wf3Path = path.join(rootDir, 'workflows/tv3_onboarding/03_onboarding_sla_guardian.json');
const wf4Path = path.join(rootDir, 'workflows/tv3_onboarding/04_weekly_morale_digest.json');

console.log('--- 1. Updating WF-01 ---');
const wf1 = JSON.parse(fs.readFileSync(wf1Path, 'utf8'));

const cardNode1 = wf1.nodes.find(n => n.name === 'Build Alert Card');
if (cardNode1) {
  cardNode1.parameters.jsCode = cardNode1.parameters.jsCode
    .replace("const CONFIG = { HR_EMAIL: 'hr@company.com' };", "const CONFIG = { HR_EMAIL: 'vutranpoh@gmail.com' };")
    .replace("hrEmail: CONFIG.HR_EMAIL, managerEmail: profile.manager_email || ''", "hrEmail: CONFIG.HR_EMAIL, managerEmail: profile.manager_email || 'vutranpoh@gmail.com'");
}

const emailNode1 = wf1.nodes.find(n => n.name === 'Email HR Official Notice');
if (emailNode1) {
  emailNode1.parameters.toEmail = "={{ $('Build Alert Card').first().json.managerEmail || $('Build Alert Card').first().json.hrEmail }}";
  emailNode1.parameters.ccEmail = "={{ ($('Build Alert Card').first().json.riskTier === 'CRITICAL' && $('Build Alert Card').first().json.managerEmail !== $('Build Alert Card').first().json.hrEmail) ? $('Build Alert Card').first().json.hrEmail : '' }}";
}

// Ensure Telegram Manager Alert also forwards to Email HR Official Notice so Manager gets notified via email even on WARNING
wf1.connections['Telegram Manager Alert'] = {
  main: [
    [
      {
        node: 'Email HR Official Notice',
        type: 'main',
        index: 0
      }
    ]
  ]
};

fs.writeFileSync(wf1Path, JSON.stringify(wf1, null, 2), 'utf8');
console.log('WF-01 file written.');

console.log('--- 2. Updating WF-03 ---');
const wf3 = JSON.parse(fs.readFileSync(wf3Path, 'utf8'));
const slaNode3 = wf3.nodes.find(n => n.name === 'SLA & Progress Engine');
if (slaNode3) {
  slaNode3.parameters.jsCode = slaNode3.parameters.jsCode
    .replace("email: user.email || 'employee@company.com'", "email: user.email || 'dattrandn@gmail.com'")
    .replace("mentorEmail: user.mentor_email || 'mentor@company.com'", "mentorEmail: user.mentor_email || 'vutranpoh@gmail.com'");
}
fs.writeFileSync(wf3Path, JSON.stringify(wf3, null, 2), 'utf8');
console.log('WF-03 file written.');

console.log('--- 3. Updating WF-04 ---');
const wf4 = JSON.parse(fs.readFileSync(wf4Path, 'utf8'));
const engineNode4 = wf4.nodes.find(n => n.name === 'Morale Analytics Engine');
if (engineNode4) {
  engineNode4.parameters.jsCode = engineNode4.parameters.jsCode
    .replace("HR_EMAIL: 'hr@company.com'", "HR_EMAIL: 'vutranpoh@gmail.com'");
}
fs.writeFileSync(wf4Path, JSON.stringify(wf4, null, 2), 'utf8');
console.log('WF-04 file written.');

console.log('--- 4. Syncing changes to n8n SQLite database ---');
const dbPath = 'C:/Users/Lenovo/.n8n/database.sqlite';
const db = new sqlite3.Database(dbPath);

const syncWf = (wfId, wfData) => {
  return new Promise((resolve, reject) => {
    const nodesStr = JSON.stringify(wfData.nodes);
    const connsStr = JSON.stringify(wfData.connections);
    const updatedAt = new Date().toISOString();
    
    db.run(
      `UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = ? WHERE id = ?`,
      [nodesStr, connsStr, updatedAt, wfId],
      function (err) {
        if (err) return reject(err);
        console.log(`Updated workflow_entity for ${wfId} (rows affected: ${this.changes})`);
        
        db.run(
          `UPDATE workflow_history SET nodes = ?, connections = ? WHERE workflowId = ? ORDER BY versionId DESC LIMIT 1`,
          [nodesStr, connsStr, wfId],
          function (err2) {
            if (err2) console.warn('Warning updating workflow_history:', err2.message);
            else console.log(`Updated workflow_history for ${wfId}`);
            resolve();
          }
        );
      }
    );
  });
};

(async () => {
  try {
    await syncWf('wJrOeNTxp2yTn4hT', wf1);
    await syncWf('TV3WF03SLAGuard', wf3);
    await syncWf('TV3WF04MoraleDig', wf4);
    console.log('ALL WORKFLOWS SYNCED TO N8N DATABASE SUCCESSFULLY!');
    db.close();
  } catch (e) {
    console.error('Error during sqlite sync:', e);
    db.close();
  }
})();
