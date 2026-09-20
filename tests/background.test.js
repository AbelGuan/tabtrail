import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsSignature,defaults,dayKey} from '../extension/core.js';
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const local={},session={},updates=[],created=[];
let tabs=[{id:1,windowId:9,url:'https://example.com/a',title:'One'},{id:2,windowId:9,url:'https://example.com/a',title:'Duplicate'},{id:3,windowId:9,url:'https://secret.com/a',title:'Secret',incognito:true}];
function storage(data){return{async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])]))},async set(value){Object.assign(data,structuredClone(value));},async remove(keys){for(const key of keys)delete data[key];},async setAccessLevel(){}};}
const panelBehaviors=[];
globalThis.chrome={sidePanel:{async setPanelBehavior(value){panelBehaviors.push(value)}},storage:{local:storage(local),session:storage(session)},runtime:{id:'test',getURL:path=>`chrome-extension://test/${path}`,onInstalled:event(),onStartup:event(),onMessage:event()},tabs:{async query(){return structuredClone(tabs)},async update(id,patch){updates.push({id,patch})},async create(value){if(value.url==='https://failure.test/')throw new Error('test failure');created.push(value);const tab={id:100+created.length,windowId:9,...value};tabs.push(tab);return tab;},onCreated:event(),onRemoved:event(),onUpdated:event(),onActivated:event()},windows:{async update(id,patch){updates.push({window:id,patch})}}};
await import('../extension/background.js');
const send=input=>{const message=input.type==='settings'&&!Object.hasOwn(input,'expectedSettings')?{...input,expectedSettings:settingsSignature(local.config)}:input;return new Promise((resolve,reject)=>chrome.runtime.onMessage.listeners[0](message,{id:'test',url:'chrome-extension://test/dashboard.html'},response=>response.error?reject(new Error(response.error)):resolve(response.value)));};
test('worker serializes edits, persists state, preserves tabs and enforces privacy',async()=>{
 let state=await send({type:'get'});assert.equal(state.records.length,1);assert.equal(state.tabs.length,2);
 const id=state.records[0].id;
 await Promise.all([send({type:'patch',id,value:{group:'手动工作区'}}),send({type:'rule',value:{keyword:'example',group:'研究'}})]);
 state=await send({type:'get'});assert.equal(state.records[0].group,'手动工作区');assert.equal(state.config.rules.length,1);
 await send({type:'jump',id});assert.equal(created.length,0);assert.deepEqual(updates.at(-1),{id:1,patch:{active:true}});
 tabs=[];await send({type:'get'});await send({type:'jump',id});assert.deepEqual(created.at(-1),{url:'https://example.com/a'});
 await send({type:'key',value:'secret-api-key'});assert.equal(local.apiKeys.deepseek,'secret-api-key');assert.ok(!JSON.stringify(session).includes('secret-api-key'));
 state=await send({type:'get'});assert.equal(state.hasKey,true);assert.ok(!JSON.stringify(state).includes('secret-api-key'));
 await send({type:'settings',value:{...state.config,excluded:['example.com']}});
 state=await send({type:'get'});assert.equal(state.records.length,0);
 await send({type:'assign',assignments:[{id,group:'late AI result'}]});assert.equal((await send({type:'get'})).records.length,0);
 await send({type:'clear'});assert.equal((await send({type:'get'})).config.recording,false);
 tabs=[{id:4,url:'https://newsite.com',title:'New'}];assert.equal((await send({type:'get'})).records.length,0);
});
test('worker ignores messages from webpage contexts',()=>{
 const result=chrome.runtime.onMessage.listeners[0]({type:'getKey'},{id:'test',url:'https://example.com'},()=>assert.fail('must not reply'));
 assert.equal(result,false);
});

test('worker persists rule edits and ordering without changing existing records',async()=>{
 const before=structuredClone(local.records);
 await send({type:'rule',value:{keyword:'video',group:'视频'}});
 let state=await send({type:'get'});
 const original=state.config.rules.find(r=>r.keyword==='video');
 await send({type:'reorderRules',expected:state.config.rules,keyword:original.keyword,target:state.config.rules[0].keyword});
 await send({type:'rule',base:original,value:{keyword:'video',group:'创作'}});
 state=await send({type:'get'});assert.deepEqual(state.config.rules[0],{keyword:'video',group:'创作'});
 await assert.rejects(send({type:'deleteRule',base:original}),/其他窗口/);
 assert.equal((await send({type:'get'})).config.rules.length,2);
 await send({type:'deleteRule',base:state.config.rules[0]});
 assert.deepEqual((await send({type:'get'})).config.rules,[{keyword:'example',group:'研究'}]);
 assert.deepEqual(local.records,before);
});

