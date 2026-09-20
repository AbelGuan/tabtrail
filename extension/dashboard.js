import {t,getLanguage,setLanguage,LANGUAGE_KEY,staticTranslations,workspaceLabel} from './i18n.js';
import {recordsChanged} from './dashboard-sync.js';
import {renderReview} from './review.js';
import {preferenceText,parseRuleBackup,mergeRuleBackup,exportRuleBackup} from './rule-transfer.js?v=20260917-15';
import {organizeOpenTabs} from './organize-workflow.js?v=20260917-15';
import {removeReadingStatus,UNGROUPED,normalizeDomain,excludedUrl,dayKey,defaults,settingsSignature,assertSettingsCurrent,updateRules,orderedWorkspaces,reorderByKey,manageWorkspace,applyLocalRules} from './core.js?v=20260917-15';
import {testConnection} from './ai.js?v=20260917-15';
import {PROVIDERS,providerFor} from './providers.js?v=20260917-15';
import {iconButton,fillWorkspaceSelect,selectedWorkspace,sortableHandle} from './controls.js?v=20260917-15';
import {demoState} from './demo.js?v=20260917-15';
const $=s=>document.querySelector(s);
const translateStatic=staticTranslations(document.documentElement);translateStatic();
const isExtension=!!globalThis.chrome?.runtime?.id;
let state,view='workspace',searchOpen=false,suggestions=[],pending=[],busy=false,editing=null,autoTimer,autoError='',retryAfter=0;
let autoDirty=false,setupIntent=false;
const isSidePanel=isExtension&&new URLSearchParams(location.search).get("surface")==="sidepanel";
let reviewDay=dayKey(),resumeDay=dayKey(new Date().setDate(new Date().getDate()-1));
let calendarDay=dayKey(),reviewDateChosen=false,resumeDateChosen=false,settingsBase;
let demoPreference,importBackup=null,restoring=false;
let demo=demoState();
// Old preview caches may contain private development examples. Never load them.
if(!isExtension)try {
 const saved=JSON.parse(localStorage.getItem('atlas-demo'));
 if(saved?.demoVersion===demo.demoVersion&&saved.records&&saved.config)demo=saved;
 else {
  localStorage.setItem('atlas-demo',JSON.stringify(demo));
  for(const key of ['atlas-card-layout-v1','atlas-card-layout-classic-v1'])localStorage.removeItem(key);
 }
}catch{}
const cleanedDemo=removeReadingStatus(demo.records);
if(cleanedDemo.some((r,i)=>r!==demo.records[i])){demo.records=cleanedDemo;try{localStorage.setItem('atlas-demo',JSON.stringify(demo));}catch{}}
let resizing=false,editingRule=null,sorting=false,sortSaving=false,connectionController=null,settingsModels={};
const themeKey='atlas-theme-v1';
let theme=document.documentElement.dataset.theme==='classic'?'classic':'rounded';
const layoutKeyForTheme=()=>theme==='classic'?'atlas-card-layout-classic-v1':'atlas-card-layout-v1';
let layoutKey=layoutKeyForTheme();
let cardSizes={};
try {const saved=JSON.parse(localStorage.getItem(layoutKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))cardSizes=saved;} catch {}
function saveLayout(){try{localStorage.setItem(layoutKey,JSON.stringify(cardSizes));}catch{toast(t('无法保存卡片尺寸，当前调整仍然有效。'));}}
const scrollObservers=[];
function visibleScrollbar(card,list){
 const rail=el('div','card-scrollbar'),thumb=el('button','card-scroll-thumb');thumb.type='button';thumb.setAttribute('aria-label',t('滚动卡片标签'));rail.hidden=true;rail.append(thumb);card.append(rail);
 const update=()=>{
  const overflow=list.scrollHeight-list.clientHeight;rail.hidden=overflow<=1;
  if(rail.hidden)return;
  const height=list.clientHeight,thumbHeight=Math.min(height,Math.max(28,height*height/list.scrollHeight));
  rail.style.top=`${list.offsetTop}px`;rail.style.height=`${height}px`;
  thumb.style.height=`${thumbHeight}px`;thumb.style.top=`${list.scrollTop/overflow*(height-thumbHeight)}px`;
 };
 list.addEventListener('scroll',update,{passive:true});
 const observer=new ResizeObserver(update);observer.observe(list);scrollObservers.push(observer);
 thumb.onpointerdown=event=>{
  if(event.button!==0)return;event.preventDefault();event.stopPropagation();thumb.setPointerCapture(event.pointerId);
  const y=event.clientY,start=list.scrollTop,travel=rail.clientHeight-thumb.offsetHeight;
  thumb.onpointermove=e=>{if(travel>0)list.scrollTop=start+(e.clientY-y)*(list.scrollHeight-list.clientHeight)/travel;};
  const finish=()=>{thumb.onpointermove=null;};thumb.onpointerup=finish;thumb.onpointercancel=finish;thumb.onlostpointercapture=finish;
 };
 rail.onpointerdown=event=>{if(event.target===rail){list.scrollTop+=(event.clientY<thumb.getBoundingClientRect().top?-1:1)*list.clientHeight;}};
 thumb.onkeydown=event=>{const amounts={ArrowDown:40,ArrowUp:-40,PageDown:list.clientHeight,PageUp:-list.clientHeight,Home:-list.scrollHeight,End:list.scrollHeight};if(Object.hasOwn(amounts,event.key)){event.preventDefault();list.scrollTop+=amounts[event.key];}};
}
function resizableCard(card,group){
 const saved=Object.hasOwn(cardSizes,group)?cardSizes[group]:null;
 const apply=(width,height)=>{card.style.setProperty('--card-width',`${width}px`);card.style.setProperty('--card-height',`${height}px`);};
 if(Number.isFinite(saved?.width)&&Number.isFinite(saved?.height))apply(Math.max(280,saved.width),Math.max(180,saved.height));
 const handle=el('button','card-resize');handle.type='button';
 handle.setAttribute('aria-label',t`调整卡片大小：${group}`);handle.title=t('拖拽调整宽高；方向键微调；双击或 Home 恢复默认');
 const reset=()=>{delete cardSizes[group];card.style.removeProperty('--card-width');card.style.removeProperty('--card-height');saveLayout();};
 const update=(width,height)=>{const max=$('#board').clientWidth;apply(Math.round(Math.min(max,Math.max(Math.min(280,max),width))),Math.round(Math.min(1600,Math.max(180,height))));};
 const persist=()=>{const rect=card.getBoundingClientRect();Object.defineProperty(cardSizes,group,{value:{width:Math.round(rect.width),height:Math.round(rect.height)},writable:true,enumerable:true,configurable:true});saveLayout();};
 handle.ondblclick=reset;
 handle.onkeydown=event=>{if(event.key==='Home'){event.preventDefault();reset();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const rect=card.getBoundingClientRect(),step=event.shiftKey?40:10;update(rect.width+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),rect.height+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));persist();};
 handle.onpointerdown=event=>{
  if(event.button!==0)return;event.preventDefault();const rect=card.getBoundingClientRect(),x=event.clientX,y=event.clientY;resizing=true;card.classList.add('resizing');handle.setPointerCapture(event.pointerId);
  handle.onpointermove=e=>update(rect.width+e.clientX-x,rect.height+e.clientY-y);
  const finish=()=>{handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;handle.onlostpointercapture=null;resizing=false;card.classList.remove('resizing');persist();render();scheduleAuto();};
  handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=finish;
 };
 card.append(handle);
}
const colorNames=['mint','blue','rose','sand','lavender','peach'];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,5500);}
async function send(message){
 if(isExtension){const response=await chrome.runtime.sendMessage({...message,locale:getLanguage()});if(response.error)throw new Error(response.error);return response.value;}
 if(message.type==='get')return {...structuredClone(demo),preference:demoPreference??demo.config.savedPreference??''};
 if(message.type==='preference'){demoPreference=preferenceText(message.value);demo.config.savedPreference=message.save?demoPreference:'';demo.config.savePreference=!!message.save;}
 if(message.type==='importRules'){const result=mergeRuleBackup(demo.config.rules,message.backup);demo.config.rules=result.rules;localStorage.setItem('atlas-demo',JSON.stringify(demo));return {added:result.added,skipped:result.skipped};}
 if(message.type==='patch'&&typeof message.value.group==='string'&&message.value.group.trim()&&message.value.group.length<=40){Object.assign(demo.records.find(r=>r.id===message.id),{group:message.value.group.trim(),manualGroup:true,ruleMatched:false});}
 if(message.type==='settings'){assertSettingsCurrent(demo.config,message.expectedSettings);demo.config={...demo.config,...message.value,providerModels:{...demo.config.providerModels,[demo.config.provider||'deepseek']:demo.config.model,[message.value.provider||demo.config.provider||'deepseek']:message.value.model}};demo.records=demo.records.filter(r=>!excludedUrl(r.url,demo.config.excluded));demo.tabs=demo.tabs.filter(t=>!excludedUrl(t.url,demo.config.excluded));demo.visits=(demo.visits||[]).filter(t=>!excludedUrl(t.url,demo.config.excluded));}
 if(['rule','deleteRule','reorderRules'].includes(message.type)) demo.config.rules=updateRules(demo.config.rules,message);
 if(message.type==='applyRules'){const result=applyLocalRules(demo.records,demo.config.rules,message.ids);demo.records=result.records;localStorage.setItem('atlas-demo',JSON.stringify(demo));return {matched:result.matched};}
 if(message.type==='workspace')demo=manageWorkspace(demo,message);
 if(message.type==='reorderWorkspaces')demo.config.workspaceOrder=reorderByKey(orderedWorkspaces(demo.records,demo.config,true),message.source,message.target);
 if(message.type==='restoreDay')throw new Error(t('网页预览只展示示例；加载扩展后可恢复真实标签。'));
 if(message.type==='jump'||message.type==='jumpVisit')toast(t('这是标题示例，没有原始网址。安装扩展后可跳回真实标签页。'));
 if(message.type==='key')toast(t('示例模式不保存 API Key。请加载 Chrome 扩展后配置。'));
 if(message.type==='clear'){demo.records=[];demo.tabs=[];demo.visits=[];demo.config.recording=false;}
 localStorage.setItem('atlas-demo',JSON.stringify(demo));return true;
}
function safe(fn){return async(...args)=>{try{await fn(...args);}catch(error){toast(error.message||t('操作失败，请重试。'));}};}
async function load(){state=await send({type:'get'});state.config={...defaults(),...state.config};render();scheduleAuto();}
function scoped(){
 const urls=new Set(state.tabs.map(t=>t.url));
 return state.records.filter(r=>view==='workspace'?r.day===state.today&&urls.has(r.url):r.day===$('#day').value).map(r=>view!=='workspace'?{...r,group:r.snapshotGroup||r.group}:r);
}
function visible(){const query=$('#search').value.trim().toLowerCase();return scoped().filter(r=>`${r.title} ${r.domain} ${workspaceLabel(r.group)}`.toLowerCase().includes(query));}
function workspaceNames(){return orderedWorkspaces(state.records,state.config);}
function updateCalendar(){
 const today=dayKey();
 $('#day').max=today;
 if(today===calendarDay)return false;
 calendarDay=today;
 if(!reviewDateChosen)reviewDay=today;
 if(!resumeDateChosen)resumeDay=dayKey(new Date().setDate(new Date().getDate()-1));
 if(view!=='workspace')$('#day').value=view==='review'?reviewDay:resumeDay;
 return true;
}
function render(){
 updateCalendar();
 if(resizing||sorting||sortSaving)return;
 const records=scoped(),rows=visible(),searching=!!$('#search').value.trim();
 const groups=orderedWorkspaces([...state.records,...records],state.config,true).filter(g=>records.some(r=>r.group===g));
 $('#demo-banner').hidden=isExtension;
 $('#recap').classList.toggle('is-review',view==='review');
 $('#review-dashboard').hidden=view!=='review';
 if(view==='review')renderReview($('#review-dashboard'),state,$('#day').value,rows,$('#search').value.trim(),safe(v=>send({type:'jumpVisit',visit:v.visit,day:v.day,url:v.url})));
 $('#page-title').textContent=view==='history'?t('继续浏览'):view==='review'?t('每日回顾'):t('工作区');
 $('#quicklinks').classList.toggle('active',view==='workspace');$('#quicklinks').setAttribute('aria-pressed',view==='workspace');
 for(const [id,name] of [['daily-review','review'],['continue-browsing','history']]){const button=$('#'+id);button.classList.toggle('active',view===name);button.setAttribute('aria-pressed',view===name);}
 $('#workspace-tools').hidden=view!=='workspace';
 $('#ai-state').hidden=!isExtension||(!state.hasKey&&!busy);
 $('#ai-onboarding').hidden=view!=='workspace'||!isExtension||state.hasKey;
 $('#ai-recovery').hidden=view!=='workspace'||!isExtension||!state.hasKey||!autoError||busy;
 $('#organize-progress').hidden=view!=='workspace'||!$('#organize-progress').textContent;
 $('#search-toolbar').hidden=!searchOpen;$('#search-toggle').setAttribute('aria-expanded',!$('#search-toolbar').hidden);
 $('#summary').textContent=t`${records.length} 个标签 · ${groups.length} 个工作区`;
 $('#ai-state').textContent=busy?t('✧ 正在归位…'):autoError?t('自动分类未完成'):!isExtension?'':!state.config.recording?t('记录已暂停'):!state.hasKey?t('AI 未配置'):t('自动整理已开启');
 $('#ai-state').title=autoError || t('新增标签先匹配规则；配置 AI 后，工作区可见时处理需要分类的页面。');
 $('#day').hidden=view==='workspace';$('#recap').hidden=view==='workspace';$('#restore-day').hidden=view!=='history';$('#review-metrics').hidden=view!=='review';
 $('#recap-title').textContent=view==='review'?t('每日回顾'):$('#day').value===dayKey(new Date().setDate(new Date().getDate()-1))?t('昨天留下的页面'):t('那天留下的页面');
 $('#restore-day').disabled=restoring||!rows.length;
 $('#restore-day').textContent=restoring?t('正在恢复…'):t`重新打开这些标签（${rows.length}）`;
 $('#recap-summary').textContent=records.length?t`${$('#day').value} · ${records.length} 个页面 · 保存当天收集的页面及最后分组，包含已关闭标签；保留最近 30 天 / 最多 5,000 条。`:t('这一天没有留下记录。插件只能找回开始记录之后、尚未过期的页面。');
 if(view==='review'){
  const switches=rows.reduce((sum,r)=>sum+(r.activations||0),0),sites=new Set(rows.map(r=>r.domain)).size;
  const rowUrls=new Set(rows.map(r=>r.url)),visits=(state.visits||[]).filter(v=>v.day===$('#day').value&&(!searching||rowUrls.has(v.url)));
  $('#recap-summary').textContent=searching?t`${$('#day').value} · 匹配 ${rows.length} / ${records.length} 个页面 · 下方统计仅包含搜索结果。切换次数不代表分心或已读。`:t('时间分布、标签切换与每一段停留。选择时段，回看浏览过程。');
  $('#review-metrics').replaceChildren(...[[rows.length,searching?t('匹配页面'):t('记录页面')],[sites,t('网站')],[visits.length||switches,visits.length?t('已采集浏览片段'):t('记录到的标签切换')]].map(([value,label])=>{const item=el('div');item.append(el('strong','',String(value)),el('span','',label));return item;}));
 }
 $('#search').placeholder=view==='review'?t('搜索所选日期的标题、域名或分组…'):t('搜索当前清单的标题、域名或分组…');
 $('#view-note').textContent=view==='review'?t('搜索所选日期 · 包含已关闭页面'):view==='workspace'?t('当前打开 · 点击回到标签页'):isExtension?t('包含已关闭页面 · 点击可重新打开'):t('示例标题 · 无真实阅读记录');
 const board=$('#board');scrollObservers.splice(0).forEach(observer=>observer.disconnect());board.replaceChildren();
 board.hidden=view==='review'&&!searching;
 $('#reorganize').hidden=view!=='workspace';
 $('#rule-count').textContent=suggestions.length?t` · ${suggestions.length} 条待确认`:'';
 if(view==='review'&&!searching)return;
 if(!rows.length){const empty=el('div','empty');empty.append(el('p','',records.length?t('没有匹配的标签。'):view!=='workspace'?t('这一天没有记录，可以选择其他日期。'):state.config.recording?t('这里还没有页面，打开网页后会自动更新。'):t('记录已暂停，可在设置中开启。')));board.append(empty);}
 groups.filter(g=>rows.some(r=>r.group===g)).forEach(g=>{
   const items=rows.filter(r=>r.group===g),card=el('section',`group-card ${colorNames[workspaceNames().indexOf(g)%colorNames.length] || 'neutral'}`);
   const head=el('div','card-heading');
   const emoji=el('span','group-emoji',['🍭','🧪','🐤','💬','🗂️','📚'][workspaceNames().indexOf(g)%6]||'📥');emoji.setAttribute('aria-hidden','true');
   const heading=el('div','heading-text');const count=el('span','card-count',String(items.length));count.title=t`${items.length} 个标签`;count.setAttribute('aria-label',t`${items.length} 个标签`);heading.append(el('h2','',workspaceLabel(g)),count);head.append(emoji,heading);card.append(head);
   {
     card.dataset.sortKey=g;const handle=iconButton('grip',t`排序工作区：${g}`,'drag-handle card-drag');handle.hidden=view!=='workspace';head.append(handle);
     sortableHandle({handle,item:card,container:board,selector:'.group-card[data-sort-key]',onBusy:value=>sorting=value,onMove:safe(async(source,target)=>{
       if(sortSaving)return;sortSaving=true;
       try{await send({type:'reorderWorkspaces',source,target});}finally{sortSaving=false;}
       await load();[...board.querySelectorAll('.group-card')].find(e=>e.dataset.sortKey===source)?.querySelector('.card-drag')?.focus();toast(t('工作区顺序已保存。'));
     })});
   }
   const list=el('div','card-items');card.append(list);
   for(const item of items){
     const row=el('article','tab-row');
     const open=state.tabs.some(t=>t.url===item.url);
     const link=el('button','tab-link');
     const icon=el('span','site-icon');
     const site=item.domain==='github.com'?'github':item.domain==='bilibili.com'||item.domain.endsWith('.bilibili.com')?'bilibili':item.domain==='mail.google.com'?'gmail':null;
     if(site){const img=el('img');img.src=`icons/${site}.svg`;img.alt='';icon.append(img);}else icon.textContent=item.domain[0].toUpperCase();
     const copy=el('span','tab-copy');copy.append(el('span','tab-text',item.title),el('span','tab-url',isExtension?item.url.replace(/^https?:\/\//,''):item.domain));
     link.append(icon,copy);
     link.title=`${item.title}\n${item.domain}${open?t(' · 回到标签页'):t(' · 重新打开')}`;
     link.onclick=safe(()=>send({type:'jump',id:item.id}));row.append(link);
     const more=el('button','tab-more','···');more.hidden=view!=='workspace';more.setAttribute('aria-label',t`更多：${item.title}`);more.onclick=()=>showTab(item);row.append(more);
     if(view==='review'){const meta=el('div','review-page-meta',t`${item.activations||0} 次标签切换`);row.append(meta);}
     list.append(row);
   }
   resizableCard(card,g);board.append(card);visibleScrollbar(card,list);
 });
 $('#rule-count').textContent=suggestions.length?t` · ${suggestions.length} 条待确认`:'';
}
function showTab(item){
 editing=item;$('#tab-title').textContent=item.title;$('#tab-domain').textContent=item.domain;
 fillWorkspaceSelect($('#tab-group'),$('#tab-new-group'),workspaceNames(),item.group);
 $('#tab-dialog').showModal();
}
let workspaceEdit=null;
function renderWorkspaces(){
 const list=$('#workspace-list');list.replaceChildren();
 for(const name of workspaceNames()){
  const row=el('div','rule-row'),copy=el('div','rule-copy');
  const records=state.records.filter(r=>r.group===name),count=new Set(records.map(r=>r.url)).size,rules=state.config.rules.filter(r=>r.group===name).length;
  copy.append(el('strong','',workspaceLabel(name)),el('small','',t`${count} 个页面 · ${rules} 条规则${count?'':t(' · 空工作区')}`));row.append(copy);
  for(const [action,icon,label] of [['rename','edit',t('重命名')],['delete','trash',t('删除')]]){
   const button=iconButton(icon,t`${label}工作区：${name}`,action==='delete'?'delete-icon':'');
   button.onclick=()=>{
    workspaceEdit={name,action,expectedRevision:state.config.workspaceRevision||0};
    $('#workspace-edit-title').textContent=`${label}「${name}」`;
    $('#workspace-impact').textContent=action==='delete'?t`将迁移 ${count} 个页面（含历史记录）和 ${rules} 条规则后移除此工作区，页面不会删除。自动分类不会改动迁移后的页面归属。`:t('名称将同步应用到标签、历史记录和关联规则。');
    $('#workspace-rename-label').hidden=action!=='rename';$('#workspace-rename').required=action==='rename';$('#workspace-rename').value=name;
    $('#workspace-target-label').hidden=action!=='delete';
    $('#workspace-target').replaceChildren(new Option(t('待整理（系统工作区）'),UNGROUPED),...workspaceNames().filter(n=>n!==name).map(n=>new Option(workspaceLabel(n),n)));
    $('#workspace-edit-save').textContent=action==='delete'?t('迁移并删除'):t('保存名称');$('#workspace-edit-dialog').showModal();
   };row.append(button);
  }
  list.append(row);
 }
 if(!list.children.length)list.append(el('p','help',t('还没有工作区，可以在下方新建。')));
}
$('#workspaces-button').onclick=safe(async()=>{await load();$('#workspace-create').reset();renderWorkspaces();$('#workspaces-dialog').showModal();});
$('#workspace-create').onsubmit=safe(async event=>{
 event.preventDefault();await send({type:'workspace',action:'create',name:$('#workspace-name').value,expectedRevision:state.config.workspaceRevision||0});
 await load();$('#workspace-create').reset();renderWorkspaces();toast(t('工作区已创建，可在标签详情和分类规则中选择。'));
});
$('#workspace-edit-form').onsubmit=safe(async event=>{
 event.preventDefault();const edit=workspaceEdit,target=edit.action==='rename'?$('#workspace-rename').value.trim():$('#workspace-target').value;
 await send({type:'workspace',...edit,target});
 suggestions=suggestions.map(r=>r.group===edit.name?{...r,group:target}:r);
 $('#workspace-edit-dialog').close();await load();renderWorkspaces();toast(edit.action==='delete'?t('工作区已删除，标签和规则已迁移。'):t('工作区名称已更新。'));
});
function renderRules(){
 $('#saved-rules').replaceChildren();
 if(!state.config.rules.length)$('#saved-rules').append(el('p','help',t('还没有规则。先试着整理一次，或者添加你熟悉的关键词。')));
 state.config.rules.forEach(rule=>{
  const row=el('div','rule-row');row.dataset.sortKey=rule.keyword;
  const handle=iconButton('grip',t`排序规则：${rule.keyword}`,'drag-handle');row.append(handle);
  const text=el('div','rule-copy');text.append(el('strong','',rule.keyword),el('small','',workspaceLabel(rule.group)));row.append(text);
  const edit=iconButton('edit',t`编辑规则：${rule.keyword}`);edit.onclick=()=>{
   editingRule={...rule};$('#rule-keyword').value=rule.keyword;
   fillWorkspaceSelect($('#rule-group'),$('#rule-new-group'),workspaceNames(),rule.group);
   $('#rule-save').textContent=t('保存修改');$('#rule-cancel').hidden=false;$('#rule-editing').hidden=false;$('#rule-keyword').focus();
  };
  const remove=iconButton('trash',t`删除规则：${rule.keyword}`,'delete-icon');remove.onclick=safe(async()=>{
   await send({type:'deleteRule',base:rule});if(editingRule?.keyword===rule.keyword)resetRuleForm();await load();renderRules();
  });row.append(edit,remove);$('#saved-rules').append(row);
  const expected=structuredClone(state.config.rules);
  sortableHandle({handle,item:row,container:$('#saved-rules'),selector:'.rule-row',onBusy:value=>sorting=value,onMove:safe(async(keyword,target)=>{
   if(sortSaving)return;sortSaving=true;
   try{await send({type:'reorderRules',keyword,target,expected});}finally{sortSaving=false;}
   await load();renderRules();[...$('#saved-rules').children].find(e=>e.dataset.sortKey===keyword)?.querySelector('.drag-handle')?.focus();toast(t('规则优先级已保存。'));
  })});
 });
 $('#suggested-rules').replaceChildren();
 if(!suggestions.length)$('#suggested-rules').textContent=t('暂无建议。AI 整理后，待确认的规则会出现在这里。');
 suggestions.forEach((rule,index)=>{const row=el('div','rule-row');row.append(el('span','',`${rule.keyword} → ${rule.group}`));const accept=el('button','',t('确认保存'));accept.onclick=safe(async()=>{await send({type:'rule',value:rule});suggestions.splice(index,1);await load();renderRules();});const dismiss=el('button','',t('忽略'));dismiss.onclick=()=>{suggestions.splice(index,1);renderRules();};row.append(accept,dismiss);$('#suggested-rules').append(row);});
}
function keyHelp(){
 const id=$('#ai-provider').value,info=providerFor(id);
 const hasKey=state.keyProviders?.includes(id) || (id===state.config.provider&&state.hasKey);
 $('#api-key-label').textContent=`${t(info.name)} API Key`;
 $('#key-help').textContent=hasKey?t('此供应商的 Key 已保存在本机，留空保留；重启浏览器后仍可使用。'):t('尚未配置此供应商的 Key。保存后将保留在本机，无需每次填写。');
 $('#provider-endpoint').textContent=t`连接到 ${new URL(info.url).hostname}`;
}
function resetConnection(){
 connectionController?.abort();connectionController=null;
 $('#test-connection').disabled=false;$('#test-connection').textContent=t('测试连接');
 $('#connection-result').textContent=isExtension?t('测试仅发送固定测试文字，不含标签信息；可能产生少量 API 费用。'):t('示例预览不保存 Key、不发送请求；请在 Chrome 扩展中测试真实连接。');
 $('#connection-result').removeAttribute('data-state');
}
function showSettings(startOrganizing=false){
 settingsBase=settingsSignature(state.config);
 setupIntent=startOrganizing===true;
 $('#save-settings').textContent=setupIntent?t('保存并开始整理'):t('保存设置');
 settingsModels={...state.config.providerModels,[state.config.provider]:state.config.model};
 $('#ai-provider').replaceChildren(...PROVIDERS.map(p=>new Option(t(p.name),p.id)));$('#ai-provider').value=state.config.provider;
 $('#api-key').value='';keyHelp();resetConnection();
 $('#model').value=state.config.model;$('#recording').checked=state.config.recording;$('#idle-seconds').value=String(state.config.idleSeconds||300);$('#excluded').value=state.config.excluded.join('\n');$('#settings-dialog').showModal();
}
$('#ai-provider').onchange=()=>{resetConnection();$('#api-key').value='';$('#model').value=settingsModels[$('#ai-provider').value]||providerFor($('#ai-provider').value).model;keyHelp();};
$('#model').oninput=()=>{settingsModels[$('#ai-provider').value]=$('#model').value;resetConnection();};
$('#api-key').oninput=resetConnection;
$('#settings-dialog').addEventListener('close',()=>{resetConnection();$('#api-key').value='';});
$('#test-connection').onclick=safe(async()=>{
 if(!isExtension){resetConnection();return;}
 resetConnection();const controller=new AbortController();connectionController=controller;
 const timeout=setTimeout(()=>controller.abort(new DOMException('Timeout','TimeoutError')),30000);
 $('#test-connection').disabled=true;$('#test-connection').textContent=t('正在测试…');$('#connection-result').textContent=t('正在检查 Key、模型与 JSON 响应…');
 try{
  const id=$('#ai-provider').value,model=$('#model').value.trim(),key=$('#api-key').value.trim()||await send({type:'getKey',provider:id});
  if(controller.signal.aborted)return;
  const result=await testConnection(id,key,model,controller.signal);
  if(connectionController!==controller)return;
  $('#connection-result').textContent=t`连接成功 · ${t(providerFor(id).name)} · ${model} · ${(result.latency/1000).toFixed(1)} 秒。保存后用于分类。`;$('#connection-result').dataset.state='success';
 }catch(error){if(connectionController===controller){$('#connection-result').textContent=error.message;$('#connection-result').dataset.state='error';}}
 finally{clearTimeout(timeout);if(connectionController===controller){connectionController=null;$('#test-connection').disabled=false;$('#test-connection').textContent=t('测试连接');}}
});
const syncColorMode=()=>{$('#color-mode').value=window.atlasColorMode.value;};
syncColorMode();
window.addEventListener('atlas-color-mode-change',syncColorMode);
$('#color-mode').onchange=()=>{
 if(!window.atlasColorMode.set($('#color-mode').value))toast(t('颜色模式已切换，但浏览器无法保存此偏好。'));
};
function changeTheme(value,persist=true){
 theme=value==='classic'?'classic':'rounded';
 document.documentElement.dataset.theme=theme;
 updateThemeButton();
 layoutKey=layoutKeyForTheme();cardSizes={};
 try{const saved=JSON.parse(localStorage.getItem(layoutKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))cardSizes=saved;}catch{}
 if(persist){try{localStorage.setItem(themeKey,theme);}catch{toast(t('主题已切换，但浏览器无法保存此偏好。'));}}
 if(state)render();
}
updateThemeButton();
function updateThemeButton(){const button=$('#theme-toggle');button.title=theme==='rounded'?t('当前：圆角主题；点击或向左滑动切换为经典主题'):t('当前：经典主题；点击或向右滑动切换为圆角主题');button.setAttribute('aria-checked',String(theme==='rounded'));button.dataset.current=theme;}
let themeDrag=null,suppressThemeClick=false;
$('#theme-toggle').onclick=()=>{if(suppressThemeClick){suppressThemeClick=false;return;}changeTheme(theme==='rounded'?'classic':'rounded');};
$('#theme-toggle').onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();changeTheme(['ArrowLeft','Home'].includes(event.key)?'classic':'rounded');}};
$('#theme-toggle').onpointerdown=event=>{if(event.button!==0)return;suppressThemeClick=false;themeDrag={id:event.pointerId,x:event.clientX};event.currentTarget.setPointerCapture(event.pointerId);};
$('#theme-toggle').onpointerup=event=>{if(!themeDrag||themeDrag.id!==event.pointerId)return;const delta=event.clientX-themeDrag.x;themeDrag=null;if(Math.abs(delta)>8){suppressThemeClick=true;changeTheme(delta>0?'rounded':'classic');}};
$('#theme-toggle').onpointercancel=()=>{themeDrag=null;suppressThemeClick=false;};
$('#theme-toggle').onlostpointercapture=()=>{themeDrag=null;};
window.addEventListener('storage',event=>{if(event.key===themeKey||event.key===null)changeTheme(event.newValue,false);});
function switchView(next){view=next;$('#search').value='';if(next!=='workspace')$('#day').value=next==='review'?reviewDay:resumeDay;render();scheduleAuto();}
$('#quicklinks').onclick=safe(async()=>{await load();switchView('workspace');});
$('#settings-shortcut').onclick=safe(async()=>{await load();showSettings();});
$('#configure-ai').onclick=()=>showSettings(true);
$('#ai-recovery').onclick=()=>showSettings(true);
$('#onboarding-rules').onclick=()=>$('#rules-button').click();
$('#brand-home').title=isSidePanel?t('在新标签页打开完整面板'):t('返回工作区');
$('#brand-home').setAttribute('aria-label',$('#brand-home').title);
$('#panel-expand').hidden=!isSidePanel;
$('#brand-home').onclick=safe(async()=>{
 if(isSidePanel)await chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')});
 else {await load();switchView('workspace');}
});
$('#search-toggle').onclick=()=>{searchOpen=!searchOpen;if(!searchOpen)$('#search').value='';render();if(searchOpen)$('#search').focus();};
$('#daily-review').onclick=safe(async()=>{await load();switchView('review');});
$('#continue-browsing').onclick=safe(async()=>{await load();switchView('history');});
$('#restore-day').onclick=safe(async()=>{
 if(restoring)return;restoring=true;const rows=visible(),day=$('#day').value;render();
 try{const result=await send({type:'restoreDay',day,ids:rows.map(r=>r.id)});await load();toast(t`已恢复 ${result.opened} 个标签，跳过 ${result.existing} 个已打开标签${result.failed?t`，${result.failed} 个失败，可重试`:''}。`);}finally{restoring=false;render();}
});
$('#day').value=dayKey();$('#day').max=dayKey();$('#day').onchange=()=>{if(!$('#day').value)return;if(view==='review'){reviewDay=$('#day').value;reviewDateChosen=true;}else{resumeDay=$('#day').value;resumeDateChosen=true;}render();};
$('#search').oninput=render;
$('#reset-layout').onclick=()=>{cardSizes={};saveLayout();render();toast(t('已恢复默认卡片大小。'));};
$('#refresh').onclick=safe(async()=>{retryAfter=0;autoError='';await load();toast(t('已同步当前标签清单。'));});
$('#rules-button').onclick=safe(async()=>{await load();resetRuleForm();renderRules();$('#ai-preference').value=state.preference||'';$('#save-preference').checked=!!state.config.savePreference;$('#export-preference').checked=false;$('#rules-dialog').showModal();});
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>document.getElementById(button.dataset.close).close();
$('#settings-form').onsubmit=safe(async event=>{event.preventDefault();const excluded=$('#excluded').value.split('\n').filter(s=>s.trim()).map(normalizeDomain);const provider=$('#ai-provider').value;if(setupIntent&&isExtension&&!$('#api-key').value.trim()&&!await send({type:'getKey',provider})){ $('#api-key').focus();throw new Error(t('请填写所选供应商的 API Key，或关闭设置后使用分类规则。'));}if(setupIntent&&!$('#recording').checked){$('#recording').focus();throw new Error(t('请开启记录，以同步并整理当前标签。'));}await send({type:'settings',expectedSettings:settingsBase,value:{provider,excluded,idleSeconds:Number($('#idle-seconds').value),recording:$('#recording').checked,model:$('#model').value}});if($('#api-key').value.trim())await send({type:'key',provider,value:$('#api-key').value});$('#api-key').value='';$('#settings-dialog').close();retryAfter=0;autoError='';await load();if(setupIntent){switchView('workspace');await runAI(true);}toast(setupIntent?t('设置已保存在本机。'):t('设置已保存在本地。'));});
$('#forget-key').onclick=safe(async()=>{resetConnection();await send({type:'key',provider:$('#ai-provider').value,value:''});$('#api-key').value='';await load();keyHelp();});
$('#clear-data').onclick=safe(async()=>{if(!confirm(t('清除所有本地浏览记录并暂停记录？分类规则和设置会保留，此操作不可撤销。')))return;await send({type:'clear'});await load();$('#settings-dialog').close();toast(t('已清空记录并暂停。'));});
function resetRuleForm(){editingRule=null;$('#rule-form').reset();fillWorkspaceSelect($('#rule-group'),$('#rule-new-group'),workspaceNames());$('#rule-save').textContent=t('确认保存规则');$('#rule-cancel').hidden=true;$('#rule-editing').hidden=true;}
$('#rule-cancel').onclick=resetRuleForm;
$('#rule-form').onsubmit=safe(async event=>{
 event.preventDefault();await send({type:'rule',base:editingRule,value:{keyword:$('#rule-keyword').value.trim(),group:selectedWorkspace($('#rule-group'),$('#rule-new-group'))}});
 await load();resetRuleForm();renderRules();toast(t('规则已保存，新页面会按列表优先级匹配。'));
});
$('#preference-form').onsubmit=safe(async event=>{event.preventDefault();await send({type:'preference',value:$('#ai-preference').value,save:$('#save-preference').checked});await load();toast(state.config.savePreference?t('偏好已保存，后续 AI 分类自动使用。'):t('偏好仅在本次浏览器会话使用，未长期保存。'));});
$('#export-rules').onclick=safe(async()=>{
 await load();const backup=exportRuleBackup(state.config,$('#export-preference').checked);
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download=`tabtrail-rules-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast(t`已导出 ${backup.rules.length} 条规则${backup.preference!==undefined?t('和已保存的 AI 偏好'):''}。`);
});
$('#import-rules').onclick=()=>{$('#rules-file').value='';$('#rules-file').click();};
$('#rules-file').onchange=safe(async()=>{
 const file=$('#rules-file').files[0];if(!file)return;if(file.size>1024*1024)throw new Error(t('规则备份不能超过 1 MB。'));
 let value;try{value=JSON.parse(await file.text());}catch{throw new Error(t('文件不是有效 JSON，尚未导入。'));}
 importBackup=parseRuleBackup(value);await load();const result=mergeRuleBackup(state.config.rules,importBackup);
 $('#import-summary').textContent=t`${importBackup.rules.length} 条规则：新增 ${result.added} 条，跳过 ${result.skipped} 条重复关键词。`;
 $('#import-preview').replaceChildren(...importBackup.rules.map(r=>el('div','',`${r.keyword} → ${r.group}`)));
 if(importBackup.preference!==undefined)$('#import-preview').append(el('div','',t`AI 偏好：${importBackup.preference||t('（空）')}`));
 $('#import-preference-label').hidden=importBackup.preference===undefined;$('#import-preference').checked=false;$('#import-dialog').showModal();
});
$('#confirm-import').onclick=safe(async()=>{
 if(!importBackup)return;const result=await send({type:'importRules',backup:importBackup});
 if($('#import-preference').checked&&importBackup.preference!==undefined){$('#ai-preference').value=importBackup.preference;$('#save-preference').checked=false;}
 $('#import-dialog').close();await load();resetRuleForm();renderRules();toast(t`已新增 ${result.added} 条规则，保留 ${result.skipped} 条已有规则。${$('#import-preference').checked?t('偏好已填入，请点击应用偏好。'):''}`);importBackup=null;
});
$('#reorganize').onclick=safe(async()=>{
 if(view!=='workspace')return;
 if(!isExtension){toast(t('当前是示例分类。加载 Chrome 扩展并配置 AI 后，即可整理真实标签页。'));return;}
 await load();if(!state.hasKey){showSettings();toast(t('先选择 AI 供应商并填写自己的 API Key。'));return;}
 pending=visible().map(r=>({...r}));if(!pending.length){toast(t('当前清单没有可整理的页面。'));return;}
 $('#ai-summary').textContent=t`当前范围：${pending.length} 个页面 · ${t(providerFor(state.config.provider).name)} / ${state.config.model} · 同时参考已打开页面中现有分类的代表标题和域名`;$('#ai-preview').replaceChildren(...pending.map(r=>{const line=el('div');line.append(el('strong','',r.title),el('small','',r.domain));return line;}));$('#ai-rules').textContent=t`已确认规则：${state.config.rules.length?state.config.rules.map(r=>`${r.keyword} → ${r.group}`).join('；'):t('无')}`;$('#ai-dialog').showModal();
});
async function runAI(automatic=false,force=false){
 if(busy)return;
 $('#ai-dialog').close();busy=true;render();
 const progress=$('#organize-progress');progress.hidden=false;
 const run=async()=>{
  const result=await organizeOpenTabs({send,force,ids:force?pending.map(r=>r.id):null,
   shouldContinue:fresh=>document.visibilityState==='visible'&&(!automatic||(view==='workspace'&&!document.querySelector('dialog[open]'))),
   onProgress:value=>{progress.textContent=t`全部 ${value.total} 页 · 规则归类 ${value.local} 页（免费） · AI 已检查 ${value.ai} 页 · 剩余 ${value.remaining} 页${value.remaining?t('，正在分批处理…'):''}`;}
  });
  for(const rule of result.suggestions)if(!suggestions.some(r=>r.keyword===rule.keyword))suggestions.push(rule);
  await load();autoError='';
  const notes={complete:t('整理完成'),paused:t('记录已暂停，请先开启记录以同步所有标签'),changed:t('设置已变化，已保留完成结果，请重新整理'),stopped:t('已暂停后续批次，返回工作区后可继续'),'no-key':isExtension?t('剩余页面需要 AI，请配置供应商和 Key'):t('示例预览不调用 AI；加载扩展后打开工作区即可整理真实标签')};
  progress.textContent=t`${notes[result.reason]} · 规则归类 ${result.local} 页（免费） · AI 已检查 ${result.ai} 页 · 仍待整理 ${result.unresolved} 页${result.remaining?t` · 剩余 ${result.remaining} 页`:''}`;
  if(!automatic&&isExtension&&result.reason==='no-key')showSettings();
 };
 try{
  if(navigator.locks)await navigator.locks.request('atlas-ai',{ifAvailable:true},async lock=>{if(lock)await run();else progress.textContent=t('另一个工作区窗口正在整理，请稍后查看结果。');});
  else await run();
 }catch(error){autoError=error.name==='TimeoutError'?t('AI 请求超时，可从更多菜单同步标签以重试。'):error.message;retryAfter=Date.now()+300000;progress.textContent+=t` · ${autoError} 已完成的批次会保留，使用更多菜单的「同步标签」可重试剩余页面。`;}
 finally{busy=false;render();if(autoDirty){autoDirty=false;scheduleAuto();}}
}
$('#ai-confirm').onclick=()=>{retryAfter=0;autoError='';return runAI(false,true);};
function scheduleAuto(){
 clearTimeout(autoTimer);
 if(!isExtension||!state||busy||sorting||sortSaving||view!=='workspace'||document.visibilityState==='hidden'||!state.config.recording||Date.now()<retryAfter)return;
 autoTimer=setTimeout(()=>safe(async()=>{
  if(document.querySelector('dialog[open]')||document.visibilityState==='hidden')return;
  await runAI(true);
 })(),1600);
}
$('#tab-form').onsubmit=safe(async event=>{
 event.preventDefault();const value={};
 const group=selectedWorkspace($('#tab-group'),$('#tab-new-group'));if(group!==editing.group)value.group=group;
 await send({type:'patch',id:editing.id,value});$('#tab-dialog').close();await load();
});
$('#exclude-tab').onclick=safe(async()=>{
 if(!confirm(t`排除 ${editing.domain} 及其子域名？已有本地记录将清除。`))return;
 await send({type:'settings',expectedSettings:settingsSignature(state.config),value:{...state.config,excluded:[...state.config.excluded,editing.domain]}});
 $('#tab-dialog').close();await load();
});
$('#search').onkeydown=event=>{if(event.key==='Escape'){$('#search').value='';render();}};
$('#more-menu').addEventListener('click',event=>{if(event.target.closest('button'))$('#more-menu').open=false;});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>{refreshSoon();scheduleAuto();});
let refreshTimer;
function refreshSoon(){if(busy){autoDirty=true;return;}clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!sorting&&!sortSaving&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]'))safe(load)();},250);}
if(isExtension){
 chrome.tabs.onCreated.addListener(refreshSoon);chrome.tabs.onRemoved.addListener(refreshSoon);
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.apiKeys||changes.config||changes.records&&recordsChanged(changes.records)))refreshSoon();});
 chrome.tabs.onUpdated.addListener((id,info)=>{if(info.url||Object.hasOwn(info,'title')||info.status==='complete')refreshSoon();});
}
window.addEventListener('focus',refreshSoon);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshSoon();else clearTimeout(autoTimer);});
function updateLanguageButtons(){
 $('#language-zh').setAttribute('aria-pressed',String(getLanguage()==='zh'));
 $('#language-en').setAttribute('aria-pressed',String(getLanguage()==='en'));
 document.title=t('Tabtrail');
}
function changeLanguage(value,persist=true){
 let saved=true;
 setLanguage(value);
 if(persist){try{localStorage.setItem(LANGUAGE_KEY,getLanguage());}catch{saved=false;}}
 translateStatic();updateLanguageButtons();updateThemeButton();
 $('#brand-home').title=isSidePanel?t('在新标签页打开完整面板'):t('返回工作区');
 $('#brand-home').setAttribute('aria-label',$('#brand-home').title);
 if(state){render();if($('#workspaces-dialog').open)renderWorkspaces();if($('#rules-dialog').open)renderRules();}
 // Preserve form values and edits in other open panels while relabeling options.
 for(const select of document.querySelectorAll('select'))for(const option of select.options){
  if(option.value===UNGROUPED)option.textContent=workspaceLabel(UNGROUPED);
  if(select.id==='ai-provider')option.textContent=t(providerFor(option.value).name);
 }
 if($('#settings-dialog').open){
  keyHelp();resetConnection();$('#save-settings').textContent=setupIntent?t('保存并开始整理'):t('保存设置');
 }
 $('#rule-save').textContent=editingRule?t('保存修改'):t('确认保存规则');
 for(const id of ['tab-group','rule-group']){
  const option=[...$('#'+id).options].find(option=>option.value==='');if(option)option.textContent=t('＋新建工作区…');
 }
 const target=[...$('#workspace-target').options].find(option=>option.value===UNGROUPED);if(target)target.textContent=t('待整理（系统工作区）');
 $('#toast').hidden=true;
 if(!saved)toast(t('语言已切换，仅在当前窗口生效。'));
 if(busy)autoDirty=true;
 if(!busy)$('#organize-progress').textContent='';
 scheduleAuto();
}
$('#language-zh').onclick=()=>changeLanguage('zh');
$('#language-en').onclick=()=>changeLanguage('en');
window.addEventListener('storage',event=>{if(event.key===LANGUAGE_KEY||event.key===null)changeLanguage(event.newValue,false);});
updateLanguageButtons();
await safe(load)();
if(location.hash==='#settings'&&state)showSettings();
if(location.hash==='#review'&&state)switchView('review');

setInterval(()=>{if(document.visibilityState==='visible'&&!document.querySelector('dialog[open]')){const changed=updateCalendar();if(changed||isExtension&&view==='review')safe(load)();}},60000);
