import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('local-hour filters and explicit timeline buckets agree across DST transitions',()=>{
 const moduleURL=new URL('../extension/activity.js',import.meta.url).href;
 const code=`
  import assert from 'node:assert/strict';
  import * as activity from ${JSON.stringify(moduleURL)};
  for(const [day,count] of [['2026-03-08',23],['2026-11-01',25],['2026-10-08',24]]){
   const start=new Date(day+'T10:00:00').getTime();
   const visits=[{day,start,end:start+60000,domain:'test',group:'Test'}];
   assert.equal(activity.reviewData(visits,day,{from:600,to:660}).total,60000,day);
   const slots=activity.reviewHours(day);
   assert.equal(slots.length,count);
   const ten=slots.find(s=>new Date(s.start).getHours()===10);
   assert.equal(activity.reviewData(visits,day,ten).total,60000);
   assert.equal(ten.start,start);
   for(let i=1;i<slots.length;i++)assert.equal(slots[i-1].end,slots[i].start);
   const all=[{day,start:slots[0].start,end:slots.at(-1).end,domain:'test',group:'Test'}];
   assert.equal(slots.reduce((sum,s)=>sum+activity.reviewData(all,day,s).total,0),activity.reviewData(all,day).total);
   for(const slot of slots)assert.equal(slot.quarters.reduce((sum,q)=>sum+q.end-q.start,0),slot.end-slot.start);
  }
  const day='2026-11-01',slots=activity.reviewHours(day),repeated=slots.filter(s=>new Date(s.start).getHours()===1);
  assert.equal(repeated.length,2);assert.notEqual(repeated[0].label,repeated[1].label);
  const visits=repeated.map(s=>({day,start:s.start+15*60000,end:s.start+16*60000,domain:'test',group:'Test'}));
  assert.equal(activity.reviewData(visits,day,{from:75,to:90}).total,120000);
  for(const slot of repeated)assert.equal(activity.reviewData(visits,day,slot.quarters[1]).total,60000);
 `;
 execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ:'America/New_York'},stdio:'pipe'});
});

test('half-hour DST transitions preserve every real minute exactly once',()=>{
 const moduleURL=new URL('../extension/activity.js',import.meta.url).href;
 const code=`
  import assert from 'node:assert/strict';
  import {reviewHours,reviewData} from ${JSON.stringify(moduleURL)};
  for(const [day,minutes] of [['2026-04-05',1470],['2026-10-04',1410]]){
   const slots=reviewHours(day),visits=[{day,start:slots[0].start,end:slots.at(-1).end,domain:'test',group:'Test'}];
   assert.equal(reviewData(visits,day).total,minutes*60000);
   assert.equal(slots.reduce((sum,s)=>sum+reviewData(visits,day,s).total,0),minutes*60000);
   for(const s of slots)assert.equal(s.quarters.reduce((sum,q)=>sum+q.end-q.start,0),s.end-s.start);
   assert.equal(reviewData(visits,day,{from:600,to:660}).total,3600000);
  }
 `;
 execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ:'Australia/Lord_Howe'},stdio:'pipe'});
});
