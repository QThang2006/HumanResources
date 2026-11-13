const fs = require('fs');
const sqlite3 = require('C:/laragon/bin/nodejs/node-v22/node_modules/n8n/node_modules/sqlite3');

const wf3Path = 'f:/HumanResources/workflows/tv3_onboarding/03_onboarding_sla_guardian.json';
const wf3 = JSON.parse(fs.readFileSync(wf3Path, 'utf8'));

const emailNode = wf3.nodes.find(n => n.name === 'Email Overdue Notice');
// Send directly to both Đạt (Employee) and Vũ (Manager/Mentor)
emailNode.parameters.toEmail = "={{ $('SLA & Progress Engine').first().json.email + ', ' + $('SLA & Progress Engine').first().json.mentorEmail }}";
emailNode.parameters.options = {};

fs.writeFileSync(wf3Path, JSON.stringify(wf3, null, 2), 'utf8');

const db = new sqlite3.Database('C:/Users/Lenovo/.n8n/database.sqlite');
const nodesStr = JSON.stringify(wf3.nodes);
const connsStr = JSON.stringify(wf3.connections);
const updatedAt = new Date().toISOString();

db.run('UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = ? WHERE id = ?', [nodesStr, connsStr, updatedAt, 'TV3WF03SLAGuard'], function(err) {
  if (err) console.error(err);
  else console.log('WF-03 SQLite updated, rows affected:', this.changes);
  db.close();
});
