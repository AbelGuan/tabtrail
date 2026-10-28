import {getLanguage} from './i18n.js';
import {I} from './offset-icons.js';
import {renderAbout} from './about-ui.js';

// UI-only preference: never written into the records/settings transaction.
export const GUIDE_KEY='pickmark-guide-v1';
const L=(zh,en)=>getLanguage()==='en'?en:zh;
let installed=false;
let about,guide,step=0;
let originalRail=false,frame=0;
let configureAI=()=>{};
const steps=()=>[
 [L('一个工作区，两种收藏方式','One workspace, two ways to organize'),L('标签页管理打开的网页，书签管理长期收藏；分类和规则分别保存。','Tabs manage open pages; bookmarks keep long-term collections. Each has separate categories and rules.'),L('在这里切换标签页与书签。','Switch between tabs and bookmarks here.')],
 [L('先按自己的方式整理','Organize your way'),L('在这里创建分类、调整归属，或设置标题与域名匹配规则。','Create categories, adjust assignments, or match titles and domains with rules here.'),L('人工整理和本地规则无需 API Key。','Manual organization and local rules need no API key.')],
 [L('让 AI 帮你整理网页','Let AI organize your pages'),L('选择 AI 供应商并填写 API Key，帮助整理未匹配的网页。','Choose an AI provider and enter your API key to organize unmatched pages.'),L('AI 为可选功能，供应商可能收费。书签 AI 整理前需要确认处理范围，不会因为配置了 Key 就自动扫描全部书签。','AI is optional and provider fees may apply. Bookmark AI requires confirmation of the processing scope; setting up a key does not automatically scan all bookmarks.')]
];
function rail(open){const current=document.querySelector('#rail')?.classList.contains('open');if(current!==open)document.querySelector(open?'#menu':'#rail-close')?.click();}
function place(){
 if(!guide.open)return;
 cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const card=guide.querySelector('.tour-card'),ring=guide.querySelector('.tour-ring');
  const narrow=innerWidth<=800;
  rail(step>=1&&narrow?true:originalRail&&narrow);
  const target=step===0?document.querySelector('.mode-switch'):document.querySelector(`.nav-dock [data-pm-view=${step===1?'manage':'settings'}]`);
  const r=target?.getBoundingClientRect();
  ring.hidden=!r;
  if(r){const left=Math.max(2,r.left-4),top=Math.max(2,r.top-4);Object.assign(ring.style,{left:`${left}px`,top:`${top}px`,width:`${Math.min(innerWidth-2,r.right+4)-left}px`,height:`${Math.min(innerHeight-2,r.bottom+4)-top}px`});}
  const w=Math.min(420,innerWidth-32),h=card.getBoundingClientRect().height;
  const x=r?Math.max(16,Math.min(innerWidth-w-16,r.left)):Math.max(16,(innerWidth-w)/2);
  const y=r?(r.bottom+20+h<innerHeight-16?r.bottom+20:r.top-h-20):(innerHeight-h)/2;
  Object.assign(card.style,{width:`${w}px`,left:`${x}px`,top:`${Math.max(16,Math.min(innerHeight-h-16,y))}px`});
  card.dataset.direction=r?(y>r.top?'up':'down'):'none';
  card.style.setProperty('--tour-arrow-x',`${r?Math.max(20,Math.min(w-20,r.left+r.width/2-x)):20}px`);
  const pointer=guide.querySelector('.tour-pointer');pointer.hidden=!r;
  if(r)Object.assign(pointer.style,{left:`${x+Math.max(20,Math.min(w-20,r.left+r.width/2-x))-6}px`,top:`${y>r.top?Math.max(16,y)-6:Math.max(16,y)+h-6}px`});
 });
}
function finish(){
 try{localStorage.setItem(GUIDE_KEY,'seen');}catch{/* Storage pressure must never block the workspace. */}
 guide.close();
}
function drawGuide(){
 const [title,copy,hint]=steps()[step];
 guide.innerHTML=`<div class="tour-ring" aria-hidden="true"></div><section class="tour-card"><div class="dialog-heading"><span class="mono">PICKMARK / ${step+1} · 3</span><button type="button" data-skip>${L('跳过','Skip')}</button></div><h2 id="guide-title">${title}</h2><p>${copy}</p><p class="help">${hint}</p><div class="dialog-actions"><button type="button" data-back ${step===0?'disabled':''}>${L('上一步','Back')}</button>${step===2?`<button type="button" data-later>${L('稍后再说','Maybe later')}</button>`:''}<button type="button" class="primary" data-next>${step===2?L('去配置 AI','Set up AI'):L('下一步','Next')}</button></div></section>`;
 guide.querySelector('[data-later]')?.addEventListener('click',finish);
 const pointer=document.createElement('div');pointer.className='tour-pointer';pointer.setAttribute('aria-hidden','true');guide.append(pointer);
 guide.querySelector('[data-skip]').onclick=finish;
 guide.querySelector('[data-back]').onclick=()=>{step--;drawGuide();guide.querySelector('[data-next]').focus();};
 guide.querySelector('[data-next]').onclick=()=>{if(step===2){guide.addEventListener('close',configureAI,{once:true});finish();return;}step++;drawGuide();guide.querySelector('[data-next]').focus();};
 place();
}
export function openGuide(){originalRail=document.querySelector('#rail')?.classList.contains('open')||false;document.body.classList.add('tour-active');step=0;drawGuide();guide.showModal();place();guide.querySelector('[data-next]').focus();}
export function helpLabels(){
 let button=document.querySelector('#top-help');
 if(!button){const tools=document.querySelector('.top-tools');if(!tools)return;button=document.createElement('button');button.type='button';button.id='top-help';button.onclick=openAbout;tools.append(button);}
 button.innerHTML=I('spark')+`<span>${L('关于与帮助','About & help')}</span>`;button.title=L('认识拾签 · 开源 · 支持作者','About Pickmark · Source code · Support');
}
export function openAbout(){
 void renderAbout(about,L,openGuide);
 about.showModal();
}
export function focusAI(){
 requestAnimationFrame(()=>{const input=document.querySelector('#ai-provider');if(!input?.checkVisibility())return;const section=input.closest('.settings-section');section?.scrollIntoView({block:'start',behavior:'instant'});input.focus({preventScroll:true});});
}
export function installHelp(onConfigureAI){
 configureAI=onConfigureAI;
 if(installed)return;installed=true;
 about=document.createElement('dialog');about.id='pickmark-about';about.setAttribute('aria-labelledby','about-title');
 guide=document.createElement('dialog');guide.id='pickmark-guide';guide.setAttribute('aria-labelledby','guide-title');
 document.body.append(about,guide);
 guide.addEventListener('cancel',event=>{event.preventDefault();finish();});
 guide.addEventListener('close',()=>{cancelAnimationFrame(frame);rail(originalRail);document.body.classList.remove('tour-active');});
 guide.addEventListener('keydown',e=>e.stopPropagation());
 window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});
 let seen=true;try{seen=localStorage.getItem(GUIDE_KEY)==='seen';}catch{}
 if(!seen)queueMicrotask(openGuide);
}
