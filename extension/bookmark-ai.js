import {handleBookmarks,BOOKMARK_KEY,bookmarkMetadata,classifyBookmarks} from './bookmarks.js';
import {UNGROUPED} from './core.js';
import {requestRecordsSignature} from './classification-request.js';
import {writeLocal} from './storage-budget.js';
const settings=c=>JSON.stringify([c.provider,c.model,c.excluded||[],c.settingsRevision||0]);
const candidates=rows=>rows.filter(r=>r.group===UNGROUPED&&!r.manualGroup);
export function bookmarkAIService({api,readConfig,readKeys,organize,serial,timeoutMs=90000}){
 const active=new Map();
 const snapshot=async()=>{const config=await readConfig(),book=await handleBookmarks({type:'bookmarks:get'},api,config.excluded);return {config,book};};
 return async message=>{
  if(message.type==='bookAI:cancel'){active.get(message.token)?.abort();return true;}
  const {config,book}=await snapshot();
  const ids=new Set(message.ids||[]),scope=book.rows.filter(r=>ids.has(r.id));
  if(message.type==='bookAI:prepare'){
   const pending=candidates(scope),after=classifyBookmarks(pending,book.rules),ai=candidates(after);
   return {ids:scope.map(r=>r.id),signature:requestRecordsSignature(scope),revision:book.revision,settings:settings(config),provider:config.provider,model:config.model,hasKey:!!(await readKeys())[config.provider],total:scope.length,local:pending.length-ai.length,ai:ai.length,protected:scope.length-pending.length,preview:ai.slice(0,50).map(({title,domain})=>({title,domain}))};
  }
  if(message.expectedRevision!==book.revision||message.settings!==settings(config)||message.signature!==requestRecordsSignature(scope))throw Error('书签或配置已变化，请重新确认范围 / Bookmarks or settings changed; confirm again');
  if(message.type==='bookAI:rules'){
   const updated=await handleBookmarks({type:'bookmarks:classify',ids:message.ids,expectedRevision:book.revision},api,config.excluded);
   const current=updated.rows.filter(r=>ids.has(r.id));return {revision:updated.revision,signature:requestRecordsSignature(current),remaining:candidates(current).length};
  }
  if(message.type!=='bookAI:batch')throw Error('Unknown bookmark AI action');
  const attempted=new Set(message.attempted||[]),batch=candidates(scope).filter(r=>!attempted.has(r.id)).slice(0,200);
  if(!batch.length)return {done:true,remaining:candidates(scope).length};
  const key=(await readKeys())[config.provider];if(!key)throw Error('请先配置 AI Key / Configure an AI key first');
  if(typeof message.token!=='string'||active.has(message.token))throw Error('Invalid request token');
  const controller=new AbortController();active.set(message.token,controller);
  const timeout=setTimeout(()=>controller.abort(new DOMException('Timeout','TimeoutError')),timeoutMs);
  const heartbeat=setInterval(()=>api.storage.local.get([]).catch(()=>{}),20000);
  const pending=organize(batch,book.rules,key,config.model,controller.signal,book.groups,config.provider,'',{pending:[],workspaces:[]}).then(plan=>serial(async()=>{
   if(controller.signal.aborted)throw Error('请求已取消或超时 / Request cancelled or timed out');
   const fresh=await snapshot();
   if(fresh.book.revision!==book.revision||settings(fresh.config)!==settings(config)||(await readKeys())[config.provider]!==key||requestRecordsSignature(fresh.book.rows.filter(r=>ids.has(r.id)))!==message.signature)throw Error('书签或配置已变化，旧结果未保存 / Data changed; stale result discarded');
   const assignments=new Map((plan.assignments||[]).map(a=>[a.id,a.group])),batchIds=new Set(batch.map(r=>r.id));let applied=0;
   const rows=fresh.book.rows.map(r=>{const group=assignments.get(r.id);if(!batchIds.has(r.id)||r.group!==UNGROUPED||r.manualGroup||typeof group!=='string'||!group.trim()||group.trim().length>40||group.trim()===UNGROUPED)return r;applied++;return {...r,group:group.trim()};});
   const next={...fresh.book,rows,revision:book.revision+1};
   await writeLocal({[BOOKMARK_KEY]:{metadata:bookmarkMetadata(rows),rules:next.rules,groups:next.groups,icons:next.icons,revision:next.revision}},api);
   const current=rows.filter(r=>ids.has(r.id));return {revision:next.revision,signature:requestRecordsSignature(current),attempted:batch.map(r=>r.id),applied,remaining:candidates(current).length};
  })).finally(()=>{clearTimeout(timeout);clearInterval(heartbeat);active.delete(message.token);});
  return {pending};
 };
}
