import test from 'node:test';import assert from 'node:assert/strict';
import {changeBookmarks} from '../extension/bookmarks.js';
const initial=()=>({revision:0,groups:['A','B'],icons:{},rules:[{keyword:'alpha',group:'A'},{keyword:'beta',group:'B'}],rows:[{id:'1',url:'https://test/a',folder:'Original',group:'A',manualGroup:true},{id:'2',url:'https://test/b',folder:'Other',group:'待整理',title:'alpha',domain:'test'}]});
const mutate=(s,action,p)=>changeBookmarks(s,{type:'bookmarks:'+action,expectedRevision:s.revision,...p});
test('bookmark categories preserve icons, order, original folders and manual ownership across merge/delete',()=>{
 let s=initial();s=mutate(s,'workspace',{action:'icon',name:'A',icon:'music'});s=mutate(s,'workspace',{action:'rename',name:'A',target:'C'});assert.equal(s.icons.C,'music');assert.equal(s.rows[0].manualGroup,true);
 s=mutate(s,'reorderGroups',{source:'B',target:'C'});assert.equal(s.groups[0],'B');
 s=mutate(s,'workspace',{action:'merge',name:'C',target:'B'});assert.equal(s.rows[0].group,'B');assert.equal(s.rules[0].group,'B');assert.equal(s.rows[0].folder,'Original');assert.equal(s.icons.C,undefined);
 s=mutate(s,'workspace',{action:'delete',name:'B'});assert.equal(s.rows[0].group,'待整理');assert.equal(s.rows[0].manualGroup,true);assert.equal(s.rows.length,2);
 const after=mutate(s,'classify',{ids:['1','2']});assert.equal(after.rows[0].manualGroup,true);
});
test('bookmark rule edits preserve priority; import merges, reorder persists, stale writes fail atomically',()=>{
 let s=initial();s=mutate(s,'rule',{original:'alpha',keyword:'gamma',group:'A'});assert.equal(s.rules[0].keyword,'gamma');
 s=mutate(s,'reorderRules',{keyword:'beta',target:'gamma'});assert.equal(s.rules[0].keyword,'beta');
 s=mutate(s,'importRules',{backup:{type:'attention-atlas-rules',version:1,rules:[{keyword:'BETA',group:'C'},{keyword:'delta',group:'D'}]}});assert.equal(s.rules.length,3);assert.equal(s.rules[0].group,'B');
 const copy=structuredClone(s);assert.throws(()=>changeBookmarks(s,{type:'bookmarks:deleteRule',keyword:'beta',expectedRevision:0}));assert.throws(()=>mutate(s,'workspace',{action:'nonsense',name:'A'}));assert.throws(()=>mutate(s,'workspace',{action:'merge',name:'A',target:'missing'}));assert.throws(()=>mutate(s,'rule',{original:'gamma',keyword:'beta',group:'A'}));assert.deepEqual(s,copy);
 s=mutate(s,'deleteRule',{keyword:'beta'});assert.equal(s.rules[0].keyword,'gamma');
});