test('worker isolates provider credentials and remembers each provider model',async()=>{
 await send({type:'key',provider:'openai',value:'openai-test-key'});
 assert.equal(await send({type:'getKey',provider:'deepseek'}),'secret-api-key');
 assert.equal(await send({type:'getKey',provider:'openai'}),'openai-test-key');
 let state=await send({type:'get'});
 await send({type:'settings',value:{...state.config,provider:'openai',model:'gpt-4.1-mini'}});
 state=await send({type:'get'});assert.equal(state.hasKey,true);assert.equal(state.config.providerModels.deepseek,'deepseek-flash');
 await send({type:'key',provider:'openai',value:''});
 assert.equal((await send({type:'get'})).hasKey,false);
 assert.equal(await send({type:'getKey',provider:'deepseek'}),'secret-api-key');
 assert.ok(!JSON.stringify(local).includes('test-key'));
 await assert.rejects(send({type:'key',provider:'unknown',value:'secret'}),/不支持/);
});
test('worker persists rule drag order and workspace order',async()=>{
 await send({type:'rule',value:{keyword:'reading',group:'阅读'}});
 let state=await send({type:'get'});
 await send({type:'reorderRules',expected:state.config.rules,keyword:'reading',target:'example'});
 assert.equal((await send({type:'get'})).config.rules[0].keyword,'reading');
 await send({type:'reorderWorkspaces',source:'研究',target:'阅读'});
 state=await send({type:'get'});assert.deepEqual(state.config.workspaceOrder,['研究','阅读']);
});

test('worker saves workspace migration and rejects late AI assignments after management',async()=>{
 let state=await send({type:'get'});
 await send({type:'workspace',action:'create',name:'空白项目',expectedRevision:state.config.workspaceRevision});
 state=await send({type:'get'});assert.ok(state.config.workspaces.includes('空白项目'));
 await send({type:'workspace',action:'rename',name:'研究',target:'研究资料',expectedRevision:state.config.workspaceRevision});
 state=await send({type:'get'});assert.ok(state.config.rules.some(r=>r.group==='研究资料'));
 assert.equal(await send({type:'assign',assignments:[],workspaceRevision:0}),false);
 await send({type:'workspace',action:'delete',name:'研究资料',target:'待整理',expectedRevision:state.config.workspaceRevision});
 state=await send({type:'get'});assert.ok(!state.config.workspaces.includes('研究资料'));assert.ok(state.config.rules.some(r=>r.group==='待整理'));
});

test('toolbar opens the side panel and preferences are opt-in persistent',async()=>{
 assert.deepEqual(panelBehaviors,[{openPanelOnActionClick:true}]);
 await send({type:'preference',value:'按项目分类',save:true});assert.equal(local.config.savedPreference,'按项目分类');
 await send({type:'preference',value:'仅本次偏好',save:false});assert.equal(local.config.savedPreference,'');assert.equal(local.config.savePreference,false);
 assert.ok(!JSON.stringify(local).includes('仅本次偏好'));assert.equal((await send({type:'get'})).preference,'仅本次偏好');
 delete session.classificationPreference;assert.equal((await send({type:'get'})).preference,'');
 await send({type:'preference',value:'保存偏好',save:true});delete session.classificationPreference;assert.equal((await send({type:'get'})).preference,'保存偏好');
});
test('restore a day deduplicates open URLs, retains groups, and reports retryable failures',async()=>{
 const {dayKey,defaults}=await import('../extension/core.js');const yesterday=dayKey(Date.now()-86400000);
 local.config=defaults();local.records=[
 {id:'old-open',day:yesterday,url:'https://already.test/',domain:'already.test',title:'Existing',group:'研究',snapshotGroup:'昨日项目',status:'待看'},
 {id:'old-closed',day:yesterday,url:'https://restore.test/',domain:'restore.test',title:'Closed',group:'修改后的名称',snapshotGroup:'昨日项目',snapshotStatus:'进行中',status:'待看'},
 {id:'fail',day:yesterday,url:'https://failure.test/',domain:'failure.test',title:'Failure',group:'研究',status:'待看'},
 {id:'bad',day:yesterday,url:'chrome://settings',domain:'settings',title:'Settings',group:'系统',status:'待看'}];
 tabs=[{id:20,windowId:9,url:'https://already.test/',title:'Existing'}];
 const request={type:'restoreDay',day:yesterday,ids:local.records.map(r=>r.id)};
 assert.deepEqual(await send(request),{opened:1,existing:1,failed:1});
 assert.deepEqual(created.at(-1),{url:'https://restore.test/',active:false});
 let state=await send({type:'get'});const restored=state.records.find(r=>r.day===state.today&&r.url==='https://restore.test/');
 assert.equal(restored.group,'昨日项目');assert.equal(Object.hasOwn(restored,'status'),false);assert.equal(restored.manualGroup,true);
 assert.deepEqual(await send(request),{opened:0,existing:2,failed:1});
 // Renaming a different current group must preserve an unrelated snapshot group.
 await send({type:'workspace',action:'rename',name:'修改后的名称',target:'现在的名称',expectedRevision:0});
 state=await send({type:'get'});assert.equal(state.records.find(r=>r.id==='old-closed').snapshotGroup,'昨日项目');
 await send({type:'settings',value:{...state.config,excluded:['restore.test']}});
 assert.ok(!(await send({type:'get'})).records.some(r=>r.url==='https://restore.test/'));
});
test('rule import validates before changing worker storage',async()=>{
 const before=structuredClone(local.config.rules);
 await assert.rejects(send({type:'importRules',backup:{type:'attention-atlas-rules',version:1,rules:[{keyword:'valid',group:'有效'},{keyword:'x',group:'无效'}]}}),/无效规则/);
 assert.deepEqual(local.config.rules,before);
});

