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
 const setup=async(count=1)=>{
  await evaluate(`(async()=>{
   if(window.folder)await chrome.bookmarks.removeTree(folder.id);
   window.folder=await chrome.bookmarks.create({title:'Synthetic only'});
   const children=[];for(let i=0;i<${count+2};i++)children.push(await chrome.bookmarks.create({parentId:folder.id,title:'Test '+i,url:'https://example.test/'+i}));
   window.ids=children.map(r=>r.id);window.outcome=null;
   await chrome.storage.local.set({config:{...core.defaults(),rules:[]},records:[],apiKeys:{deepseek:'fake-local-only'},'pickmark-bookmarks-v1':{revision:0,rules:[],metadata:{[ids[${count}]]:{url:children[${count}].url,group:'Existing'},[ids[${count+1}]]:{url:children[${count+1}].url,group:'待整理',manualGroup:true}}}});
  })()`);
  requests=[];responses=[];
 };
 const start=()=>evaluate("void (async()=>bookFlow({send,prepared:await send({type:'bookAI:prepare',ids}),token:crypto.randomUUID()}))().then(value=>window.outcome={value},error=>window.outcome={error:error.message})");
 const finish=(timeout=15000)=>until(()=>evaluate('window.outcome'),timeout);
 const rows=()=>evaluate("send({type:'bookmarks:get'}).then(b=>b.rows)");
 const protectedRows=rows=>{assert.equal(rows.at(-2).group,'Existing');assert.equal(rows.at(-1).manualGroup,true);assert.equal(rows.at(-1).group,'待整理');};
 const stop=async(waitStopped=true)=>{
  const workers=(await cdp('Target.getTargets')).targetInfos.filter(t=>t.type==='service_worker');assert.ok(workers.every(t=>!t.attached));
  const running=await until(()=>[...versions.values()].find(v=>v.scriptURL===worker.url&&v.runningStatus==='running'));
  await cdp('ServiceWorker.stopWorker',{versionId:running.versionId},sessionId);
  if(waitStopped)await until(()=>versions.get(running.versionId)?.runningStatus==='stopped');
 };
 if(!process.env.BOOK_AI_UI_ONLY){
 await setup();mode='slow';await start();await until(()=>requests.length===1);
 assert.ok(requests[0].input.tabs.every(t=>!('url' in t)&&!('folder' in t)));
 const began=Date.now();assert.equal((await finish(65000)).value?.applied,1);assert.ok(Date.now()-began>40000);protectedRows(await rows());
 console.log('PASS: 45-second response, real MV3 worker; only confirmed title/domain payload.');
 await setup(201);mode='hold';await start();await until(()=>requests.length===1);responses[0]();await until(()=>requests.length===2);
 await stop();assert.ok((await finish()).error);assert.equal((await rows()).filter(r=>r.group==='Lifecycle tested').length,200);responses[1]();await delay(300);
 assert.equal((await rows()).filter(r=>r.group==='Lifecycle tested').length,200);
 mode='fast';await evaluate('window.outcome=null');await start();assert.equal((await finish()).value?.applied,1);assert.equal(requests[2].ids.length,1);protectedRows(await rows());
 console.log('PASS: worker termination preserves 200 completed; retry sends only remaining 1; late response ignored.');
 await setup();mode='hold';await start();await until(()=>requests.length===1);const timeoutStart=Date.now();assert.ok((await finish(105000)).error);assert.ok(Date.now()-timeoutStart>85000);
 assert.equal((await rows())[0].group,'待整理');mode='fast';await evaluate('window.outcome=null');await start();assert.equal((await finish()).value?.applied,1);
 console.log('PASS: real 90-second deadline and fresh retry.');
 }
 await setup();mode='hold';await start();await until(()=>requests.length===1);
 await evaluate("(async()=>{const key=await send({type:'getKey',provider:'deepseek'});await send({type:'key',provider:'deepseek',value:''});await send({type:'key',provider:'deepseek',value:key});})()");
 responses[0]();assert.match((await finish()).error,/变化|changed/);assert.equal((await rows())[0].group,'待整理');protectedRows(await rows());
 mode='fast';await evaluate('window.outcome=null');await start();assert.equal((await finish()).value?.applied,1);
 console.log('PASS: same-Key forget/restore rejects live old bookmark AI; fresh retry succeeds.');
 await setup();mode='hold';await evaluate("localStorage.setItem('atlas-language-v1','zh')");
 const uiTarget=await cdp('Target.createTarget',{url:`${origin}/dashboard.html`});
 const uiSession=(await cdp('Target.attachToTarget',{targetId:uiTarget.targetId,flatten:true})).sessionId;
 const ui=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},uiSession);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
 await until(()=>ui('!!document.querySelector("[data-mode=bookmarks]")'));
 await ui('document.querySelector("[data-mode=bookmarks]").click()');
 await until(()=>ui('document.querySelectorAll("#mono-list .item").length===3'));
 const confirm=async()=>{
  await until(()=>ui('!!document.querySelector("[data-pm=book-ai]:not([disabled])")'));
  await ui('document.querySelector("[data-pm=book-ai]").click()');
  await until(()=>ui('!!document.querySelector("#mono-book-dialog[open] .primary")'));
 };
 await confirm();assert.equal(requests.length,0);assert.match(await ui('document.querySelector("#mono-book-dialog").textContent'),/deepseek/);
 await ui('document.querySelector("#mono-book-dialog").close()');assert.equal(requests.length,0);
 await confirm();await ui('document.querySelector("#mono-book-dialog .primary").click()');await until(()=>requests.length===1);await stop(false);
 await until(()=>ui('document.querySelector("#book-ai-progress").textContent.includes("重试")'));protectedRows(await rows());
 mode='fast';await confirm();assert.equal(requests.length,1);await ui('document.querySelector("#mono-book-dialog .primary").click()');
 await until(async()=>(await rows())[0].group==='Lifecycle tested');assert.equal(requests.length,2);protectedRows(await rows());
 console.log('PASS: actual UI sends nothing before consent; dismissal sends nothing; worker termination clears busy state; reconfirmed retry succeeds.');
 console.log('PASS: bookmark AI lifecycle, synthetic bookmarks in disposable profile; production code unchanged, test-only bookmark permission pregrant.');

}finally{
 ws?.close();chrome.kill('SIGTERM');server.closeAllConnections();await new Promise(r=>server.close(r));
 await delay(500);fs.rmSync(temp,{recursive:true,force:true});
}

