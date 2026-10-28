// Real MV3 lifecycle regression. No debugger is attached to the service worker.
// Only synthetic records and a fake key are used; HTTPS is resolved to loopback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const executable=process.env.CHROMIUM_EXECUTABLE;
assert.ok(executable,'Set CHROMIUM_EXECUTABLE to an extension-capable Chromium binary');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tabkeep-lifecycle-'));
// Renderer sandbox access to macOS Desktop can differ from the browser process.
fs.cpSync(`${root}/extension`,`${temp}/extension`,{recursive:true});
for(const file of fs.readdirSync(`${root}/extension`,{recursive:true})){
 if(fs.statSync(`${root}/extension/${file}`).isFile())assert.deepEqual(fs.readFileSync(`${temp}/extension/${file}`),fs.readFileSync(`${root}/extension/${file}`));
}
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',`${temp}/key.pem`,'-out',`${temp}/cert.pem`,'-subj','/CN=api.deepseek.com','-days','1'],{stdio:'ignore'});
let mode='fast',requests=[],responses=[];
const server=https.createServer({key:fs.readFileSync(`${temp}/key.pem`),cert:fs.readFileSync(`${temp}/cert.pem`)},(req,res)=>{
 if(req.method==='GET'){const name=/^\/\d+$/.test(req.url)?req.url.slice(1):'0';res.writeHead(200,{'Content-Type':'text/html'});res.end(`<title>Test ${name}</title><p>Synthetic lifecycle page</p>`);return;}
 let raw='';req.on('data',b=>raw+=b);req.on('end',()=>{
  const input=JSON.parse(JSON.parse(raw).messages[1].content);requests.push({time:Date.now(),ids:input.tabs.map(t=>t.id)});
  const respond=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({assignments:input.tabs.map(t=>({id:t.id,group:'Lifecycle tested'})),suggestedRules:[]})}}]}));};
  responses.push(respond);
  if(mode==='fast')respond();else if(mode==='slow')setTimeout(respond,45000).unref();
 });
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const chrome=spawn(executable,[`--user-data-dir=${temp}/profile`,'--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--no-proxy-server','--ignore-certificate-errors','--remote-debugging-port=0',`--host-resolver-rules=MAP api.deepseek.com 127.0.0.1:${server.address().port}, MAP example.test 127.0.0.1:${server.address().port}`,`--load-extension=${temp}/extension`,`--disable-extensions-except=${temp}/extension`,'about:blank'],{stdio:'ignore'});
let ws,serial=0;const waiting=new Map(),versions=new Map();
async function until(fn,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){const v=await fn();if(v)return v;await delay(100);}throw Error('Timed out waiting for lifecycle condition');}
const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
try{
 await until(()=>fs.existsSync(`${temp}/profile/DevToolsActivePort`));
 const [port,socket]=fs.readFileSync(`${temp}/profile/DevToolsActivePort`,'utf8').trim().split('\n');
 ws=new WebSocket(`ws://127.0.0.1:${port}${socket}`);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=waiting.get(m.id);waiting.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='ServiceWorker.workerVersionUpdated'){for(const v of m.params.versions)versions.set(v.versionId,v);}});
 console.log('Browser:',(await cdp('Browser.getVersion')).product);
 const extensionId=createHash('sha256').update(fs.realpathSync(`${temp}/extension`)).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
 let worker;
 try{worker=await until(async()=> (await cdp('Target.getTargets')).targetInfos.find(t=>t.url===`chrome-extension://${extensionId}/background.js`));}
 catch(error){console.log('Expected extension',extensionId,'targets',(await cdp('Target.getTargets')).targetInfos);throw error;}
 const origin=`chrome-extension://${new URL(worker.url).hostname}`;
 console.log(`Lifecycle target: ${worker.url}; byte-identical extension copy.`);
 // Block only dashboard startup to isolate workflows; worker and workflow code stay unchanged.
 const {targetId}=await cdp('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value;};
 await cdp('ServiceWorker.enable',{},sessionId);
 await cdp('Network.enable',{},sessionId);
 await cdp('Network.setBlockedURLs',{urls:[`${origin}/dashboard.js?v=20260917-15`]},sessionId);
 const navigation=await cdp('Page.navigate',{url:`${origin}/dashboard.html`},sessionId);assert.equal(navigation.errorText,undefined);
 try{await until(()=>evaluate('typeof chrome.storage !== "undefined"'));}catch(error){console.log(await evaluate('JSON.stringify({url:location.href,title:document.title,chrome:Object.keys(chrome)})'));throw error;}
 await evaluate(`(async()=>{
  window.send=async message=>{const r=await chrome.runtime.sendMessage({...message,locale:'zh'});if(r.error)throw Error(r.error);return r.value;};
  window.core=await import('./core.js?v=20260917-15');
  (await import('./i18n.js')).setLanguage('zh');
  window.historyFlow=(await import('./history-workflow.js')).organizeHistory;
  window.openFlow=(await import('./organize-workflow.js?v=20260917-15')).organizeOpenTabs;
 })()`);
 const setup=async(kind,count=1)=>{
  await evaluate(`(async()=>{
   const tabs=await chrome.tabs.query({});for(const t of tabs)if(t.url?.startsWith('https://example.test/'))await chrome.tabs.remove(t.id);
   await send({type:'get'});
   const day=core.dayKey(${kind==='history'?'Date.now()-86400000':'Date.now()'});
   window.testDay=day;
   const rows=Array.from({length:${count}},(_,i)=>({id:'r'+i,day,url:'https://example.test/'+i,title:'Test '+i,domain:'example.test',group:'待整理',snapshotGroup:'待整理',firstSeen:Date.now(),lastSeen:Date.now()}));
   rows.push({...rows[0],id:'manual',url:'https://example.test/manual',manualGroup:true},{...rows[0],id:'existing',url:'https://example.test/existing',group:'Existing',snapshotGroup:'Existing',aiTitle:'Test 0'});
   await chrome.storage.local.set({config:{...core.defaults(),rules:[]},records:rows,apiKeys:{deepseek:'fake-local-only'}});
   if(${kind==='open'})for(const r of rows)await chrome.tabs.create({url:r.url,active:false});
   await send({type:'get'});
   window.ids=rows.map(r=>r.id);window.outcome=null;
  })()`);
  requests=[];responses=[];
 };
 const start=kind=>evaluate(`void (${kind==='history'?'historyFlow({send,day:testDay,ids})':'openFlow({send})'}).then(value=>window.outcome={value},error=>window.outcome={error:error.message})`);
 const finish=(timeout=15000)=>until(()=>evaluate('window.outcome'),timeout);
 const records=()=>evaluate('(async()=> (await chrome.storage.local.get("records")).records)()');
 const protectedRows=rows=>{assert.equal(rows.find(r=>r.id==='manual').group,'待整理');assert.equal(rows.find(r=>r.id==='manual').manualGroup,true);assert.equal(rows.find(r=>r.id==='existing').group,'Existing');};
 const unattached=async()=>{const workers=(await cdp('Target.getTargets')).targetInfos.filter(t=>t.type==='service_worker');assert.ok(workers.length);assert.ok(workers.every(t=>!t.attached),'A debugger would invalidate lifecycle evidence');};
 if(!process.env.LIFECYCLE_UI_ONLY){
 for(const kind of ['history','open']){
  await setup(kind);mode='slow';await start(kind);await until(()=>requests.length===1);await unattached();
  const began=Date.now();const out=await finish(65000);assert.equal(out.value?.ai,1,JSON.stringify(out));assert.ok(Date.now()-began>=40000);
  let rows=await records();assert.equal(rows.find(r=>r.id==='r0').group,'Lifecycle tested');assert.equal(rows.find(r=>r.id==='r0').snapshotGroup,'Lifecycle tested');protectedRows(rows);
  console.log(`${kind}: 45-second HTTPS response committed successfully; worker debugger detached.`);
  // Complete batch 1, then terminate during batch 2 to check partial progress and retry.
  await setup(kind,201);mode='hold';await start(kind);await until(()=>requests.length===1);responses[0]();await until(()=>requests.length===2);
  await unattached();const running=await until(()=>[...versions.values()].find(v=>v.scriptURL===worker.url&&v.runningStatus==='running'));
  await cdp('ServiceWorker.stopWorker',{versionId:running.versionId},sessionId);
  await until(()=>versions.get(running.versionId)?.runningStatus==='stopped');
  const interrupted=await finish();assert.ok(interrupted.error,JSON.stringify(interrupted));
  rows=await records();assert.equal(rows.filter(r=>r.group==='Lifecycle tested').length,200);protectedRows(rows);
  responses[1]();await delay(300);rows=await records();assert.equal(rows.filter(r=>r.group==='Lifecycle tested').length,200);
  mode='fast';await evaluate('window.outcome=null');await start(kind);const retry=await finish();assert.equal(retry.value?.ai,1,JSON.stringify(retry));
  assert.equal(requests.length,3);assert.equal(requests[2].ids.length,1);rows=await records();assert.equal(rows.filter(r=>r.group==='Lifecycle tested').length,201);protectedRows(rows);
  console.log(`${kind}: worker terminated mid-batch; 200 completed pages retained, late response ignored, restart retries only 1 pending page.`);
 }
 // A response beyond the existing deadline must fail safely and remain retryable.
 await setup('history');mode='hold';await start('history');await until(()=>requests.length===1);const started=Date.now();
 const timedOut=await finish(105000);assert.ok(timedOut.error,JSON.stringify(timedOut));assert.ok(Date.now()-started>=85000);
 let rows=await records();assert.equal(rows.find(r=>r.id==='r0').group,'待整理');protectedRows(rows);
 mode='fast';await evaluate('window.outcome=null');await start('history');assert.equal((await finish()).value?.ai,1);
 console.log('history: 90-second request deadline leaves pending data intact; retry succeeds.');
 }
 // A forgotten and restored identical Key still invalidates an in-flight plan.
 for(const kind of ['history','open']){
  await setup(kind);mode='hold';await start(kind);await until(()=>requests.length===1);
  await evaluate("(async()=>{const key=await send({type:'getKey',provider:'deepseek'});await send({type:'key',provider:'deepseek',value:''});await send({type:'key',provider:'deepseek',value:key});})()");
  responses[0]();const rejected=await finish();assert.equal(rejected.value?.reason,'changed');assert.equal(rejected.value?.ai,0);assert.deepEqual(rejected.value?.suggestions,[]);
  const unchanged=await records();assert.equal(unchanged.find(r=>r.id==='r0').group,'待整理');protectedRows(unchanged);
  mode='fast';await evaluate('window.outcome=null');await start(kind);assert.equal((await finish()).value?.ai,1);
  console.log(`${kind}: same-Key forget/restore rejects live old AI; fresh retry succeeds.`);
 }
 // Verify the actual dashboard clears its busy state and offers a working retry.
 for(const kind of ['history','open']){
  await setup(kind);mode='hold';
  await evaluate("localStorage.setItem('atlas-language-v1','zh')");
  const uiTarget=await cdp('Target.createTarget',{url:`${origin}/dashboard.html`});
  const uiSession=(await cdp('Target.attachToTarget',{targetId:uiTarget.targetId,flatten:true})).sessionId;
  const ui=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},uiSession);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
  await cdp('Page.bringToFront',{},uiSession);
  await until(()=>ui('!!document.querySelector("#continue-browsing")?.onclick'));
  const confirmHistory=async()=>{
   await until(()=>ui('!document.querySelector("#organize-history").disabled'));
   await ui('document.querySelector("#organize-history").click()');
   try{await until(()=>ui('!!document.querySelector("#history-dialog[open]")'));}
   catch(error){console.log('History confirmation state',await ui('({day:document.querySelector("#day").value,hidden:document.querySelector("#organize-history").hidden,disabled:document.querySelector("#organize-history").disabled,toast:document.querySelector("#toast").textContent,summary:document.querySelector("#recap-summary").textContent})'));throw error;}
   await ui('document.querySelector("#history-confirm").click()');
  };
  if(kind==='history'){
   // Finish the asynchronous navigation before editing the history date.
   await ui('document.querySelector("#continue-browsing").onclick()');
   const day=await evaluate('window.testDay');
   await ui(`document.querySelector('#day').value=${JSON.stringify(day)};document.querySelector('#day').dispatchEvent(new Event('change'))`);
   await until(()=>ui('!document.querySelector("#organize-history").disabled'));
   await confirmHistory();
  }
  await until(()=>requests.length===1);await unattached();
  const running=await until(()=>[...versions.values()].find(v=>v.scriptURL===worker.url&&v.runningStatus==='running'));
  await cdp('ServiceWorker.stopWorker',{versionId:running.versionId},sessionId);
  const progress=kind==='history'?'#history-progress':'#organize-progress';
  try{await until(()=>ui(`document.querySelector(${JSON.stringify(progress)}).textContent.includes('重试')`));}
  catch(error){console.log(kind,'UI progress:',await ui(`document.querySelector(${JSON.stringify(progress)}).textContent`));throw error;}
  protectedRows(await records());assert.equal((await records()).find(r=>r.id==='r0').group,'待整理');
  mode='fast';
  if(kind==='history')await confirmHistory();else await ui('document.querySelector("#refresh").click()');
  await until(async()=>(await records()).find(r=>r.id==='r0').group==='Lifecycle tested');
  assert.equal(requests.length,2);protectedRows(await records());
  if(kind==='history'){
   const restored=await evaluate("send({type:'restoreDay',day:testDay,ids:['r0']})");assert.equal(restored.opened,1);
   const duplicate=await evaluate("send({type:'restoreDay',day:testDay,ids:['r0']})");assert.equal(duplicate.existing,1);assert.equal(duplicate.opened,0);
   const today=await evaluate('core.dayKey()');const current=(await records()).find(r=>r.day===today&&r.url==='https://example.test/0');
   assert.equal(current.group,'Lifecycle tested');assert.equal(current.manualGroup,true);
   console.log('history: restored snapshot after worker restart; repeated restore deduplicates the open tab.');
  }
  await cdp('Target.closeTarget',{targetId:uiTarget.targetId});
  console.log(`${kind}: actual dashboard reports worker interruption, clears busy state, and user retry succeeds.`);
 }
 console.log('PASS: real MV3 lifecycle scenarios; unchanged extension, real Chrome APIs, loopback HTTPS only.');
}finally{
 ws?.close();chrome.kill('SIGTERM');server.closeAllConnections();await new Promise(r=>server.close(r));
 await delay(500);fs.rmSync(temp,{recursive:true,force:true});
}
