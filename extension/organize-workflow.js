import {getLanguage} from './i18n.js';
import {UNGROUPED,autoCandidates,orderedWorkspaces,excludedUrl,classificationContext} from './core.js?v=20260917-15';
import {organize} from './ai.js?v=20260917-15';
const openRecords=state=>state.records.filter(r=>r.day===state.today&&state.tabs.some(t=>t.url===r.url)&&!excludedUrl(r.url,state.config.excluded));
const signature=config=>JSON.stringify([config.provider,config.model,config.rules,config.excluded,config.workspaceRevision||0,config.savedPreference,config.savePreference]);
// One lock wraps the whole operation in the caller. Refresh before each batch,
// so the next request reuses newly created workspaces and respects user edits.
export async function organizeOpenTabs({send,request=organize,onProgress=()=>{},shouldContinue=()=>true,force=false,ids=null}) {
  let state=await send({type:'get'});
  const result={total:0,local:0,ai:0,unresolved:0,batches:0,remaining:0,reason:'complete',suggestions:[]};
  if(!state.config.recording)return {...result,reason:'paused'};
  const scope=new Set(openRecords(state).filter(r=>!ids||ids.includes(r.id)).map(r=>r.id));result.total=scope.size;
  const local=await send({type:'applyRules',ids:[...scope]});result.local=local.matched;
  state=await send({type:'get'});
  const initial=openRecords(state).filter(r=>scope.has(r.id));
  const seeds=new Set(autoCandidates(initial).map(r=>r.id));
  // Revisit accumulated uncertain pages only when there is new classification evidence.
  // Keep fresh pages last so an interrupted backlog review remains retryable.
  const reviewBacklog=!force&&seeds.size>0;
  const language=getLanguage(),baseline=signature(state.config),preference=state.preference||'',attempted=new Set();
  for(;;){
    const available=openRecords(state).filter(r=>scope.has(r.id)&&!attempted.has(r.id));
    const freshIds=new Set(autoCandidates(available).map(r=>r.id));
    const candidates=force?available.filter(r=>r.manualGroup||!r.ruleMatched):available.filter(r=>freshIds.has(r.id)||(reviewBacklog&&!r.manualGroup&&!r.ruleMatched&&r.group===UNGROUPED)).sort((a,b)=>Number(seeds.has(a.id))-Number(seeds.has(b.id)));
    result.unresolved=openRecords(state).filter(r=>scope.has(r.id)&&r.group===UNGROUPED).length;
    result.remaining=candidates.length;onProgress({...result});
    if(!candidates.length)return result;
    if(!state.config.recording)return {...result,reason:'paused'};
    if((getLanguage()!==language||signature(state.config)!==baseline||(state.preference||'')!==preference))return {...result,reason:'changed'};
    if(!shouldContinue(state))return {...result,reason:'stopped'};
    if(!state.hasKey)return {...result,reason:'no-key'};
    const batch=candidates.slice(0,200);
    const key=await send({type:'getKey',provider:state.config.provider});
    if(!key)return {...result,reason:'no-key'};
    const plan=await request(batch,state.config.rules,key,state.config.model,AbortSignal.timeout(90000),orderedWorkspaces(state.records,state.config),state.config.provider,preference,{
      pending: candidates.filter(r=>!batch.some(b=>b.id===r.id)).sort((a,b)=>Number(seeds.has(b.id))-Number(seeds.has(a.id))).slice(0,200),
      workspaces: openRecords(state).filter(r=>r.group!==UNGROUPED)
    });
    const fresh=await send({type:'get'});
    if(!fresh.config.recording||(getLanguage()!==language||signature(fresh.config)!==baseline||(fresh.preference||'')!==preference))return {...result,reason:'changed'};
    const assignments=plan.assignments.filter(a=>fresh.tabs.some(t=>t.url===batch.find(r=>r.id===a.id)?.url)).map(a=>{const before=batch.find(r=>r.id===a.id);return {...a,baseTitle:before.title,baseGroup:before.group,baseManual:!!before.manualGroup};});
    await send({type:'assign',assignments,workspaceRevision:state.config.workspaceRevision||0,expectedContext:classificationContext(state.config,preference)});
    batch.forEach(r=>attempted.add(r.id));result.batches++;
    state=await send({type:'get'});
    result.ai+=assignments.filter(a=>state.records.some(r=>r.id===a.id&&r.group===a.group&&r.aiTitle===a.baseTitle)).length;
    for(const rule of plan.rules)if(!result.suggestions.some(r=>r.keyword===rule.keyword))result.suggestions.push(rule);
  }
}
