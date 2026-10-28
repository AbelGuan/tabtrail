import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeHistory} from '../extension/history-workflow.js';
import {defaults,historyCandidates,applyLocalRules,classificationContext} from '../extension/core.js';
import {setLanguage} from '../extension/i18n.js';
const day='2026-10-10';
function fixture(count=451){
 const state={config:defaults(),hasKey:true,preference:'',records:Array.from({length:count},(_,i)=>({id:String(i),day,url:`https://example.com/${i}`,domain:'example.com',title:`Page ${i}`,group:'待整理',snapshotGroup:'待整理'}))};
 const ids=state.records.map(r=>r.id);
 const send=async m=>{
  if(m.type==='getHistory')return structuredClone(state);
  if(m.type==='getKey')return state.hasKey?'test-key':'';
  if(!state.config.recording||m.expectedContext!==classificationContext(state.config,state.preference))return {accepted:false};
  if(m.type==='historyRules'){
   const scope=historyCandidates(state.records,m.day,state.config).filter(r=>m.ids.includes(r.id)).map(r=>r.id);
   const result=applyLocalRules(state.records,state.config.rules,scope);
   state.records=result.records.map(r=>scope.includes(r.id)?{...r,snapshotGroup:r.group}:r);
   return {accepted:true,matched:result.matched};
  }
  if(m.type==='historyAssign'){
   let applied=0;
   for(const a of m.assignments){
    const r=historyCandidates(state.records,m.day,state.config).find(r=>r.id===a.id);
    if(r&&r.title===a.baseTitle&&r.snapshotGroup===a.baseSnapshot){Object.assign(r,{group:a.group,snapshotGroup:a.group,aiTitle:r.title});applied++;}
   }
   return {accepted:true,applied};
  }
  assert.fail(`Unexpected operation: ${m.type}`);
 };
 return {state,send,day,ids};
}
const plan=rows=>({assignments:rows.map(r=>({id:r.id,group:'Research'})),rules:[]});

test('history never sends stale pages when privacy settings change while retrieving the key',async()=>{
 for(const change of [s=>{s.config.excluded=['example.com'];s.records=[];},s=>{s.config.recording=false;},s=>{s.records=[];s.config.recording=false;},s=>{s.records=[];},s=>{s.hasKey=false;},s=>{s.records[0].manualGroup=true;}]){
  const f=fixture(2);let requests=0;
  const send=async m=>{const response=await f.send(m);if(m.type==='getKey')change(f.state);return response;};
  const result=await organizeHistory({...f,send,request:async rows=>{requests++;return plan(rows);}});
  assert.equal(requests,0);assert.ok(['changed','paused','no-key'].includes(result.reason));
 }
});

test('451 closed historical pages run in bounded batches with no tab operations',async()=>{
 const f=fixture(),sizes=[];
 const result=await organizeHistory({...f,request:async(rows,rules,key,model,signal,names)=>{sizes.push(rows.length);if(sizes.length>1)assert.ok(names.includes('Research'));return plan(rows);}});
 assert.deepEqual(sizes,[200,200,51]);assert.equal(result.ai,451);assert.equal(result.unresolved,0);
 assert.ok(f.state.records.every(r=>r.snapshotGroup==='Research'));
 assert.equal((await organizeHistory({...f,request:()=>assert.fail('classified pages must be preserved')})).total,0);
});
test('local rules run without AI and preserve manual, classified, other-day and out-of-scope pages',async()=>{
 const f=fixture(6);f.state.hasKey=false;f.state.config.rules=[{keyword:'Page',group:'Docs'}];
 f.state.records[1].manualGroup=true;f.state.records[2].snapshotGroup='Saved';
 f.state.records[3].group='Existing';f.state.records[4].day='2026-10-09';f.ids.pop();
 const before=structuredClone(f.state.records.slice(1));
 const result=await organizeHistory({...f,request:()=>assert.fail('no AI expected')});
 assert.equal(result.local,1);assert.equal(f.state.records[0].snapshotGroup,'Docs');
 assert.deepEqual(f.state.records.slice(1),before);
});
test('AI opt-out applies rules without sending a request even with a saved key',async()=>{
 const f=fixture(2);f.state.config.rules=[{keyword:'Page 0',group:'Docs'}];
 const result=await organizeHistory({...f,allowAI:false,request:()=>assert.fail('AI not authorized')});
 assert.equal(result.reason,'rules-only');assert.equal(result.local,1);assert.equal(result.remaining,1);
});
test('failed batches preserve completed snapshots and explicit retry processes only pending pages',async()=>{
 const f=fixture();let calls=0;
 await assert.rejects(organizeHistory({...f,request:async rows=>{if(++calls===2)throw new Error('offline');return plan(rows);}}),/offline/);
 assert.equal(f.state.records.filter(r=>r.snapshotGroup==='Research').length,200);
 const sizes=[];await organizeHistory({...f,request:async rows=>{sizes.push(rows.length);return plan(rows);}});
 assert.deepEqual(sizes,[200,51]);
});
test('an uncertain result is attempted once per explicit run, without a retry loop',async()=>{
 const f=fixture(1);let calls=0;
 const result=await organizeHistory({...f,request:async rows=>{calls++;return {assignments:rows.map(r=>({id:r.id,group:'待整理'})),rules:[]};}});
 assert.equal(calls,1);assert.equal(result.unresolved,1);assert.equal(result.remaining,0);
});
test('pause, provider, preference, exclusion, workspace and language changes discard late AI results',async()=>{
 for(const change of [s=>s.config.recording=false,s=>s.config.provider='openai',s=>s.preference='new',s=>s.config.excluded=['example.com'],s=>s.config.workspaceRevision++,()=>setLanguage('en')]){
  try{
   const f=fixture(1);const result=await organizeHistory({...f,request:async rows=>{change(f.state);return plan(rows);}});
   assert.ok(['paused','changed'].includes(result.reason));assert.equal(f.state.records[0].group,'待整理');
  }finally{setLanguage('zh');}
 }
});
test('cleared key and leaving the selected date stop in-flight results from being committed',async()=>{
 const f=fixture(1);
 assert.equal((await organizeHistory({...f,request:async rows=>{f.state.hasKey=false;return plan(rows);}})).reason,'no-key');
 f.state.hasKey=true;let visible=true;
 assert.equal((await organizeHistory({...f,shouldContinue:()=>visible,request:async rows=>{visible=false;return plan(rows);}})).reason,'stopped');
 assert.equal(f.state.records[0].group,'待整理');
});
test('manual changes and snapshot edits during a request are preserved',async()=>{
 const f=fixture(3);
 const result=await organizeHistory({...f,request:async rows=>{
  Object.assign(f.state.records[0],{group:'Manual',snapshotGroup:'Manual',manualGroup:true});
  f.state.records[1].snapshotGroup='Another panel';
  return plan(rows);
 }});
 assert.equal(result.ai,1);assert.equal(f.state.records[0].snapshotGroup,'Manual');assert.equal(f.state.records[1].snapshotGroup,'Another panel');
});
test('a stale confirmation cannot apply rules or send AI under new settings',async()=>{
 const f=fixture(1),expectedContext=classificationContext(f.state.config,'');
 f.state.config.rules=[{keyword:'Page',group:'New rule'}];
 const result=await organizeHistory({...f,expectedContext,request:()=>assert.fail()});
 assert.equal(result.reason,'changed');assert.equal(f.state.records[0].group,'待整理');
});
