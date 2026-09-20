import {t,locale} from './i18n.js';
const make=(tag,cls,text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};
const time=t=>new Date(t).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit',hour12:false});
export function renderSwimlane({runs,start,end,siteOrder,colors,offset=0,onPage,onSelect,formatDuration}){
 const root=make('div','rv-swimlane');
 const domains=siteOrder.filter(name=>runs.some(r=>r.domain===name));
 const currentPage=Math.min(offset,Math.max(0,Math.ceil(domains.length/8)-1));
 const visible=domains.slice(currentPage*8,currentPage*8+8),height=visible.length*52;
 if(!runs.length)return root;
 const intro=make('div','rv-swim-hint',t('横向看时间，纵向看网站。色条越长，停留越久；箭头连接下一站。'));root.append(intro);
 const body=make('div','rv-swim-body'),labels=make('div','rv-swim-labels'),plot=make('div','rv-swim-plot');plot.style.height=height+'px';
 const x=t=>(t-start)/(end-start)*1000;
 visible.forEach((name,i)=>{const row=make('div','rv-swim-label');row.title=name;row.append(make('strong','',name),make('span','',formatDuration(runs.filter(r=>r.domain===name).reduce((n,r)=>n+r.total,0))));labels.append(row);const lane=make('div','rv-swim-row');lane.style.top=i*52+'px';plot.append(lane);});
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 1000 ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.classList.add('rv-swim-links');
 for(let i=1;i<runs.length;i++){
  const a=runs[i-1],b=runs[i],ay=visible.indexOf(a.domain),by=visible.indexOf(b.domain);
  if(ay<0||by<0||ay===by||a.chain!==b.chain||a.end!==b.start)continue;
  const px=x(b.start),y1=ay*52+26,y2=by*52+26,sign=Math.sign(y2-y1),target=y2-sign*13;
  const path=document.createElementNS(ns,'path');path.setAttribute('d',`M${px} ${y1+sign*13}V${target}m-4 ${-sign*5}l4 ${sign*5}l4 ${-sign*5}`);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1');path.setAttribute('vector-effect','non-scaling-stroke');svg.append(path);
 }
 plot.append(svg);
 runs.forEach((run,index)=>{
  const y=visible.indexOf(run.domain);if(y<0)return;
  const b=make('button','rv-swim-segment');b.type='button';b.style.left=x(run.start)/10+'%';b.style.width=(x(run.end)-x(run.start))/10+'%';b.style.top=(y*52+14)+'px';b.style.background=colors[siteOrder.indexOf(run.domain)%colors.length];
  const description=`${time(run.start)}–${time(run.end)} · ${run.domain} · ${formatDuration(run.total)}`;
  b.title=description;b.setAttribute('aria-label',t`${description}，查看页面记录`);b.dataset.run=index;b.onclick=()=>onSelect(index);
  // The duration remains available on hover/focus even for very short visits.
  const text=make('span','',formatDuration(run.total));b.append(text);plot.append(b);
 });
 body.append(labels,plot);root.append(body);
 const axis=make('div','rv-swim-axis');for(let i=0;i<=4;i++)axis.append(make('span','',time(start+(end-start)*i/4)));root.append(axis);
 const footer=make('div','rv-swim-footer');footer.append(make('span','',t`点击色条查看这一段的页面 · 极短停留以细线显示${domains.length>8?t(' · 跨隐藏泳道的连线不显示'):''}`));
 if(domains.length>8){const pager=make('div','rv-pager');for(const [text,delta] of [['←',-1],['→',1]]){const b=make('button','',text);b.type='button';b.setAttribute('aria-label',delta<0?t('泳道上一页'):t('泳道下一页'));b.disabled=delta<0?currentPage===0:(currentPage+1)*8>=domains.length;b.onclick=()=>onPage(currentPage+delta);pager.append(b);}pager.prepend(make('span','',`${currentPage+1} / ${Math.ceil(domains.length/8)}`));footer.append(pager);}root.append(footer);
 return root;
}
