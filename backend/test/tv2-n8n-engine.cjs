// Real n8n execution + HTTP/MySQL + loopback SMTP. Google services use explicit fixtures.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const { startHarness, pdf } = require('./recruitment-harness.cjs');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.temp/tv2-engine'); fs.mkdirSync(output, {recursive:true});
const runtime = process.env.N8N_TEST_RUNTIME || 'C:/Users/tienc/AppData/Local/Temp/hr-n8n-runtime-20261007/node_modules';
const cli = path.join(runtime,'n8n/bin/n8n');
const env = {...process.env,N8N_USER_FOLDER:path.join(root,'.temp/tv2-engine-profile'),N8N_RUNNERS_BROKER_PORT:'15679',N8N_DIAGNOSTICS_ENABLED:'false',N8N_VERSION_NOTIFICATIONS_ENABLED:'false',N8N_LOG_LEVEL:'warn'};
let serial=0;
function command(args) {
  return new Promise((resolve,reject)=>{
    const log=path.join(output,`command-${++serial}.log`), fd=fs.openSync(log,'w');
    const p=spawn(process.execPath,[cli,...args],{env,stdio:['ignore',fd,fd],windowsHide:true,cwd:root});
    const timer=setTimeout(()=>{p.kill();reject(Error('n8n timed out: '+log));},150000);
    p.on('error',reject);p.on('exit',code=>{clearTimeout(timer);fs.closeSync(fd);code===0?resolve(log):reject(Error('n8n exit '+code+': '+log));});
  });
}
function mock(n,js) { n.type='n8n-nodes-base.code';n.typeVersion=2;n.parameters={jsCode:js};delete n.credentials;delete n.onError; }
(async()=>{
  process.env.MAIL_FROM='hr@example.test';process.env.HR_EMAIL='hr@example.test';process.env.N8N_INTAKE_KEY=randomBytes(32).toString('hex');
  const h=await startHarness();const mails=[];
  const smtp=net.createServer(socket=>{
    let pending='',data=false,lines=[],recipients=[];
    socket.write('220 localhost test SMTP\r\n');
    socket.on('data',chunk=>{
      pending+=chunk.toString();let i;
      while((i=pending.indexOf('\r\n'))>=0){
        const line=pending.slice(0,i);pending=pending.slice(i+2);
        if(data){if(line==='.') {mails.push({recipients,raw:lines.join('\r\n')});data=false;lines=[];socket.write('250 queued locally\r\n');}else lines.push(line);continue;}
        if(/^EHLO|^HELO/i.test(line))socket.write('250 localhost\r\n');
        else if(/^MAIL FROM:/i.test(line)){recipients=[];socket.write('250 OK\r\n');}
        else if(/^RCPT TO:/i.test(line)){const address=line.match(/<([^>]+)>/)?.[1];if(!address?.endsWith('@example.test'))socket.write('550 Only synthetic recipients allowed\r\n');else{recipients.push(address);socket.write('250 OK\r\n');}}
        else if(line==='DATA'){data=true;socket.write('354 End with dot\r\n');}
        else if(line==='QUIT'){socket.end('221 Bye\r\n');}
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(r=>smtp.listen(0,'127.0.0.1',r));
  try {
    const credentials=path.join(output,'smtp.json');fs.writeFileSync(credentials,JSON.stringify([{id:'tv2TestSmtp',name:'TV2 loopback only',type:'smtp',data:{host:'127.0.0.1',port:smtp.address().port,secure:false,disableStartTls:true,user:'',password:''}}]));
    await command(['import:credentials','--input='+credentials]);
    const job=(await h.request('/jobs',{method:'POST',who:'hr',body:{title:'Engine fixture',departmentId:h.departments[0].id,description:'Synthetic',requirements:'TypeScript'}})).data;
    async function execute(filename,kind,payload){
      let w=JSON.parse(fs.readFileSync(path.join(root,'workflows',filename),'utf8').replaceAll('http://localhost:3001/api',h.base));
      w.id='testTv2'+kind;w.name='TEST '+kind;w.active=false;
      for(const n of w.nodes){
        delete n.credentials;
        if(n.type==='n8n-nodes-base.httpRequest' && n.parameters.authentication==='genericCredentialType'){
          delete n.parameters.authentication;delete n.parameters.genericAuthType;
          n.parameters.sendHeaders=true;n.parameters.headerParameters={parameters:[{name:'x-intake-key',value:process.env.N8N_INTAKE_KEY}]};
        }
        if(n.type==='n8n-nodes-base.emailSend')n.credentials={smtp:{id:'tv2TestSmtp',name:'TV2 loopback only'}};
        if(n.type==='n8n-nodes-base.wait') n.parameters={resume:'timeInterval',amount:0,unit:'seconds'};
        if(n.type==='n8n-nodes-base.webhook')mock(n,'return [{json:{body:'+JSON.stringify(payload)+'}}];');
        if(n.type==='n8n-nodes-base.gmailTrigger') mock(n,`return [{json:{id:'fixture-gmail',subject:'CV JOB-${job.id}',from:{value:[{address:'engine-intake@example.test',name:'Engine Candidate'}]}},binary:{attachment_0:{data:'${pdf().toString('base64')}',fileName:'cv.pdf',mimeType:'application/pdf'}}}];`);
        if(n.type==='n8n-nodes-base.googleSheetsTrigger')mock(n,`return [{json:{Timestamp:'2099-01-01 09:00:00',cvFileId:'abcdefghijklmnop',jobId:${job.id},candidateName:'Form Candidate',candidateEmail:'engine-form@example.test'}}];`);
        if(n.type==='n8n-nodes-base.googleDrive')mock(n,`return [{json:$input.first().json,binary:{cv:{data:'${pdf().toString('base64')}',fileName:'cv.pdf',mimeType:'application/pdf'}}}];`);
        if(n.type==='n8n-nodes-base.gmail')mock(n,'return [{json:{marked:true}}];');
        if(n.type==='n8n-nodes-base.googleCalendar'){
          if(n.parameters.operation==='create')mock(n,`const p=$('04. Nạp thông tin buổi phỏng vấn').first().json;return [{json:{id:p.delivery.eventId,status:'confirmed',start:{dateTime:p.scheduledAt},end:{dateTime:new Date(Date.parse(p.scheduledAt)+45*60000).toISOString()},hangoutLink:'https://meet.google.com/abc-defg-hij',iCalUID:'fixture@google.com',organizer:{email:'hr@example.test'},conferenceData:{createRequest:{status:{statusCode:'success'}}}}}];`);
          else mock(n,'return $input.all();');
        }
      }
      // Explicit start prevents CLI choosing another trigger/fixture branch.
      const start=kind==='Intake'?'01. Theo dõi CV mới trong Gmail tuyển dụng':kind==='Form'?'03. Phát hiện câu trả lời Google Form mới':'01. Nhận yêu cầu phát hành thư mời nhận việc';
      const target=kind==='Interview'?'01. Nhận yêu cầu xếp lịch phỏng vấn':start;
      w.nodes.push({id:'manual',name:'Manual fixture start',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[-250,300],parameters:{}});
      w.connections['Manual fixture start']={main:[[{node:target,type:'main',index:0}]]};
      const file=path.join(output,kind+'.json');fs.writeFileSync(file,JSON.stringify(w));
      await command(['import:workflow','--input='+file]);await command(['execute','--id='+w.id]);
      console.log('PASS n8n engine '+kind);
    }
    await execute('candidate-intake-omnichannel.json','Intake');
    const intake=await h.db.getRepository(h.entities.Application).findOneByOrFail({candidateEmail:'engine-intake@example.test'});
    assert.equal(intake.acknowledgementStatus,'SMTP_ACCEPTED');
    await execute('candidate-intake-omnichannel.json','Intake');assert.equal(mails.length,1,'duplicate intake must not send twice');
    await execute('candidate-intake-omnichannel.json','Form');
    const form=await h.db.getRepository(h.entities.Application).findOneByOrFail({candidateEmail:'engine-form@example.test'});
    assert.equal(form.intakeChannel,'GOOGLE_FORM');assert.equal(form.acknowledgementStatus,'SMTP_ACCEPTED');
    process.env.RECRUITMENT_CALLBACK_BASE_URL=h.base;
    const app=(await h.request('/applications/apply',{method:'POST',body:h.upload(job.id,'engine-interview@example.test')})).data;
    const scheduled=await h.request(`/applications/${app.applicationId}/interview`,{method:'POST',who:'hr',body:{interviewerId:h.users.manager.id,scheduledAt:'2099-01-01T03:30:00Z',round:1}});
    assert.equal(scheduled.status,201,JSON.stringify(scheduled.data));
    await execute('interview-schedule-readback.json','Interview',h.automation.calls.at(-1));
    const detail=(await h.request('/applications/'+app.applicationId,{who:'hr'})).data;
    assert.equal(detail.interviews[0].automation.status,'COMPLETED');
    assert.equal(mails.at(-1).recipients.length,2);assert.match(mails.at(-1).raw,/filename=interview-|filename="interview-/);
    await h.db.getRepository(h.entities.Interview).update(detail.interviews[0].id,{result:'PASSED'});
    const issued=await h.request(`/applications/${app.applicationId}/offer`,{method:'POST',who:'hr',body:{salary:'15 million VND',roleTitle:'Engineer',startDate:'2099-02-01'}});assert.equal(issued.status,201);
    const capability=h.automation.offerCalls.at(-1);
    // Expedited dates are applied in the isolated test DB after SENT is persisted.
    const { OfferService }=require('../dist/modules/applications/offer.service');
    const service=h.app.get(OfferService),real=service.delivery.bind(service);
    service.delivery=async(id,token,input)=>{
      if(input.action==='REMIND')await h.db.getRepository(h.entities.Offer).update(id,{sentAt:new Date(Date.now()-25*3600000)});
      if(input.action==='EXPIRE')await h.db.getRepository(h.entities.Offer).update(id,{expiresAt:new Date(Date.now()-1000)});
      return real(id,token,input);
    };
    await execute('offer-letter-48h.json','Offer',capability);
    const row=await h.db.getRepository(h.entities.Offer).findOneByOrFail({id:capability.offerId});
    assert.equal(row.status,'EXPIRED');assert.ok(row.remindedAt);assert.ok(row.expiryNotifiedAt);assert.equal(mails.length,6);
    fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({passed:true,engine:'n8n',database:'isolated MySQL',smtp:'loopback sink, 6 messages, no external delivery',google:'contract fixture',waits:'accelerated in test only',cases:['Gmail intake','duplicate intake','Form/Drive intake','interview + ICS two recipients','offer + 24h reminder + 48h expiry']},null,2));
    console.log('ALL n8n engine checks passed; 6 messages captured locally.');
  } finally { await h.close(); await new Promise(r=>smtp.close(r)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
