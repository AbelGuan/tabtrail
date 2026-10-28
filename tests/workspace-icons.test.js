import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,manageWorkspace} from '../extension/core.js';
test('workspace icon updates are revision checked and follow rename without altering records',()=>{
 const data={config:{...defaults(),workspaces:['A','B'],rules:[],workspaceIcons:{B:'book'}},records:[{id:'1',group:'A',snapshotGroup:'A',manualGroup:true}]};
 const icon=manageWorkspace(data,{action:'icon',name:'A',icon:'music',expectedRevision:0});
 assert.equal(icon.records,data.records);assert.equal(icon.config.workspaceIcons.A,'music');
 assert.throws(()=>manageWorkspace(icon,{action:'icon',name:'A',icon:'tools',expectedRevision:0}));
 assert.throws(()=>manageWorkspace(icon,{action:'icon',name:'A',icon:'<svg>',expectedRevision:1}));
 const renamed=manageWorkspace(icon,{action:'rename',name:'A',target:'C',expectedRevision:1});
 assert.equal(renamed.config.workspaceIcons.C,'music');assert.equal(renamed.config.workspaceIcons.A,undefined);
 assert.equal(renamed.records[0].snapshotGroup,'C');assert.equal(renamed.records[0].manualGroup,true);
 const merged=manageWorkspace(renamed,{action:'delete',name:'C',target:'B',expectedRevision:2});
 assert.deepEqual(merged.config.workspaceIcons,{B:'book'});assert.equal(merged.records[0].group,'B');assert.equal(merged.records[0].snapshotGroup,'B');assert.equal(merged.records[0].manualGroup,true);
 const reset=manageWorkspace(merged,{action:'icon',name:'B',icon:'auto',expectedRevision:3});assert.deepEqual(reset.config.workspaceIcons,{});
});
