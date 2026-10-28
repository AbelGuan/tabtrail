import {dayKey, eligible} from './core.js?v=20260917-15';
import {retainByBytes} from './storage-budget.js';
import {retentionCutoff} from './retention-policy.js';
export const MAX_GAP = 90_000;
export const MAX_VISITS = 12000;
export function retainVisits(visits,config,now=Date.now()) {
 const cutoff=retentionCutoff(config,now);
 const kept=visits.filter(v=>v.day>=dayKey(cutoff)&&eligible(v,config)).slice(-MAX_VISITS);
 return retainByBytes(kept);
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
const pad=value=>String(value).padStart(2,'0');
const clockLabel=date=>`${pad(date.getHours())}:${pad(date.getMinutes())}`;
let calendarCache;
function reviewCalendar(day) {
 const midnight=new Date(`${day}T00:00:00`),next=new Date(midnight);next.setDate(next.getDate()+1);
 const key=`${day}:${midnight.getTime()}:${next.getTime()}`;
 if(calendarCache?.key===key)return calendarCache;
 const hours=[],minutes=[];
 // Walk actual instants, grouping by local clock hour AND UTC offset. This also
 // handles half-hour DST changes without inventing missing local times.
 for(let start=midnight.getTime();start<next.getTime();start+=60000){
  const date=new Date(start),end=Math.min(start+60000,next.getTime());
  const h=date.getHours(),offset=date.getTimezoneOffset(),q=Math.floor(date.getMinutes()/15);
  minutes.push({start,end,minute:h*60+date.getMinutes()});
  let slot=hours.at(-1);
  if(!slot||slot.hour!==h||slot.offset!==offset){slot={start,end,hour:h,offset,label:clockLabel(date),quarters:[]};hours.push(slot);}
  slot.end=end;
  let part=slot.quarters.at(-1);
  if(!part||part.quarter!==q){part={start,end,quarter:q,label:clockLabel(date)};slot.quarters.push(part);}
  part.end=end;
 }
 for(const slot of hours){
  const repeated=hours.filter(h=>h.hour===slot.hour);
  slot.shortLabel=pad(slot.hour);
  slot.endLabel=slot.end===next.getTime()?'24:00':clockLabel(new Date(slot.end));
  if(repeated.length>1){
   const offset=-slot.offset,zone=`UTC${offset<0?'-':'+'}${pad(Math.floor(Math.abs(offset)/60))}:${pad(Math.abs(offset)%60)}`;
   slot.label+=` ${zone}`;
   slot.shortLabel+=repeated.indexOf(slot)===0?'¹':'²';
  }
 }
 calendarCache={key,hours,minutes};return calendarCache;
}
export const reviewHours=day=>reviewCalendar(day).hours;

export function reviewData(visits,day,{from=0,to=1440,start,end,urls=null}={}) {
 const ranges=[];
 if(start!==undefined&&end!==undefined)ranges.push({start,end});
 else for(const minute of reviewCalendar(day).minutes){
  const lo=minute.start+Math.max(0,from-minute.minute)*60000;
  const hi=minute.end-Math.max(0,minute.minute+1-to)*60000;
  if(hi<=lo)continue;
  if(ranges.at(-1)?.end===lo)ranges.at(-1).end=hi;
  else ranges.push({start:lo,end:hi});
 }
 const all=ranges.flatMap(({start:lo,end:hi})=>visits.filter(v=>v.day===day&&v.end>lo&&v.start<hi).map(v=>({...v,start:Math.max(lo,v.start),end:Math.min(hi,v.end)})));
 const shown=all.filter(v=>!urls||urls.has(v.url));
 const sites=new Map(),groups=new Map();
 for(const v of shown){const duration=v.end-v.start;sites.set(v.domain,(sites.get(v.domain)||0)+duration);groups.set(v.group,(groups.get(v.group)||0)+duration);}
 return {visits:shown,sites:[...sites].sort((a,b)=>b[1]-a[1]),groups:[...groups].sort((a,b)=>b[1]-a[1]),total:shown.reduce((n,v)=>n+v.end-v.start,0)};
}
