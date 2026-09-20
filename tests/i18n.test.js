import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {english} from '../extension/translations.js';
import {t,setLanguage,getLanguage,workspaceLabel} from '../extension/i18n.js';
import {UNGROUPED,defaults,classificationContext,validatePlan} from '../extension/core.js';
import {organize} from '../extension/ai.js';
test('language changes display labels without changing storage values or interpolated user text',()=>{
 try {
  setLanguage('en');assert.equal(workspaceLabel(UNGROUPED),'Unsorted');
  assert.equal(workspaceLabel('工作区'),'工作区');
  assert.equal(t`排序工作区：${'每日回顾 {0}'}`,'Reorder workspace: 每日回顾 {0}');
  assert.equal(UNGROUPED,'待整理');
  assert.throws(()=>validatePlan({},['a']),/incomplete/);
  const en=classificationContext(defaults());setLanguage('zh');assert.notEqual(en,classificationContext(defaults()));
  assert.equal(t`排序工作区：${'My project'}`,'排序工作区：My project');
  setLanguage('unsupported');assert.equal(getLanguage(),'zh');
 }finally{setLanguage('zh');}
});
test('English catalog preserves all interpolation placeholders and covers static Chinese HTML',()=>{
 for(const [source,target] of Object.entries(english)){
  assert.ok(target.trim());
  const slots=text=>[...text.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
  assert.deepEqual(slots(source),slots(target),source);
 }
 const html=fs.readFileSync(new URL('../extension/dashboard.html',import.meta.url),'utf8');
 const texts=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim());
 const attrs=[...html.matchAll(/(?:title|aria-label|placeholder|alt)="([^"]+)"/g)].map(m=>m[1]);
 for(const source of [...texts,...attrs].filter(s=>/[\u3400-\u9fff]/.test(s))) {
  if(['中文','Language / 语言'].includes(source))continue;
  assert.ok(english[source],`Missing translation: ${source}`);
 }
});
test('English AI classification asks for English new names while preserving existing workspace names',async tctx=>{
 try {
  setLanguage('en');
  tctx.mock.method(globalThis,'fetch',async(url,init)=>{
   const body=JSON.parse(init.body);assert.match(body.messages[0].content,/must be concise English/);
   assert.match(body.messages[0].content,/Reuse existing workspace names exactly/);
   const input=JSON.parse(body.messages[1].content);assert.deepEqual(input.existingWorkspaces,['我的项目']);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({assignments:[{id:'one',group:'Research'}]})}}]}));
  });
  const plan=await organize([{id:'one',title:'A paper',domain:'example.com'}],[],'mock-key','mock-model',undefined,['我的项目']);
  assert.equal(plan.assignments[0].group,'Research');
 }finally{setLanguage('zh');}
});
