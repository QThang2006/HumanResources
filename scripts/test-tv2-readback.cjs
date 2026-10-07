// Own disposable MySQL + real HTTP regression. No calls to Google/n8n providers.
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const net=require('node:net');
const root=path.resolve(__dirname,'..');
const mysql=require(path.join(root,'backend/node_modules/mysql2/promise'));
const port=13317;
async function open(){return new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();resolve(true)});s.once('error',()=>{s.destroy();resolve(false)});s.setTimeout(300,()=>{s.destroy();resolve(false)});});}
async function run(file,args,options={}){return new Promise((resolve,reject)=>{const p=spawn(file,args,{windowsHide:true,...options});p.once('error',reject);p.once('exit',code=>code===0?resolve():reject(new Error('Command exited '+code)));});}
(async()=>{
  if(await open())throw new Error('Port13317 occupied; no test process started.');
  const owned=await fs.mkdtemp(path.join(os.tmpdir(),'hr-tv2-readback-'));
  const data=path.join(owned,'data');await fs.mkdir(data);
  const basedir='C:/Program Files/MySQL/MySQL Server 9.6';const mysqld=path.join(basedir,'bin/mysqld.exe');
  const log=await fs.open(path.join(owned,'mysql.log'),'w');
  let server,connection;let passwordSet=false;const password=crypto.randomBytes(24).toString('hex');
  try{
    // MySQL may re-exec itself; an ASCII Temp working directory avoids Windows error267.
    await run(mysqld,['--no-defaults','--initialize-insecure','--basedir='+basedir,'--datadir='+data,'--console'],{cwd:owned,stdio:['ignore',log.fd,log.fd]});
    server=spawn(mysqld,['--no-defaults','--basedir='+basedir,'--datadir='+data,'--port='+port,'--bind-address=127.0.0.1','--mysqlx=OFF','--console','--innodb-buffer-pool-size=64M','--max-connections=40'],{cwd:owned,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
    for(let i=0;i<30&&!await open();i++)await new Promise(r=>setTimeout(r,1000));
    connection=await mysql.createConnection({host:'127.0.0.1',port,user:'root'});
    await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY "+connection.escape(password));passwordSet=true;
    await connection.end();connection=null;
    await run(process.execPath,['--test','test/jobs-crud.test.cjs','test/recruitment.test.cjs','test/interview-delivery.test.cjs','test/interview-workflow.test.cjs'],{cwd:path.join(root,'backend'),stdio:'inherit',env:{...process.env,ATS_TEST_DB_PORT:String(port),ATS_TEST_DB_PASSWORD:password,RECRUITMENT_CALLBACK_BASE_URL:''}});
  }finally{
    if(server&&server.exitCode===null){
      const admin=connection||await mysql.createConnection({host:'127.0.0.1',port,user:'root',password:passwordSet?password:undefined});
      try{await admin.query('SHUTDOWN');}catch(e){if(!['PROTOCOL_CONNECTION_LOST','ECONNRESET'].includes(e.code))throw e;}
      await admin.end().catch(()=>{});
      await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});
    }
    await log.close();
    const resolved=path.resolve(owned);const temp=path.resolve(os.tmpdir());
    if(path.dirname(resolved)!==temp||!/^hr-tv2-readback-[a-zA-Z0-9]+$/.test(path.basename(resolved)))throw new Error('Cleanup path outside owned Temp test folder.');
    await fs.rm(resolved,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
