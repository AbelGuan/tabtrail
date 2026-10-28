import test from 'node:test';
import assert from 'node:assert/strict';
import {writeLocal,jsonBytes} from '../extension/storage-budget.js';
import {retainRecords,defaults,dayKey} from '../extension/core.js';
function fixture(){
 const manual={id:'manual',url:'https://open.test',day:'2020-01-01',title:'Human',group:'Human',manualGroup:true};
 const data={config:defaults(),records:[manual,...Array.from({length:2000},(_,i)=>({id:'h'+i,url:'https://closed.test/'+i,day:dayKey(),title:'x'.repeat(1500)}))],visits:[],bookmarks:{saved:true},padding:'x'.repeat(5*1024*1024)};
 const api={tabs:{query:async()=>[{url:manual.url}]},storage:{local:{get:async()=>structuredClone(data),set:async patch=>Object.assign(data,structuredClone(patch))}}};
 return {manual,data,api};
}
test('all write payloads protect open manual state before maintenance',async()=>{
 for(const type of ['records','visits','config','bookmark','thumbnail','keys']){
  const {manual,data,api}=fixture();const patches={records:{records:data.records},visits:{visits:[{day:dayKey(),url:'https://visit.test'}]},config:{config:{...data.config,idleSeconds:600}},bookmark:{bookmarks:{saved:'updated'}},thumbnail:{thumbnails:{cached:true}},keys:{apiKeys:{deepseek:'fake'}}};
  await writeLocal(patches[type],api);assert.deepEqual(data.records.find(r=>r.id===manual.id),manual,type);assert.ok(data.records.length<2001,type);assert.ok(jsonBytes(data)<10*1024*1024,type);assert.ok(data.config.historyRevision>0,type);
 }
});
test('protected state may borrow the history budget and never gets silently truncated',async()=>{
 const {manual,data,api}=fixture();data.records=[{...manual,title:'x'.repeat(2800000)}];await writeLocal({trackingSince:1},api);assert.equal(data.records[0].title.length,2800000);
 data.padding='x'.repeat(9*1024*1024);const before=structuredClone(data);await assert.rejects(writeLocal({trackingSince:2},api),/空间不足/);assert.deepEqual(data,before);
});
test('upstream retention does not silently discard oversized current manual state',()=>{
 const manual={id:'manual',url:'https://open.test',day:dayKey(),manualGroup:true,title:'x'.repeat(5*1024*1024)};
 assert.deepEqual(retainRecords([manual],defaults()),[manual]);
});
test('explicit record deletion cannot recover old manual rows; revisions stay monotonic',async()=>{
 const {data,api}=fixture();data.config.historyRevision=5;await writeLocal({records:[],config:{...data.config,historyRevision:1}},api);assert.deepEqual(data.records,[]);assert.equal(data.config.historyRevision,5);assert.deepEqual(data.bookmarks,{saved:true});
});
test('storage backend failure leaves classifications and bookmarks unchanged',async()=>{
 const {data,api}=fixture(),before=structuredClone(data);
 api.storage.local.set=async()=>{throw Error('QUOTA_BYTES quota exceeded');};
 await assert.rejects(writeLocal({bookmarks:{saved:'replacement'}},api),/QUOTA_BYTES/);
 assert.deepEqual(data,before);
});
