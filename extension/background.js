import {t,setLanguage} from './i18n.js';
import {retainVisits} from './activity.js';
import {activityWorker} from './activity-worker.js';
import {preferenceText,mergeRuleBackup} from './rule-transfer.js?v=20260917-15';
import {providerFor,sessionKeys} from './providers.js?v=20260917-15';
import {defaults, assertSettingsCurrent, retainRecords, classificationContext, collect, eligible, dayKey, removeReadingStatus, normalizeDomain, canAssign, updateRules, orderedWorkspaces, reorderByKey, manageWorkspace, applyLocalRules} from './core.js?v=20260917-15';
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
const snapshotRecords=records=>records.map(r=>r.day===dayKey()||!r.snapshotGroup?{...r,snapshotGroup:r.group}:r);
let queue = Promise.resolve();
function serial(fn) { const task = queue.then(fn); queue = task.catch(console.error); return task; }
const activity=activityWorker(serial);
async function read() {
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const data = await chrome.storage.local.get(['records','config']);
  const config={...defaults(),...data.config};
  const hadLegacy=Object.hasOwn(config,'autoOrganize');delete config.autoOrganize;
  const source=data.records||[];
  const cleaned=removeReadingStatus(source);
  const records=retainRecords(cleaned,config);
  if(hadLegacy||cleaned.some((r,i)=>r!==source[i])||records.length!==source.length)await chrome.storage.local.set({records,config});
  return {records:snapshotRecords(records),config};
}
async function readKeys() {
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const stored=await chrome.storage.local.get(['apiKeys']);
  const legacy=await chrome.storage.session.get(['apiKey','apiKeys']);
  const keys={...sessionKeys(legacy),...stored.apiKeys};
  if(Object.hasOwn(legacy,'apiKey')||Object.hasOwn(legacy,'apiKeys')) {
    await chrome.storage.local.set({apiKeys:keys});
    await chrome.storage.session.remove(['apiKey','apiKeys']);
  }
  return keys;
}
async function sync(activeId=null) {
  const data = await read();
  const tabs = await chrome.tabs.query({});
  if (data.config.recording) {
    data.records = collect(data.records, tabs, data.config, Date.now(), activeId);
    data.records=snapshotRecords(data.records);
    await chrome.storage.local.set({records:snapshotRecords(data.records)});
  }
  const keys=await readKeys();
  const prefs=await chrome.storage.session.get(['classificationPreference']);
  return {...data, preference:prefs.classificationPreference ?? data.config.savedPreference, tabs:tabs.filter(t=>eligible(t,data.config)).map(({id,windowId,url})=>({id,windowId,url})), hasKey:!!keys[data.config.provider], keyProviders:Object.entries(keys).filter(([,key])=>!!key).map(([id])=>id), today:dayKey()};
}
chrome.runtime.onInstalled.addListener(()=>serial(()=>sync()));
chrome.runtime.onStartup.addListener(()=>serial(()=>sync()));
chrome.tabs.onCreated.addListener(()=>serial(()=>sync()));
chrome.tabs.onRemoved.addListener(()=>serial(()=>sync()));
chrome.tabs.onUpdated.addListener((id,info)=>{if(info.url || Object.hasOwn(info,'title') || info.status==='complete') serial(()=>sync());});
chrome.tabs.onActivated.addListener(({tabId})=>serial(()=>sync(tabId)));
async function handle(message) {
  if(message.type==='get') {const review=await activity.sample();return {...await sync(),...review};}
  if(message.type==='key' || message.type==='getKey') {
    const provider=message.provider || (await read()).config.provider;providerFor(provider);
    const keys=await readKeys();
    if(message.type==='getKey')return keys[provider] || '';
    keys[provider]=String(message.value||'').trim();
    await chrome.storage.local.set({apiKeys:keys});return true;
  }
  if(message.type==='clear') {await activity.clear();await chrome.storage.local.set({records:[],config:{...(await read()).config,recording:false}}); return true;}
  const data=await read();
  if(message.type==='preference') {
    const text=preferenceText(message.value);
    data.config={...data.config,savedPreference:message.save?text:'',savePreference:!!message.save};
    await chrome.storage.local.set({config:data.config});
    await chrome.storage.session.set({classificationPreference:text});return true;
  }
  if(message.type==='importRules') {
    const result=mergeRuleBackup(data.config.rules,message.backup);
    data.config.rules=result.rules;await chrome.storage.local.set({config:data.config});return {added:result.added,skipped:result.skipped};
  }
  if(message.type==='restoreDay') {
    if(!data.config.recording)throw new Error(t('请先在设置中开启记录，再恢复工作现场。'));
    const ids=new Set(message.ids||[]),source=data.records.filter(r=>r.day===message.day&&ids.has(r.id)&&eligible({url:r.url},data.config));
    if(!source.length)throw new Error(t('这个日期没有可恢复的页面。'));
    const openedTabs=await chrome.tabs.query({}),urls=new Set(openedTabs.filter(t=>!t.incognito).map(t=>t.url));
    let opened=0,existing=0,failed=0;const restored=[];
    for(const record of source) {
      if(urls.has(record.url)){existing++;continue;}
      try{const tab=await chrome.tabs.create({url:record.url,active:false});urls.add(record.url);openedTabs.push({...tab,url:record.url,title:record.title});restored.push(record);opened++;}catch{failed++;}
    }
    data.records=collect(data.records,openedTabs,data.config,Date.now());
    data.records=data.records.map(r=>{const old=restored.find(item=>item.url===r.url);return r.day===dayKey()&&old?{...r,group:old.snapshotGroup||old.group,manualGroup:true,aiTitle:r.title}:r;});
    await chrome.storage.local.set({records:snapshotRecords(data.records)});return {opened,existing,failed};
  }
  if(message.type==='settings') {
    assertSettingsCurrent(data.config,message.expectedSettings);
    await activity.sample({stop:true});
    const {recording, excluded, model}=message.value;
    const provider=message.value.provider || data.config.provider;const info=providerFor(provider);
    const nextModel=String(model||'').trim().slice(0,80)||info.model;
    const providerModels={...data.config.providerModels,[data.config.provider]:data.config.model,[provider]:nextModel};
    data.config={...data.config,idleSeconds:[60,300,600,900].includes(Number(message.value.idleSeconds))?Number(message.value.idleSeconds):(data.config.idleSeconds||300),provider,providerModels,recording:!!recording,excluded:[...new Set(excluded.map(normalizeDomain).filter(Boolean))],model:nextModel};
    data.records=data.records.filter(r=>eligible({url:r.url},data.config));
    await chrome.storage.local.set({...data,records:snapshotRecords(data.records)}); await activity.configure();return true;
  }
  if(['rule','deleteRule','reorderRules'].includes(message.type)) {
    data.config.rules=updateRules(data.config.rules,message);
    await chrome.storage.local.set({config:data.config}); return true;
  }
  if(message.type==='applyRules') {
    if(!data.config.recording)return {matched:0};
    const tabs=await chrome.tabs.query({});
    const ids=data.records.filter(r=>r.day===dayKey()&&message.ids.includes(r.id)&&tabs.some(t=>t.url===r.url&&eligible(t,data.config))).map(r=>r.id);
    const result=applyLocalRules(data.records,data.config.rules,ids);
    await chrome.storage.local.set({records:snapshotRecords(result.records)});return {matched:result.matched};
  }
  if(message.type==='workspace') {const next=manageWorkspace(data,message);await chrome.storage.local.set({...next,records:snapshotRecords(next.records)});return true;}
  if(message.type==='reorderWorkspaces') {
    data.config.workspaceOrder=reorderByKey(orderedWorkspaces(data.records,data.config,true),message.source,message.target);
    await chrome.storage.local.set({config:data.config});return true;
  }
  if(message.type==='patch') {
    const record=data.records.find(r=>r.id===message.id);
    if(!record) throw new Error(t('记录已不存在，请刷新。'));
    if(typeof message.value.group==='string'&&message.value.group.trim()&&message.value.group.length<=40) { record.group=message.value.group.trim(); record.manualGroup=true;record.ruleMatched=false; }
    await chrome.storage.local.set({records:snapshotRecords(data.records)}); return true;
  }
  if(message.type==='assign') {
    if(!data.config.recording)return false;
    const prefs=await chrome.storage.session.get(['classificationPreference']);
    if(message.expectedContext!==undefined&&message.expectedContext!==classificationContext(data.config,prefs.classificationPreference??data.config.savedPreference))return false;
    const tabs=await chrome.tabs.query({});

    if(message.workspaceRevision!==undefined && message.workspaceRevision!==(data.config.workspaceRevision||0))return false;
    for(const a of message.assignments) {
      const record=data.records.find(r=>r.id===a.id);
      if(record?.day===dayKey()&&tabs.some(t=>t.url===record.url&&eligible(t,data.config))&&canAssign(record,a)&&typeof a.group==='string'&&a.group.trim()&&a.group.length<=40) { record.group=a.group.trim(); record.aiTitle=record.title; }
    }
    await chrome.storage.local.set({records:snapshotRecords(data.records)}); return true;
  }
  if(message.type==='jump'||message.type==='jumpVisit') {
    const record=message.type==='jump'?data.records.find(r=>r.id===message.id):
      retainVisits((await chrome.storage.local.get(['visits'])).visits||[],data.config).find(v=>v.visit===message.visit&&v.day===message.day&&v.url===message.url);
    if(!record) throw new Error(t('记录已不存在。'));
    const tabs=await chrome.tabs.query({});
    const tab=tabs.find(t=>t.url===record.url&&!t.incognito);
    if(tab) {await chrome.windows.update(tab.windowId,{focused:true}); await chrome.tabs.update(tab.id,{active:true});}
    else await chrome.tabs.create({url:record.url});
    return true;
  }
  throw new Error(t('未知操作'));
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type==='mediaState'){
    if(sender.id!==chrome.runtime.id||!sender.tab||typeof message.playing!=='boolean')return false;
    serial(()=>activity.sample({mediaMessage:{tab:sender.tab,frameId:sender.frameId,playing:message.playing}})).then(()=>reply({value:true}),()=>reply({value:false}));return true;
  }
  if(sender.id!==chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  serial(()=>{setLanguage(message.locale);return handle(message);}).then(value=>reply({value}),error=>reply({error:error.message}));
  return true;
});
