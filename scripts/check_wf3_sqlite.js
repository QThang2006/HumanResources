const sqlite3 = require('C:/laragon/bin/nodejs/node-v22/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('C:/Users/Lenovo/.n8n/database.sqlite');

db.get("SELECT nodes FROM workflow_history WHERE versionId = '61e9753f-97d2-446d-806b-d850ad60821d'", (err, row) => {
  const nodes = JSON.parse(row.nodes);
  const em = nodes.find(n => n.name === 'Email Overdue Notice');
  console.log('In workflow_history for 61e9753f-97d2-446d-806b-d850ad60821d:');
  console.log(JSON.stringify(em.parameters));
  db.close();
});
