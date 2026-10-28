const concepts=[['D','流光颗粒 · 文件夹','疏朗的颗粒铺出文件夹，蓝、青、紫与白色高光在内部缓慢游走。外形固定，明暗与颗粒轻重随光变化。']];
const palettes={ocean:[214,186],violet:[267,190],amber:[16,44],mint:[164,142]};let palette='ocean';
let currentView='workspace';
const rows=[['G','GitHub','开源项目入门'],['M','MDN','JavaScript 基础指南'],['F','Figma','界面设计练习'],['N','Notion','项目资料与笔记'],['P','Pinterest','灵感与参考']];
const grid=document.querySelector('#grid');
for(const [id,name,description] of concepts){const card=document.createElement('section');card.className='concept';card.dataset.id=id;card.innerHTML=`<div class="label"><span class="letter">${id}</span><h2>${name}</h2></div><div class="stage"><canvas data-kind="${id}" aria-label="${name}动态标记"></canvas><small>HOVER TO EXPLORE</small></div><p class="description">${description}</p><div class="focusbar"><button data-focus="${id}">单独看 ↗</button></div><div class="mock"><aside class="sidebar"><div class="brand"><canvas data-kind="${id}" aria-label="${name}实际尺寸"></canvas><div><b>拾签</b><small>PICKMARK</small></div></div><div class="nav selected">▱ 工作区</div><div class="nav">◷ 每日回顾</div><div class="nav">↶ 继续浏览</div><div class="nav caption">分类</div><div class="nav selected">▤ 全部</div><div class="nav">⌘ 开发与技术</div><div class="nav">◇ 设计与灵感</div><div class="dock">分类与规则　设置</div></aside><div class="main"><div class="toolbar"><b>标签页　<span>书签</span></b><span>⌕　☼　关于与帮助</span></div><div class="content"><div class="hero"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 8h18v13H3z M7 8V3h14v5"/></svg><div><b>工作区</b><small>正在打开的标签，按主题归位</small></div><div class="count">39</div></div><div class="list-head"><b>全部标签 / 39</b><span>整理待分类 ↗</span></div>${rows.map(([icon,title,copy])=>`<div class="row"><i>${icon}</i><b>${title}</b><span>${copy}</span></div>`).join('')}</div></div></div>`;grid.append(card);}
// Compare page-header artwork; keep the same static brand in every mockup.
const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='title-study.css';document.head.append(sheet);
document.title='拾签 · 标题动态图形对比';
document.querySelector('.eyebrow').textContent='PICKMARK / HEADER MOTION STUDIES';
document.querySelector('h1').textContent='三个图形，同一种玫瑰流光。';
document.querySelector('header p').textContent='切换工作区、每日回顾和继续浏览，比较各自形状里的明暗波动。正式插件未修改。';
document.querySelector('footer').firstChild.textContent='左侧看颗粒细节，右侧看标题旁的实际比例。支持页面切换、深浅色、暂停和重播。';
for(const card of document.querySelectorAll('.concept')){
 const brand=card.querySelector('.brand canvas'),hero=card.querySelector('.hero svg');
 hero.replaceWith(brand);brand.setAttribute('aria-label',card.querySelector('h2').textContent+'标题图形');
 const mark=document.createElementNS('http://www.w3.org/2000/svg','svg');mark.setAttribute('viewBox','0 0 40 40');mark.setAttribute('aria-hidden','true');mark.innerHTML='<path fill="currentColor" d="M4 4h4v32l-4 3z M11 4h3v28l-3 2z M17 4h2v25l-2 1z M22 4h2v26l-2-1z M27 4h3v30l-3-2z M33 4h4v35l-4-3z"/>';card.querySelector('.brand').prepend(mark);
}
const switcher=document.createElement('div');switcher.className='page-switch';switcher.innerHTML='<span>配色</span><button data-palette="ocean" aria-pressed="true">蓝青 · 清透</button><button data-palette="violet" aria-pressed="false">紫青 · 灵感</button><button data-palette="amber" aria-pressed="false">琥珀珊瑚 · 温暖</button><button data-palette="mint" aria-pressed="false">翡翠薄荷 · 清新</button>';document.querySelector('header').after(switcher);
function pageView(view){
 currentView=view;
 for(const b of switcher.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.page===view));
 for(const card of document.querySelectorAll('.concept')){
  const review=view==='review',history=view==='history';card.querySelector('.hero b').textContent=history?'继续浏览':review?'每日回顾':'工作区';card.querySelector('.hero small').textContent=history?'找回之前浏览的页面':review?'回看今天的浏览，留下有用的线索':'正在打开的标签，按主题归位';card.querySelector('.count').textContent=review?'24':'39';card.querySelector('.list-head b').textContent=history?'历史页面 / 39':review?'今日浏览 / 24':'全部标签 / 39';card.querySelector('.list-head span').textContent=history?'历史补分类 ↗':review?'浏览轨迹':'整理待分类 ↗';
  const nav=card.querySelectorAll('.nav');nav[0].classList.toggle('selected',view==='workspace');nav[1].classList.toggle('selected',review);nav[2].classList.toggle('selected',history);
  const name=history?'继续浏览':review?'每日回顾':'工作区';
  card.querySelector('h2').textContent='玫瑰流光 · '+name;
  card.querySelectorAll('canvas').forEach(c=>c.setAttribute('aria-label',name+'流光图形'));
  for(let i=0;i<3;i++)nav[i].setAttribute('aria-pressed',String(i===['workspace','review','history'].indexOf(view)));
 }
 paint();
}
palette='warm';
switcher.innerHTML='<span>预览页面</span><button data-page="workspace" aria-pressed="true">工作区</button><button data-page="review" aria-pressed="false">每日回顾</button><button data-page="history" aria-pressed="false">继续浏览</button>';
switcher.addEventListener('click',e=>{if(e.target.dataset.page)pageView(e.target.dataset.page);});
document.querySelectorAll('.concept').forEach(card=>{[...card.querySelectorAll('.nav')].slice(0,3).forEach((nav,i)=>{const button=document.createElement('button');button.className=nav.className;button.textContent=nav.textContent;button.type='button';button.onclick=()=>pageView(['workspace','review','history'][i]);nav.replaceWith(button);});});
document.querySelector('.description').textContent='玫瑰、琥珀、靛紫与暖白在疏朗颗粒中流动。三个图形共享同样的明暗节奏，保留文件夹、时钟和回溯箭头各自的形状。';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,time=reduced.matches?3:0,last=0,raf=0;
const canvases=[...document.querySelectorAll('canvas')].map(canvas=>{const ctx=canvas.getContext('2d');canvas.width=canvas.height=288;const entry={canvas,ctx,kind:canvas.dataset.kind,hover:false};canvas.addEventListener('mouseenter',()=>{entry.hover=true;if(paused)paint();});canvas.addEventListener('mouseleave',()=>{entry.hover=false;if(paused)paint();});return entry;});
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function draw({ctx,kind,hover}){ctx.clearRect(0,0,288,288);const t=time,dark=document.body.classList.contains('dark');
 if(kind==='D'){
  const shape=new Path2D('M36 60H120L144 96H252V240H36Z');
  const clock=new Path2D();clock.arc(144,144,108,0,Math.PI*2);
  const hands=new Path2D('M144 79V144L187 176');
  const history=new Path2D('M47 112A102 102 0 1 1 47 178 M40 44V112H108 M144 84V144L101 167');
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(let y=32;y<260;y+=6)for(let x=32;x<260;x+=6){
   let inside=false;
   if(currentView==='workspace')inside=ctx.isPointInPath(shape,x,y);
   else if(currentView==='review'){ctx.lineWidth=15;inside=ctx.isPointInPath(clock,x,y)&&!ctx.isPointInStroke(hands,x,y);}
   else{ctx.lineWidth=28;inside=ctx.isPointInStroke(history,x,y);}
   if(!inside)continue;
   const nx=(x-144)/119,ny=(y-150)/105;
   const z=Math.sqrt(Math.max(0,1-nx*nx*.65-ny*ny*.65));
   const wave=Math.sin(nx*2.7+ny*1.4-t*1.1)+Math.cos(ny*2.6-nx*.8+t*.85);
   const mix=(wave+2)/4;
   // Interpolate through violet, rose and amber without crossing green.
   const hue=palette==='warm'?(mix<.55?255+mix/.55*80:335+(mix-.55)/.45*65):188+mix*83;
   const highlight=Math.pow(Math.max(0,1-Math.hypot(nx-Math.sin(t*.8)*.65,ny-Math.cos(t*.65)*.5)),2);
   const shade=(Math.sin(nx*4.5-ny*3+t*2.2)+1)/2;
   const grain=noise(x*31+y);
   const glint=Math.pow((Math.sin(t*2.8+grain*12+nx*3)+1)/2,10)*.45;
   const alpha=(.56+z*.2+shade*.2)*(grain<.13?.42:1);
   const size=1.4+z*.55+shade*.65+glint*.65;
   const light=Math.min(97,(dark?27:22)+shade*39+highlight*37+glint*25);
   ctx.fillStyle=`hsla(${hue},${Math.max(8,83-highlight*62-glint*60)}%,${light}%,${alpha})`;
   ctx.fillRect(x-size/2,y-size/2,size,size);
  }
  ctx.restore();return;
 }
 if(kind==='A'){const radius=112;for(let y=-112;y<=112;y+=6)for(let x=-112;x<=112;x+=6){const q=(x*x+y*y)/(radius*radius);if(q>1)continue;const z=Math.sqrt(1-q),wave=Math.sin(x*.024+y*.018+t*.65)+Math.cos(y*.03-t*.5);const hue=205+wave*20+z*16;const alpha=.3+z*.6;const light=(dark?58:49)+z*18+Math.sin(x*.04-t)*8;const size=2.3+z*.7;ctx.fillStyle=`hsla(${hue},85%,${light}%,${alpha})`;const pulse=hover?1+Math.sin(t*3+q*8)*.022:1;ctx.fillRect(144+x*pulse,144+y*pulse,size,size);}}
 if(kind==='B'){const settle=reduced.matches?1:Math.min(1,t/1.6),ease=1-Math.pow(1-settle,3);let n=0;for(let y=0;y<24;y++)for(let x=0;x<18;x++){if(y>18+Math.abs(x-8.5)*.57)continue;const id=n++,px=144+(x-8.5)*8,py=49+y*8;const spread=(1-ease)*100+(hover?Math.max(0,Math.sin(t*1.8+id*.3))*5:0);const dx=(noise(id)-.5)*spread,dy=(noise(id+1000)-.5)*spread;const hue=204+x*2.2+Math.sin(y*.2+t*.55)*16;ctx.fillStyle=`hsla(${hue},82%,${(dark?64:52)+Math.sin(x*.3+y*.2+t)*10}%,${.62+noise(id+200)*.35})`;ctx.fillRect(px+dx,py+dy,5.3,5.3);}}
 if(kind==='C'){for(let i=0;i<12;i++){const x=48+i*16,width=[8,5,3,7][i%4],sweep=Math.sin(t*1.1-i*.38),top=52+(hover?sweep*8:Math.sin(t*.6-i*.3)*3);const bottom=228-Math.max(0,1-Math.abs(i-5.5)/5.5)*35;const grad=ctx.createLinearGradient(x,top,x,bottom);grad.addColorStop(0,`hsl(${233+sweep*20},85%,${dark?73:62}%)`);grad.addColorStop(.52,`hsl(${192+sweep*16},85%,${dark?66:46}%)`);grad.addColorStop(1,`hsl(${264+sweep*12},75%,${dark?70:60}%)`);ctx.fillStyle=grad;ctx.fillRect(x,top,width,bottom-top);}}
}
function paint(){canvases.forEach(e=>{if(e.canvas.getBoundingClientRect().width)draw(e);});}
function tick(now){if(paused||document.hidden){raf=0;return;}if(now-last>=33){time+=last?Math.min((now-last)/1000,.1):0;last=now;paint();}raf=requestAnimationFrame(tick);}
function start(){last=0;if(!raf&&!paused&&!document.hidden)raf=requestAnimationFrame(tick);}
function pauseLabel(){document.querySelector('#pause').textContent=paused?'播放动画':'暂停动画';}
document.querySelector('#pause').onclick=()=>{paused=!paused;pauseLabel();start();};
document.querySelector('#replay').onclick=()=>{time=0;paused=false;pauseLabel();start();};
for(const theme of ['light','dark'])document.querySelector('#'+theme).onclick=()=>{document.body.classList.toggle('dark',theme==='dark');for(const value of ['light','dark'])document.querySelector('#'+value).setAttribute('aria-pressed',String(value===theme));paint();};
document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{document.body.dataset.focus=b.dataset.focus;document.querySelectorAll('.concept').forEach(c=>c.classList.toggle('focused',c.dataset.id===b.dataset.focus));document.querySelector('#all').hidden=false;paint();});
document.querySelector('#all').onclick=()=>{delete document.body.dataset.focus;document.querySelector('#all').hidden=true;paint();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else start();});
reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)time=3;pauseLabel();paint();start();});
pauseLabel();paint();start();
document.querySelector('[data-focus=D]').click();document.querySelector('#all').hidden=true;document.querySelector('.focusbar').style.display='none';document.querySelector('.letter').textContent='≈';document.querySelector('.stage small').textContent='PIXEL VOLUME · SLOW FLOW';
pageView('workspace');
