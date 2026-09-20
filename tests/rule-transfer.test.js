import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRuleBackup,mergeRuleBackup,exportRuleBackup} from '../extension/rule-transfer.js';
const backup={type:'attention-atlas-rules',version:1,rules:[{keyword:'Video',group:'影像'},{keyword:'design',group:'设计'}],preference:'按项目分类'};
test('rule backups allowlist data and include only explicitly saved preferences',()=>{
 const config={rules:backup.rules.map(r=>({...r,url:'private-url'})),apiKey:'secret',records:['private'],savePreference:true,savedPreference:'按项目分类'};
 assert.deepEqual(Object.keys(exportRuleBackup(config)),['type','version','rules']);
 assert.equal(exportRuleBackup(config,true).preference,'按项目分类');
 assert.equal(exportRuleBackup({...config,savePreference:false},true).preference,undefined);
 assert.ok(!JSON.stringify(exportRuleBackup(config,true)).includes('private'));
 assert.ok(!JSON.stringify(exportRuleBackup(config,true)).includes('secret'));
});
test('import is atomic, keeps existing conflicts and appends in priority order',()=>{
 const existing=[{keyword:'video',group:'已有视频'},{keyword:'work',group:'工作'}];
 const result=mergeRuleBackup(existing,backup);
 assert.equal(result.added,1);assert.equal(result.skipped,1);assert.deepEqual(result.rules,[...existing,backup.rules[1]]);
 for(const value of [{...backup,version:2},{...backup,rules:[backup.rules[0],{keyword:'x',group:'错误'}]},{...backup,rules:[backup.rules[0],{keyword:'video',group:'重复'}]},{...backup,preference:'x'.repeat(2001)}])assert.throws(()=>mergeRuleBackup(existing,value));
 assert.equal(existing.length,2);
 assert.throws(()=>parseRuleBackup({version:1,records:[],rules:[]}));
});
