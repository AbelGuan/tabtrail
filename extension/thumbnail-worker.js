import {defaults} from './core.js';
import {handleThumbnail,previewAllowed,THUMBNAIL_KEY,PREVIEW_AUTO_KEY} from './thumbnails.js';
// Consent is persistent; eligibility is checked again for each visible page.
// Timers hold no tab images. Network/hidden tabs/bookmarks are never opened.
export function thumbnailWorker({api,serial,delayMs=1100}){
 let timer,generation=0,lastAttempt=0;
 async function capture(){
  const token=generation,now=Date.now();
  const data=await api.storage.local.get(['config',PREVIEW_AUTO_KEY]);
  const config={...defaults(),...data.config};
  if(data[PREVIEW_AUTO_KEY]!==true||!config.recording||!await api.permissions.contains({origins:['<all_urls>']}))return;
  const window=await api.windows.getLastFocused();
  if(!window.focused||window.incognito)return;
  const [tab]=await api.tabs.query({active:true,lastFocusedWindow:true});
  if(!tab||tab.windowId!==window.id||tab.incognito||tab.status!=='complete'||!previewAllowed(tab.url,config.excluded))return;
  const cache=await api.storage.local.get(THUMBNAIL_KEY);
  if(now-lastAttempt<1000||now-(cache[THUMBNAIL_KEY]?.[tab.url]?.at||0)<300000)return;
  lastAttempt=now;
  const shouldSave=()=>token===generation;
  return handleThumbnail({type:'thumbnail:capture',url:tab.url},api,config,{shouldSave});
 }
 function schedule(){generation++;clearTimeout(timer);timer=setTimeout(()=>serial(capture).catch(()=>{}),delayMs);timer.unref?.();}
 function cancel(){generation++;clearTimeout(timer);}
 api.tabs.onActivated?.addListener(schedule);
 api.tabs.onUpdated?.addListener((id,info)=>{if(info.url||info.status==='complete')schedule();else if(info.status==='loading')cancel();});
 api.windows.onFocusChanged?.addListener(schedule);
 api.runtime.onStartup?.addListener(schedule);
 api.runtime.onInstalled?.addListener(schedule);
 api.alarms?.onAlarm?.addListener(alarm=>{if(alarm.name==='activity-checkpoint')schedule();});
 api.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes[PREVIEW_AUTO_KEY]){if(changes[PREVIEW_AUTO_KEY].newValue===true)schedule();else cancel();}});
 api.permissions?.onRemoved?.addListener(cancel);
 schedule();
 return {capture,schedule,cancel};
}
