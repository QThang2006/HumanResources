// Creates network-free fixtures from the actual TV4 graphs. Run these only in
// an isolated n8n database. Every HTTP, SMTP and Telegram node is replaced.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const outputDir = process.argv[2] && path.resolve(process.argv[2]);
if (!outputDir || outputDir.startsWith(root + path.sep)) throw Error('Choose a temporary output directory outside the repository.');
const config = { apiBaseUrl: 'http://backend.example.invalid/api', automationSecret: 'fixture-only-not-a-live-secret', senderEmail: 'sender@example.invalid', telegramChatId: '-123456789', workspaceUrl: 'https://hr.example.invalid/employee/workspace', reviewFormUrl: 'https://hr.example.invalid/employee/workspace', itEmail: 'it@example.invalid', accountingEmail: 'finance@example.invalid' };
const employee = id => ({ id, fullName: 'QA Employee ' + id, email: id === 2 ? '' : `employee${id}@example.invalid` });
const training = [1,2,3].map(id => ({ assignmentId: id, employee: employee(id), manager: id === 1 ? { fullName: 'QA Manager', email: 'manager@example.invalid' } : null, course: { title: 'QA course ' + id }, daysRemaining: 3-id, progressPercent: 25, notifyManager: true }));
const reviews = [1,2,3].map(id => ({ recipient: { id, fullName: 'QA Manager ' + id, email: id === 2 ? '' : `manager${id}@example.invalid` }, employees: [{ ...employee(id), departmentName: 'QA' }], pendingCount: 1, reviewPeriod: '2026-11', reviewPeriodLabel: '11/2026', deadline: '30/11/2026', phase: 'OPENING' }));
const record = { caseId: 19, status: 'IN_PROGRESS', lastWorkingDate: '2026-11-15', employee: { fullName: 'QA Employee', workEmail: 'work@example.invalid', personalEmail: 'personal@example.invalid', departmentName: 'QA' }, approvedBy: { fullName: 'QA HR' }, alreadyNotified: {} };
const cases = [
  ['training-multiple', 2, { data: { reminders: training } }],
  ['training-empty', 2, { data: { reminders: [] } }],
  ['review-multiple', 3, { data: { phase: 'OPENING', count: 3, pendingEmployeeCount: 3, reviewPeriod: '2026-11', reminders: reviews } }],
  ['review-empty', 3, { data: { phase: 'OPENING', count: 0, pendingEmployeeCount: 0, reminders: [] } }],
  ['review-outside-schedule', 3, { data: { count: 0, reminders: [] } }],
  ['offboarding-all', 4, { data: record }],
  ['offboarding-retry', 4, { data: { ...record, alreadyNotified: { it: true, finance: true, employee: true } } }],
  ['offboarding-invalid', 4, { data: { ...record, status: 'COMPLETED' } }],
];
const code = (node, jsCode, each = false) => {
  node.type = 'n8n-nodes-base.code'; node.typeVersion = 2;
  node.parameters = { jsCode, ...(each ? { mode: 'runOnceForEachItem' } : {}) };
  delete node.credentials; delete node.retryOnFail; delete node.onError;
};
const edge = target => ({ node: target, type: 'main', index: 0 });
fs.mkdirSync(outputDir, { recursive: true });
for (const [scenario, role, response] of cases) {
  const file = fs.readdirSync(path.join(root,'workflows/tv4_admin_training')).find(file => file.startsWith('0'+role));
  const w = JSON.parse(fs.readFileSync(path.join(root,'workflows/tv4_admin_training',file)));
  w.id = 'tv4QA' + scenario.replace(/-/g,''); w.name = '[TV4 QA] ' + scenario; w.active=false; w.settings={executionOrder:'v1',timezone:'Asia/Ho_Chi_Minh'};
  delete w.tags; delete w.meta; delete w.staticData;
  const cfg = { ...config };

  const start = w.nodes.find(node => /scheduleTrigger|webhook$/.test(node.type));
  if (role === 4) {
    code(start, `return [{json:${JSON.stringify({headers:{'x-automation-secret':config.automationSecret},body:{caseId:19}})}}];`);
    w.nodes.push({id:'qa-start',name:'TV4 QA Start',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[-300,0],parameters:{}});
    w.connections['TV4 QA Start']={main:[[edge(start.name)]]};
  } else { start.type='n8n-nodes-base.manualTrigger';start.typeVersion=1;start.parameters={}; }
  const extraSchedules=w.nodes.filter(node => node.type==='n8n-nodes-base.scheduleTrigger');
  for(const node of extraSchedules)delete w.connections[node.name];
  w.nodes=w.nodes.filter(node=>!extraSchedules.includes(node));
  for(const node of w.nodes) {
    if(node.type==='n8n-nodes-base.set')code(node,`return [{json:${JSON.stringify(cfg)}}];`);
    if(node.type==='n8n-nodes-base.httpRequest') {
      if(node.name.startsWith('Fetch ')) code(node,`return [{json:${JSON.stringify(response)}}];`);
      else code(node,"return {json:{data:{recorded:true}}};",true);
    }
    if(node.type==='n8n-nodes-base.emailSend') {
      const expression=node.parameters.toEmail.slice(3,-2);
      code(node,`return {json:{accepted:[${expression}],rejected:[],messageId:'qa-message'}};`,true);
    }
    if(node.type==='n8n-nodes-base.telegram') {
      const source=role===2?'Compose Training Notices':role===3?'Compose Review Notices':'Compose Offboarding Notices';
      const id=role===2?'assignmentId':'recipient?.id';
      code(node,node.name==='Send Review Run Summary' ? 'return {json:{message_id:99,...$json}};' : `const source=$('${source}').item.json; return {json:source.${id} === 3 ? {error:{message:'QA Telegram unavailable'}} : {message_id:99}};`,true);
    }
    if(node.type==='n8n-nodes-base.respondToWebhook')code(node,`return [{json:JSON.parse(${node.parameters.responseBody.slice(3,-2)})}];`);
  }
  let terminal=role===2?(scenario.endsWith('empty')?'Has Training Reminders?':'Process Training Assignments'):role===3?(scenario.endsWith('schedule')?'Is Review Phase Active?':'Send Review Run Summary'):scenario.endsWith('invalid')?'Respond to Invalid Case':'Respond to Offboarding Request';
  let branch=(scenario==='training-empty'||scenario==='review-outside-schedule')?1:0;
  let assertions='';
  if(scenario==='training-multiple')assertions="const rows=$input.all().map(item=>item.json);if(rows.length!==3||rows.map(row=>row.assignmentId).join(',')!=='1,2,3'||rows.map(row=>row.status).join(',')!=='SENT,PARTIAL,PARTIAL')throw Error('Training loop mismatch: '+JSON.stringify(rows));";
  if(scenario==='review-multiple')assertions="const row=$json;if(row.totalRecipients!==3||row.sent!==1||row.partial!==2||row.callbackErrors!==0)throw Error('Review loop mismatch: '+JSON.stringify(row));";
  if(scenario==='review-empty')assertions="if($json.totalRecipients!==0||$json.sent!==0)throw Error('Empty review mismatch');";
  if(scenario==='offboarding-retry')assertions="const row=$('Summarize Offboarding Delivery').first().json;if(row.status!=='SENT'||row.attemptedChannels.join(',')!=='telegram'||row.skippedChannels.length!==3)throw Error('Retry mismatch: '+JSON.stringify(row));for(const name of ['Send IT Handover Notice','Send Finance Handover Notice','Send Employee Farewell'])if($(name).isExecuted)throw Error('Repeated a confirmed channel');";
  if(scenario==='offboarding-all')assertions="if($json.status!=='SENT'||!$json.callbackRecorded)throw Error('Offboarding completion mismatch');";
  if(scenario==='offboarding-invalid')assertions="if($json.errorCode!=='INVALID_OFFBOARDING_CASE')throw Error('Invalid case was not rejected');";
  const verifier={id:'qa-assert',name:'Verify TV4 QA Result',type:'n8n-nodes-base.code',typeVersion:2,position:[5000,0],parameters:{jsCode:assertions+`\nreturn [{json:{scenario:${JSON.stringify(scenario)},verified:true}}];`}};
  w.nodes.push(verifier);w.connections[terminal]??={main:[]};w.connections[terminal].main[branch]??=[];w.connections[terminal].main[branch].push(edge(verifier.name));
  const safeTypes=new Set(['n8n-nodes-base.manualTrigger','n8n-nodes-base.code','n8n-nodes-base.if','n8n-nodes-base.splitInBatches']);
  if(w.nodes.some(node=>!safeTypes.has(node.type)||node.credentials))throw Error('Unsafe fixture '+scenario);
  fs.writeFileSync(path.join(outputDir,scenario+'.json'),JSON.stringify(w,null,2)+'\n');
  console.log(w.id+' '+scenario);
}
