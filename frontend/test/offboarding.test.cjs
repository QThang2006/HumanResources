const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const filename=path.join(root,'src',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const original=m.require.bind(m);
 m.require=name=>name.endsWith('.css')?{}:Object.hasOwn(mocks,name)?mocks[name]:original(name);
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);return m.exports;
}
const helpers=load('components/offboarding.ts');
const valid={userId:4,lastWorkingDate:'2026-11-15',personalEmail:'person@example.invalid'};
test('dates, Vietnam midnight, personal email and survey validation',()=>{
 assert.equal(helpers.vietnamToday(new Date('2026-11-06T17:01:00Z')),'2026-11-07');
 assert.equal(helpers.validateOffboarding(valid,'2026-11-07'),'');
 for(const lastWorkingDate of ['2026-11-06','2026-02-30','2026-13-01',''])assert.ok(helpers.validateOffboarding({...valid,lastWorkingDate},'2026-11-07'));
 for(const personalEmail of ['', 'a@b', 'a@example.invalid,b@example.invalid'])assert.ok(helpers.validateOffboarding({...valid,personalEmail},'2026-11-07'));
 for(const exitSurveyUrl of ['javascript:alert(1)','https://user:password@example.invalid','x'.repeat(1001)])assert.ok(helpers.validateOffboarding({...valid,exitSurveyUrl},'2026-11-07'));
});
const employee={id:4,fullName:'Employee QA',email:'work@example.invalid',role:'EMPLOYEE',isActive:true,departmentName:'QA'};
const record={approvedAt:'2026-11-07T01:00:00Z',updatedAt:'2026-11-07T01:05:00Z',id:1,employee,approvedBy:{id:1,fullName:'Admin QA'},lastWorkingDate:'2026-11-15',status:'PARTIAL',delivery:{itNotified:true,financeNotified:true,employeeNotified:true,telegramNotified:false},personalEmail:'personal@example.invalid',reason:'QA',assetNotes:'Laptop',exitSurveyUrl:null};
const {OffboardingDetailsDrawer}=load('components/OffboardingDetailsDrawer.tsx',{'react-dom':{createPortal:node=>node},'./offboarding':helpers});
function render(role,overrides={}){
 const states=[[record],[employee],false,'','','ALL',false,'',{},false,false,'',[],false,1,null,null];let index=0;
 const api=new Proxy({}, {get(){return()=>{throw Error('No requests during render')}}});
 const {OffboardingPanel}=load('components/OffboardingPanel.tsx',{
 react:{...React,useState:initial=>React.useState(Object.hasOwn(overrides,index)?overrides[index++]:states[index++]??initial)},
 '../context/AuthContext':{useAuth:()=>({user:{role}})},'../api/offboarding.api':{offboardingApi:api},'../api/users.api':{usersApi:api},
 './TrainingToast':{TrainingToast:()=>null},'./offboarding':helpers,'./OffboardingDetailsDrawer':{OffboardingDetailsDrawer:()=>null},'./use-offboarding-tracking':{useOffboardingTracking:()=> 'idle'},
 });return renderToStaticMarkup(React.createElement(OffboardingPanel));
}
test('HR/Admin see real statuses; other roles have no panel; table opens case details',()=>{
 for(const role of ['HR','SUPERADMIN']){const html=render(role);assert.doesNotMatch(html,/Điều phối thông báo|3\/4 kênh/);assert.match(html,/Xem hồ sơ/);assert.doesNotMatch(html,/n8n|demo|mô phỏng/i);}
 for(const role of ['EMPLOYEE','MANAGER'])assert.equal(render(role),'');
});
test('wizard separates choosing, editing and reviewing, preserving private per-person input',()=>{
 const base={0:[],6:true,8:{4:{...valid,reason:'Private QA note'}}};
 const pick=render('SUPERADMIN',{...base,17:1});assert.match(pick,/Tiếp tục/);assert.doesNotMatch(pick,/<input[^>]+type="email"/);assert.doesNotMatch(pick,/Duyệt và gửi thông báo/);
 const edit=render('SUPERADMIN',{...base,17:2});assert.match(edit,/<input[^>]+type="email"/);assert.match(edit,/Private QA note/);assert.doesNotMatch(edit,/Duyệt và gửi thông báo/);
 const review=render('SUPERADMIN',{...base,9:true,17:3});assert.match(review,/Private QA note/);assert.match(review,/Duyệt và gửi thông báo/);assert.doesNotMatch(review,/n8n|demo|mô phỏng/i);
 assert.match(render('SUPERADMIN',{6:true}),/Nhân viên đã có hồ sơ chưa hủy/);
});
test('drawer shows persisted facts and prevents retry on completed or running cases',()=>{
 const previous=global.document;global.document={body:{}};
 try {for(const status of ['PARTIAL','COMPLETED','IN_PROGRESS']){
  const html=renderToStaticMarkup(React.createElement(OffboardingDetailsDrawer,{record:{...record,status},busy:false,confirmingRetry:false,onClose:()=>{},onRequestRetry:()=>{},onCancelRetry:()=>{},onConfirmRetry:()=>{}}));
  assert.match(html,/Email nhận thông báo/);assert.match(html,/Chưa có xác nhận/);assert.match(html,/không thay thế xác nhận bàn giao/);
  assert.equal(html.includes('Yêu cầu xử lý lại'),status==='PARTIAL');assert.doesNotMatch(html,/n8n|demo|mô phỏng/i);
 }} finally {global.document=previous;}
});
const source=fs.readFileSync(path.join(root,'src/components/OffboardingPanel.tsx'),'utf8');
function handler(name,context){let initializer;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText()===name)initializer=n.initializer.getText();ts.forEachChild(n,visit)}visit(ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX));assert.ok(initializer);return vm.runInNewContext('(function(){'+ts.transpileModule('const run = '+initializer,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nreturn run;})()',context);}
test('batch preserves mixed outcomes, never automatically repeats an uncertain POST, and requires confirmation',async()=>{
 const selected=[{...valid,lastWorkingDate:helpers.vietnamToday()},{...valid,userId:5,lastWorkingDate:helpers.vietnamToday()}],requests=[],state={};let reloads=0;
 const context={lock:{current:false},alive:{current:true},confirming:true,loadError:'',selected,employees:[employee,{...employee,id:5}],validateOffboarding:helpers.validateOffboarding,vietnamToday:helpers.vietnamToday,errorText:e=>e.message,
 setBusy:v=>state.busy=v,setOutcomes:v=>state.outcomes=v,setConfirming:()=>{},setFormError:()=>{},setToast:v=>state.toast=v,closeForm:()=>{},reload:async()=>{reloads++},
 offboardingApi:{approve:async input=>{requests.push(input);if(input.userId===5)throw Error('Timeout');return{automationQueued:true,offboarding:{id:9}}}}};
 await handler('approve',context)();assert.deepEqual(requests.map(r=>r.userId),[4,5]);assert.equal(reloads,1);assert.equal(state.busy,false);assert.equal(state.toast.success,false);assert.match(state.outcomes[1],/kiểm tra danh sách trước khi tạo lại/);
 context.lock.current=true;await handler('approve',context)();assert.equal(requests.length,2);
 context.lock.current=false;context.confirming=false;await handler('approve',context)();assert.equal(requests.length,2);
});
test('retry targets existing case and refreshes without claiming successful delivery',async()=>{
 const ids=[];let refreshes=0,toast;
 await handler('retry',{lock:{current:false},alive:{current:true},retryId:9,setBusy:()=>{},setRetryId:()=>{},setToast:v=>toast=v,reload:async()=>{refreshes++},errorText:e=>e.message,offboardingApi:{retry:async id=>{ids.push(id);return{automationQueued:false,message:'Chưa chuyển được'}}}})();
 assert.deepEqual(ids,[9]);assert.equal(refreshes,1);assert.equal(toast.success,false);
});
test('API uses existing routes and unchanged single-person payload',async()=>{
 const requests=[];const {offboardingApi}=load('api/offboarding.api.ts',{'./client':{apiClient:{get:async(...args)=>requests.push(['GET',...args]),post:async(...args)=>requests.push(['POST',...args])}}});
 await offboardingApi.list();await offboardingApi.approve(valid);await offboardingApi.retry(19);
 assert.deepEqual(requests.map(r=>r.slice(0,2)),[['GET','/offboarding'],['POST','/offboarding'],['POST','/offboarding/19/retry']]);assert.equal(requests[1][2],valid);
});

