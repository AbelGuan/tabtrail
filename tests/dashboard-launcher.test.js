import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardLauncher} from '../extension/dashboard-launcher.js';

function fixture(tabs=[]){
 const calls=[],url='chrome-extension://mock/dashboard.html';
 const api={runtime:{getURL:()=>url},tabs:{query:async()=>structuredClone(tabs),create:async value=>{calls.push(['create',value]);const tab={id:9,windowId:4,...value};tabs.push(tab);return tab;},update:async(id,value)=>calls.push(['activate',id,value])},windows:{update:async(id,value)=>calls.push(['focus',id,value])}};
 return {open:dashboardLauncher(api),calls,url};
}
test('toolbar opens one full dashboard even for overlapping clicks',async()=>{
 const f=fixture();await Promise.all([f.open({windowId:4}),f.open({windowId:4})]);
 assert.equal(f.calls.filter(c=>c[0]==='create').length,1);
 assert.deepEqual(f.calls[0],['create',{url:f.url,active:true}]);
});
test('toolbar reuses dashboard with view hash/query and focuses its window',async()=>{
 const f=fixture([{id:2,windowId:7,url:'chrome-extension://mock/dashboard.html?version=old#settings'},{id:3,windowId:4,url:'chrome-extension://mock/dashboard.html#bookmarks'}]);
 await f.open({windowId:4});assert.deepEqual(f.calls,[['activate',3,{active:true}],['focus',4,{focused:true}]]);
});
test('toolbar ignores lookalike URLs and continues after a failed launch',async()=>{
 const f=fixture([{id:1,url:'https://example.test/dashboard.html'},{id:2,url:'chrome-extension://mock/dashboard.html.fake'},{id:3,url:'chrome-extension://mock/dashboard.html?surface=sidepanel'}]);
 await f.open();assert.equal(f.calls[0][0],'create');
 const api={runtime:{getURL:()=>f.url},tabs:{query:async()=>{throw Error('closed window');}}};
 const open=dashboardLauncher(api);await assert.rejects(open(),/closed window/);
 api.tabs.query=async()=>[];api.tabs.create=async()=>({id:8});assert.deepEqual(await open(),{id:8});
});
