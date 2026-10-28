const shape = new Path2D('M36 60H120L144 96H252V240H36Z');
const clock = new Path2D(); clock.arc(144,144,108,0,Math.PI*2);
const hands = new Path2D('M144 79V144L187 176');
const history = new Path2D('M47 112A102 102 0 1 1 47 178 M40 44V112H108 M144 84V144L101 167');
const spark = new Path2D('M144 24L180 108L264 144L180 180L144 264L108 180L24 144L108 108Z');
const pages = {
 workspace:{title:'工作区',subtitle:'正在打开的标签，按主题归位',shape:'folder',count:39,list:'全部标签',action:'整理待分类 ↗'},
 review:{title:'每日回顾',subtitle:'回看今天的浏览与投入',shape:'clock',count:12,list:'今日浏览',action:'查看回顾 ↗'},
 history:{title:'继续浏览',subtitle:'从上次停下的地方继续',shape:'history',count:8,list:'最近浏览',action:'继续浏览 ↗'},
 folders:{title:'原文件夹',subtitle:'沿用浏览器里的收藏目录',shape:'folder',count:16,list:'全部书签',action:'应用书签规则 ↗'},
 smart:{title:'智能分类',subtitle:'按主题重新整理，不动原目录',shape:'spark',count:16,list:'分类书签',action:'整理书签 ↗'}
};
let selected = 'workspace';
function art() {
 return '<canvas class="art" width="440" height="440" role="img" aria-label="连续液态色场文件夹"></canvas>';
}
document.querySelector('#studies').innerHTML = `<section class="card"><div class="heading"><span class="letter">C</span><h2>液态交融</h2></div><div class="stage">${art()}</div><p class="description">蓝色铺底，粉紫连接橙色余晖。色带不断弯曲、舒展，高光沿交汇处流动，文件夹轮廓保持不变。</p><div class="mock"><div class="bar"><b>标签页</b><span>书签</span><span class="help">查找　关于与帮助</span></div><div class="content"><div class="hero">${art()}<div><h3>工作区</h3><p>正在打开的标签，按主题归位</p></div><span class="count">39</span></div><div class="list-head"><b>全部标签 / 39</b><span>整理待分类 ↗</span></div>${[['G','GitHub','开源项目入门'],['M','MDN','JavaScript 基础指南'],['F','Figma','界面设计练习']].map(([icon,name,title]) => `<div class="row"><i>${icon}</i><div><b>${name}</b><small>${title}</small></div><span>···</span></div>`).join('')}</div></div></section>`;
document.querySelector('.description').textContent = '暮蓝与钴蓝为主，粉紫过渡到珊瑚橙与落日橙。局部余晖浓淡流转，保留蓝调时刻的清冷与温度。';
const navigation = document.createElement('nav');
navigation.className = 'page-switch';
navigation.setAttribute('aria-label','切换图标小样');
navigation.innerHTML = Object.entries(pages).map(([key,page])=>`<button data-page="${key}" aria-pressed="${key===selected}"><small>${['folders','smart'].includes(key)?'书签':'标签页'}</small>${page.title}</button>`).join('');
document.querySelector('#studies').before(navigation);
function selectPage(key) {
 selected=key; const page=pages[key];
 for(const button of navigation.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.page===key));
 document.querySelector('.heading h2').textContent=`${page.title} · 液态交融`;
 document.querySelector('.hero h3').textContent=page.title;
 document.querySelector('.hero p').textContent=page.subtitle;
 document.querySelector('.count').textContent=page.count;
 document.querySelector('.list-head b').textContent=`${page.list} / ${page.count}`;
 document.querySelector('.list-head span').textContent=page.action;
 document.querySelector('.bar').innerHTML=`<${['folders','smart'].includes(key)?'span':'b'}>标签页</${['folders','smart'].includes(key)?'span':'b'}><${['folders','smart'].includes(key)?'b':'span'}>书签</${['folders','smart'].includes(key)?'b':'span'}><span class="help">查找　关于与帮助</span>`;
 for(const canvas of document.querySelectorAll('canvas.art'))canvas.setAttribute('aria-label',`${page.title}液态图标`);
 draw(elapsed);
}
navigation.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(button)selectPage(button.dataset.page);});
// A single continuous material field, sampled once and shared by both previews.
const surface = document.createElement('canvas');
surface.width = surface.height = 180;
const context = surface.getContext('2d');
const pixels = context.createImageData(180,180);
const views = [...document.querySelectorAll('canvas.art')].map(canvas => ({canvas,ctx:canvas.getContext('2d')}));
const mix = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,v) => {const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
function noise(x,y) {
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
 const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
}
function field(x,y,t) {
 const qx=noise(x*1.5+t*.12,y*1.5-t*.09);
 const qy=noise(x*1.5+5-t*.08,y*1.5+t*.11);
 const u=x+1.15*(qx-.5),v=y+1.15*(qy-.5);
 return .76*noise(u*2.1+t*.13,v*2.1-t*.1)+.24*noise(u*4.2-t*.08,v*4.2+8);
}
function draw(t) {
 const data=pixels.data;
 for(let y=0;y<180;y++)for(let x=0;x<180;x++){
  const u=x/180,v=y/180,f=field(u,v,t);
  const warm=smooth(.48,.68,f),violet=smooth(.35,.55,f)*(1-warm);
  const light=smooth(.24,.6,f)*.22 + Math.pow(Math.max(0,1-Math.abs(f-.57)*12),4)*.1;
  const blue=[32,66,166],purple=[143,125,213];
  const coral=[240,112,125],sunset=[250,112,64];
  const index=(y*180+x)*4;
  for(let channel=0;channel<3;channel++){
   const ember=mix(coral[channel],sunset[channel],smooth(.3,.9,warm));
   const color=mix(mix(blue[channel],purple[channel],violet),ember,warm);
   data[index+channel]=mix(color,[205,216,255][channel],light*(1-.7*warm));
  }
  data[index+3]=255;
 }
 context.putImageData(pixels,0,0);
 for(const {canvas,ctx} of views){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
  ctx.scale(canvas.width/288,canvas.height/288);
  ctx.drawImage(surface,0,0,288,288);
  ctx.globalCompositeOperation='destination-in';
  ctx.lineCap='round';ctx.lineJoin='round';
  const kind=pages[selected].shape;
  if(kind==='history'){ctx.lineWidth=28;ctx.stroke(history);}
  else ctx.fill(kind==='clock'?clock:kind==='spark'?spark:shape);
  if(kind==='clock'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=15;ctx.stroke(hands);}
  ctx.restore();
 }
}
for (const button of document.querySelectorAll('[data-theme]')) button.onclick = () => {
 document.body.classList.toggle('dark',button.dataset.theme==='dark');
 for (const item of document.querySelectorAll('[data-theme]')) item.setAttribute('aria-pressed',String(item===button));
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches, frame = 0, previous = 0, elapsed = 0;
function tick(now) {
 if(now-previous>=32) { elapsed += previous ? Math.min(now-previous,100)/1000 : 0; previous=now; draw(elapsed); }
 frame=requestAnimationFrame(tick);
}
function sync() {
 cancelAnimationFrame(frame); previous=0;
 document.querySelector('#pause').textContent=paused?'播放动画':'暂停动画';
 document.querySelector('#pause').setAttribute('aria-pressed',String(paused));
 if(!paused&&!document.hidden) frame=requestAnimationFrame(tick);
}
document.querySelector('#pause').onclick=()=>{paused=!paused;sync();};
reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
document.addEventListener('visibilitychange',sync);
selectPage('workspace');sync();