test('wizard navigation does not submit an approval before final confirmation',()=>{
 const state={},context={lock:{current:false},step:1,selected:[valid],eligible:[employee],employees:[employee],setFormError:v=>state.error=v,setStep:v=>state.step=v,setConfirming:v=>state.confirm=v,validateOffboarding:()=>'',vietnamToday:()=> '2026-11-07'};
 handler('requestApproval',context)({preventDefault(){}});assert.equal(state.step,2);assert.equal(state.confirm,undefined);
 context.step=2;handler('requestApproval',context)({preventDefault(){}});assert.equal(state.step,3);assert.equal(state.confirm,true);
 context.eligible=[];state.confirm=false;handler('requestApproval',context)({preventDefault(){}});assert.equal(state.confirm,false);assert.match(state.error,/Danh sách nhân viên đã thay đổi/);
});
test('tracking only reads, pauses in hidden tabs, stops after two minutes and aborts on cleanup',async()=>{
 const filename=path.join(root,'src/components/use-offboarding-tracking.ts');
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 function start(active=true){
  let now=0,calls=0,updates=0,signal;const effects=[],states=[],timers=new Map();let next=0;
  const context={exports:{},Date:{now:()=>now},AbortController,document:{visibilityState:'visible'},setTimeout:fn=>{timers.set(++next,fn);return next},clearTimeout:id=>timers.delete(id),require:name=>name==='react'?{useRef:value=>({current:value}),useState:()=>['idle',value=>states.push(value)],useEffect:fn=>effects.push(fn)}:{offboardingApi:{list:async value=>{calls++;signal=value;return[record]}}}};
  vm.runInNewContext(compiled,context);context.exports.useOffboardingTracking(active,'1',0,()=>updates++);const cleanup=effects.map(effect=>effect());
  return{context,states,timers,get calls(){return calls},get updates(){return updates},get signal(){return signal},advance(value){now=value},async tick(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();await Promise.resolve();await Promise.resolve()},stop(){cleanup.forEach(fn=>fn?.())}};
 }
 const tracker=start();assert.equal(tracker.calls,0);await tracker.tick();assert.equal(tracker.calls,1);assert.equal(tracker.updates,1);
 tracker.context.document.visibilityState='hidden';await tracker.tick();assert.equal(tracker.calls,1);
 tracker.advance(120000);await tracker.tick();assert.equal(tracker.states.at(-1),'waiting');assert.equal(tracker.timers.size,0);tracker.stop();assert.equal(tracker.signal.aborted,true);
 const inactive=start(false);assert.equal(inactive.timers.size,0);inactive.stop();
});

test('new cases default to the account email without changing existing case recipients',()=>{
 const draft=helpers.createOffboardingDraft({id:23,email:' account@example.invalid '});
 assert.equal(draft.userId,23);assert.equal(draft.personalEmail,'account@example.invalid');assert.equal(draft.lastWorkingDate,helpers.vietnamToday());
 assert.ok(helpers.validateOffboarding({...draft,reason:'Lý do \uFFFD'},helpers.vietnamToday()));
 assert.equal(helpers.validateOffboarding({...draft,reason:'Nguyện vọng cá nhân',assetNotes:'Bàn giao thiết bị'},helpers.vietnamToday()),'');
 assert.equal(record.personalEmail,'personal@example.invalid');
});
