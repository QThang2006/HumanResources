require('reflect-metadata');
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const build=process.env.TV4_TEST_DIST||path.resolve(__dirname,'../dist');
const {TrainingService}=require(path.join(build,'modules/training/training.service'));
const {PerformanceReviewService}=require(path.join(build,'modules/training/performance-review.service'));
const {ParseBoolPipe}=require('@nestjs/common');
test('manual repeats bypass only training cooldown and retain eligibility and saved receipts',async()=>{
 const row={id:9,status:'IN_PROGRESS',progressPercent:25,dueAt:new Date('2026-11-08T00:00:00Z'),lastReminderAt:new Date('2026-11-07T00:00:00Z'),reminderCount:4,lastReminderRunId:'previous',user:{id:4,fullName:'QA',email:'qa@example.invalid',isActive:true},course:{id:3,title:'QA',type:'MANDATORY'}};
 const service=new TrainingService({}, {find:async()=>[row]}, {find:async()=>[]}, {});
 const asOf='2026-11-07T08:00:00+07:00';
 assert.equal((await service.getPendingTrainingReminders(asOf)).count,0);
 for(let i=0;i<2;i++)assert.equal((await service.getPendingTrainingReminders(asOf,true)).count,1);
 assert.equal(row.reminderCount,4);assert.equal(row.lastReminderRunId,'previous');
 row.progressPercent=50;assert.equal((await service.getPendingTrainingReminders(asOf,true)).count,0);
});
test('manual KPI repeat includes SENT recipients but still excludes submitted reviews and dates outside calendar',async()=>{
 let submitted=[];const receipts=[{recipientId:3,status:'SENT'}];
 const employee={id:4,fullName:'QA',email:'qa@example.invalid',manager:{id:3,fullName:'Manager',email:'manager@example.invalid'},department:{name:'QA'}};
 const service=new PerformanceReviewService({find:async()=>submitted},{find:async()=>receipts},{find:async q=>q.where.role==='EMPLOYEE'?[employee]:[]},{get:async()=>({reviewPeriod:'2026-11',openingDate:'2026-11-07',reminderDate:'2026-11-20',deadline:'2026-11-30'})});
 const asOf='2026-11-07T08:00:00+07:00';
 assert.equal((await service.getPendingReviewReminders(asOf)).count,0);
 for(let i=0;i<2;i++)assert.equal((await service.getPendingReviewReminders(asOf,undefined,true)).count,1);
 assert.equal((await service.getPendingReviewReminders('2026-11-08T08:00:00+07:00',undefined,true)).phase,null);
 submitted=[{userId:4}];assert.equal((await service.getPendingReviewReminders(asOf,undefined,true)).count,0);assert.equal(receipts[0].status,'SENT');
});
const root=path.resolve(__dirname,'../..');
for(const [file,node]of [['02_mandatory_training_reminder.json','Validate Training Configuration'],['03_monthly_performance_review_reminder.json','Prepare Review Request']]){
 test(`${file}: only manual mode uses selected date or repeat; automatic ignores stale manual date`,()=>{
  const workflow=JSON.parse(fs.readFileSync(path.join(root,'workflows/tv4_admin_training',file)));
  const code=workflow.nodes.find(n=>n.name===node).parameters.jsCode;
  const run=(mode,date)=>JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+code+'})()',{ $json:{apiBaseUrl:'http://localhost:3001/api',automationSecret:'fixture',senderEmail:'sender@example.invalid',reviewFormUrl:'https://hr.example.invalid/',manualRunDate:date},$execution:{mode,id:'new-run-1'}})))[0].json;
  assert.equal(run('test','2026-11-07').asOf,'2026-11-07T08:00:00+07:00');assert.equal(run('test','').allowRepeat,true);
  for(const mode of ['production','manual','trigger','webhook','retry']){assert.equal(run(mode,'broken-date').asOf,'');assert.equal(run(mode,'broken-date').allowRepeat,false);}
  assert.throws(()=>run('test','2026-02-30'),/Ngày chạy thủ công/);
  const fetch=workflow.nodes.find(n=>n.name=== (file.startsWith('02')?'Fetch Training Reminders':'Fetch Review Recipients'));
  assert.equal(fetch.parameters.sendQuery,true);assert.deepEqual(fetch.parameters.queryParameters.parameters.map(p=>p.name),['asOf','repeat']);
 });
}
test('repeat query accepts explicit booleans and rejects other values',async()=>{
 const pipe=new ParseBoolPipe({optional:true}),metadata={type:'query'};
 assert.equal(await pipe.transform(undefined,metadata),undefined);assert.equal(await pipe.transform('true',metadata),true);assert.equal(await pipe.transform('false',metadata),false);
 await assert.rejects(()=>pipe.transform('yes',metadata));
});
test('real HTTP with application ValidationPipe validates repeat before service calls',async t=>{
 const {Test}=require('@nestjs/testing');const {ValidationPipe}=require('@nestjs/common');
 const {TrainingAutomationController}=require(path.join(build,'modules/training/training-automation.controller'));
 const {AutomationSecretGuard}=require(path.join(build,'common/guards/automation-secret.guard'));
 const calls=[];
 const module=await Test.createTestingModule({controllers:[TrainingAutomationController],providers:[
 {provide:TrainingService,useValue:{getPendingTrainingReminders:(...args)=>{calls.push(args);return{count:0}}}},
 {provide:PerformanceReviewService,useValue:{getPendingReviewReminders:(...args)=>{calls.push(args);return{count:0}}}},
 ]}).overrideGuard(AutomationSecretGuard).useValue({canActivate:()=>true}).compile();
 const app=module.createNestApplication({logger:false});t.after(()=>app.close());
 app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true,transformOptions:{enableImplicitConversion:true}}));
 await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/training/automation';
 for(const route of ['pending-reminders','review-reminders']){
  for(const [query,expected]of [['',false],['?repeat=false',false],['?repeat=true',true]]){
   const response=await fetch(base+'/'+route+query);assert.equal(response.status,200);assert.equal(calls.at(-1).at(-1),expected);
  }
  const before=calls.length;assert.equal((await fetch(base+'/'+route+'?repeat=invalid')).status,400);assert.equal(calls.length,before);
 }
});
