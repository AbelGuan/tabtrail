import test from 'node:test';
import assert from 'node:assert/strict';
import {activityWorker} from '../extension/activity-worker.js';
import {defaults} from '../extension/core.js';
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
function storage(data){return {async get(keys){return structuredClone(Object.fromEntries((keys===null?Object.keys(data):keys).filter(k=>k in data).map(k=>[k,data[k]])));},async set(v){Object.assign(data,structuredClone(v));},async remove(keys){keys.forEach(k=>delete data[k]);},async setAccessLevel(){}};}
test('worker honors video, lock, focus, exclusions, restarts and clear with atomic checkpoints',async()=>{
 let now=new Date(2026,8,18,10).getTime();const realNow=Date.now;Date.now=()=>now;
 const local={config:defaults(),records:[]},session={};let focused=true,idle='active';let tab={id:1,url:'https://video.test/',title:'Silent video',active:true};
 globalThis.chrome={storage:{local:storage(local),session:storage(session)},windows:{onFocusChanged:event(),async getLastFocused(){return {id:1,focused};}},tabs:{onActivated:event(),onRemoved:event(),onUpdated:event(),async query(){return [tab];}},idle:{setDetectionInterval(){},async queryState(){return idle;},onStateChanged:event()},alarms:{create(){},onAlarm:event()},runtime:{onStartup:event(),onInstalled:event()}};
 try{
  const tracker=activityWorker(fn=>fn());await tracker.sample();now+=20000;
  idle='idle';await tracker.sample({mediaMessage:{tab,frameId:0,playing:true}});assert.equal(local.activityCursor.page.mode,'video');now+=20000;
  idle='locked';await tracker.sample();assert.equal(local.activityCursor.page,null);assert.equal(local.visits.reduce((n,v)=>n+v.end-v.start,0),40000);
  now+=20000;idle='idle';focused=false;await tracker.sample({mediaMessage:{tab,frameId:0,playing:true}});assert.equal(local.activityCursor.page,null);
  now+=20000;focused=true;await tracker.sample({mediaMessage:{tab,frameId:0,playing:false}});assert.equal(local.activityCursor.page,null);
  idle='active';await tracker.sample();now+=20000;tab={...tab,incognito:true};await tracker.sample();assert.equal(local.activityCursor.page,null);
  tab={...tab,incognito:false};await tracker.sample();now+=20000;delete session.activityRun;const before=JSON.stringify(local.visits);await tracker.sample();assert.equal(JSON.stringify(local.visits),before);
  local.config.excluded=['video.test'];await tracker.configure();assert.equal(local.visits.length,0);assert.equal(local.activityCursor.page,null);assert.deepEqual(session.mediaFrames,{});
  local.config.excluded=[];local.config.recording=false;await tracker.sample({mediaMessage:{tab,frameId:0,playing:true}});assert.equal(local.activityCursor.page,null);assert.deepEqual(session.mediaFrames,{});
  await tracker.clear();assert.deepEqual(local.visits,[]);assert.equal(local.activityCursor,null);assert.equal(local.trackingSince,null);
 }finally{Date.now=realNow;delete globalThis.chrome;}
});
