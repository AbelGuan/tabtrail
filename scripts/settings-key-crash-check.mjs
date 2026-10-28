// Real browser SIGKILL regression. Attach a worker debugger only to pause the
// cleanup immediately before its atomic write; production files are unchanged.
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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tabkeep-key-crash-'));
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

let browser,ws,serial=0;const waiting=new Map();
const origin='chrome-extension://'+createHash('sha256').update(fs.realpathSync(temp+'/extension')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
async function until(fn,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){const v=await fn();if(v)return v;await delay(100);}throw Error('Timed out waiting for browser restart condition');}
const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
async function launch(restore=false){
 fs.rmSync(temp+'/profile/DevToolsActivePort',{force:true});
 browser=spawn(executable,[`--user-data-dir=${temp}/profile`,'--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--no-proxy-server','--ignore-certificate-errors','--remote-debugging-port=0',`--host-resolver-rules=MAP api.deepseek.com 127.0.0.1:${server.address().port}, MAP example.test 127.0.0.1:${server.address().port}`,`--load-extension=${temp}/extension`,`--disable-extensions-except=${temp}/extension`,...(restore?['--restore-last-session']:['about:blank'])],{stdio:'ignore',detached:true});
 await until(()=>fs.existsSync(temp+'/profile/DevToolsActivePort'));
 const [port,socket]=fs.readFileSync(temp+'/profile/DevToolsActivePort','utf8').trim().split('\n');
 ws=new WebSocket('ws://127.0.0.1:'+port+socket);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=waiting.get(m.id);if(!p)return;waiting.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 ws.addEventListener('close',()=>{for(const p of waiting.values())p.reject(Error('Browser fully closed'));waiting.clear();});
 console.log('Launched browser PID',browser.pid,(await cdp('Browser.getVersion')).product);
}
async function close(){
 const proc=browser,exited=new Promise(resolve=>proc.once('exit',(code,signal)=>resolve({code,signal})));
 await cdp('Browser.close').catch(()=>{});
 const result=await Promise.race([exited,delay(15000).then(()=>{throw Error('Browser process did not exit');})]);
 assert.equal(result.code,0);assert.equal(proc.exitCode,0);console.log('Confirmed complete process exit',proc.pid);browser=null;ws=null;return proc.pid;
}
async function killBrowser(){
 const proc=browser,exited=new Promise(resolve=>proc.once('exit',(code,signal)=>resolve({code,signal})));
 process.kill(-proc.pid,'SIGKILL');
 const result=await exited;assert.equal(result.signal,'SIGKILL');console.log('Confirmed forced process-group exit',proc.pid);
 browser=null;ws=null;return proc.pid;
}
async function panel(block=false){
 const {targetId}=await cdp('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await cdp('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 if(block){await cdp('Network.enable',{},sessionId);await cdp('Network.setBlockedURLs',{urls:[origin+'/dashboard.js?v=20260917-15']},sessionId);}
 await cdp('Page.navigate',{url:origin+'/dashboard.html'},sessionId);
 await until(()=>evaluate('!!chrome.storage'));
 await evaluate(`(async()=>{window.send=async m=>{const r=await chrome.runtime.sendMessage({...m,locale:'zh'});if(r.error)throw Error(r.error);return r.value;};window.core=await import('./core.js?v=20260917-15');(await import('./i18n.js')).setLanguage('zh');})()`);
 return evaluate;
}
try{
 await launch();let run=await panel(true);
 await cdp('Target.createTarget',{url:'https://example.test/1'});
 await until(()=>run("chrome.tabs.query({}).then(t=>t.some(x=>x.url==='https://example.test/1'&&x.status==='complete'))"));
 await run("send({type:'get'})");
 await run(`(async()=>{
  const folder=await chrome.bookmarks.create({title:'Synthetic restart folder'});
  const book=await chrome.bookmarks.create({parentId:folder.id,title:'Synthetic protected bookmark',url:'https://bookmark.test/synthetic'});
  const config={...core.defaults(),rules:[{keyword:'example.test',group:'Fixture rule'}]};
  await chrome.storage.local.set({config,lastCleanupAt:Date.now(),apiKeys:{deepseek:'fake-local-only',openai:'synthetic-other'},records:[
   {id:'human',day:core.dayKey(),url:'https://example.test/1',domain:'example.test',title:'Human',group:'Protected',snapshotGroup:'Protected',manualGroup:true},
   {id:'pending',day:core.dayKey(Date.now()-86400000),url:'https://pending.test/old',domain:'pending.test',title:'Pending',group:'待整理',snapshotGroup:'待整理'}
  ],'pickmark-bookmarks-v1':{metadata:{[book.id]:{url:book.url,group:'Bookmark human',manualGroup:true}},revision:1,rules:[],groups:['Bookmark human']}});
  window.historyDay=core.dayKey(Date.now()-86400000);window.baseline=core.classificationContext(config,'');
  window.flow=(await import('./history-workflow.js')).organizeHistory;
 })()`);
 const competitor=await panel();
 const base=await run("(async()=>{const s=await send({type:'getHistory'});return {config:s.config,signature:core.settingsSignature(s.config)};})()");
 const attempts=await Promise.allSettled([run,competitor].map((client,i)=>client('send('+JSON.stringify({type:'settings',expectedSettings:base.signature,apiKey:i?'panel-second':'panel-first',value:{...base.config}})+')')));
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(attempts.filter(r=>r.status==='rejected').length,1);
 await run("(async()=>{const s=await send({type:'getHistory'});window.baseline=core.classificationContext(s.config,s.preference||'');})()");
 console.log('PASS two extension panels saving the same baseline: one whole commit succeeds, stale panel is rejected.');

 // Exercise the actual form, including its optional key and blank-key path.
 await competitor('document.querySelector("#settings-shortcut").click()');
 await until(()=>competitor('!!document.querySelector("#settings-dialog[open]")'));
 await competitor(`window.formMessages=[];const original=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=(m,...args)=>{window.formMessages.push(m.type);return original(m,...args);};document.querySelector('#api-key').value='synthetic-ui-key';document.querySelector('#save-settings').click();`);
 await until(()=>competitor('!document.querySelector("#settings-dialog[open]")'));
 assert.deepEqual(await competitor("formMessages.filter(t=>t==='settings'||t==='key')"),['settings']);
 assert.equal(await run("chrome.storage.local.get('apiKeys').then(d=>d.apiKeys.deepseek)"),'synthetic-ui-key');
 await competitor('document.querySelector("#settings-shortcut").click()');await until(()=>competitor('!!document.querySelector("#settings-dialog[open]")'));
 await competitor("window.formMessages=[];document.querySelector('#api-key').value='';document.querySelector('#save-settings').click()");
 await until(()=>competitor('!document.querySelector("#settings-dialog[open]")'));
 assert.deepEqual(await competitor("formMessages.filter(t=>t==='settings'||t==='key')"),['settings']);
 assert.equal(await run("chrome.storage.local.get('apiKeys').then(d=>d.apiKeys.deepseek)"),'synthetic-ui-key');
 await run("(async()=>{const s=await send({type:'getHistory'});window.baseline=core.classificationContext(s.config,s.preference||'');})()");
 console.log('PASS real settings form: one settings message, no separate key write; blank preserves saved key.');
 mode='hold';
 await run("void flow({send,day:historyDay,ids:['pending']}).then(v=>window.outcome={value:v},e=>window.outcome={error:e.message})");
 try{await until(()=>requests.length===1);}catch(error){console.log('AI setup outcome',await run('window.outcome'));throw error;}
 const stale=await run("({type:'historyAssign',day:historyDay,expectedContext:baseline,assignments:[{id:'pending',group:'Resurrected',baseTitle:'Pending',baseGroup:'待整理',baseManual:false,baseSnapshot:'待整理'}]})");
 await run(`(async()=>{
  const d=await chrome.storage.local.get(null);
  d['pickmark-thumbnails-v1']={'https://example.test/cache':{at:Date.now(),image:'data:image/jpeg;base64,'+'A'.repeat(1000000)}};
  d['restart-padding']='';const bytes=Object.entries(d).reduce((n,[k,v])=>n+new TextEncoder().encode(k).length+new TextEncoder().encode(JSON.stringify(v)).length,0);
  d['restart-padding']='x'.repeat(10*1024*1024-128*1024+2048-bytes);
  await chrome.storage.local.set(d);
 })()`);
 assert.equal((await run("send({type:'get'})")).storageWarning,true);
 const before=await run('chrome.storage.local.get(["records","pickmark-bookmarks-v1","apiKeys"])');
 const tree=await run('chrome.bookmarks.getTree().then(tree=>tree[0].children)');
 // Establish a disk-persisted baseline before simulating abrupt loss.
 await close();await launch(true);run=await panel(true);
 // Keep the originally captured AI response and old commit envelope for replay.
 assert.equal((await run("send({type:'get'})")).storageWarning,true);
 const firstPid=await killBrowser();
 await launch(true);assert.notEqual(browser.pid,firstPid);
 run=await panel(true);
 await until(()=>run("chrome.tabs.query({}).then(t=>t.some(x=>x.url==='https://example.test/1'))"));
 const restored=await run("send({type:'get'})");assert.equal(restored.storageWarning,true);
 assert.ok(restored.records.some(r=>r.id==='human'&&r.manualGroup&&r.group==='Protected'));
 assert.ok(restored.records.some(r=>r.id==='pending'));
 assert.deepEqual(await run('chrome.storage.local.get("pickmark-bookmarks-v1")'),{'pickmark-bookmarks-v1':before['pickmark-bookmarks-v1']});
 assert.deepEqual(await run('chrome.storage.local.get("apiKeys")'),{apiKeys:before.apiKeys});
 assert.deepEqual(await run('chrome.bookmarks.getTree().then(tree=>tree[0].children)'),tree);
 let ui=await panel();
 await until(()=>ui('!!document.querySelector("#storage-warning")&&!document.querySelector("#storage-warning").hidden'));
 await ui('document.querySelector("#storage-warning button").click()');
 await until(()=>ui('document.querySelector("#storage-summary").textContent.includes("MB")'));
 // Accept only the synthetic cleanup confirmation; execute the real UI handler.
 await ui('window.confirm=()=>true;document.querySelector("#clear-preview-cache").click()');
 await until(()=>ui('document.querySelector("#storage-warning").hidden'));
 // Pause the actual worker immediately before the atomic cleanup storage commit.
 const target=(await cdp('Target.getTargets')).targetInfos.find(t=>t.type==='service_worker'&&t.url===origin+'/background.js');
 const workerSession=(await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
 let paused;
 const listener=e=>{const m=JSON.parse(e.data);if(m.sessionId===workerSession&&m.method==='Debugger.paused')paused=m.params;};
 ws.addEventListener('message',listener);await cdp('Debugger.enable',{},workerSession);
 const storageSource=fs.readFileSync(root+'/extension/storage-budget.js','utf8').split('\n');
 const lineNumber=storageSource.findIndex(line=>line.includes('await api.storage.local.set(patch)'));assert.ok(lineNumber>=0);
 await cdp('Debugger.setBreakpointByUrl',{url:origin+'/storage-budget.js',lineNumber},workerSession);
 await run("(async()=>{const state=await send({type:'getHistory'});void send({type:'settings',expectedSettings:core.settingsSignature(state.config),apiKey:'after-crash-new',value:{...state.config,excluded:['pending.test','bookmark.test']}}).then(v=>window.cleanupOutcome=v,e=>window.cleanupOutcome={error:e.message});})()");
 await until(()=>paused);
 assert.ok(paused.callFrames.some(f=>f.functionName==='writeLocal'));
 const patchValue=await cdp('Debugger.evaluateOnCallFrame',{callFrameId:paused.callFrames[0].callFrameId,expression:'JSON.stringify({ids:patch.records?.map(r=>r.id),revision:patch.config?.historyRevision})',returnByValue:true},workerSession);
 const pendingPatch=JSON.parse(patchValue.result.value);assert.ok(!pendingPatch.ids.includes('pending'));assert.ok(pendingPatch.ids.includes('human'));
 await killBrowser();await launch(true);run=await panel(true);
 const interrupted=await run("send({type:'get'})");
 assert.ok(interrupted.records.some(r=>r.id==='human'&&r.manualGroup&&r.group==='Protected'));
 assert.ok(interrupted.records.some(r=>r.id==='pending'),'Interrupted pre-commit cleanup must leave original history intact');
 assert.deepEqual(await run('chrome.storage.local.get("pickmark-bookmarks-v1")'),{'pickmark-bookmarks-v1':before['pickmark-bookmarks-v1']});
 assert.deepEqual(await run('chrome.storage.local.get("apiKeys")'),{apiKeys:before.apiKeys});
 console.log('PASS forced exit inside settings transaction before storage commit: complete old state survives; manual and bookmark classifications intact.');
 await run("(async()=>{const state=await send({type:'getHistory'});return send({type:'settings',expectedSettings:core.settingsSignature(state.config),apiKey:'after-crash-new',value:{...state.config,excluded:['pending.test','bookmark.test']}});})()");
 before.apiKeys={...before.apiKeys,deepseek:'after-crash-new'};
 before['pickmark-bookmarks-v1']={...before['pickmark-bookmarks-v1'],metadata:{},revision:before['pickmark-bookmarks-v1'].revision+1};
 await killBrowser();await launch(true);run=await panel(true);ui=await panel();
 responses.forEach(respond=>respond());assert.equal((await run('send('+JSON.stringify(stale)+')')).accepted,false);
 await cdp('Target.createTarget',{url:'https://example.test/after-full-restart'});
 await until(()=>run("chrome.storage.local.get('records').then(d=>d.records.some(r=>r.url==='https://example.test/after-full-restart'))"));
 const recovered=await run("send({type:'get'})");assert.deepEqual(recovered.config.excluded,['pending.test','bookmark.test']);assert.equal(recovered.storageWarning,undefined);assert.equal(recovered.config.recording,true);
 assert.ok(recovered.records.some(r=>r.id==='human'&&r.group==='Protected'&&r.manualGroup));assert.ok(!recovered.records.some(r=>r.id==='pending'));
 assert.deepEqual(await run('chrome.bookmarks.getTree().then(tree=>tree[0].children)'),tree);
 assert.deepEqual(await run('chrome.storage.local.get("pickmark-bookmarks-v1")'),{'pickmark-bookmarks-v1':before['pickmark-bookmarks-v1']});
 assert.deepEqual(await run('chrome.storage.local.get("apiKeys")'),{apiKeys:before.apiKeys});
 await until(()=>ui('!!document.querySelector("#storage-warning")&&document.querySelector("#storage-warning").hidden'));
 console.log('PASS forced exit at quota and after settings commit, session restoration, settings, cleanup, new page recording, manual classification and bookmark tree/metadata persistence, stale AI rejection.');
 const secondPid=await killBrowser();await launch(true);assert.notEqual(browser.pid,secondPid);run=await panel(true);
 const final=await run("send({type:'get'})");assert.equal(final.storageWarning,undefined);
 assert.ok(!final.records.some(r=>r.id==='pending'));assert.ok(final.records.some(r=>r.url==='https://example.test/1'&&r.manualGroup&&r.group==='Protected'));
 assert.equal((await run('send('+JSON.stringify(stale)+')')).accepted,false);
 assert.deepEqual(await run('chrome.bookmarks.getTree().then(tree=>tree[0].children)'),tree);
 assert.deepEqual(await run('chrome.storage.local.get("pickmark-bookmarks-v1")'),{'pickmark-bookmarks-v1':before['pickmark-bookmarks-v1']});
 assert.deepEqual(await run('chrome.storage.local.get("apiKeys")'),{apiKeys:before.apiKeys});
 console.log('PASS repeated forced restart: cleanup persisted on disk, manual/bookmark data intact, deleted history still absent and old AI commit still rejected.');
 await close();
}finally{
 if(browser){process.kill(-browser.pid,'SIGKILL');await delay(500);}ws?.close();
 server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});
}




