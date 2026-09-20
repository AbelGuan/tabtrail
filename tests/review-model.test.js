import test from 'node:test';
import assert from 'node:assert/strict';
import {siteRuns,visitPages} from '../extension/review-model.js';
const v=(domain,start,end,visit='v',chain='a')=>({domain,url:`https://${domain}/${visit}`,start,end,visit,chain,mode:'active'});
test('display merges only consecutive same-site visits, retaining every page and duration',()=>{
 const visits=[v('a',0,10,'one'),v('a',10,20,'two'),v('b',20,30),v('a',30,40,'one')];
 const original=structuredClone(visits),runs=siteRuns(visits);
 assert.equal(runs.length,3);assert.equal(runs[0].total,20);assert.equal(runs[0].items.length,2);assert.equal(runs[2].domain,'a');assert.deepEqual(runs.flatMap(r=>r.items),visits);assert.deepEqual(visits,original);
});
test('gaps, hidden visits and different chains never become continuous runs',()=>{
 assert.equal(siteRuns([v('a',0,10),v('a',20,30),v('a',30,40,'v','b')]).length,3);
});
test('mode checkpoints merge into a page while returns remain separate',()=>{
 const items=[v('a',0,10),{...v('a',10,20),mode:'video'},v('a',20,30,'other'),v('a',30,40)];
 const pages=visitPages(items);assert.equal(pages.length,3);assert.equal(pages[0].end,20);assert.equal(pages[0].video,true);assert.equal(pages.reduce((n,v)=>n+v.end-v.start,0),40);
});
test('twelve hours of rapid browsing retains all information behind compact site runs',()=>{
 const visits=Array.from({length:720},(_,i)=>v(String(Math.floor(i/8)%3),i*60000,(i+1)*60000,String(i)));
 const runs=siteRuns(visits);assert.equal(runs.length,90);assert.equal(runs.flatMap(r=>r.items).length,720);assert.equal(runs.reduce((n,r)=>n+r.total,0),12*3600000);
});