test('paused recording still prunes expired records and removes obsolete configuration',async()=>{
 const {defaults,dayKey}=await import('../extension/core.js');
 local.config={...defaults(),recording:false,autoOrganize:false};
 local.records=[{id:'expired',day:'2000-01-01',url:'https://old.test/',group:'旧页面'},{id:'recent',day:dayKey(),url:'https://recent.test/',group:'近期',snapshotGroup:'原工作区',status:'待看',snapshotStatus:'进行中'}];
 const state=await send({type:'get'});
 assert.deepEqual(state.records.map(r=>r.id),['recent']);assert.equal(local.records.length,1);
 assert.equal(Object.hasOwn(local.config,'autoOrganize'),false);assert.equal(state.config.recording,false);
 assert.equal(Object.hasOwn(local.records[0],'status'),false);assert.equal(Object.hasOwn(local.records[0],'snapshotStatus'),false);assert.equal(local.records[0].snapshotGroup,'原工作区');
 await send({type:'patch',id:'recent',value:{status:'已处理'}});assert.equal(Object.hasOwn(local.records[0],'status'),false);
 assert.deepEqual(await send({type:'applyRules',ids:['recent']}),{matched:0});
});
test('worker rejects stale AI results at commit after preferences, pause or open tabs change',async()=>{
 const {defaults,dayKey,classificationContext}=await import('../extension/core.js');
 local.config=defaults();delete session.classificationPreference;
 tabs=[{id:90,windowId:1,url:'https://race.test/',title:'Race'}];local.records=[];
 let state=await send({type:'get'}),r=state.records[0];
 const assignment={id:r.id,group:'AI result',baseTitle:r.title,baseGroup:r.group,baseManual:false};
 const message={type:'assign',assignments:[assignment],expectedContext:classificationContext(state.config,state.preference)};
 await send({type:'preference',value:'新的偏好',save:false});
 assert.equal(await send(message),false);assert.equal(local.records[0].group,'待整理');
 state=await send({type:'get'});message.expectedContext=classificationContext(state.config,state.preference);
 await send({type:'settings',value:{...state.config,recording:false}});
 assert.equal(await send(message),false);assert.equal(local.records[0].group,'待整理');
 await send({type:'settings',value:{...state.config,recording:true}});tabs=[];
 await send(message);assert.equal(local.records[0].group,'待整理');
 tabs=[{id:90,windowId:1,url:r.url,title:r.title}];await send(message);assert.equal(local.records[0].group,'AI result');
});

 test('keys survive session reset, migrate old credentials and stay isolated by provider',async()=>{
  await send({type:'key',provider:'deepseek',value:'persistent-test-key'});
  await send({type:'key',provider:'openai',value:'other-test-key'});
  for(const key of Object.keys(session))delete session[key];
  assert.equal(await send({type:'getKey',provider:'deepseek'}),'persistent-test-key');
  assert.equal(await send({type:'getKey',provider:'openai'}),'other-test-key');
  session.apiKey='stale-key';session.apiKeys={anthropic:'migrated-test-key'};
  assert.equal(await send({type:'getKey',provider:'anthropic'}),'migrated-test-key');
  assert.equal(await send({type:'getKey',provider:'deepseek'}),'persistent-test-key');
  assert.equal(session.apiKey,undefined);assert.equal(session.apiKeys,undefined);
  await send({type:'key',provider:'deepseek',value:''});
  session.apiKey='stale-key';
  assert.equal(await send({type:'getKey',provider:'deepseek'}),'');
  assert.equal(await send({type:'getKey',provider:'openai'}),'other-test-key');
  const state=await send({type:'get'});
  assert.ok(!JSON.stringify(state).includes('test-key'));
 });

