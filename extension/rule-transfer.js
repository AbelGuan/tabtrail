import {t} from './i18n.js';
// Rule backups deliberately allowlist fields: never include URLs or credentials.
export function preferenceText(value) {
  if(typeof value!=='string'||value.length>2000)throw new Error(t('AI 分类偏好最多 2,000 字。'));
  return value.trim();
}
export function parseRuleBackup(value) {
  if(!value||value.type!=='attention-atlas-rules'||value.version!==1||!Array.isArray(value.rules)||value.rules.length>1000)throw new Error(t('请选择有效的分类规则备份（版本 1，最多 1,000 条）。'));
  const seen=new Set();
  const rules=value.rules.map(rule=>{
    if(!rule||typeof rule.keyword!=='string'||rule.keyword.trim().length<2||rule.keyword.length>80||typeof rule.group!=='string'||!rule.group.trim()||rule.group.length>40)throw new Error(t('文件中存在无效规则，尚未导入。'));
    const keyword=rule.keyword.trim(),group=rule.group.trim(),key=keyword.toLowerCase();
    if(seen.has(key))throw new Error(t('文件包含重复关键词，请先修正规则备份。'));
    seen.add(key);return {keyword,group};
  });
  return {type:'attention-atlas-rules',version:1,rules,...(value.preference!==undefined?{preference:preferenceText(value.preference)}:{})};
}
export function mergeRuleBackup(existing,backup) {
  const clean=parseRuleBackup(backup),keys=new Set(existing.map(r=>r.keyword.toLowerCase()));
  const added=clean.rules.filter(r=>!keys.has(r.keyword.toLowerCase()));
  if(existing.length+added.length>1000)throw new Error(t('合并后超过 1,000 条规则，请先清理。'));
  return {rules:[...existing,...added],added:added.length,skipped:clean.rules.length-added.length};
}
export function exportRuleBackup(config,includePreference=false) {
  return parseRuleBackup({type:'attention-atlas-rules',version:1,rules:config.rules,...(includePreference&&config.savePreference?{preference:config.savedPreference||''}:{})});
}
