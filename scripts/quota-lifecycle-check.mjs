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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tabkeep-quota-lifecycle-'));
// Renderer sandbox access to macOS Desktop can differ from the browser process.
fs.cpSync(`${root}/extension`,`${temp}/extension`,{recursive:true});
for(const file of fs.readdirSync(`${root}/extension`,{recursive:true})){
 if(fs.statSync(`${root}/extension/${file}`).isFile())assert.deepEqual(fs.readFileSync(`${temp}/extension/${file}`),fs.readFileSync(`${root}/extension/${file}`));
}
const manifest=JSON.parse(fs.readFileSync(`${temp}/extension/manifest.json`));manifest.permissions.push('bookmarks');fs.writeFileSync(`${temp}/extension/manifest.json`,JSON.stringify(manifest));
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',`${temp}/key.pem`,'-out',`${temp}/cert.pem`,'-subj','/CN=api.deepseek.com','-days','1'],{stdio:'ignore'});
let mode='fast',requests=[],responses=[];
const server=https.createServer({key:fs.readFileSync(`${temp}/key.pem`),cert:fs.readFileSync(`${temp}/cert.pem`)},(req,res)=>{
 if(req.method==='GET'){const name=/^\/\d+$/.test(req.url)?req.url.slice(1):'0';res.writeHead(200,{'Content-Type':'text/html'});res.end(`<title>Test ${name}</title><p>Synthetic lifecycle page</p>`);return;}
 let raw='';req.on('data',b=>raw+=b);req.on('end',()=>{
  const input=JSON.parse(JSON.parse(raw).messages[1].content);requests.push({time:Date.now(),ids:input.tabs.map(t=>t.id),input});
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
 console.log(`Lifecycle target: ${worker.url}; production source with test-only bookmark permission pregrant.`);
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

 await evaluate("(async()=>{window.bookFlow=(await import('./bookmark-ai-workflow.js')).organizeBookmarksAI})()");

 const stop=async()=>{
  const targets=(await cdp('Target.getTargets')).targetInfos.filter(t=>t.type==='service_worker');assert.ok(targets.every(t=>!t.attached));
  const running=await until(()=>[...versions.values()].find(v=>v.scriptURL===worker.url&&v.runningStatus==='running'));
  await cdp('ServiceWorker.stopWorker',{versionId:running.versionId},sessionId);
  await until(()=>versions.get(running.versionId)?.runningStatus==='stopped');
 };
 await cdp('Target.createTarget',{url:'https://example.test/1'});
 await evaluate(`(async()=>{
  const folder=await chrome.bookmarks.create({title:'Synthetic quota bookmarks'});
  const bookmark=await chrome.bookmarks.create({parentId:folder.id,title:'Protected bookmark',url:'https://example.test/bookmark'});
  window.bookmarkId=bookmark.id;
 })()`);
 const panels=[];
 for(let i=0;i<3;i++){
  const target=await cdp('Target.createTarget',{url:origin+'/dashboard.html'+(i===2?'?surface=sidepanel':'')});
  const sid=(await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
  const run=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sid);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
  await until(()=>run('!!document.querySelector("#mono-hero h1")'));panels.push(run);
 }
 const sendFrom=(run,message)=>run('chrome.runtime.sendMessage('+JSON.stringify(message)+')');
 const seed=()=>evaluate(`(async()=>{
  await send({type:'get'});
  const config={...core.defaults(),rules:[{keyword:'example.test',group:'Fixture rule'}]};
  const day=core.dayKey(Date.now()-86400000);
  window.baseline=core.classificationContext(config,'');window.historyDay=day;
  window.outcome=null;
  await chrome.storage.local.clear();
  await chrome.storage.local.set({config,lastCleanupAt:Date.now(),apiKeys:{deepseek:'fake-local-only'},records:[
   {id:'human',day:core.dayKey(),url:'https://example.test/1',title:'Human',domain:'example.test',group:'Protected',manualGroup:true,snapshotGroup:'Protected'},
   {id:'pending',day,url:'https://pending.test/old',title:'Pending history',domain:'pending.test',group:'待整理',snapshotGroup:'待整理'}
  ],'pickmark-bookmarks-v1':{metadata:{[bookmarkId]:{url:'https://example.test/bookmark',group:'Protected bookmark',manualGroup:true}},revision:1,rules:[],groups:['Protected bookmark']}});
 })()`);
 const pressure=()=>evaluate(`(async()=>{
  const data=await chrome.storage.local.get(null);
  data['pickmark-thumbnails-v1']={'https://example.test/cached':{at:Date.now(),image:'data:image/jpeg;base64,'+'A'.repeat(1000000)}};
  data['quota-fixture-padding']='';
  const bytes=Object.entries(data).reduce((n,[k,v])=>n+new TextEncoder().encode(k).length+new TextEncoder().encode(JSON.stringify(v)).length,0);
  data['quota-fixture-padding']='x'.repeat(10*1024*1024-128*1024+2048-bytes);
  await chrome.storage.local.set(data);
 })()`);
 for(const terminate of [true,false]){
  await seed();requests=[];responses=[];mode='hold';
  await evaluate("void historyFlow({send,day:historyDay,ids:['pending']}).then(value=>window.outcome={value},error=>window.outcome={error:error.message})");
  await until(()=>requests.length===1);
  await pressure();
  const loaded=await Promise.all(panels.map(run=>sendFrom(run,{type:'get'})));
  for(const r of loaded){assert.equal(r.value.storageWarning,true);assert.equal(r.value.records.find(x=>x.id==='human').group,'Protected');}
  for(const run of panels){
   await run('document.querySelector("#settings-shortcut").click()');
   await until(()=>run('!!document.querySelector("#storage-summary").textContent.includes("MB")'));
  }
  const before=await evaluate('chrome.storage.local.get(["records","pickmark-bookmarks-v1"])');
  assert.ok(before.records.some(r=>r.id==='pending'),'History must still exist before explicit cleanup');
  if(terminate){
   await stop();await until(()=>evaluate('window.outcome'));
   assert.ok((await evaluate('window.outcome')).error);
   const wake=await Promise.all(panels.map(run=>sendFrom(run,{type:'get'})));
   assert.ok(wake.every(r=>r.value?.storageWarning));
   assert.deepEqual(await evaluate('chrome.storage.local.get(["records","pickmark-bookmarks-v1"])'),before);
   console.log('PASS forced worker termination while quota full and AI pending; three panels wake worker, read saved manual data and retain cleanup access.');
  }
  // First release cache headroom. Then race two panels cleaning history with a third reading.
  assert.ok(!(await sendFrom(panels[0],{type:'cleanup',mode:'cache'})).error);
  const concurrent=await Promise.all([
   sendFrom(panels[0],{type:'cleanup',mode:'all'}),
   sendFrom(panels[1],{type:'cleanup',mode:'old',days:7}),
   sendFrom(panels[2],{type:'get'})
  ]);assert.ok(concurrent.every(r=>!r.error));
  responses[0]();
  if(!terminate){const result=await until(()=>evaluate('window.outcome'));assert.equal(result.value.ai,0);assert.equal(result.value.reason,'changed');}
  const stale=await evaluate("send({type:'historyAssign',day:historyDay,expectedContext:baseline,assignments:[{id:'pending',group:'Late resurrected',baseTitle:'Pending history',baseGroup:'待整理',baseManual:false,baseSnapshot:'待整理'}]})");
  assert.equal(stale.accepted,false);
  await cdp('Target.createTarget',{url:'https://example.test/recovered-'+(terminate?'restart':'live')});
  await until(()=>evaluate('chrome.storage.local.get("records").then(d=>d.records.some(r=>r.url.endsWith('+JSON.stringify(terminate?'recovered-restart':'recovered-live')+')))'));
  const snapshots=await Promise.all(panels.map(run=>sendFrom(run,{type:'get'})));
  for(const {value:r,error} of snapshots){
   assert.equal(error,undefined);assert.equal(r.storageWarning,undefined);assert.equal(r.config.recording,true);
   assert.ok(!r.records.some(x=>x.id==='pending'));assert.equal(r.records.find(x=>x.id==='human').group,'Protected');assert.equal(r.records.find(x=>x.id==='human').manualGroup,true);
  }
  assert.deepEqual(await evaluate('chrome.storage.local.get("pickmark-bookmarks-v1")'),{'pickmark-bookmarks-v1':before['pickmark-bookmarks-v1']});
  // Reload all real dashboards concurrently, not just their message endpoints.
  await Promise.all(panels.map(run=>run('location.reload();undefined')));
  for(const run of panels)await until(()=>run('!!document.querySelector("#mono-hero h1") && !!document.querySelector("#storage-warning") && document.querySelector("#storage-warning").hidden'));
  console.log('PASS '+(terminate?'after restart':'live late AI')+': concurrent cleanup, stale AI rejection, new page recording, manual/bookmark protection, and three dashboards reload without quota warning.');
 }
 console.log('PASS quota lifecycle and multi-panel regression; isolated temporary profile, simulated data, AI served only by loopback.');
}finally{
 ws?.close();chrome.kill('SIGTERM');server.closeAllConnections();await new Promise(r=>server.close(r));
 await delay(500);fs.rmSync(temp,{recursive:true,force:true});
}

