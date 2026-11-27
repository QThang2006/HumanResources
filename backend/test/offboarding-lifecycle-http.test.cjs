require('reflect-metadata');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomBytes}=require('node:crypto'),bcrypt=require('bcrypt');
const {Test}=require('@nestjs/testing'),{ConfigModule,ConfigService}=require('@nestjs/config'),{TypeOrmModule}=require('@nestjs/typeorm'),{DataSource,Repository}=require('typeorm');
const entities=require('../dist/entities');
const {InterviewDelivery}=require('../dist/modules/applications/interview-delivery.entity');
const {PerformanceReviewSchedule}=require('../dist/modules/training/performance-review-schedule.entity');
const {AuthModule}=require('../dist/modules/auth/auth.module');
const {OffboardingController}=require('../dist/modules/offboarding/offboarding.controller');
const {OffboardingService}=require('../dist/modules/offboarding/offboarding.service');
const {N8nService}=require('../dist/modules/core/automation/n8n.service');

// Opt-in: localhost, application credentials, random prefixed tables, no outgoing notifications.
test('SCRUM-17: real MySQL, HTTP, JWT, rollback and concurrency',{skip:process.env.TV4_LOCAL_MYSQL_TEST!=='1',timeout:120000},async t=>{
 const env=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../.env')));
 assert.ok(['localhost','127.0.0.1'].includes(env.DB_HOST),'Only localhost is allowed.');
 assert.notEqual(env.DB_USERNAME,'root','Use the normal application account.');
 const prefix='tv4_scrum17_test_'+randomBytes(6).toString('hex')+'_',secret=randomBytes(32).toString('hex');
 let app,db,dispatched=0;
 t.after(async()=>{
  if(db?.isInitialized){const runner=db.createQueryRunner();await runner.connect();
   try{const tables=await runner.query('SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE()');
    const names=tables.map(row=>row.name).filter(name=>name.startsWith(prefix));
    assert.ok(names.every(name=>/^tv4_scrum17_test_[a-f0-9]{12}_[a-z0-9_]+$/.test(name)));
    await runner.query('SET FOREIGN_KEY_CHECKS=0');
    try{for(const name of names)await runner.query('DROP TABLE IF EXISTS `'+name+'`');}finally{await runner.query('SET FOREIGN_KEY_CHECKS=1');}
    console.log('CLEANUP: removed '+names.length+' isolated SCRUM-17 tables.');
   }finally{await runner.release();}}
  if(app)await app.close();
 });
 const module=await Test.createTestingModule({
  imports:[ConfigModule.forRoot({isGlobal:true,ignoreEnvFile:true}),TypeOrmModule.forRoot({type:'mysql',host:'127.0.0.1',port:Number(env.DB_PORT||3306),username:env.DB_USERNAME,password:env.DB_PASSWORD,database:env.DB_DATABASE,
   entities:[...Object.values(entities).filter(value=>typeof value==='function'),InterviewDelivery,PerformanceReviewSchedule],entityPrefix:prefix,synchronize:false,logging:false,timezone:'Z',extra:{connectionLimit:4}}),TypeOrmModule.forFeature([entities.User,entities.OffboardingCase]),AuthModule],
  controllers:[OffboardingController],providers:[OffboardingService,{provide:N8nService,useValue:{async triggerOffboardingApproved(){dispatched++;return true;}}}],
 }).overrideProvider(ConfigService).useValue({get:(key,fallback)=>key==='JWT_SECRET'?secret:fallback}).compile();
 app=module.createNestApplication({logger:false});db=app.get(DataSource);
 assert.ok(db.entityMetadatas.every(metadata=>metadata.tableName.startsWith(prefix)));
 await db.synchronize();app.setGlobalPrefix('api');await app.listen(0,'127.0.0.1');
 const base=await app.getUrl()+'/api',users=db.getRepository(entities.User),cases=db.getRepository(entities.OffboardingCase),departments=db.getRepository(entities.Department);
 const password=randomBytes(16).toString('hex'),passwordHash=await bcrypt.hash(password,4),actors={},tokens={};
 for(const[name,id,role,isActive]of[['admin',1,'SUPERADMIN',true],['hr',2,'HR',true],['manager',3,'MANAGER',true],['employee',4,'EMPLOYEE',true],['inactive',5,'EMPLOYEE',false],['hrTarget',6,'HR',true]])actors[name]=await users.save({id,email:name+'@example.invalid',fullName:'QA '+name,role,isActive,passwordHash});
 await departments.save([{name:'SCRUM17 Operations',code:'S17_OPS',managerId:3},{name:'SCRUM17 Support',code:'S17_SUPPORT',managerId:3}]);
 async function request(url,method='GET',body,actor='hr'){
  const response=await fetch(base+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(tokens[actor]?{Authorization:'Bearer '+tokens[actor]}:{})},body:body?JSON.stringify(body):undefined});
  return{status:response.status,data:await response.json()};
 }
 for(const actor of ['admin','hr','manager','employee','hrTarget']){const response=await request('/auth/login','POST',{email:actors[actor].email,password},null);assert.equal(response.status,201);tokens[actor]=response.data.accessToken;}
 const service=app.get(OffboardingService),today=service.vietnamDateKey(new Date()),input=(userId,lastWorkingDate='2099-12-31')=>({userId,lastWorkingDate,personalEmail:'person@example.invalid'});
 let managerCase,employeeCase;
 await t.test('HR/Admin permissions; Employee and Manager cannot operate; Manager/HR can be offboarding targets',async()=>{
  for(const actor of ['manager','employee',null]){const expected=actor?403:401;
   assert.equal((await request('/offboarding','GET',undefined,actor)).status,expected);
   assert.equal((await request('/offboarding','POST',input(4),actor)).status,expected);
   for(const action of ['cancel','finalize'])assert.equal((await request('/offboarding/1/'+action,'PATCH',undefined,actor)).status,expected);
  }
  for(const userId of [1,5])assert.ok([400,404].includes((await request('/offboarding','POST',input(userId))).status));
  const hrCase=await request('/offboarding','POST',input(6),'admin');assert.equal(hrCase.status,201);
  assert.equal((await request('/offboarding/'+hrCase.data.offboarding.id+'/cancel','PATCH',undefined,'admin')).status,200);
  assert.equal((await users.findOneBy({id:6})).isActive,true);
  const response=await request('/offboarding','POST',input(4));assert.equal(response.status,201);employeeCase=response.data.offboarding.id;
 });
 await t.test('concurrent approvals create exactly one case and queue one notification',async()=>{
  const before=dispatched,responses=await Promise.all([request('/offboarding','POST',input(3)),request('/offboarding','POST',input(3))]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);assert.equal(dispatched-before,1);
  const response=responses.find(r=>r.status===201);managerCase=response.data.offboarding.id;assert.equal(response.data.offboarding.managesDepartments.length,2);
 });
 await t.test('future closure is rejected; cancellation preserves account and department leadership',async()=>{
  assert.equal((await request('/offboarding/'+managerCase+'/finalize','PATCH')).status,400);
  assert.equal((await request('/offboarding/'+managerCase+'/cancel','PATCH')).status,200);
  assert.equal((await users.findOneBy({id:3})).isActive,true);assert.equal(await departments.countBy({managerId:3}),2);
  const response=await request('/offboarding','POST',input(3,today));assert.equal(response.status,201);managerCase=response.data.offboarding.id;
 });
 const delivery={runId:'scrum17-delivery',itNotified:true,financeNotified:true,employeeNotified:true,telegramNotified:true,status:'SENT'};
 await t.test('delivery keeps employment open; a forced failure rolls back all lifecycle writes',async()=>{
  const claimed=await service.getAutomationCase(managerCase);assert.equal(claimed.caseId,managerCase);assert.equal(claimed.employee.id,3);
  assert.equal((await service.recordAutomationResult(managerCase,delivery)).status,'IN_PROGRESS');
  const original=Repository.prototype.update;
  Repository.prototype.update=function(...args){if(this.target===entities.Department)throw Error('Intentional isolated rollback test');return original.apply(this,args);};
  try{assert.equal((await request('/offboarding/'+managerCase+'/finalize','PATCH')).status,500);}finally{Repository.prototype.update=original;}
  assert.equal((await users.findOneBy({id:3})).isActive,true);assert.equal(await departments.countBy({managerId:3}),2);
  assert.equal((await cases.findOneBy({id:managerCase})).finalizedAt,null);
 });
 await t.test('closure locks Manager, clears head positions, blocks old JWT and new login with 401',async()=>{
  assert.equal((await request('/auth/profile','GET',undefined,'manager')).status,200);
  assert.equal((await request('/offboarding/'+managerCase+'/finalize','PATCH')).status,200);
  assert.equal((await users.findOneBy({id:3})).isActive,false);assert.equal(await departments.countBy({managerId:3}),0);
  assert.equal((await cases.findOneBy({id:managerCase})).status,'COMPLETED');
  assert.equal((await request('/auth/profile','GET',undefined,'manager')).status,401);
  assert.equal((await request('/auth/login','POST',{email:actors.manager.email,password},null)).status,401);
  assert.equal((await service.recordAutomationResult(managerCase,{...delivery,runId:'late-callback'})).ignored,true);
 });
 await t.test('cancel versus finalize has one consistent winner; late callbacks cannot reopen the case',async()=>{
  await cases.update(employeeCase,{lastWorkingDate:today});
  const responses=await Promise.all(['cancel','finalize'].map(action=>request('/offboarding/'+employeeCase+'/'+action,'PATCH')));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);
  const row=await cases.findOneBy({id:employeeCase});assert.equal((await users.findOneBy({id:4})).isActive,row.status==='CANCELLED');
  assert.equal((await service.recordAutomationResult(employeeCase,delivery)).ignored,true);
  assert.equal((await cases.findOneBy({id:employeeCase})).status,row.status);
 });
 await t.test('automatic closure respects Vietnam midnight and legacy delivery-only COMPLETED rows',async()=>{
  const legacy=await cases.save({userId:6,approvedById:2,lastWorkingDate:'2030-04-20',status:'COMPLETED'});
  assert.equal((await service.findAll()).find(row=>row.id===legacy.id).status,'IN_PROGRESS');
  assert.equal((await service.finalizeOverdue(new Date('2030-04-20T16:59:59Z'))).completed,0);
  assert.equal((await service.finalizeOverdue(new Date('2030-04-20T17:00:00Z'))).completed,1);
  assert.equal((await users.findOneBy({id:6})).isActive,false);assert.ok((await cases.findOneBy({id:legacy.id})).finalizedAt);
 });
});
