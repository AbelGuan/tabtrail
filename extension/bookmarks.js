// Independent bookmark metadata: never move or rewrite the browser's tree.
import {writeLocal} from './storage-budget.js';
import {UNGROUPED,excludedUrl,manageWorkspace,orderedWorkspaces,reorderByKey,updateRules} from './core.js';
import {mergeRuleBackup} from './rule-transfer.js';
export const BOOKMARK_KEY='pickmark-bookmarks-v1';
export function flattenBookmarks(tree,metadata={},excluded=[]){
 const rows=[];
 function walk(nodes,path=[]){for(const node of nodes||[]){
  if(node.url){
   let url;try{url=new URL(node.url);}catch{continue;}
   if(!['http:','https:'].includes(url.protocol)||excludedUrl(node.url,excluded))continue;
   const saved=metadata[node.id];const current=saved?.url===node.url?saved:null;
   rows.push({id:String(node.id),url:node.url,title:node.title||url.hostname,domain:url.hostname,folder:path.join(' / ')||'书签',folderId:String(node.parentId||''),firstSeen:node.dateAdded||0,group:current?.group||UNGROUPED,manualGroup:!!current?.manualGroup});
  }else walk(node.children,node.title?[...path,node.title]:path);
 }}walk(tree);return rows;
}
export function classifyBookmarks(rows,rules){return rows.map(r=>{
 if(r.manualGroup||r.group!==UNGROUPED)return r;
 const text=`${r.title} ${r.domain}`.toLowerCase();
 const rule=rules.find(x=>x.enabled!==false&&text.includes(x.keyword.toLowerCase()));
 return rule?{...r,group:rule.group}:r;
});}
export function bookmarkMetadata(rows){return Object.fromEntries(rows.filter(r=>r.group!==UNGROUPED||r.manualGroup).map(r=>[r.id,{url:r.url,group:r.group,manualGroup:r.manualGroup}]));}
export function changeBookmarks(state,message){
 const revision=state.revision||0,action=message.type.slice('bookmarks:'.length);
 if(message.expectedRevision!==revision)throw Error('书签分类已更新，请刷新后重试 / Bookmark data changed; refresh and retry');
 let rows=state.rows.map(r=>({...r})),rules=state.rules.map(r=>({...r})),groups=[...state.groups],icons={...state.icons};
 const name=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>40)throw Error('名称须为 1–40 字 / Name must be 1–40 characters');return value.trim();};
 if(action==='patch'){
  const r=rows.find(r=>r.id===message.id&&r.url===message.url);if(!r)throw Error('书签已变化，请刷新 / Bookmark changed');
  r.group=name(message.group);r.manualGroup=true;
 }else if(action==='classify'){
  if(!Array.isArray(message.ids))throw Error('Invalid bookmark scope');
  const ids=new Set(message.ids);rows=rows.map(r=>ids.has(r.id)?classifyBookmarks([r],rules)[0]:r);
 }else if(action==='rule'||action==='deleteRule'||action==='reorderRules'){
  const base=message.original?rules.find(r=>r.keyword===message.original):action==='deleteRule'?rules.find(r=>r.keyword===message.keyword):undefined;
  if((message.original||action==='deleteRule')&&!base)throw Error('规则已不存在 / Rule no longer exists');
  rules=updateRules(rules,{type:action,base,expected:rules,keyword:message.keyword,target:message.target,value:{keyword:message.keyword,group:message.group}});
 }else if(action==='importRules'){rules=mergeRuleBackup(rules,message.backup).rules;
 }else if(action==='reorderGroups'){groups=reorderByKey(groups.filter(g=>g!==UNGROUPED),message.source,message.target);
 }else if(action==='workspace'){
  const operation=message.action==='merge'?'delete':message.action;
  if(message.action==='merge'&&(!groups.includes(message.target)||message.target===UNGROUPED))throw Error('请选择目标分类 / Select target category');
  const data=manageWorkspace({records:rows,config:{rules,workspaces:groups.filter(g=>g!==UNGROUPED),workspaceOrder:groups,workspaceIcons:icons,workspaceRevision:revision}},{...message,action:operation,target:message.action==='delete'?UNGROUPED:message.target});
  rows=data.records;rules=data.config.rules;groups=orderedWorkspaces(rows,data.config);icons=data.config.workspaceIcons;
 }else throw Error('未知书签操作 / Unknown bookmark operation');
 return {rows,rules,groups:[...new Set([...groups,...rows.map(r=>r.group),...rules.map(r=>r.group)])].filter(g=>g!==UNGROUPED),icons,revision:revision+1};
}
export async function handleBookmarks(message,api,excluded=[]){
 if(!await api.permissions.contains({permissions:['bookmarks']}))throw Error('请先授权读取书签');
 const stored=(await api.storage.local.get(BOOKMARK_KEY))[BOOKMARK_KEY]||{};
 const rows=flattenBookmarks(await api.bookmarks.getTree(),stored.metadata,excluded),rules=Array.isArray(stored.rules)?stored.rules:[],groups=Array.isArray(stored.groups)?stored.groups:[];
 let state={rows,rules,groups:[...new Set([...groups,...rows.map(r=>r.group),...rules.map(r=>r.group)])].filter(g=>g!==UNGROUPED),icons:stored.icons||{},revision:stored.revision||0};
 if(message.type!=='bookmarks:get'){
  state=changeBookmarks(state,message);
  await writeLocal({[BOOKMARK_KEY]:{metadata:bookmarkMetadata(state.rows),rules:state.rules,groups:state.groups,icons:state.icons,revision:state.revision}},api);
 }
 return state;
}

