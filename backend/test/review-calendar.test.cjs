require('reflect-metadata');
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const build = process.env.TV4_TEST_DIST || path.resolve(__dirname, '../dist');
const { defaultReviewCalendar, validateReviewCalendar, reviewPhaseOnDate, vietnamDate } = require(path.join(build,'modules/training/review-calendar'));
const { ReviewCalendarService } = require(path.join(build,'modules/training/review-calendar.service'));
const { PerformanceReviewService } = require(path.join(build,'modules/training/performance-review.service'));
const { PerformanceReviewController } = require(path.join(build,'modules/training/performance-review.controller'));
const { ROLES_KEY } = require(path.join(build,'common/decorators/roles.decorator'));

test('Calendar validates real dates, period bounds, ordering and leap years', () => {
  assert.equal(defaultReviewCalendar('2028-02').deadline,'2028-02-29');
  const valid={openingDate:'2026-11-06',reminderDate:'2026-11-10',deadline:'2026-11-30'};
  assert.equal(validateReviewCalendar('2026-11',valid).openingDate,valid.openingDate);
  for(const value of [{...valid,openingDate:'2026-11-31'},{...valid,reminderDate:'2026-12-01'},{...valid,openingDate:valid.reminderDate},{...valid,deadline:'2026-11-09'}])assert.throws(()=>validateReviewCalendar('2026-11',value));
  for(const period of ['2026-13','invalid','1999-01','2101-01'])assert.throws(()=>defaultReviewCalendar(period));
  assert.equal(vietnamDate(new Date('2026-11-05T18:00:00Z')),'2026-11-06');
  assert.equal(reviewPhaseOnDate({...valid,reviewPeriod:'2026-11'},'2026-11-06'),'OPENING');
  assert.equal(reviewPhaseOnDate({...valid,reviewPeriod:'2026-11'},'2026-11-10'),'SECOND_REMINDER');
  assert.equal(reviewPhaseOnDate({...valid,reviewPeriod:'2026-11'},'2026-11-25'),null);
});
test('HR and Super Admin can read calendars; only Super Admin can write',()=>{
 assert.deepEqual(Reflect.getMetadata(ROLES_KEY,PerformanceReviewController.prototype.getCalendar),['HR','SUPERADMIN']);
 assert.deepEqual(Reflect.getMetadata(ROLES_KEY,PerformanceReviewController.prototype.updateCalendar),['SUPERADMIN']);
});
test('Reading defaults is side-effect free; save persists and detects stale versions',async()=>{
 let row=null,writes=0;
 const repo={findOne:async()=>row,insert:async v=>{if(row)throw Object.assign(Error('duplicate'),{code:'ER_DUP_ENTRY'});row={...v};writes++;},update:async(where,v)=>{if(row?.version!==where.version)return {affected:0};row={...row,...v};writes++;return {affected:1};}};
 const service=new ReviewCalendarService(repo);
 assert.equal((await service.get('2026-11')).configured,false);assert.equal(writes,0);
 const body={openingDate:'2026-11-06',reminderDate:'2026-11-10',deadline:'2026-11-30',version:0};
 assert.equal((await service.update('2026-11',body,7)).version,1);
 assert.equal((await new ReviewCalendarService(repo).get('2026-11')).openingDate,'2026-11-06');
 await assert.rejects(()=>service.update('2026-11',body,7),/phiên khác/);
 await assert.rejects(()=>service.update('2026-11',{...body,version:'1'},7),/Phiên bản/);
 assert.equal((await service.update('2026-11',{...body,openingDate:'2026-11-07',version:1},7)).version,2);
 assert.equal(writes,2);
});
test('Pending reminders follow stored dates and deadline while preserving submission filtering and dedupe',async()=>{
 const staff=[{id:4,fullName:'QA Employee',email:'employee@example.invalid',role:'EMPLOYEE',isActive:true,manager:{id:3,fullName:'QA Manager',email:'manager@example.invalid'},department:{name:'QA'}}];
 let submitted=[],receipts=[];
 const reviews={find:async()=>submitted};const reminders={find:async()=>receipts};
 const users={find:async q=>q.where.role==='EMPLOYEE'?staff:[]};
 const calendar={get:async()=>({reviewPeriod:'2026-11',openingDate:'2026-11-06',reminderDate:'2026-11-10',deadline:'2026-11-20'})};
 const service=new PerformanceReviewService(reviews,reminders,users,calendar);
 const opening=await service.getPendingReviewReminders('2026-11-06T01:00:00Z');
 assert.equal(opening.phase,'OPENING');assert.equal(opening.deadline,'2026-11-20');assert.equal(opening.count,1);
 assert.equal((await service.getPendingReviewReminders('2026-11-10T01:00:00Z')).phase,'SECOND_REMINDER');
 assert.equal((await service.getPendingReviewReminders('2026-11-25T01:00:00Z')).count,0);
 receipts=[{recipientId:3,status:'SENT'}];assert.equal((await service.getPendingReviewReminders('2026-11-06T01:00:00Z')).count,0);
 receipts=[];submitted=[{userId:4}];assert.equal((await service.getPendingReviewReminders('2026-11-06T01:00:00Z')).count,0);
});
