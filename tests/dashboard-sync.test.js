import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsChanged} from '../extension/dashboard-sync.js';
test('cross-panel refresh ignores collection timestamps but keeps user and AI changes',()=>{
 const oldValue=[{id:'a',title:'Page',group:'研究',lastSeen:1}];
 assert.equal(recordsChanged({oldValue,newValue:[{...oldValue[0],lastSeen:2}]}),false);
 for(const patch of [{group:'学习'},{title:'New'},{aiTitle:'Page'},{manualGroup:true},{activations:1},{snapshotGroup:'旧项目'}])
  assert.equal(recordsChanged({oldValue,newValue:[{...oldValue[0],...patch}]}),true);
 assert.equal(recordsChanged({oldValue,newValue:[]}),true);
 assert.equal(recordsChanged({newValue:oldValue}),true);
});
