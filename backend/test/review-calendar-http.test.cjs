require('reflect-metadata');
const test=require('node:test'), assert=require('node:assert/strict'),path=require('node:path');
const {randomBytes}=require('node:crypto'), mysql=require('mysql2/promise'),bcrypt=require('bcrypt');
const {Test}=require('@nestjs/testing'),{TypeOrmModule}=require('@nestjs/typeorm'),{ConfigModule}=require('@nestjs/config'),{DataSource}=require('typeorm');
const build=process.env.TV4_TEST_DIST||path.resolve(__dirname,'../dist');
const entities=require(path.join(build,'entities'));
const {InterviewDelivery}=require(path.join(build,'modules/applications/interview-delivery.entity'));
const {PerformanceReviewSchedule}=require(path.join(build,'modules/training/performance-review-schedule.entity'));
const {ReviewCalendarService}=require(path.join(build,'modules/training/review-calendar.service'));
const {PerformanceReviewService}=require(path.join(build,'modules/training/performance-review.service'));
const {PerformanceReviewController}=require(path.join(build,'modules/training/performance-review.controller'));
const {AuthModule}=require(path.join(build,'modules/auth/auth.module'));
const {TransformInterceptor}=require(path.join(build,'common/interceptors/transform.interceptor'));

test('TV4 review calendar with isolated MySQL and authenticated HTTP',{timeout:60000},async t=>{
 assert.ok(process.env.TV4_TEST_DB_PASSWORD,'Set TV4_TEST_DB_PASSWORD');
 const database='hr_tv4_calendar_test_'+randomBytes(8).toString('hex');
 const options={host:'127.0.0.1',port:Number(process.env.TV4_TEST_DB_PORT||3307),user:'root',password:process.env.TV4_TEST_DB_PASSWORD};
 const admin=await mysql.createConnection(options);let app;
 t.after(async()=>{if(app)await app.close();if(!/^hr_tv4_calendar_test_[a-f0-9]{16}$/.test(database))throw Error('Unsafe cleanup');await admin.query('DROP DATABASE IF EXISTS `'+database+'`');await admin.end();});
 await admin.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 const module=await Test.createTestingModule({imports:[ConfigModule.forRoot({isGlobal:true,ignoreEnvFile:true}),TypeOrmModule.forRoot({type:'mysql',host:options.host,port:options.port,username:options.user,password:options.password,database,entities:[...Object.values(entities).filter(v=>typeof v==='function'),InterviewDelivery,PerformanceReviewSchedule],synchronize:true,logging:false}),TypeOrmModule.forFeature([entities.User,entities.PerformanceReview,entities.PerformanceReviewReminder,PerformanceReviewSchedule]),AuthModule],controllers:[PerformanceReviewController],providers:[PerformanceReviewService,ReviewCalendarService]}).compile();
 app=module.createNestApplication({logger:false});app.setGlobalPrefix('api');app.useGlobalInterceptors(new TransformInterceptor());await app.listen(0,'127.0.0.1');
 const db=app.get(DataSource),users=db.getRepository(entities.User),department=await db.getRepository(entities.Department).save({name:'Calendar QA',code:'CAL_QA'});
 const password=randomBytes(18).toString('hex'),passwordHash=await bcrypt.hash(password,4),actors={},tokens={};
 for(const [name,role]of Object.entries({admin:'SUPERADMIN',hr:'HR',manager:'MANAGER',employee:'EMPLOYEE',pending:'EMPLOYEE',inactive:'EMPLOYEE'}))actors[name]=await users.save({fullName:'QA '+name,email:name+'@example.invalid',passwordHash,role,isActive:name!=='inactive',departmentId:department.id});
 await users.update({role:'EMPLOYEE'},{managerId:actors.manager.id});
 const base=await app.getUrl()+'/api';
 async function request(url,method='GET',body,actor='admin'){
  const response=await fetch(base+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(tokens[actor]?{Authorization:'Bearer '+tokens[actor]}:{})},body:body?JSON.stringify(body):undefined});
  const json=await response.json();return{status:response.status,data:json.data??json};
 }
 for(const name of ['admin','hr','manager','employee'])tokens[name]=(await request('/auth/login','POST',{email:actors[name].email,password},null)).data.accessToken;
 const endpoint='/performance-reviews/calendar/2030-04',dates={openingDate:'2030-04-03',reminderDate:'2030-04-08',deadline:'2030-04-20',version:0};
 await t.test('default GET is side-effect free and excludes inactive staff',async()=>{const r=await request(endpoint);assert.equal(r.status,200);assert.equal(r.data.calendar.openingDate,'2030-04-25');assert.equal(r.data.count,2);assert.equal(await db.getRepository(PerformanceReviewSchedule).count(),0);});
 await t.test('HR reads only; other roles cannot access calendar routes',async()=>{
  assert.equal((await request(endpoint,'GET',undefined,'hr')).status,200);assert.equal((await request(endpoint,'PUT',dates,'hr')).status,403);
  for(const actor of ['manager','employee',null]){const status=actor?403:401;assert.equal((await request(endpoint,'GET',undefined,actor)).status,status);assert.equal((await request(endpoint,'PUT',dates,actor)).status,status);}
 });
 await t.test('save persists and invalid calendars make no partial changes',async()=>{
  assert.equal((await request(endpoint,'PUT',dates)).data.version,1);
  for(const value of [{...dates,version:1,openingDate:'2030-04-31'},{...dates,version:1,reminderDate:'2030-05-01'},{...dates,version:1,deadline:'2030-04-01'}])assert.equal((await request(endpoint,'PUT',value)).status,400);
  assert.equal((await request(endpoint)).data.calendar.version,1);assert.equal((await request('/performance-reviews/calendar/2030-13')).status,400);
  assert.equal((await new ReviewCalendarService(db.getRepository(PerformanceReviewSchedule)).get('2030-04')).openingDate,dates.openingDate);
 });
 await t.test('concurrent saves reject stale versions',async()=>{const results=await Promise.all([request(endpoint,'PUT',{...dates,version:1}),request(endpoint,'PUT',{...dates,version:1})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);});
 await t.test('real review submission updates roster and reminder recipients',async()=>{
  assert.equal((await request('/performance-reviews','POST',{userId:actors.employee.id,reviewPeriod:'2030-04',kpiScore:85,ratingRank:'GOOD',managerComment:'QA'},'manager')).status,201);
  const board=(await request(endpoint)).data;assert.equal(board.submittedCount,1);assert.equal(board.employees.find(e=>e.id===actors.employee.id).submitted,true);
  const service=app.get(PerformanceReviewService),pending=await service.getPendingReviewReminders('2030-04-03T01:00:00Z');assert.equal(pending.phase,'OPENING');assert.equal(pending.deadline,'2030-04-20');assert.equal(pending.reminders.length,1);assert.deepEqual(pending.reminders[0].employees.map(e=>e.id),[actors.pending.id]);assert.equal((await service.getPendingReviewReminders('2030-04-25T01:00:00Z')).count,0);
 });
 await t.test('receipt appears on roster; changing dates preserves dedupe',async()=>{
  const service=app.get(PerformanceReviewService);await service.recordReviewReminderResult({reviewPeriod:'2030-04',recipientId:actors.manager.id,phase:'OPENING',runId:'calendar-qa-1',pendingEmployeeIds:[actors.pending.id],emailNotified:true,telegramNotified:true,status:'SENT'});
  assert.equal((await request(endpoint)).data.employees.find(e=>e.id===actors.pending.id).openingDelivery.status,'SENT');assert.equal((await request(endpoint,'PUT',{...dates,openingDate:'2030-04-04',version:2})).status,200);assert.equal((await service.getPendingReviewReminders('2030-04-04T01:00:00Z')).count,0);
 });
});