test('workspace rename and deletion migrate snapshots before restoring historical tabs',async()=>{
 const {defaults,dayKey}=await import('../extension/core.js');
 local.config=defaults();tabs=[];
 const day=dayKey(Date.now()-86400000);
 local.records=[
  {id:'snapshot',day,url:'https://snapshot.test/',domain:'snapshot.test',title:'Snapshot',group:'旧项目',snapshotGroup:'旧项目',status:'已处理',snapshotStatus:'进行中'},
  {id:'different',day,url:'https://different.test/',domain:'different.test',title:'Different',group:'其他项目',snapshotGroup:'旧项目',status:'待看',snapshotStatus:'已处理'}
 ];
 await send({type:'workspace',action:'rename',name:'旧项目',target:'新项目',expectedRevision:0});
 assert.deepEqual(local.records.map(r=>r.snapshotGroup),['新项目','新项目']);
 assert.equal(local.records[1].group,'其他项目');
 await send({type:'workspace',action:'delete',name:'新项目',target:'待整理',expectedRevision:1});
 assert.deepEqual(local.records.map(r=>r.snapshotGroup),['待整理','待整理']);
 assert.equal(local.records[1].group,'其他项目');
 await send({type:'restoreDay',day,ids:['snapshot','different']});
 const today=local.records.filter(r=>r.day===dayKey());
 assert.deepEqual(today.map(r=>r.group),['待整理','待整理']);
 assert.ok(today.every(r=>!Object.hasOwn(r,'status')&&!Object.hasOwn(r,'snapshotStatus')));
 assert.ok(today.every(r=>r.manualGroup));
});

test('title-only tab updates collect new metadata without a dashboard read',async()=>{
 const {defaults}=await import('../extension/core.js');local.config=defaults();local.records=[];
 tabs=[{id:91,windowId:1,url:'https://title.test/',title:'Before'}];
 await send({type:'get'});tabs[0].title='After';
 for(const listener of chrome.tabs.onUpdated.listeners)listener(91,{title:'After'},tabs[0]);
 // A non-collecting request waits for the worker queue without masking a missed event.
 await send({type:'getKey',provider:'deepseek'});
 assert.equal(local.records[0].title,'After');
});

test('worker errors use the requesting panel language without changing record storage',async()=>{
 await assert.rejects(send({type:'patch',id:'not-a-record',value:{},locale:'en'}),/record no longer exists/);
 await assert.rejects(send({type:'patch',id:'not-a-record',value:{},locale:'zh'}),/记录已不存在/);
});

test('stale settings cannot undo pause, exclusion or clear; unrelated rules do not conflict',async()=>{
 local.config=defaults();local.records=[];tabs=[];
 const baseline=settingsSignature(local.config);
 await send({type:'settings',expectedSettings:baseline,value:{...local.config,recording:false,excluded:['private.test']}});
 await assert.rejects(send({type:'settings',expectedSettings:baseline,value:{...defaults(),model:'changed'}}),/其他窗口/);
 assert.equal(local.config.recording,false);assert.deepEqual(local.config.excluded,['private.test']);
 const current=settingsSignature(local.config);
 await send({type:'rule',value:{keyword:'safe',group:'Safe'}});
 await send({type:'settings',expectedSettings:current,value:{...local.config,recording:true}});
 const beforeClear=settingsSignature(local.config);await send({type:'clear'});
 await assert.rejects(send({type:'settings',expectedSettings:beforeClear,value:{...local.config,recording:true}}),/其他窗口/);
 await assert.rejects(send({type:'settings',expectedSettings:undefined,value:defaults()}),/其他窗口/);
 assert.equal(local.config.recording,false);
});
test('review opens retained visits without daily records, reuses tabs and rejects missing or excluded visits',async()=>{
 local.config=defaults();local.records=[];tabs=[];
 const now=Date.now(),visit={visit:'review-visit',day:dayKey(now),url:'https://review.test/',domain:'review.test',start:now-1000,end:now};
 local.visits=[visit];
 const message={type:'jumpVisit',visit:visit.visit,day:visit.day,url:visit.url},before=created.length;
 await send(message);assert.equal(created.length,before+1);
 await send(message);assert.equal(created.length,before+1);assert.equal(updates.at(-1).patch.active,true);
 await assert.rejects(send({...message,url:'https://arbitrary.test/'}),/不存在/);
 local.config.excluded=['review.test'];await assert.rejects(send(message),/不存在/);
 local.config.excluded=[];local.visits=[{...visit,day:'2000-01-01'}];await assert.rejects(send({...message,day:'2000-01-01'}),/不存在/);
 local.visits=[];await assert.rejects(send(message),/不存在/);
});
