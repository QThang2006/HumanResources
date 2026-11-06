// Only the three main TV4 workflows are writable targets. Instance configuration
// and credential references may only be preserved outside the repository.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const defaultSource = path.join(root, 'workflows/tv4_admin_training');
const args = process.argv.slice(2);
const option = flag => args.includes(flag) ? path.resolve(args[args.indexOf(flag) + 1]) : null;
const sourceDir = option('--source-dir') || defaultSource;
const outputDir = option('--output-dir') || defaultSource;
if (sourceDir !== defaultSource && (outputDir === root || outputDir.startsWith(root + path.sep))) throw Error('Instance exports may contain private configuration. Output must stay outside the repository.');
const helpers = fs.readFileSync(path.join(__dirname, 'tv4-workflow-code/common.js'), 'utf8');
const files = ['02_mandatory_training_reminder.json', '03_monthly_performance_review_reminder.json', '04_offboarding_workflow.json'];
const mappings = [
  ['Lịch chạy 08 giờ mỗi ngày','Daily Training Schedule'], ['Nạp cấu hình an toàn','Load Workflow Configuration'],
  ['Lấy danh sách cần nhắc','Fetch Training Reminders'], ['Tách từng lượt đào tạo','Split Training Assignments'],
  ['Có trường hợp cần nhắc?','Has Training Reminders?'], ['Soạn nội dung nhắc bằng tiếng Việt','Compose Training Notices'],
  ['Gửi thư nhắc nhân viên','Send Employee Reminder'], ['Có quản lý trực tiếp?','Should Notify Manager?'],
  ['Thông báo cho quản lý','Send Manager Reminder'], ['Thông báo kênh đào tạo','Send Training Telegram'],
  ['Tổng hợp kết quả gửi','Summarize Training Delivery'], ['Lưu kết quả về hệ thống','Record Training Delivery'],
  ['Cron ngày 25 - Mở kỳ đánh giá','Daily Review Schedule'], ['Cron ngày 28 - Đôn đốc chưa nộp','Monthly Review Follow-up Schedule'],
  ['Xác định đợt thông báo','Prepare Review Request'], ['Resolve Review Phase','Prepare Review Request'], ['Monthly Review Opening Schedule','Daily Review Schedule'], ['Lấy danh sách quản lý cần nhắc','Fetch Review Recipients'],
  ['Tách từng quản lý phụ trách','Split Review Recipients'], ['Có quản lý cần thông báo?','Has Review Recipients?'],
  ['Soạn nội dung đánh giá bằng tiếng Việt','Compose Review Notices'], ['Gửi thư cho quản lý','Send Review Email'],
  ['Thông báo kênh đánh giá','Send Review Telegram'], ['Tổng hợp kết quả thông báo','Summarize Review Delivery'],
  ['Lưu kết quả nhắc đánh giá','Record Review Delivery'],
  ['Webhook - HR Duyệt Thôi Việc','Offboarding Approval Webhook'], ['Nạp cấu hình liên phòng ban','Load Offboarding Configuration'],
  ['Xác thực yêu cầu từ hệ thống','Authenticate Offboarding Request'], ['Lấy hồ sơ thôi việc đã duyệt','Fetch Approved Offboarding Case'],
  ['Soạn nội dung điều phối bằng tiếng Việt','Compose Offboarding Notices'], ['Gửi ticket cho phòng IT','Send IT Handover Notice'],
  ['Gửi thông báo cho Kế toán','Send Finance Handover Notice'], ['Gửi thư cảm ơn và khảo sát','Send Employee Farewell'],
  ['Thông báo kênh liên phòng ban','Send Offboarding Telegram'], ['Tổng hợp kết quả liên phòng ban','Summarize Offboarding Delivery'],
  ['Lưu kết quả thôi việc về hệ thống','Record Offboarding Delivery'], ['Phản hồi kết quả offboarding','Respond to Offboarding Request'],
];
function configValidation() {
  const item = $json;
  if (!httpUrl(item.apiBaseUrl)) throw Error('Địa chỉ backend không hợp lệ.');
  if (!String(item.automationSecret || '').trim()) throw Error('Thiếu khóa xác thực tự động hóa.');
  if (!emailValid(item.senderEmail)) throw Error('Email gửi không hợp lệ.');
  return [{ json: { ...item, apiBaseUrl: item.apiBaseUrl.replace(/\/+$/, ''), senderEmail: item.senderEmail.trim(), telegramReady: chatValid(item.telegramChatId) } }];
}
function classifyTraining() {
  const item = $json;
  if (!Number.isInteger(item.assignmentId) || !item.employee || !item.course || !Number.isFinite(item.daysRemaining)) throw Error('Dữ liệu lượt học không hợp lệ.');
  return { json: { ...item, alertTier: item.daysRemaining < 0 ? 'OVERDUE' : 'DUE_SOON', telegramReady: chatValid(item.telegramChatId) } };
}
function trainingSummary() {
  const source = $('Compose Training Notices').item.json;
  const employeeError = source.employeeEmailReady ? outputError('Send Employee Reminder', source.employeeEmail) : 'Email nhân viên không hợp lệ.';
  const managerRequired = Boolean(source.manager && source.notifyManager !== false);
  const managerError = managerRequired ? (source.hasManager ? outputError('Send Manager Reminder', source.managerEmail) : 'Email quản lý không hợp lệ.') : '';
  const telegramError = source.telegramReady ? outputError('Send Training Telegram', '', true) : 'Chưa có Chat ID Telegram hợp lệ.';
  const employeeNotified = !employeeError;
  const managerNotified = managerRequired && !managerError;
  const telegramNotified = !telegramError;
  const flags = [employeeNotified, telegramNotified];
  if (managerRequired) flags.push(managerNotified);
  return { json: { apiBaseUrl: source.apiBaseUrl, automationSecret: source.automationSecret, assignmentId: source.assignmentId, runId: source.runId, employeeNotified, managerNotified, telegramNotified, status: deliveryStatus(flags), detail: [`Nhân viên: ${employeeError || 'đã gửi'}`, `Quản lý: ${managerRequired ? managerError || 'đã gửi' : 'không có người phụ trách'}`, `Telegram: ${telegramError || 'đã gửi'}`].join('; ') } };
}
function reviewPhase() {
  const validated = CONFIG_VALIDATION;
  const config = validated[0].json;
  if (!httpUrl(config.reviewFormUrl)) throw Error('Đường dẫn thực hiện đánh giá không hợp lệ.');
  return [{ json: { ...config, runId: String($execution.id) } }];
}
function reviewSummary() {
  const source = $('Compose Review Notices').item.json;
  const emailError = source.recipientEmailReady ? outputError('Send Review Email', source.recipientEmail) : 'Email người phụ trách không hợp lệ.';
  const telegramError = source.telegramReady ? outputError('Send Review Telegram', '', true) : 'Chưa có Chat ID Telegram hợp lệ.';
  const emailNotified = !emailError, telegramNotified = !telegramError;
  return { json: { ...source, emailNotified, telegramNotified, status: deliveryStatus([emailNotified, telegramNotified]), detail: `Email: ${emailError || 'đã gửi'}; Telegram: ${telegramError || 'đã gửi'}` } };
}
function callbackReceipt() {
  const response = $json;
  const payload = response.data ?? response;
  const source = $(SUMMARY_NODE).item.json;
  return { json: { runId: source.runId, assignmentId: source.assignmentId, recipientId: source.recipient?.id, pendingCount: source.pendingCount, status: source.status, callbackRecorded: !response.error && payload.recorded === true, callbackError: Boolean(response.error || payload.recorded !== true), employeeNotified: source.employeeNotified, managerNotified: source.managerNotified, emailNotified: source.emailNotified, telegramNotified: source.telegramNotified } };
}
function reviewRunSummary() {
  const config = $('Prepare Review Request').first().json;
  const response = $('Fetch Review Recipients').first().json;
  const payload = response.data ?? response;
  const results = $input.all().map(item => item.json).filter(item => !item.skip);
  const total = Number(payload.count) || 0;
  const sent = results.filter(item => item.status === 'SENT').length;
  const partial = results.filter(item => item.status === 'PARTIAL').length;
  const failed = results.filter(item => item.status === 'FAILED').length;
  const callbackErrors = results.filter(item => item.callbackError).length;
  const telegramText = ['📊 <b>TỔNG KẾT ĐỢT NHẮC ĐÁNH GIÁ</b>', `Kỳ: ${escapeHtml(payload.reviewPeriod || '')}`, `Đợt: ${payload.phase === 'OPENING' ? 'Mở kỳ' : 'Đôn đốc lần hai'}`, `Người phụ trách cần nhắc: ${total}`, `Nhân viên đang chờ đánh giá: ${Number(payload.pendingEmployeeCount) || 0}`, `Gửi đầy đủ: ${sent}; gửi một phần: ${partial}; gửi lỗi: ${failed}`, `Lỗi lưu kết quả: ${callbackErrors}`].join('\n');
  return [{ json: { runId: config.runId, totalRecipients: total, pendingEmployeeCount: Number(payload.pendingEmployeeCount) || 0, sent, partial, failed, callbackErrors, telegramReady: config.telegramReady, telegramChatId: config.telegramChatId, telegramText } }];
}
function offboardingAuthentication() {
  const request = $('Offboarding Approval Webhook').first().json;
  const config = CONFIG_VALIDATION;
  const item = config[0].json;
  const headers = request.headers || {};
  const supplied = String(headers['x-automation-secret'] || headers['X-Automation-Secret'] || '').trim();
  if (!supplied || supplied !== String(item.automationSecret).trim()) throw Error('Webhook thôi việc chưa được xác thực.');
  const body = request.body?.data || request.body || request;
  const caseId = Number(body.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) throw Error('Mã hồ sơ thôi việc không hợp lệ.');
  return [{ json: { ...item, caseId, runId: String($execution.id) } }];
}
function offboardingSummary() {
  const source = $('Compose Offboarding Notices').item.json;
  const already = source.alreadyNotified || {};
  const channels = [
    ['it', 'itNotified', 'Send IT Handover Notice', source.itRecipient, source.itEmailReady, false],
    ['finance', 'financeNotified', 'Send Finance Handover Notice', source.accountingRecipient, source.financeEmailReady, false],
    ['employee', 'employeeNotified', 'Send Employee Farewell', source.employeeRecipient, source.employeeEmailReady, false],
    ['telegram', 'telegramNotified', 'Send Offboarding Telegram', '', source.telegramReady, true],
  ];
  const flags = {}, details = [], attemptedChannels = [], skippedChannels = [];
  for (const [key, flag, node, recipient, ready, telegram] of channels) {
    if (already[key] === true) { flags[flag] = true; skippedChannels.push(key); details.push(`${key}: đã gửi trước đó, không gửi lại`); continue; }
    if (!ready) { flags[flag] = false; details.push(`${key}: cấu hình người nhận không hợp lệ`); continue; }
    attemptedChannels.push(key);
    const error = outputError(node, recipient, telegram);
    flags[flag] = !error;
    details.push(`${key}: ${error || 'đã gửi'}`);
  }
  return [{ json: { ...source, ...flags, status: deliveryStatus(Object.values(flags)), attemptedChannels, skippedChannels, detail: details.join('; ') } }];
}
function build(file) {
  let w = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  if(Array.isArray(w)) w=w[0];
  if (!/^TV4\s*-|^\[TV4\]/.test(w.name)) throw Error('Refuse non-TV4 workflow: '+w.name);
  let raw=JSON.stringify(w);
  for(const [oldName,newName] of mappings)raw=raw.split(oldName).join(newName);
  w=JSON.parse(raw); w.active=false; w.pinData={}; delete w.activeVersionId; delete w.versionId;
  const nodes=new Map(w.nodes.map(node=>[node.name,node]));
  const get=name=>{const node=nodes.get(name);if(!node)throw Error('Missing '+name);return node;};
  const add=node=>{ if(nodes.has(node.name)){Object.assign(nodes.get(node.name),node);return nodes.get(node.name);}w.nodes.push(node);nodes.set(node.name,node);return node; };
  const code=(name,fn,each=false)=>add({id:'tv4-'+file.slice(0,2)+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,type:'n8n-nodes-base.code',typeVersion:2,position:[0,0],parameters:{...(each?{mode:'runOnceForEachItem'}:{}),jsCode:helpers+'\nreturn ('+fn.toString()+')();'}});
  const editCode=(name,fn,each=false)=>{const node=get(name);node.parameters={...(each?{mode:'runOnceForEachItem'}:{}),jsCode:helpers+'\nreturn ('+fn.toString()+')();'};};
  const gate=(name,expression)=>add({id:'tv4-'+file.slice(0,2)+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,type:'n8n-nodes-base.if',typeVersion:2.2,position:[0,0],parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'condition',leftValue:'={{ '+expression+' }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}});
  const loop=name=>add({id:'tv4-'+file.slice(0,2)+'-recipient-loop',name,type:'n8n-nodes-base.splitInBatches',typeVersion:3,position:[0,0],parameters:{batchSize:1,options:{reset:false}}});
  const map={}; const edge=(from,to,branch=0)=>{map[from]??={main:[]};map[from].main[branch]??=[];map[from].main[branch].push({node:to,type:'main',index:0});};
  const chain=(...names)=>names.slice(0,-1).forEach((name,i)=>edge(name,names[i+1]));
  const adjustConfig=(name,field,value)=>{const list=get(name).parameters.assignments.assignments;if(!list.some(a=>a.name===field))list.push({id:'tv4-'+field,name:field,type:'string',value});};
  const finishCallback=(name)=>{const n=get(name);n.retryOnFail=true;n.maxTries=3;n.waitBetweenTries=1000;n.onError='continueRegularOutput';};
  if(file.startsWith('02')) {
    w.name='[TV4] WF-02: Mandatory Training Reminder & Escalation';
    code('Validate Training Configuration',configValidation);
    code('Classify Training Alert',classifyTraining,true);
    loop('Process Training Assignments');
    gate('Has Valid Employee Email?',"$('Compose Training Notices').item.json.employeeEmailReady");
    gate('Has Training Telegram Route?',"$('Compose Training Notices').item.json.telegramReady");
    code('Collect Training Receipt',callbackReceipt,true).parameters.jsCode=helpers+'\nreturn ('+callbackReceipt.toString().replace('SUMMARY_NODE',"'Summarize Training Delivery'")+')();';
    adjustConfig('Load Workflow Configuration','workspaceUrl','http://localhost:5173/employee/workspace');
    get('Split Training Assignments').parameters.jsCode=get('Split Training Assignments').parameters.jsCode.replace("$('Load Workflow Configuration')","$('Validate Training Configuration')");
    if (!get('Compose Training Notices').parameters.jsCode.includes('// TV4_UPGRADE_COMPOSE_V2')) {
    let compose=get('Compose Training Notices').parameters.jsCode;
    compose=helpers+'\n'+compose.replace("const courseLink = course.courseUrl || 'http://localhost:5173/employee/workspace';", "const courseLink = httpUrl(course.courseUrl) || httpUrl(item.workspaceUrl);")
      .replace('  hasManager: Boolean(manager && managerEmail),','  hasManager: Boolean(manager && item.notifyManager !== false && emailValid(managerEmail)),\n  employeeEmailReady: emailValid(employeeEmail),\n  telegramReady: chatValid(item.telegramChatId),')
      .replace("<p><a href=\"' + esc(courseLink) + '\">Mở khóa học</a></p>", "' + (courseLink ? '<p><a href=\"' + esc(courseLink) + '\">Mở khóa học</a></p>' : '<p>Vui lòng mở khóa học trong không gian làm việc của bạn.</p>') + '");
    get('Compose Training Notices').parameters.jsCode=compose.replace(helpers, helpers+'\n// TV4_UPGRADE_COMPOSE_V2');
    }
    editCode('Summarize Training Delivery',trainingSummary,true); finishCallback('Record Training Delivery');
    chain('Daily Training Schedule','Load Workflow Configuration','Validate Training Configuration','Fetch Training Reminders','Split Training Assignments','Has Training Reminders?');
    edge('Has Training Reminders?','Process Training Assignments',0);
    edge('Process Training Assignments','Classify Training Alert',1);
    chain('Classify Training Alert','Compose Training Notices','Has Valid Employee Email?');
    edge('Has Valid Employee Email?','Send Employee Reminder',0);edge('Has Valid Employee Email?','Should Notify Manager?',1);edge('Send Employee Reminder','Should Notify Manager?');
    edge('Should Notify Manager?','Send Manager Reminder',0);edge('Should Notify Manager?','Has Training Telegram Route?',1);edge('Send Manager Reminder','Has Training Telegram Route?');
    edge('Has Training Telegram Route?','Send Training Telegram',0);edge('Has Training Telegram Route?','Summarize Training Delivery',1);edge('Send Training Telegram','Summarize Training Delivery');
    chain('Summarize Training Delivery','Record Training Delivery','Collect Training Receipt','Process Training Assignments');
  } else if(file.startsWith('03')) {
    w.name='[TV4] WF-03: Monthly KPI Review Cycle & Follow-up';
    w.nodes = w.nodes.filter(node => node.name !== 'Monthly Review Follow-up Schedule');
    get('Daily Review Schedule').parameters = { rule: { interval: [{ field: 'cronExpression', expression: '0 8 * * *' }] } };
    get('Load Workflow Configuration').parameters.assignments.assignments = get('Load Workflow Configuration').parameters.assignments.assignments.filter(field => !['testPhase','testAsOf'].includes(field.name));
    editCode('Prepare Review Request',reviewPhase);
    get('Prepare Review Request').parameters.jsCode=get('Prepare Review Request').parameters.jsCode.replace('CONFIG_VALIDATION','('+configValidation.toString()+')()');
    gate('Is Review Phase Active?',"Boolean(($json.data ?? $json).phase)");
    loop('Process Review Recipients');
    gate('Has Valid Reviewer Email?',"$('Compose Review Notices').item.json.recipientEmailReady");
    gate('Has Review Telegram Route?',"$('Compose Review Notices').item.json.telegramReady");
    code('Collect Review Receipt',callbackReceipt,true).parameters.jsCode=helpers+'\nreturn ('+callbackReceipt.toString().replace('SUMMARY_NODE',"'Summarize Review Delivery'")+')();';
    code('Build Review Run Summary',reviewRunSummary);
    const summaryTelegram=structuredClone(get('Send Review Telegram'));summaryTelegram.id='tv4-review-summary-telegram';summaryTelegram.name='Send Review Run Summary';summaryTelegram.parameters.chatId='={{ $json.telegramChatId }}';summaryTelegram.parameters.text='={{ $json.telegramText }}';add(summaryTelegram);
    if (!get('Compose Review Notices').parameters.jsCode.includes('// TV4_UPGRADE_COMPOSE_V2')) {
    let compose=get('Compose Review Notices').parameters.jsCode;
    compose=helpers+'\n'+compose.replace("if (!recipientEmail) throw new Error('Người quản lý chưa có email nhận thông báo');",'')
      .replace('...item, recipientEmail,','...item, recipientEmail, recipientEmailReady: emailValid(recipientEmail), telegramReady: chatValid(item.telegramChatId),');
    get('Compose Review Notices').parameters.jsCode=compose.replace(helpers, helpers+'\n// TV4_UPGRADE_COMPOSE_V2');
    }
    editCode('Summarize Review Delivery',reviewSummary,true);finishCallback('Record Review Delivery');
    gate('Has Review Summary Route?', '$json.telegramReady');
    get('Fetch Review Recipients').parameters.sendQuery = false;
    delete get('Fetch Review Recipients').parameters.queryParameters;
    chain('Daily Review Schedule','Load Workflow Configuration','Prepare Review Request','Fetch Review Recipients','Is Review Phase Active?');
    edge('Is Review Phase Active?','Split Review Recipients',0);
    chain('Split Review Recipients','Has Review Recipients?');
    edge('Has Review Recipients?','Process Review Recipients',0);edge('Has Review Recipients?','Build Review Run Summary',1);
    edge('Process Review Recipients','Compose Review Notices',1);edge('Process Review Recipients','Build Review Run Summary',0);
    edge('Compose Review Notices','Has Valid Reviewer Email?');edge('Has Valid Reviewer Email?','Send Review Email',0);edge('Has Valid Reviewer Email?','Has Review Telegram Route?',1);edge('Send Review Email','Has Review Telegram Route?');
    edge('Has Review Telegram Route?','Send Review Telegram',0);edge('Has Review Telegram Route?','Summarize Review Delivery',1);edge('Send Review Telegram','Summarize Review Delivery');
    chain('Summarize Review Delivery','Record Review Delivery','Collect Review Receipt','Process Review Recipients');chain('Build Review Run Summary','Has Review Summary Route?');edge('Has Review Summary Route?','Send Review Run Summary',0);
  } else {
    w.name='[TV4] WF-04: Offboarding Coordination & Delivery Recovery';
    editCode('Authenticate Offboarding Request',offboardingAuthentication);get('Authenticate Offboarding Request').parameters.jsCode=get('Authenticate Offboarding Request').parameters.jsCode.replace('CONFIG_VALIDATION','('+configValidation.toString()+')()');
    const fetch=get('Fetch Approved Offboarding Case');fetch.onError='continueRegularOutput';
    gate('Is Approved Case Valid?',"!$json.error && Number(($json.data ?? $json).caseId) === $('Authenticate Offboarding Request').first().json.caseId && Boolean(($json.data ?? $json).employee?.fullName) && /^\\d{4}-\\d{2}-\\d{2}$/.test(($json.data ?? $json).lastWorkingDate || '') && !Number.isNaN(Date.parse(($json.data ?? $json).lastWorkingDate)) && ['APPROVED','IN_PROGRESS','PARTIAL','FAILED'].includes(($json.data ?? $json).status)");
    add({id:'tv4-offboarding-invalid-response',name:'Respond to Invalid Case',type:'n8n-nodes-base.respondToWebhook',typeVersion:1.4,position:[0,0],parameters:{respondWith:'json',responseBody:'={{ JSON.stringify({success:false,errorCode:"INVALID_OFFBOARDING_CASE",message:"Không thể điều phối hồ sơ. Kiểm tra mã hồ sơ, trạng thái duyệt và kết nối backend."}) }}',options:{responseCode:409}}});
    if (!get('Compose Offboarding Notices').parameters.jsCode.includes('// TV4_UPGRADE_COMPOSE_V2')) {
    let compose=get('Compose Offboarding Notices').parameters.jsCode;
    compose=helpers+'\n'+compose.replace("if (!employeeRecipient || !itRecipient || !accountingRecipient) throw new Error('Thiếu email nhận thông báo thôi việc');",'')
      .replace('...config, ...record, employeeRecipient,', '...config, ...record, employeeEmailReady: emailValid(employeeRecipient), itEmailReady: emailValid(itRecipient), financeEmailReady: emailValid(accountingRecipient), telegramReady: chatValid(config.telegramChatId), sendIt: record.alreadyNotified?.it !== true && emailValid(itRecipient), sendFinance: record.alreadyNotified?.finance !== true && emailValid(accountingRecipient), sendEmployee: record.alreadyNotified?.employee !== true && emailValid(employeeRecipient), sendTelegram: record.alreadyNotified?.telegram !== true && chatValid(config.telegramChatId), employeeRecipient,');
    compose=compose.replace('record.approvedBy.fullName', "record.approvedBy?.fullName || 'Bộ phận Nhân sự'");
    compose=compose.replace('const surveyUrl = record.exitSurveyUrl || config.exitSurveyUrl;', 'const surveyUrl = httpUrl(record.exitSurveyUrl || config.exitSurveyUrl);')
      .replace('<p><a href="${esc(surveyUrl)}">Mở khảo sát thôi việc</a></p>', '${surveyUrl && !/THAY_BANG|YOUR_|example\\.invalid/i.test(surveyUrl) ? `<p><a href="${esc(surveyUrl)}">Mở khảo sát thôi việc</a></p>` : \'<p>Vui lòng liên hệ bộ phận Nhân sự để nhận đường dẫn khảo sát.</p>\'}');
    get('Compose Offboarding Notices').parameters.jsCode=compose.replace(helpers, helpers+'\n// TV4_UPGRADE_COMPOSE_V2');
    }
    for(const [name,flag] of [['Should Notify IT?','sendIt'],['Should Notify Finance?','sendFinance'],['Should Notify Employee?','sendEmployee'],['Should Notify Offboarding Telegram?','sendTelegram']])gate(name,"$('Compose Offboarding Notices').item.json."+flag);
    editCode('Summarize Offboarding Delivery',offboardingSummary); finishCallback('Record Offboarding Delivery');
    // Keep 18 nodes: the existing response node validates callback acknowledgement directly.
    get('Respond to Offboarding Request').parameters.responseBody='={{ JSON.stringify((() => { const response=$json; const payload=response.data ?? response; const source=$("Summarize Offboarding Delivery").item.json; const recorded=!response.error && payload.recorded===true; return {success:recorded && source.status!=="FAILED",caseId:source.caseId,status:source.status,callbackRecorded:recorded,errorCode:recorded?null:"CALLBACK_FAILED",notifications:{it:source.itNotified,accounting:source.financeNotified,employee:source.employeeNotified,telegram:source.telegramNotified}}; })()) }}';
    get('Respond to Offboarding Request').parameters.options={responseCode:'={{ $json.error || ($json.data ?? $json).recorded !== true ? 502 : 200 }}'};
    chain('Offboarding Approval Webhook','Load Offboarding Configuration','Authenticate Offboarding Request','Fetch Approved Offboarding Case','Is Approved Case Valid?');
    edge('Is Approved Case Valid?','Compose Offboarding Notices',0);edge('Is Approved Case Valid?','Respond to Invalid Case',1);edge('Compose Offboarding Notices','Should Notify IT?');
    const gates=['Should Notify IT?','Should Notify Finance?','Should Notify Employee?','Should Notify Offboarding Telegram?'];
    const send=['Send IT Handover Notice','Send Finance Handover Notice','Send Employee Farewell','Send Offboarding Telegram'];
    gates.forEach((name,i)=>{const next=gates[i+1]||'Summarize Offboarding Delivery';edge(name,send[i],0);edge(name,next,1);edge(send[i],next);});
    chain('Summarize Offboarding Delivery','Record Offboarding Delivery','Respond to Offboarding Request');
  }
  w.connections=map;
  // Ordered lanes keep validation, per-recipient handling and recovery readable.
  const positions = {};
  const row=(names,y=0,start=0)=>names.forEach((name,index)=>positions[name]=[start+index*300,y]);
  if(file.startsWith('04')) {
    row(['Offboarding Approval Webhook','Load Offboarding Configuration','Authenticate Offboarding Request','Fetch Approved Offboarding Case','Is Approved Case Valid?','Compose Offboarding Notices','Should Notify IT?','Should Notify Finance?','Should Notify Employee?','Should Notify Offboarding Telegram?','Summarize Offboarding Delivery','Record Offboarding Delivery','Respond to Offboarding Request']);
    positions['Respond to Invalid Case']=[1200,320];
    ['Send IT Handover Notice','Send Finance Handover Notice','Send Employee Farewell','Send Offboarding Telegram'].forEach((name,index)=>positions[name]=[1800+index*300,320]);
  } else if(file.startsWith('02')) {
    row(['Daily Training Schedule','Load Workflow Configuration','Validate Training Configuration','Fetch Training Reminders','Split Training Assignments','Has Training Reminders?','Process Training Assignments','Classify Training Alert','Compose Training Notices','Has Valid Employee Email?','Should Notify Manager?','Has Training Telegram Route?','Summarize Training Delivery','Record Training Delivery','Collect Training Receipt']);
    positions['Send Employee Reminder']=[2700,320];positions['Send Manager Reminder']=[3000,320];positions['Send Training Telegram']=[3300,320];
  } else {
    row(['Load Workflow Configuration','Prepare Review Request','Fetch Review Recipients','Is Review Phase Active?','Split Review Recipients','Has Review Recipients?','Process Review Recipients','Compose Review Notices','Has Valid Reviewer Email?','Has Review Telegram Route?','Summarize Review Delivery','Record Review Delivery','Collect Review Receipt'],0,300);
    positions['Daily Review Schedule']=[0,0];
    positions['Send Review Email']=[2700,320];positions['Send Review Telegram']=[3000,320];
    row(['Build Review Run Summary','Has Review Summary Route?','Send Review Run Summary'],-400,2100);
  }
  w.nodes.forEach(node=>{delete node.notes;delete node.notesInFlow;node.position=positions[node.name]||node.position;});
  for (const name of ['Has Training Reminders?', 'Has Review Recipients?']) if (nodes.has(name)) { nodes.get(name).notesInFlow=true; nodes.get(name).notes='The true branch processes pending recipients. The false branch completes normally when there is nothing to send.'; }
  fs.mkdirSync(outputDir,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(outputDir,file),JSON.stringify(w,null,2)+'\n', { mode: sourceDir === defaultSource ? 0o644 : 0o600 });
  if (sourceDir !== defaultSource) fs.chmodSync(path.join(outputDir,file),0o600);
  console.log(file+': '+w.nodes.length+' nodes; '+w.name);
}
module.exports = { mappings };
if (require.main === module) for(const file of files)build(file);
