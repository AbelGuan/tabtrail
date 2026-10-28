import {t,locale,workspaceLabel} from './i18n.js';
import {renderSwimlane} from './swimlane.js';
import {reviewData,reviewHours} from './activity.js';
import {siteRuns,visitPages} from './review-model.js';
const colors=['#111111','#5c5c59','#858582','#a2a29e','#b5b5b2','#cdcdc9','#dededb','#eeeeeb'];
const node=(tag,cls='',text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};
export const duration=ms=>ms<60000?t`${Math.floor(ms/1000)} 秒`:ms<3600000?t`${Math.floor(ms/60000)} 分钟`:t`${Math.floor(ms/3600000)} 小时 ${Math.floor(ms%3600000/60000)} 分`;
const clock=t=>new Date(t).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit',hour12:false});
let day='',queryKey='',hour=null,quarter=-1,mode='sites',page=0,expanded=-1,detailPage=0,pathView='graph',lanePage=0;
function button(text,cls,action){const b=node('button',cls,text);b.type='button';b.onclick=action;return b;}
const headingIcons={
 allocation:['M12 4a8 8 0 1 0 8 8h-8V4Z','M15 3.6A8 8 0 0 1 20.4 9H15V3.6Z'],
 rhythm:['M4 20V12h3v8H4Z','M10.5 20V4h3v16h-3Z','M17 20V8h3v12h-3Z'],
 journey:['M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z','M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z','M8 5h8a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8']
};
function card(title,icon,cls=''){
 const box=node('section',`group-card review-card ${cls}`),head=node('div','card-heading');
 const titleGroup=node('div','rv-heading-title'),mark=node('span','rv-section-icon');mark.setAttribute('aria-hidden','true');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.75','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
 for(const d of headingIcons[icon]){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);}
 mark.append(svg);titleGroup.append(mark,node('h2','',title));head.append(titleGroup);box.append(head);return {box,head};
}
function pager(count,index,change,label){
 const bar=node('div','rv-pager');const back=button('←','',()=>change(index-1)),next=button('→','',()=>change(index+1));
 back.dataset.reviewFocus=`${label}-prev`;next.dataset.reviewFocus=`${label}-next`;back.setAttribute('aria-label',t`${label}上一页`);next.setAttribute('aria-label',t`${label}下一页`);back.disabled=index===0;next.disabled=(index+1)*6>=count;
 bar.append(node('span','',`${index*6+1}–${Math.min(count,(index+1)*6)} / ${count}`),back,next);return bar;
}
export function renderReview(root,state,selectedDay,records,query='',onOpen=()=>{}){
 if(day!==selectedDay||queryKey!==query){day=selectedDay;queryKey=query;hour=null;quarter=-1;page=0;expanded=-1;detailPage=0;}
 const focusKey=root.contains(document.activeElement)?document.activeElement.dataset.reviewFocus:null;
 root.replaceChildren();
 const rerender=()=>renderReview(root,state,selectedDay,records,query,onOpen);
 const urls=query?new Set(records.map(r=>r.url)):null;
 const full=reviewData(state.visits||[],day,{urls});
 if(!full.visits.length){root.append(node('div','review-empty',query?t('没有匹配的时间记录。'):t('这一天尚未采集到浏览时长。旧页面记录无法还原停留时间。')));return;}
 const slots=reviewHours(day),hours=slots.map(slot=>reviewData(state.visits||[],day,{...slot,urls}));
 if(hour===null)hour=hours.findIndex(h=>h.total>0);
 const resetDetail=()=>{lanePage=0;page=0;expanded=-1;detailPage=0;};
 const selectHour=h=>{hour=h;quarter=-1;resetDetail();rerender();};
 const top=node('div','rv-top');
 const {box:allocation,head:allocationHead}=card(t('时间分布'),'allocation','rv-allocation');
 const toggle=node('div','rv-toggle');toggle.setAttribute('role','group');toggle.setAttribute('aria-label',t('时间分布维度'));
 for(const [value,label] of [['sites',t('网站')],['groups',t('工作区')]]){const b=button(label,'',()=>{mode=value;rerender();});b.setAttribute('aria-pressed',String(mode===value));b.dataset.reviewFocus=value;toggle.append(b);}allocationHead.append(toggle);
 const allocationBody=node('div','rv-allocation-body');
 const entries=full[mode].map(([name,value])=>[mode==='groups'?workspaceLabel(name):name,value]),chunks=entries.length>5?[...entries.slice(0,5),[t('其他'),entries.slice(5).reduce((sum,x)=>sum+x[1],0)]]:entries;
 const total=node('div','rv-distribution-total'),digits=node('strong');digits.setAttribute('aria-label',duration(full.total));
 const minutes=Math.floor(full.total/60000),hoursTotal=Math.floor(minutes/60);
 if(hoursTotal)digits.append(String(hoursTotal),node('small','','h'));
 digits.append(String(minutes%60),node('small','','min'));
 total.append(digits,node('span','',t('浏览投入 · 估算')));allocationBody.append(total);
 const stack=node('div','rv-stackbar');stack.setAttribute('role','img');stack.setAttribute('aria-label',chunks.map(([name,time])=>`${name} ${duration(time)}`).join('，'));
 chunks.forEach(([name,time],i)=>{const part=node('span');part.style.flex=String(time);part.style.background=colors[i];part.title=`${name} · ${duration(time)}`;stack.append(part);});allocationBody.append(stack);
 const largest=Math.max(...chunks.map(([,time])=>time),1);
 const legend=node('div','rv-legend');chunks.forEach(([name,time],i)=>{const row=node('div','rv-legend-row'),dot=node('span','rv-dot');dot.style.background=colors[i];const label=node('span','',name);label.title=name;const percent=node('span','rv-percent',`${Math.round(time/full.total*100)}%`),track=node('span','rv-distribution-track'),fill=node('span');fill.style.width=`${time/largest*100}%`;fill.style.background=colors[i];track.append(fill);row.append(dot,label,node('strong','',duration(time)),percent,track);legend.append(row);});allocationBody.append(legend);allocation.append(allocationBody);top.append(allocation);
 const {box:rhythm,head:rhythmHead}=card(t('一天的节奏'),'rhythm','rv-rhythm');rhythmHead.append(node('span','rv-caption',t('每格 1 小时')));
 const selected=slots[hour],rangeLabel=`${selected.label}—${selected.endLabel}`;
 const selectedSummary=node('div','rv-hour-summary');selectedSummary.append(node('strong','',selected.label),node('span','',`${rangeLabel} · ${hours[hour].total?t`${duration(hours[hour].total)} · ${hours[hour].sites.length} 个网站`:t('没有采集记录')}`));rhythm.append(selectedSummary);
 const chart=node('div','rv-hours');chart.setAttribute('role','group');chart.setAttribute('aria-label',t('选择浏览时段'));
 chart.style.setProperty('--review-hours',slots.length);
 const max=Math.max(...hours.map(h=>h.total),1);
 hours.forEach((data,h)=>{const slot=slots[h],b=button('','rv-hour',()=>selectHour(h));b.dataset.reviewFocus=`hour-${h}`;b.dataset.hour=slot.hour;b.dataset.start=slot.start;b.setAttribute('aria-pressed',String(h===hour));b.setAttribute('aria-label',`${slot.label}，${data.total?duration(data.total):t('无记录')}`);b.title=`${slot.label} · ${duration(data.total)}`;
 const track=node('span','rv-hour-track'),bar=node('span','rv-hour-fill');bar.style.height=data.total?`${Math.max(4,data.total/max*100)}%`:'0';track.append(bar);b.append(track,node('span','rv-hour-label',slot.shortLabel));chart.append(b);});rhythm.append(chart,node('p','rv-note',t('选一个小时，看这段时间的浏览过程。空白时段不补记。')));top.append(rhythm);root.append(top);
 const {start,end}=quarter<0?selected:selected.quarters[quarter];
 const data=reviewData(state.visits||[],day,{start,end,urls}),runs=siteRuns(data.visits);
 page=Math.min(page,Math.max(0,Math.ceil(runs.length/6)-1));
 const {box:journey,head:journeyHead}=card(t('浏览路径'),'journey','rv-journey');journeyHead.append(node('span','rv-caption',t`${runs.length} 段停留 · ${duration(data.total)}`));
 const tools=node('div','rv-journey-tools'),quarterPicker=node('div','rv-toggle');quarterPicker.setAttribute('role','group');quarterPicker.setAttribute('aria-label',t('细看十五分钟'));
 for(const q of [-1,...selected.quarters.map((_,i)=>i)]){const label=q<0?t('整小时'):selected.quarters[q].label;const b=button(label,'',()=>{quarter=q;resetDetail();rerender();});b.dataset.reviewFocus=`quarter-${q}`;b.setAttribute('aria-pressed',String(quarter===q));quarterPicker.append(b);}const viewPicker=node('div','rv-toggle');viewPicker.setAttribute('role','group');viewPicker.setAttribute('aria-label',t('浏览路径视图'));for(const [value,label]of [['graph',t('轨迹图')],['list',t('详细记录')]]){const b=button(label,'',()=>{pathView=value;rerender();});b.dataset.reviewFocus=`path-${value}`;b.setAttribute('aria-pressed',String(pathView===value));viewPicker.append(b);}tools.append(quarterPicker,viewPicker);journey.append(tools);
 if(!runs.length)journey.append(node('div','review-empty',t('这个时段没有采集到浏览记录。可选择上方其他小时。')));
 if(pathView==='graph'&&runs.length){journey.append(renderSwimlane({runs,start,end,siteOrder:full.sites.map(([name])=>name),colors,offset:lanePage,onPage:p=>{lanePage=p;rerender();},onSelect:index=>{pathView='list';page=Math.floor(index/6);expanded=index;detailPage=0;rerender();root.querySelector('.rv-stop.is-open .rv-stop-button')?.focus({preventScroll:true});},formatDuration:duration}));}
 if(pathView==='list'){
 const route=node('ol','rv-route');
 runs.slice(page*6,page*6+6).forEach((run,offset)=>{
  const index=page*6+offset,prev=runs[index-1],connected=prev&&prev.end===run.start&&prev.chain===run.chain;
  const pages=visitPages(run.items),open=expanded===index,li=node('li',`rv-stop${connected?' is-connected':''}${open?' is-open':''}`);
  const row=button('','rv-stop-button',()=>{expanded=open?-1:index;detailPage=0;rerender();});row.dataset.reviewFocus=`stop-${index}`;row.setAttribute('aria-expanded',String(open));row.setAttribute('aria-controls',`rv-detail-${index}`);
  const rail=node('span','rv-rail');rail.append(node('span','rv-step',String(index+1)));
  const time=node('span','rv-time',clock(run.start));
  const icon=node('span','site-icon',run.domain.replace(/^www\./,'')[0].toUpperCase());icon.setAttribute('aria-hidden','true');
  const copy=node('span','rv-stop-copy');copy.append(node('strong','',run.domain),node('span','rv-stop-sub',pages.length===1?pages[0].title:t`${pages.length} 个页面 · ${pages[0].title}`));
  const meta=node('span','rv-stop-meta');meta.append(node('strong','',duration(run.total)),node('span','',open?t('收起 ⌃'):t('展开 ⌄')));
  row.append(rail,time,icon,copy,meta);li.append(row);
  if(index>0&&!connected){li.prepend(node('span','rv-gap',t('记录间隔')));}
  const detail=node('div','rv-detail');detail.id=`rv-detail-${index}`;detail.hidden=!open;
  if(open){detailPage=Math.min(detailPage,Math.max(0,Math.ceil(pages.length/6)-1));const list=node('ol','rv-pages');pages.slice(detailPage*6,detailPage*6+6).forEach(v=>{const item=node('li','rv-page'),copy=node('div');copy.append(button(v.title,'rv-page-link',()=>onOpen(v)),node('span','',`${clock(v.start)}–${clock(v.end)} · ${workspaceLabel(v.group)}${v.video?t(' · 视频播放'):''}`));item.append(copy,node('span','',duration(v.end-v.start)));list.append(item);});detail.append(list);if(pages.length>6)detail.append(pager(pages.length,detailPage,p=>{detailPage=p;rerender();},t('页面记录')));}
  li.append(detail);route.append(li);
 });journey.append(route);
 }
 const footer=node('div','rv-journey-footer');footer.append(node('span','rv-caption',t`${selected.label}—${selected.endLabel} · 只显示所选时段`));if(pathView==='list'&&runs.length>6)footer.append(pager(runs.length,page,p=>{page=p;expanded=-1;detailPage=0;rerender();},t('浏览路径')));journey.append(footer);root.append(journey);
 const note=node('details','rv-method');note.append(node('summary','',t('关于时间与记录')));note.append(node('p','',t`${state.reviewDemo?t('当前为虚构示例。'):''}投入时间是估算，不代表专注或完成任务。锁屏、离开 Chrome 或普通页面长时间无操作时暂停；前台视频播放时继续估算。路径按前台访问顺序排列，不代表链接来源。同站合并仅改变展示，原始页面与时长保留；返回同一网站会显示为新的一段。最多保留最近 30 天、12,000 个片段，存储预算约 4 MB，达到上限移除最早片段。`));root.append(note);
 if(focusKey)[...root.querySelectorAll('[data-review-focus]')].find(e=>e.dataset.reviewFocus===focusKey)?.focus({preventScroll:true});
}
