// Prepare TV2 workflows and the local intake credential without exposing secrets.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const data = process.env.N8N_LOCAL_DATA || 'C:/Users/tienc/AppData/Local/Temp/hr-n8n-data-20261007';
const db = new DatabaseSync(path.join(data, '.n8n/database.sqlite'), { readOnly: true });
const credentials = db.prepare('SELECT id,name,type FROM credentials_entity').all(); db.close();
const output = path.join(root, '.temp/tv2-local-import'); fs.mkdirSync(output, { recursive: true });
const envPath = path.join(root, 'backend/.env');
let env = fs.readFileSync(envPath, 'utf8');
const read = name => env.match(new RegExp('^' + name + '=(.*)$', 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
let intakeKey = read('N8N_INTAKE_KEY');
if (!intakeKey) { intakeKey = randomBytes(32).toString('hex'); env += '\nN8N_INTAKE_KEY=' + intakeKey + '\n'; fs.writeFileSync(envPath, env); }
if (intakeKey.length < 32) throw Error('N8N_INTAKE_KEY must have at least 32 characters');
const intakeCredential = { id: 'hrTv2IntakeHeader', name: 'TV2 Backend Intake Key', type: 'httpHeaderAuth', data: { name: 'x-intake-key', value: intakeKey } };
fs.writeFileSync(path.join(output, 'intake-credential.json'), JSON.stringify([intakeCredential]));
const syncUrl = read('GOOGLE_FORM_SYNC_URL');
const syncToken = read('GOOGLE_FORM_SYNC_TOKEN');
if (syncUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(syncUrl)) throw Error('Invalid Google Apps Script URL');
const syncCredential = { id: 'hrTv2FormSyncAuth', name: 'TV2 Google Form Sync Token', type: 'httpCustomAuth', data: { json: JSON.stringify({body:{token:syncToken}}) } };
if (syncToken) fs.writeFileSync(path.join(output, 'form-sync-credential.json'), JSON.stringify([syncCredential]));
const map = { emailSend: 'smtp', googleCalendar: 'googleCalendarOAuth2Api', gmailTrigger: 'gmailOAuth2', gmail: 'gmailOAuth2', googleSheetsTrigger: 'googleSheetsTriggerOAuth2Api', googleDrive: 'googleDriveOAuth2Api' };
const missing = new Set();
const workflows = ['candidate-intake-omnichannel.json','interview-schedule-readback.json','offer-letter-48h.json','job-form-sync.json'].map(file => {
  const w = JSON.parse(fs.readFileSync(path.join(root,'workflows',file),'utf8')); w.active=false;
  for(const n of w.nodes){
    const type=map[n.type.split('.').at(-1)];
    if(type){ const matches=credentials.filter(c=>c.type===type); if(matches.length===1)n.credentials={[type]:{id:matches[0].id,name:matches[0].name}};else missing.add(type); }
    if(n.parameters.genericAuthType==='httpHeaderAuth')n.credentials={httpHeaderAuth:{id:intakeCredential.id,name:intakeCredential.name}};
    if(w.id==='hrTv2JobSyncV2' && n.parameters.genericAuthType==='httpCustomAuth'){
      if (!syncUrl || !syncToken || syncToken.length < 32) missing.add('Google Form sync URL/token');
      n.parameters.url=syncUrl || n.parameters.url;
      n.credentials={httpCustomAuth:{id:syncCredential.id,name:syncCredential.name}};
    }
  }
  return w;
});
fs.writeFileSync(path.join(output,'workflows.json'),JSON.stringify(workflows,null,2));
console.log('Prepared '+workflows.length+' INACTIVE workflows: '+workflows.map(w=>w.id).join(', '));
console.log('Credentials requiring connection: '+[...missing].join(', '));
console.log('Missing Backend settings: '+['MAIL_FROM','HR_EMAIL','RECRUITMENT_CALLBACK_BASE_URL','PUBLIC_WEB_BASE_URL'].filter(k=>!read(k)).join(', '));
