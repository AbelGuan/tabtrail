import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceActivity,reviewData,retainVisits,MAX_GAP} from '../extension/activity.js';
import {defaults,dayKey} from '../extension/core.js';
import {siteRuns} from '../extension/review-model.js';
const cfg=defaults(),base=new Date(2026,8,18,9).getTime();
const a={url:'https://a.test/',domain:'a.test',title:'A',group:'研究',tabId:1,mode:'active'},b={...a,url:'https://b.test/',domain:'b.test',tabId:2};
function step(state,page,now,config=cfg){return advanceActivity(state.visits,state.cursor,page,now,config);}
const initial=()=>({visits:[],cursor:null});
test('checkpoints accumulate once and ordered transitions preserve direction',()=>{
 let s=step(initial(),a,base);s=step(s,a,base+30000);s=step(s,b,base+60000);s=step(s,a,base+90000);s=step(s,null,base+120000);
 const d=reviewData(s.visits,dayKey(base));assert.equal(d.total,120000);assert.equal(s.visits.length,3);assert.deepEqual(siteRuns(d.visits).map(r=>r.domain),['a.test','b.test','a.test']);assert.ok(d.visits.every(v=>v.chain===d.visits[0].chain));
 const again=step(s,null,base+120000);assert.equal(reviewData(again.visits,dayKey(base)).total,120000);
});
test('background, pause, excluded domains, restarts and long gaps never accrue or bridge time',()=>{
 let s=step(initial(),a,base);s=step(s,null,base+30000);s=step(s,b,base+60000);s=step(s,null,base+90000);assert.notEqual(s.visits[0].chain,s.visits[1].chain);
 s=step(s,a,base+100000);s=step(s,b,base+100000+MAX_GAP+1);assert.equal(reviewData(s.visits,dayKey(base)).total,60000);
 s=step(s,b,base+100000+MAX_GAP+10000,{...cfg,recording:false});assert.equal(s.cursor.page,null);
 s=step(s,a,base+100000+MAX_GAP+20000,{...cfg,excluded:['a.test']});assert.equal(s.cursor.page,null);assert.ok(s.visits.every(v=>v.domain!=='a.test'));
 const resumed=advanceActivity(s.visits,null,b,base+999999,cfg);assert.deepEqual(resumed.visits,s.visits);
});
test('local midnight splits duration into calendar days without losing a second',()=>{
 const t=new Date(2026,8,18,23,59,40).getTime();let s=step(initial(),a,t);s=step(s,null,t+40000);
 assert.equal(s.visits.length,2);assert.equal(reviewData(s.visits,dayKey(t)).total,20000);assert.equal(reviewData(s.visits,dayKey(t+40000)).total,20000);
});
test('time clipping and searches do not invent a connection over filtered pages',()=>{
 let s=step(initial(),a,base);s=step(s,b,base+30000);s=step(s,a,base+60000);s=step(s,null,base+90000);
 const d=reviewData(s.visits,dayKey(base),{from:540,to:541,urls:new Set([a.url])});assert.equal(d.total,30000);assert.equal(siteRuns(d.visits).length,1);
 const clipped=reviewData(s.visits,dayKey(base),{from:541,to:542});assert.equal(clipped.total,30000);assert.equal(siteRuns(clipped.visits).length,1);
});
test('video mode segments are not extra visits or double counted',()=>{
 let s=step(initial(),a,base);s=step(s,{...a,mode:'video'},base+20000);s=step(s,null,base+40000);
 assert.deepEqual(s.visits.map(v=>v.mode),['active','video']);assert.equal(s.visits[0].visit,s.visits[1].visit);assert.equal(reviewData(s.visits,dayKey(base)).total,40000);assert.equal(siteRuns(s.visits).length,1);
});
test('retention removes old visits and all subdomains of excluded sites',()=>{
 const v={...a,start:base,end:base+1000,day:dayKey(base)};
 assert.equal(retainVisits([{...v,day:'2000-01-01'},{...v,url:'https://sub.a.test/'}],{...cfg,excluded:['a.test']},base).length,0);
});
