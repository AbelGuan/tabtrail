import test from 'node:test';
import assert from 'node:assert/strict';
import {thumbnailWorker} from '../extension/thumbnail-worker.js';
import {PREVIEW_AUTO_KEY,THUMBNAIL_KEY} from '../extension/thumbnails.js';
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);},fire(...args){this.listeners.forEach(fn=>fn(...args));}});
function fixture(){
 const data={config:{recording:true,excluded:[]},[PREVIEW_AUTO_KEY]:false,records:[{id:'human',url:'https://visible.test/',day:'2026-10-14',group:'Human',manualGroup:true}],'pickmark-bookmarks-v1':{metadata:{human:{group:'Human bookmark',manualGroup:true}}}};
 const tab={id:1,windowId:1,active:true,status:'complete',url:'https://visible.test/',incognito:false};
 const state={allowed:false,focused:true,captures:0,fail:false,hold:null};
 const api={storage:{onChanged:event(),local:{get:async()=>structuredClone(data),set:async value=>{if(state.fail)throw Error('QUOTA_BYTES quota exceeded');Object.assign(data,structuredClone(value));}}},
  permissions:{contains:async()=>state.allowed,onRemoved:event()},runtime:{onInstalled:event(),onStartup:event()},
  windows:{getLastFocused:async()=>({id:1,focused:state.focused}),onFocusChanged:event()},
  tabs:{query:async()=>[structuredClone(tab)],get:async()=>structuredClone(tab),captureVisibleTab:async()=>{state.captures++;if(state.hold)await state.hold;return 'data:image/jpeg;base64,YQ==';},onActivated:event(),onUpdated:event()}};
 const worker=thumbnailWorker({api,serial:fn=>fn(),delayMs:100000});worker.cancel();
 return {api,data,tab,state,worker};
}
test('automatic previews require consent, permission, focus and an eligible loaded visible page',async()=>{
 const f=fixture(),before=structuredClone(f.data);
 await f.worker.capture();assert.equal(f.state.captures,0);
 f.data[PREVIEW_AUTO_KEY]=true;await f.worker.capture();assert.equal(f.state.captures,0);
 f.state.allowed=true;
 for(const [field,value] of [['focused',false]]){f.state[field]=value;await f.worker.capture();assert.equal(f.state.captures,0);f.state[field]=true;}
 f.tab.incognito=true;await f.worker.capture();f.tab.incognito=false;
 f.tab.status='loading';await f.worker.capture();f.tab.status='complete';
 f.data.config.recording=false;await f.worker.capture();f.data.config.recording=true;
 f.tab.url='https://mail.google.com/mail/';await f.worker.capture();
 f.tab.url='chrome://settings';await f.worker.capture();
 f.tab.url='https://visible.test/';f.data.config.excluded=['visible.test'];await f.worker.capture();f.data.config.excluded=[];
 assert.equal(f.state.captures,0);
 await f.worker.capture();assert.equal(f.state.captures,1);
 assert.ok(f.data[THUMBNAIL_KEY][f.tab.url]);await f.worker.capture();assert.equal(f.state.captures,1);
 assert.deepEqual(f.data.records,before.records);assert.deepEqual(f.data['pickmark-bookmarks-v1'],before['pickmark-bookmarks-v1']);
 f.worker.cancel();
});
test('tab switch or permission revocation during capture prevents an old image from being stored',async()=>{
 for(const revoke of [false,true]){
  const f=fixture();f.data[PREVIEW_AUTO_KEY]=true;f.state.allowed=true;
  let release;f.state.hold=new Promise(resolve=>release=resolve);
  const task=f.worker.capture();while(!f.state.captures)await new Promise(resolve=>setImmediate(resolve));
  if(revoke){f.state.allowed=false;f.api.permissions.onRemoved.fire({origins:['<all_urls>']});}
  else f.api.tabs.onActivated.fire({tabId:2,windowId:1});
  // Even switching away and back to the same URL cannot validate the old image.
  release();await assert.rejects(task,/变化/);assert.equal(f.data[THUMBNAIL_KEY],undefined);f.worker.cancel();
 }
});
test('automatic preview capacity rejection preserves manual state and bookmark classifications',async()=>{
 const f=fixture();f.data[PREVIEW_AUTO_KEY]=true;f.state.allowed=true;f.state.fail=true;
 const before=structuredClone(f.data);await assert.rejects(f.worker.capture(),/QUOTA/);assert.deepEqual(f.data,before);f.worker.cancel();
});
