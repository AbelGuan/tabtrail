import {defaults,eligible} from './core.js?v=20260917-15';
import {advanceActivity} from './activity.js';
import {writeLocal} from './storage-budget.js';
export function activityWorker(serial) {
 const supported=!!(chrome.idle&&chrome.alarms&&chrome.windows.onFocusChanged);
 async function sample({mediaMessage,reset=false,stop=false,commit=true}={}) {
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const now=Date.now();
  const data=await chrome.storage.local.get(['config','records','visits','activityCursor','trackingSince']);
  const config={...defaults(),...data.config};
  const session=await chrome.storage.session.get(['activityRun','mediaFrames']);
  const run=session.activityRun||crypto.randomUUID();
  if(!session.activityRun)await chrome.storage.session.set({activityRun:run});
  let frames=session.mediaFrames||{};
  frames=Object.fromEntries(Object.entries(frames).filter(([,f])=>now-f.at<45000&&eligible(f,config)&&config.recording));
  if(mediaMessage&&config.recording&&eligible(mediaMessage.tab,config)){
   const {tab,frameId,playing}=mediaMessage;
   frames[`${tab.id}:${frameId}`]={url:tab.url,playing,at:now,tabId:tab.id};
  }
  await chrome.storage.session.set({mediaFrames:frames});
  let page=null;
  if(supported&&config.recording&&!stop){
   chrome.idle.setDetectionInterval(config.idleSeconds||300);
   const idle=await chrome.idle.queryState(config.idleSeconds||300);
   const win=await chrome.windows.getLastFocused();
   if(win.focused&&!win.incognito&&idle!=='locked'){
    const [tab]=await chrome.tabs.query({active:true,windowId:win.id});
    if(tab&&eligible(tab,config)){
     const playing=Object.values(frames).some(f=>f.tabId===tab.id&&f.url===tab.url&&f.playing);
     if(idle==='active'||playing){
      const record=(data.records||[]).findLast(r=>r.url===tab.url);
      page={url:tab.url,domain:new URL(tab.url).hostname,title:tab.title||new URL(tab.url).hostname,group:record?.group||'待整理',tabId:tab.id,mode:playing?'video':'active'};
     }
    }
   }
  }
  const previous=!reset&&data.activityCursor?.run===run?data.activityCursor:null;
  const result=advanceActivity(data.visits||[],previous,page,now,config);
  const trackingSince=data.trackingSince||(supported&&config.recording?now:null);
  const patch={visits:result.visits,activityCursor:{...result.cursor,run},trackingSince};
  if(!commit)return patch;
  const saved=await writeLocal(patch);
  return {visits:saved.visits,trackingSince};
 }
 async function clear(){await writeLocal({visits:[],activityCursor:null,trackingSince:null});await chrome.storage.session.remove(['mediaFrames']);}
 if(supported){
  chrome.idle.setDetectionInterval(300);
  chrome.alarms.create('activity-checkpoint',{periodInMinutes:1});
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='activity-checkpoint')serial(()=>sample());});
  chrome.idle.onStateChanged.addListener(()=>serial(()=>sample()));
  chrome.windows.onFocusChanged.addListener(()=>serial(()=>sample()));
  chrome.tabs.onActivated.addListener(()=>serial(()=>sample()));
  chrome.tabs.onRemoved.addListener(()=>serial(()=>sample()));
  chrome.tabs.onUpdated.addListener((id,info)=>{if(info.url||Object.hasOwn(info,'title')||info.status==='complete')serial(()=>sample());});
  chrome.runtime.onStartup.addListener(()=>serial(()=>sample({reset:true})));
  chrome.runtime.onInstalled.addListener(()=>serial(()=>sample({reset:true})));
 }
 return {sample,clear,configureIdle(config){if(supported)chrome.idle.setDetectionInterval(config?.idleSeconds||300);},async configure(){const {config}=await chrome.storage.local.get(['config']);if(supported)chrome.idle.setDetectionInterval(config?.idleSeconds||300);return sample();}};
}
