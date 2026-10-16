const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { startHarness } = require('./recruitment-harness.cjs');
const root = path.resolve(__dirname, '../..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, 'workflows', f)));

test('TV2 workflows: valid graph, code and contract payloads', () => {
  const workflows = ['candidate-intake-omnichannel.json', 'interview-schedule-readback.json', 'offer-letter-48h.json', 'job-form-sync.json'].map(load);
  for (const w of workflows) {
    assert.ok(w.nodes.length >= 12); assert.equal(w.active, false);
    const names = new Set(w.nodes.map(n => n.name)); assert.equal(names.size, w.nodes.length);
    for (const [src, c] of Object.entries(w.connections)) {
      assert.ok(names.has(src)); assert.equal(Array.isArray(c), false);
      for (const group of c.main) for (const edge of group) assert.ok(names.has(edge.node));
    }
    for (const n of w.nodes) if (n.type.endsWith('.code')) new Function(n.parameters.jsCode);
    for (const n of w.nodes.filter(n=>n.type.endsWith('.webhook'))) assert.equal(n.webhookId,n.parameters.path);
    assert.doesNotMatch(JSON.stringify(w), /scoreResume|generateJobDescription|\/score["']|\/ai-generate/);
  }
  const run = (w, name, ctx) => vm.runInNewContext('(function(){'+w.nodes.find(n=>n.name===name).parameters.jsCode+'})()', { Buffer, $input: {item: {binary: ctx.$binary}}, ...ctx });
  const gmail = run(workflows[0], '02. Chuẩn hóa hồ sơ nhận qua Gmail', { $json: { id:'gmail-1',subject:'CV JOB-12',from:{value:[{address:'candidate@example.test',name:'Candidate'}]} }, $binary: { attachment_0:{mimeType:'application/pdf',fileName:'cv.pdf',data:'JVBERg=='} } });
  assert.equal(gmail.json.jobId,12); assert.equal(gmail.json.sourceId,'gmail-1'); assert.ok(gmail.binary.cv);
  const image = run(workflows[0], '02. Chuẩn hóa hồ sơ nhận qua Gmail', { $json: { id:'gmail-image', subject:'CV JOB-12', from:{value:[{address:'image@example.test',name:'Image Candidate'}]} }, $binary: { attachment_0:{mimeType:'image/png',fileName:'cv.png',data:'iVBORw0KGgo='} } });
  assert.equal(image.json.candidateEmail,'image@example.test'); assert.equal(image.binary.cv.fileName,'cv.png');
  assert.throws(()=>run(workflows[0],'02. Chuẩn hóa hồ sơ nhận qua Gmail',{$json:{subject:'hello'},$binary:{}}));
  const form=run(workflows[0], '04. Chuẩn hóa hồ sơ và mã vị trí từ Form', { $json:{sourceId:'row-1',cvFileId:'https://drive.google.com/file/d/abcdefghijklmnop/view',jobId:'12 – Backend Engineer (NestJS / TypeScript)',candidateName:'CV',candidateEmail:'candidate@example.test'} });
  assert.equal(form.json.fileId,'abcdefghijklmnop');
  assert.equal(form.json.jobId,12);
  const realForm = run(workflows[0], '04. Chuẩn hóa hồ sơ và mã vị trí từ Form', { $json: {
    'Dấu thời gian':'16/10/2026 20:00:00', 'Mã vị trí ứng tuyển':'JOB-0001 – Backend Engineer',
    'Họ và tên ứng viên':'Ứng viên thử', 'Địa chỉ email':'test@example.test', 'Số điện thoại':'0900000000',
    'Tải lên CV (PDF/PNG/JPG/WEBP)':'https://drive.google.com/open?id=abcdefghijklmnop'
  }});
  assert.equal(realForm.json.jobId,1); assert.equal(realForm.json.fileId,'abcdefghijklmnop');
  const syncEvent=run(workflows[3], '02. Chuẩn hóa sự kiện tuyển dụng', { $json:{body:{data:{action:'CREATED',job:{id:2,title:'Frontend'}}}} });
  assert.equal(syncEvent.json.action,'CREATED'); assert.equal(syncEvent.json.job.id,2);
  const syncContext = {$:()=>({first:()=>syncEvent})};
  const filtered = run(workflows[3], '04. Kiểm tra và lọc vị trí đang mở', {...syncContext,$json:{data:[
    {id:2,title:'Closed',status:'CLOSED'},{id:1,title:'Lập trình viên',status:'OPEN'}
  ]}});
  const choices = run(workflows[3], '05. Tạo lựa chọn mã vị trí – tên công việc', {$json:filtered.json});
  assert.deepEqual(Array.from(choices.json.options),['JOB-0001 – Lập trình viên']);
  const empty = run(workflows[3], '05. Tạo lựa chọn mã vị trí – tên công việc', {$json:{jobs:[]}});
  assert.deepEqual(Array.from(empty.json.jobIds),[]);
  assert.throws(()=>run(workflows[3], '04. Kiểm tra và lọc vị trí đang mở', {...syncContext,$json:{error:'unavailable'}}));
  const p={interviewId:2,candidateName:'Ứng viên, \nINJECT:yes '+ 'Việt'.repeat(40),candidateEmail:'candidate@example.test',interviewerName:'Manager',interviewerEmail:'manager@example.test',fromEmail:'hr@example.test',scheduledAt:'2099-01-01T03:30:00Z',round:1};
  const calendar={id:'test123',iCalUID:'same-google-event@google.com',hangoutLink:'https://meet.google.com/abc-defg-hij',organizer:{email:'hr@example.test'}};
  const generated=run(workflows[1],'10. Soạn thư mời và tệp lịch ICS',{$:name=>({first:()=>({json:name==='04. Nạp thông tin buổi phỏng vấn'?p:calendar})})})[0];
  assert.equal(generated.json.toEmail,'candidate@example.test,manager@example.test');
  const ics=Buffer.from(generated.binary.calendar.data,'base64').toString();
  assert.ok(ics.includes('METHOD:REQUEST\r\n')); assert.ok(ics.includes('UID:same-google-event@google.com'));
  assert.ok(ics.includes('DTEND:20990101T041500Z')); assert.ok(!ics.includes('\r\nINJECT:'));
  for(const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line)<=75);
  const mail={messageId:'test-id',accepted:['candidate@example.test','manager@example.test'],rejected:[]};
  p.delivery={requestId:'x',eventId:'test123'};
  const verify=m=>run(workflows[1],'12. Xác minh kết quả gửi thư mời',{$input:{first:()=>({json:m})},$:()=>({first:()=>({json:p})})});
  assert.equal(verify(mail)[0].json.acceptedRecipients.length,2);
  assert.throws(()=>verify({...mail,accepted:['candidate@example.test']}));
});

test('TV2 intake and offers: HTTP/MySQL security, duplicates, deadlines and responses', {timeout:120000}, async t=>{
  process.env.MAIL_FROM='hr@example.test';process.env.HR_EMAIL='hr@example.test';process.env.N8N_INTAKE_KEY='test-key-'.repeat(8);
  const h=await startHarness();t.after(()=>h.close());const {db,entities:e,request:req}=h;
  const job=(await req('/jobs',{method:'POST',who:'hr',body:{title:'TV2 automation test',departmentId:h.departments[0].id,description:'Synthetic',requirements:'TypeScript'}})).data;
  await t.test('job creation, edits and status changes dispatch Form sync only after save',async()=>{
    assert.equal(h.automation.jobsCalls.at(-1).action,'CREATED');
    assert.equal(h.automation.jobsCalls.at(-1).job.id,job.id);
    const updated = await req('/jobs/'+job.id,{method:'PATCH',who:'hr',body:{title:'TV2 automation renamed',departmentId:job.departmentId,description:job.description,requirements:job.requirements,expectedUpdatedAt:job.updatedAt}});
    assert.equal(updated.status,200);assert.equal(h.automation.jobsCalls.at(-1).action,'UPDATED');
    const count=h.automation.jobsCalls.length;
    const stale=await req('/jobs/'+job.id+'/status',{method:'PATCH',who:'hr',body:{status:'CLOSED',expectedUpdatedAt:job.updatedAt}});
    assert.equal(stale.status,409);assert.equal(h.automation.jobsCalls.length,count);
    const closed=await req('/jobs/'+job.id+'/status',{method:'PATCH',who:'hr',body:{status:'CLOSED',expectedUpdatedAt:updated.data.updatedAt}});
    assert.equal(closed.status,200);assert.equal(h.automation.jobsCalls.at(-1).job.status,'CLOSED');
    assert.equal((await req('/jobs')).data.some(item=>item.id===job.id),false);
    const reopened=await req('/jobs/'+job.id+'/status',{method:'PATCH',who:'hr',body:{status:'OPEN',expectedUpdatedAt:closed.data.updatedAt}});
    assert.equal(reopened.status,200);assert.equal(h.automation.jobsCalls.at(-1).action,'STATUS_CHANGED');
    assert.equal((await req('/jobs')).data.some(item=>item.id===job.id),true);
  });
  async function machine(route,body,key=process.env.N8N_INTAKE_KEY){
    const r=await fetch(h.base+route,{method:'POST',headers:{'x-intake-key':key,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});const data=await r.json();return {status:r.status,data:data.data??data};
  }
  const form=(sourceId,email='intake@example.test')=>{const b=h.upload(job.id,email);b.set('channel','GMAIL');b.set('sourceId',sourceId);return b;};
  await t.test('intake requires machine auth and atomically avoids duplicate candidate/ack',async()=>{
    assert.equal((await machine('/recruitment/intake',form('x'),'bad')).status,401);
    const results=await Promise.all([1,2].map(()=>machine('/recruitment/intake',form('gmail-1'))));
    assert.deepEqual(results.map(r=>r.status),[201,201]);assert.equal(results.filter(r=>r.data.shouldSend).length,1);
    const id=results.find(r=>r.data.shouldSend).data.applicationId;
    assert.equal(await db.getRepository(e.Application).countBy({candidateEmail:'intake@example.test'}),1);
    assert.equal((await machine(`/recruitment/intake/${id}/acknowledgement`,{accepted:['wrong@example.test'],messageId:'ack'})).status,409);
    assert.equal((await machine(`/recruitment/intake/${id}/acknowledgement`,{accepted:['intake@example.test'],messageId:'ack'})).status,201);
    const view=(await req('/applications/'+id,{who:'hr'})).data;
    assert.equal(view.acknowledgementStatus,'SMTP_ACCEPTED');assert.equal(view.matchScore,null);
    assert.equal((await machine('/recruitment/intake',form('another-mail'))).data.shouldSend,false);
  });
  let sequence=0;
  async function issue(){
    const email=`offer${++sequence}@example.test`;
    const app=(await req('/applications/apply',{method:'POST',body:h.upload(job.id,email)})).data;
    await db.getRepository(e.Application).update(app.applicationId,{status:'INTERVIEWING'});
    await db.getRepository(e.Interview).save({applicationId:app.applicationId,interviewerId:h.users.manager.id,round:1,scheduledAt:new Date('2099-01-01'),result:'PASSED',score:90});
    const body={roleTitle:'Engineer <safe>',salary:'15.000.000 VND',startDate:'2099-02-01'};
    const result=await req(`/applications/${app.applicationId}/offer`,{method:'POST',who:'hr',body});assert.equal(result.status,201,JSON.stringify(result.data));
    const p=h.automation.offerCalls.at(-1);
    const delivery=async(action,extra={},token=p.token)=>{const r=await fetch(h.base+`/offers/${p.offerId}/delivery`,{method:'POST',headers:{'Content-Type':'application/json','x-offer-token':token},body:JSON.stringify({action,...extra})});const d=await r.json();return {status:r.status,data:d.data??d};};
    return {p,email,appId:app.applicationId,delivery,body};
  }
  await t.test('offer claim authenticated, only one issuance, both tokens stay out of HR DTO',async()=>{
    const o=await issue();
    assert.equal((await o.delivery('CLAIM',{responseToken:o.p.responseToken},'bad')).status,401);
    assert.equal((await req(`/applications/${o.appId}/offer`,{method:'POST',who:'manager',body:o.body})).status,403);
    assert.equal((await req(`/applications/${o.appId}/offer`,{method:'POST',who:'hr',body:o.body})).status,409);
    const rows=await req(`/applications/${o.appId}/offers`,{who:'hr'});assert.ok(!JSON.stringify(rows.data).includes(o.p.token));
    const claims=await Promise.all([1,2].map(()=>o.delivery('CLAIM',{responseToken:o.p.responseToken})));
    assert.deepEqual(claims.map(r=>r.status).sort(),[201,409]);
    assert.ok(claims.find(r=>r.status===201).data.html.includes('Engineer &lt;safe&gt;'));
    assert.equal((await o.delivery('SENT',{accepted:['wrong@example.test'],messageId:'x'})).status,409);
    assert.equal((await o.delivery('SENT',{accepted:[o.email],messageId:'offer'})).status,201);
    assert.equal((await o.delivery('REMIND')).data.shouldSend,false);
    assert.equal((await req(`/applications/${o.appId}/hire`,{method:'POST',who:'hr'})).status,409);
    const outcomes=await Promise.all(['accept','decline'].map(a=>req(`/offers/${o.p.responseToken}/${a}`,{method:'POST'})));
    assert.deepEqual(outcomes.map(r=>r.status).sort(),[201,409]);
    assert.equal((await o.delivery('REMIND')).data.shouldSend,false);
  });
  await t.test('24/48 deadlines, reminders only once, expired cannot accept',async()=>{
    const o=await issue();await o.delivery('CLAIM',{responseToken:o.p.responseToken});await o.delivery('SENT',{accepted:[o.email],messageId:'offer'});
    await db.getRepository(e.Offer).update(o.p.offerId,{sentAt:new Date(Date.now()-25*3600000)});
    const reminders=await Promise.all([1,2].map(()=>o.delivery('REMIND')));assert.equal(reminders.filter(r=>r.data.shouldSend).length,1);
    assert.equal((await o.delivery('REMINDED',{accepted:[o.email],messageId:'reminder'})).status,409);
    assert.equal((await o.delivery('REMINDED',{accepted:[o.email,'hr@example.test'],messageId:'reminder'})).status,201);
    await db.getRepository(e.Offer).update(o.p.offerId,{expiresAt:new Date(Date.now()-1000)});
    const expiry=await Promise.all([1,2].map(()=>o.delivery('EXPIRE')));assert.equal(expiry.filter(r=>r.data.shouldSend).length,1);
    assert.equal((await req(`/offers/${o.p.responseToken}/accept`,{method:'POST'})).status,409);
    assert.equal((await req(`/offers/${o.p.responseToken}`)).data.status,'EXPIRED');
    assert.equal((await o.delivery('EXPIRY_NOTIFIED',{accepted:['hr@example.test'],messageId:'expiry'})).status,201);
  });
  await t.test('dispatch failure is observable and retry invalidates previous capabilities',async()=>{
    h.automation.offerAccepted=false;const o=await issue();
    assert.equal((await req(`/applications/${o.appId}/offers`,{who:'hr'})).data[0].deliveryStatus,'DISPATCH_FAILED');
    h.automation.offerAccepted=true;assert.equal((await req(`/applications/${o.appId}/offer/retry`,{method:'POST',who:'hr'})).status,201);
    assert.equal((await o.delivery('CLAIM',{responseToken:o.p.responseToken})).status,401);
    assert.equal((await req(`/offers/${o.p.responseToken}`)).status,404);
  });
});
