import {dayKey, eligible} from './core.js?v=20260917-15';
export const MAX_GAP = 90_000;
export const MAX_VISITS = 12000;
export function retainVisits(visits,config,now=Date.now()) {
 const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-29);
 const kept=visits.filter(v=>v.day>=dayKey(cutoff)&&eligible(v,config)).slice(-MAX_VISITS);
 // Reserve room for the existing daily records under Chrome's local quota.
 let bytes=0,index=kept.length;
 while(index>0){const size=JSON.stringify(kept[index-1]).length*3;if(bytes+size>4*1024*1024)break;bytes+=size;index--;}
 return kept.slice(index);
}
// A checkpoint and its accumulated segments are committed together. Unobserved long
// gaps (sleep, worker interruption) never become estimated browsing time.
export function advanceActivity(visits,cursor,current,now,config) {
 let next=retainVisits(visits,config,now).map(v=>({...v})),chain=cursor?.chain||crypto.randomUUID();
 const valid=cursor&&now>=cursor.at&&now-cursor.at<=MAX_GAP;
 if(valid&&cursor.page&&eligible(cursor.page,config)&&config.recording){
  let start=cursor.at;
  while(start<now){
   const midnight=new Date(start);midnight.setHours(24,0,0,0);
   const end=Math.min(now,midnight.getTime()),day=dayKey(start);
   const last=next.at(-1);
   if(last&&last.visit===cursor.visit&&last.day===day&&last.end===start&&last.mode===cursor.page.mode&&last.group===cursor.page.group)last.end=end;
   else next.push({...cursor.page,day,start,end,chain,visit:cursor.visit});
   start=end;
  }
 }
 if(!valid||!cursor?.page||!current)chain=crypto.randomUUID();
 const page=config.recording&&current&&eligible(current,config)?current:null;
 const same=valid&&cursor.page&&page&&cursor.page.tabId===page.tabId&&cursor.page.url===page.url;
 return {visits:retainVisits(next,config,now),cursor:{at:now,page,chain,visit:same?cursor.visit:crypto.randomUUID()}};
}
export function reviewData(visits,day,{from=0,to=1440,urls=null}={}) {
 const midnight=new Date(`${day}T00:00:00`).getTime();
 const endDay=new Date(midnight);endDay.setDate(endDay.getDate()+1);
 const lo=midnight+from*60000,hi=to===1440?endDay.getTime():midnight+to*60000;
 const all=visits.filter(v=>v.day===day&&v.end>lo&&v.start<hi).map(v=>({...v,start:Math.max(lo,v.start),end:Math.min(hi,v.end)}));
 const shown=all.filter(v=>!urls||urls.has(v.url));
 const sites=new Map(),groups=new Map();
 for(const v of shown){const duration=v.end-v.start;sites.set(v.domain,(sites.get(v.domain)||0)+duration);groups.set(v.group,(groups.get(v.group)||0)+duration);}
 return {visits:shown,sites:[...sites].sort((a,b)=>b[1]-a[1]),groups:[...groups].sort((a,b)=>b[1]-a[1]),total:shown.reduce((n,v)=>n+v.end-v.start,0)};
}
