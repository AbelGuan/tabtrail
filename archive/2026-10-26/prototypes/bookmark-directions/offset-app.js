
const glyphs={pin:'M9 3h6l-1 6 4 4H6l4-4z M12 13v8',sound:'M4 9v6h4l5 4V5L8 9z M16 9a4 4 0 0 1 0 6',sleep:'M14 4h6l-6 7h6 M4 12h5l-5 7h5',dense:'M4 5h16 M4 9.5h16 M4 14h16 M4 18.5h16',airy:'M4 6h16 M4 12h16 M4 18h16',arrow:'M5 19 19 5 M5 5h14v14',right:'M4 12h16 m-6-6 6 6-6 6',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',list:'M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1',tabs:'M3 8h18v13H3z M7 8V3h14v5',bookmark:'M6 3h12v18l-6-4-6 4z',clock:'M12 6v6l4 3 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',history:'M3 9a9 9 0 1 1 0 6 M3 3v6h6 M12 7v5l-4 2',folder:'M3 5h7l2 3h9v12H3z',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',all:'M4 4h16v16H4z M4 9h16 M9 9v11',search:'m16 16 5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',more:'M5 11v2 M12 11v2 M19 11v2',sun:'M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M20 4l-2 2 M4 20l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12',settings:'M3 7h18 M3 17h18 M8 3v8 M16 13v8',info:'M12 10v7 M12 6v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',close:'M5 5l14 14 M19 5 5 19',menu:'M3 6h18 M3 12h18 M3 18h18',check:'m4 12 5 5L20 5',lock:'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4',refresh:'M20 8a9 9 0 1 0 1 7 M20 3v6h-6'};
const I=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${glyphs[n]||glyphs.folder}"/></svg>`;
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const groups=['设计与造物','代码与逻辑','阅读与远方','日常与生活','待整理'];
const folders=['书签栏 / 设计档案','书签栏 / 开发文档','其他书签 / 慢慢读','其他书签 / 生活切片'];
const seed=[
 ['Form follows curiosity','form.example','设计与造物','不是每个想法都需要答案。有些只需要被好好留下。','F','poster','#84734d'],
 ['Figma · 拾签的下一个形状','figma.com','设计与造物','从界面草图到可使用的组件，一份仍在生长的设计稿。','F','design','#7f6890'],
 ['Objects of everyday life','objects.example','设计与造物','平凡物件里的材料、结构，以及经得起时间的细节。','O','objects','#a46c47'],
 ['Type foundry · 字体观察','type.example','设计与造物','字里行间，藏着一整个世界的性格。','Aa','type','#556b5d'],
 ['GitHub · Pickmark workspace','github.com','代码与逻辑','一个关于信息归位的实验。组件、逻辑与本地优先。','G','code','#54695a'],
 ['MDN · The shape of CSS Grid','developer.mozilla.org','代码与逻辑','用网格组织空间，给内容留出呼吸的余地。','M','grid','#58717a'],
 ['Local-first, human-first','local.example','代码与逻辑','让数据留在身边，让工具保持安静。','L','code','#7b8061'],
 ['A slower kind of internet','slow.example','阅读与远方','少一点刷新，多一点真正值得回来的地方。','s','article','#97735b'],
 ['Field notes · 山野之间','field.example','阅读与远方','风经过森林。我们经过一段不需要赶路的时间。','f','landscape','#6f805d'],
 ['The quiet practice of noticing','noticing.example','阅读与远方','一些没有目的的观察，一本永远写不完的笔记。','N','article','#786f5f'],
 ['京都 · 留一天给小路','kyoto.example','日常与生活','离开主街，去寻找雨后的庭院和一间小咖啡馆。','旅','landscape','#8c7658'],
 ['Sunday table · 不赶时间的午餐','sunday.example','日常与生活','陶器、时令蔬菜，以及愿意坐下来的人。','S','objects','#a77252'],
 ['一个尚未命名的灵感','new.example','待整理','先留下，再想想它属于哪里。','n',null,'#7b816c'],
 ['关于未来工作方式的片段','future.example','待整理','等待下一次整理的页面。','↗',null,'#7b816c']
];
const make=(s,i,p)=>({id:p+i,title:s[0],domain:s[1],group:s[2],desc:s[3],mark:s[4],art:s[5],color:s[6],folder:folders[Math.min(3,groups.indexOf(s[2]))],manual:i===2});
const tabs=seed.map((r,i)=>make(r,i,'t')),bookmarks=seed.slice(0,12).map((r,i)=>make(r,i,'b')),history=seed.slice(0,9).map((r,i)=>({...make(r,i,'h'),group:i>5?'待整理':r[2]}));
bookmarks.push(make(['Color field · 自然的配色','color.example','设计与造物','从植物、岩石与日光里采集颜色。','C','poster','#927557'],12,'b'),make(['SVG handbook · 让图形呼吸','svg.example','代码与逻辑','向量、曲线与那些轻巧的交互。','S','grid','#76835c'],13,'b'),{...make(seed[12],14,'b'),folder:folders[2]},{...make(seed[0],15,'b'),folder:folders[2],desc:'同一网址的另一份收藏，保留它在原目录中的位置。'});
const DOTS={'0':['01110','10001','10001','10001','10001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','11110','00001','00001','10001','01110'],'6':['00110','01000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00010','01100'],':':['0','0','1','0','1','0','0']};
function DM(str){let x=0,dots='';for(const ch of String(str)){const g=DOTS[ch];if(!g)continue;g.forEach((row,y)=>[...row].forEach((b,c)=>{dots+=`<circle class="${b==='1'?'on':'off'}" cx="${x+c+.5}" cy="${y+.5}" r=".4"/>`;}));x+=g[0].length+1;}const w=Math.max(1,x-1);return `<svg class="dm" viewBox="0 0 ${w} 7" style="--w:${w}" role="img" aria-label="${E(str)}" fill="currentColor">${dots}</svg>`;}
const POOL={'设计与造物':[['Are.na · 收集与连接','are.na','poster'],['Typewolf · 本周字体','typewolf.com','type'],['Fonts In Use · 字体档案','fontsinuse.com','type'],['It\'s Nice That · 新锐作品','itsnicethat.com','poster'],['Brutalist Websites','brutalistwebsites.com','design'],['Dieter Rams · 十条原则','vitsoe.com','objects'],['Muji · 无印良品的器物','muji.com','objects'],['Swiss Design Archive','museum-gestaltung.ch','poster'],['Cosmos · 视觉灵感','cosmos.so','design'],['Pentagram · 新项目','pentagram.com','poster'],['Savee · 灵感板','savee.it','design'],['Klim Type Foundry','klim.co.nz','type'],['Teenage Engineering · OP-1','teenage.engineering','objects'],['Spline · 三维草稿','spline.design','design'],['Grilli Type · 字体试用','grillitype.com','type']],
'代码与逻辑':[['React · Server Components','react.dev','code'],['TypeScript Handbook','typescriptlang.org','grid'],['Chrome Extensions · Side Panel API','developer.chrome.com','code'],['Chrome Extensions · Bookmarks API','developer.chrome.com','code'],['web.dev · Container queries','web.dev','grid'],['Vite · 构建配置','vitejs.dev','code'],['IndexedDB · 本地存储笔记','javascript.info','code'],['Can I use · view-transition','caniuse.com','grid'],['Hacker News · Local-first','news.ycombinator.com','article'],['Stack Overflow · tabs.query','stackoverflow.com','code'],['Playwright · 测试指南','playwright.dev','code'],['Josh Comeau · CSS 动画','joshwcomeau.com','grid'],['Rust Book · 所有权','doc.rust-lang.org','code'],['SQLite · When to use','sqlite.org','article'],['Linear Method · 工作方式','linear.app','article']],
'阅读与远方':[['Aeon · 关于无聊的随笔','aeon.co','article'],['The Marginalian · 阅读札记','themarginalian.org','article'],['Craig Mod · 走路笔记','craigmod.com','landscape'],['少数派 · 数字生活方式','sspai.com','article'],['Atlas Obscura · 秘境','atlasobscura.com','landscape'],['Kinfolk · 慢生活','kinfolk.com','objects'],['豆瓣读书 · 想读清单','book.douban.com','article'],['Longreads · 本周长文','longreads.com','article'],['NASA · 今日天文图','apod.nasa.gov','landscape'],['Public Domain Review','publicdomainreview.org','poster'],['单读 · 新一期','owspace.com','article'],['Wikipedia · 侘寂','zh.wikipedia.org','article'],['Nautilus · 时间的形状','nautil.us','article'],['国家地理 · 冰岛','natgeo.com','landscape'],['Monocle · 城市指南','monocle.com','landscape']],
'日常与生活':[['小红书 · 周末去哪','xiaohongshu.com','landscape'],['下厨房 · 番茄牛腩','xiachufang.com','objects'],['12306 · 车次查询','12306.cn','grid'],['和风天气 · 十五天','qweather.com','grid'],['Google Calendar · 本周','calendar.google.com','grid'],['Gmail · 收件箱','mail.google.com','article'],['Notion · 搬家清单','notion.so','article'],['Spotify · 专注歌单','open.spotify.com','poster'],['淘宝 · 台灯比较','taobao.com','objects'],['大众点评 · 附近咖啡','dianping.com','objects'],['Airbnb · 京都町屋','airbnb.com','landscape'],['Strava · 周日骑行','strava.com','landscape'],['Apple Support · 备份','support.apple.com','grid'],['哔哩哔哩 · 收纳视频','bilibili.com','objects'],['Things · 今日待办','culturedcode.com','grid']]};
const extra=(n,p,start)=>{const out=[];let i=0;while(out.length<n){const g=groups[i%4],list=POOL[g],e=list[Math.floor(i/4)%list.length];out.push(make([e[0],e[1],g,'',e[0][0].toUpperCase(),e[2],'#888'],start+out.length,p));i++;}return out;};
tabs.push(...extra(60,'t',14));bookmarks.push(...extra(48,'b',16));
const MORE=['工作项目 · 拾签','研究资料','影像与摄影','音乐与声音','旅行计划','学习课程','购物比较','健康与运动','新闻与时事','财务与账单','家居与改造','灵感速记'];groups.push(...MORE);
[tabs.slice(14),bookmarks.slice(16)].forEach(list=>list.forEach((r,i)=>{if(i%5>1)r.group=MORE[(i*7)%MORE.length];}));
const state={mode:'bookmarks',tabs:{view:'workspace',filter:'全部',q:'',layout:'list',selected:'t0',scroll:0},bookmarks:{view:'folders',filter:'全部',q:'',layout:'list',selected:'b0',scroll:0},night:false,appearance:'system',previewEnabled:true,density:'compact',navQ:'',reviewBy:'group',date:'2026-10-12',hour:10};
const cur=()=>state[state.mode],all=()=>state.mode==='bookmarks'?bookmarks:cur().view==='history'?history:tabs,find=id=>[...tabs,...bookmarks,...history].find(r=>r.id===id),key=()=>state.mode==='bookmarks'&&cur().view==='folders'?'folder':'group';
const rows=()=>all().filter(r=>cur().q?`${r.title} ${r.domain} ${r.group} ${r.folder}`.toLowerCase().includes(cur().q.toLowerCase()):cur().filter==='全部'||r[key()]===cur().filter).filter(()=>cur().view!=='history'||state.date==='2026-10-12');
let hoverTimer,toastTimer,previewTrigger,activeId=null;
const rules=[{domain:'figma.com',group:groups[0],mode:'tabs',enabled:true},{domain:'developer.mozilla.org',group:groups[1],mode:'tabs',enabled:true},{domain:'type.example',group:groups[0],mode:'bookmarks',enabled:true}];
$('#search').insertAdjacentHTML('afterbegin',I('search'));$('#menu').innerHTML=I('menu');$('#theme').innerHTML=I('moon');$('#settings').innerHTML=I('settings');$('#rail-about').innerHTML=I('info');$('#rail-close').innerHTML=I('close');$('#search-glyph').innerHTML=I('search');$('#command-close').innerHTML=I('close');
function transition(fn){if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion:reduce)').matches)document.startViewTransition(fn);else fn();}
function navItem(label,ico,attr,value,active,count){return `<button class="nav ${active?'active':''}" data-${attr}="${E(value)}" ${active?'aria-current="page"':''}>${I(ico)}<span>${E(label)}</span>${count===undefined?'':`<span class="number mono">${count}</span>`}</button>`}
function renderNav(){
 const t=state.mode==='tabs',v=cur().view;
 let html='<div class="nav-group nav-primary"><p class="rail-label mono">'+(t?'浏览':'收藏')+'</p>';
 if(t)html+=navItem('工作区','tabs','view','workspace',v==='workspace',tabs.length)+navItem('每日回顾','clock','view','review',v==='review')+navItem('继续浏览','history','view','history',v==='history',history.length);
 else html+=navItem('原文件夹','folder','view','folders',v==='folders',bookmarks.length)+navItem('智能分类','spark','view','smart',v==='smart');
 html+='</div>';
 if(!['review','settings','manage','rules'].includes(v)){
  const folder=key()==='folder',list=all();
  let cats=(folder?folders:groups).map(name=>({name,count:list.filter(r=>r[key()]===name).length})).filter(c=>c.count);
  if(!folder)cats.sort((a,b)=>(b.name==='待整理')-(a.name==='待整理')||b.count-a.count);
  html+='<div class="nav-group nav-cats"><p class="rail-label mono">'+(folder?'目录':'分类')+'<span>'+String(cats.length).padStart(2,'0')+'</span></p>'+(cats.length>6?'<label class="nav-find">'+I('search')+'<input id="nav-filter" type="text" placeholder="筛选分类" autocomplete="off" aria-label="筛选分类" value="'+E(state.navQ)+'"></label>':'')+'<div class="nav-scroll">'+`<button class="nav cat ${cur().filter==='全部'?'active':''}" data-filter="全部" ${cur().filter==='全部'?'aria-current="page"':''}><span>全部</span><span class="number mono">${list.length}</span></button>`+cats.map(c=>`<button class="nav cat ${cur().filter===c.name?'active':''}" data-filter="${E(c.name)}" ${cur().filter===c.name?'aria-current="page"':''}><span>${E(folder?c.name.split(' / ')[1]:c.name)}</span>${catFavs(c.name)}<span class="number mono">${c.count}</span></button>`).join('')+'<p class="nav-none" hidden>没有匹配的分类</p></div></div>';
 }
 const dock=(label,short,ico,view)=>`<button class="dock ${v===view?'active':''}" data-view="${view}" title="${label}" aria-label="${label}" ${v===view?'aria-current="page"':''}>${I(ico)}<span>${short}</span></button>`;
 html+='<div class="nav-dock">'+dock('工作区管理','管理','grid','manage')+dock('分类规则','规则','spark','rules')+dock('设置与隐私','设置','settings','settings')+'</div>';
 $('#nav').innerHTML=html;filterNav();
 const sel=$('#nav .nav-scroll .nav.active');if(sel)sel.scrollIntoView({block:'nearest'});
}
function filterNav(){const q=(state.navQ||'').trim().toLowerCase();let shown=0;$$('#nav .nav-scroll .nav[data-filter]').forEach(n=>{const hit=!q||n.dataset.filter==='全部'||n.textContent.toLowerCase().includes(q);n.hidden=!hit;if(hit&&n.dataset.filter!=='全部')shown++;});const none=$('#nav .nav-none');if(none)none.hidden=!q||shown>0;}
document.addEventListener('input',e=>{if(e.target.id==='nav-filter'){state.navQ=e.target.value;filterNav();}});
const PIXELS={workspace:['..####.....','.#....#....','###########','#.........#','#.........#','#.........#','#.........#','#.........#','###########'],
review:['...#####...','..#.....#..','.#...#...#.','#....#....#','#....###..#','#.........#','.#.......#.','..#.....#..','...#####...'],
history:['...........','.....#....#','....##...##','...###..###','..####.####','...###..###','....##...##','.....#....#','...........'],
folders:['####.......','#...#......','#....######','#.........#','#.........#','#.........#','#.........#','#.........#','###########'],
smart:['.....#.....','.....#.....','....###....','..#######..','###########','..#######..','....###....','.....#.....','.....#.....'],
manage:['####...####','#..#...#..#','#..#...#..#','####...####','...........','####...####','#..#...#..#','#..#...#..#','####...####'],
rules:['..#........','###########','..#........','......#....','###########','......#....','....#......','###########','....#......'],
settings:['....###....','.#.#####.#.','..#######..','.###...###.','####...####','.###...###.','..#######..','.#.#####.#.','....###....']};
function PIX(v){const g=PIXELS[v]||PIXELS.workspace;let d='';g.forEach((row,y)=>[...row].forEach((b,x)=>{d+=`<circle class="${b==='#'?'on':'off'}" cx="${x+.5}" cy="${y+.5}" r=".4"/>`;}));return `<svg class="dm pix" viewBox="0 0 ${g[0].length} ${g.length}" style="--w:${g[0].length*7/g.length}" fill="currentColor">${d}</svg>`;}
const SHADES=['var(--ink)','var(--chart-2)','var(--chart-3)','var(--chart-4)'];
function strip(v){
 if(['workspace','folders','smart'].includes(v)){
  const k=key(),list=all(),order=[...new Set(list.map(r=>r[k]))].sort((a,b)=>(a==='待整理')-(b==='待整理')||list.filter(r=>r[k]===b).length-list.filter(r=>r[k]===a).length);
  const sorted=[...list].sort((a,b)=>order.indexOf(a[k])-order.indexOf(b[k]));
  const f=cur().filter;
  let prev=null;const dots=sorted.map(r=>{const i=order.indexOf(r[k]),sep=prev!==null&&prev!==r[k]?'<b class="sep"></b>':'';prev=r[k];return sep+(()=>{const pend=r[k]==='待整理',dim=f!=='全部'&&r[k]!==f;return `<i class="${pend?'pend':''}${dim?' dim':''}" style="--c:${SHADES[i%4]}" title="${E(r.title)} · ${E(k==='folder'?r.folder:r.group)}"></i>`;})();}).join('');
  const pend=list.filter(r=>r.group==='待整理'&&!r.manual).length;
  return `<div class="hero-strip"><div class="dotfield">${dots}</div><p class="strip-key mono"><span>${order.length} ${k==='folder'?'FOLDERS':'GROUPS'}</span><span><i class="pend"></i>${pend} 待整理</span></p></div>`;
 }
 if(v==='review'){
  const data=[0,0,0,0,0,0,0,12,21,72,100,34,9,48,76,29,17,9,2,0,0,0,0,0];
  const cols=data.map((p,h)=>{const n=Math.round(p/100*6);return `<span class="col${h===state.hour?' on':''}" title="${String(h).padStart(2,'0')}:00">${Array.from({length:6},(_,i)=>`<i class="${i<6-n?'off':''}"></i>`).join('')}</span>`;}).join('');
  return `<div class="hero-strip"><div class="dotcols">${cols}</div><p class="strip-key mono"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></p></div>`;
 }
 if(v==='history'){
  const base=new Date('2026-10-13T12:00:00');const cols=Array.from({length:30},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()-29+i);const iso=d.toISOString().slice(0,10);const n=iso==='2026-10-12'?6:iso==='2026-10-13'?3:((i*37)%11)%7;return `<span class="col${iso===state.date?' on':''}" title="${iso}">${Array.from({length:6},(_,j)=>`<i class="${j<6-n?'off':''}"></i>`).join('')}</span>`;}).join('');
  return `<div class="hero-strip"><div class="dotcols days">${cols}</div><p class="strip-key mono"><span>09.14</span><span>30 DAYS</span><span>10.13</span></p></div>`;
 }
 return '<div class="hero-strip"></div>';
}
function renderStatus(){
 const sb=$('#statusbar');if(!sb)return;const t=state.mode==='tabs',list=all(),pend=list.filter(r=>r.group==='待整理'&&!r.manual).length,c=find(cur().selected);
 const left=t?(cur().view==='history'?`${history.length} 条历史 · ${state.date}`:`${tabs.length} 个标签 · 3 个窗口`):`${bookmarks.length} 条书签 · ${folders.length} 个目录`;
 const k=(key,label)=>`<span class="k"><kbd>${key}</kbd>${label}</span>`;
 sb.innerHTML=`<span class="sb-left"><span class="dot"></span>${left}<span class="sep">·</span>${pend} 待整理${c&&!['review','settings','manage','rules'].includes(cur().view)?`<span class="sep">·</span><span class="cursor">▸ ${E(c.title)}</span>`:''}</span><span class="sb-right">${k('↑↓','移动')}${k('↵','打开')}${k('Space','预览')}${t&&cur().view==='workspace'?k('⌫','关闭'):''}${k('E','整理')}${k('/','搜索')}<span class="sep">·</span>本地存储 · 刚刚同步</span>`;
}
function rowButtons(){return $$('.stage .item [data-open]');}
document.addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey)return;
 if($('#dialog').open||$('#command').open)return;
 const tag=(e.target.tagName||'').toLowerCase();if(['input','select','textarea'].includes(tag))return;
 const list=rowButtons(),idx=list.indexOf(document.activeElement);
 const move=d=>{if(!list.length)return;e.preventDefault();const n=idx<0?(d>0?0:list.length-1):Math.max(0,Math.min(list.length-1,idx+d));list[n].focus();list[n].closest('.item').scrollIntoView({block:'nearest'});cur().selected=list[n].dataset.open;renderStatus();};
 if(e.key==='ArrowDown'||e.key==='j')move(1);
 else if(e.key==='ArrowUp'||e.key==='k')move(-1);
 else if(e.key==='/'){e.preventDefault();search();}
 else if(e.key==='e'||e.key==='E'){if(!['review','settings','manage','rules'].includes(cur().view)){e.preventDefault();classify();}}
 else if(e.key===' '&&idx>=0){e.preventDefault();select(list[idx].dataset.open,true,list[idx]);}
 else if((e.key==='Backspace'||e.key==='Delete')&&idx>=0&&state.mode==='tabs'&&cur().view==='workspace'){e.preventDefault();const id=list[idx].dataset.open,r=find(id),i=tabs.indexOf(r);if(i<0)return;tabs.splice(i,1);const next=list[idx+1]||list[idx-1];const nid=next&&next.dataset.open;render();toast('已关闭「'+r.title+'」 · 原型中刷新可恢复');const nb=nid&&$(`.stage [data-open="${nid}"]`);if(nb){nb.focus();cur().selected=nid;renderStatus();}}
});
function render(){
 clearHover();renderNav();closePreview();document.documentElement.classList.toggle('dense',state.density==='compact');
 $$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode);b.querySelector('sup').textContent=b.dataset.mode==='tabs'?tabs.length:bookmarks.length;});
 const t=state.mode==='tabs',v=cur().view,h=v==='history',review=v==='review';
 const titles={workspace:'WORK<br>SPACE.',review:'DAILY <br>REVIEW.',history:'PICK UP <br>THE THREAD.',folders:'BOOK<br>MARKS.',smart:'SMART <br>COLLECTION.',manage:'YOUR <br>SPACES.',rules:'SET <br>THE RULES.',settings:'MAKE <br>IT YOURS.'};
 const subtitles={workspace:'正在打开的标签，按主题归位',review:'今天的注意力去了哪里',history:'找回那天留下的页面，保留已有分类与人工调整',folders:'沿用浏览器里的收藏目录',smart:'按主题重新整理，不动原目录',manage:'新建、重命名你的分类',rules:'让网址自动落进对应分类',settings:'外观、预览与隐私'};
 const names={workspace:['工作区','WORKSPACE'],review:['每日回顾','DAILY REVIEW'],history:['继续浏览','PICK UP THE THREAD'],folders:['原文件夹','BOOKMARKS / FOLDERS'],smart:['智能分类','BOOKMARKS / SMART'],manage:['工作区管理','YOUR SPACES'],rules:['分类规则','SET THE RULES'],settings:['设置与隐私','MAKE IT YOURS']};
 const count=String(review?154:v==='manage'?groups.length:v==='rules'?rules.filter(r=>r.mode===state.mode).length:v==='settings'?3:rows().length);
 const countLabel=review?'分钟':v==='manage'?'个分类':v==='rules'?'条规则':v==='settings'?'项设置':h?'条记录':t?'个标签':'条书签';
 $('#top-title').innerHTML=E(names[v][0])+'<span class="mono">'+count+' '+countLabel+'</span>';
 const listView=!['review','settings','manage','rules'].includes(v),pend0=listView?rows().filter(r=>r.group==='待整理'&&!r.manual).length:0;
 const heroAction=listView?'<button class="button hero-action'+(pend0?' primary':'')+'" data-action="classify">'+(h?'历史补分类':'整理待分类')+(pend0?'<span class="badge mono">'+pend0+'</span>':'')+I('arrow')+'</button>':'';
 let html='<section class="hero"><div class="hero-icon" aria-hidden="true">'+PIX(v)+'</div><div class="hero-text"><h1>'+names[v][0]+'</h1><p class="hero-sub">'+subtitles[v]+'</p></div>'+heroAction+'<div class="hero-stat"><strong>'+DM(count)+'</strong><span class="mono">'+countLabel+'</span></div></section>';
 if(['settings','manage','rules'].includes(v)){html+=v==='settings'?settingsHTML():v==='manage'?manageHTML():rulesHTML();$('#workspace').innerHTML=html+footer();return;}
 if(review){$('#workspace').innerHTML=html+reviewHTML()+footer();bindHover();return;}
 const visible=rows(),pending=visible.filter(r=>r.group==='待整理'&&!r.manual).length;
 
 if(!visible.some(r=>r.id===cur().selected))cur().selected=visible[0]?.id||null;
 html+='<div class="stage"><section class="index" aria-label="'+(t?'标签':'书签')+'列表"><div class="list-tools"><div class="scope"><strong>'+(cur().q?'搜索结果':E(cur().filter==='全部'?(h?'历史工作现场':t?'全部标签':'全部书签'):cur().filter.split(' / ').at(-1)))+'</strong><span class="mono">/ '+String(visible.length).padStart(2,'0')+'</span></div><div class="view-controls">'+(h?'<input class="date-picker" id="date" type="date" value="'+state.date+'" max="2026-10-13" aria-label="历史日期"><button class="tool '+(state.density==='compact'?'active':'')+'" data-density="compact" aria-label="紧凑行距" aria-pressed="'+(state.density==='compact')+'">'+I('dense')+'</button><button class="tool '+(state.density==='comfortable'?'active':'')+'" data-density="comfortable" aria-label="舒适行距" aria-pressed="'+(state.density==='comfortable')+'">'+I('airy')+'</button><span class="vsep"></span><button class="button compact" data-action="restore">恢复清单 '+I('refresh')+'</button>':'<button class="tool '+(state.density==='compact'?'active':'')+'" data-density="compact" aria-label="紧凑行距" aria-pressed="'+(state.density==='compact')+'">'+I('dense')+'</button><button class="tool '+(state.density==='comfortable'?'active':'')+'" data-density="comfortable" aria-label="舒适行距" aria-pressed="'+(state.density==='comfortable')+'">'+I('airy')+'</button><span class="vsep"></span><button class="tool '+(cur().layout==='list'?'active':'')+'" data-layout="list" aria-label="索引列表" aria-pressed="'+(cur().layout==='list')+'">'+I('list')+'</button><button class="tool '+(cur().layout==='gallery'?'active':'')+'" data-layout="gallery" aria-label="预览画廊" aria-pressed="'+(cur().layout==='gallery')+'">'+I('grid')+'</button>')+'</div></div>';
 if(cur().q)html+='<div class="search-state"><span>“'+E(cur().q)+'” · 当前面板全部内容</span><button data-action="clear-search">清除 ×</button></div>';
 if(!visible.length)html+='<div class="empty"><p>NOTHING HERE.</p><span>'+(h?'这个日期没有模拟记录，试试 10 月 12 日。':'没有匹配结果，换个关键词试试。')+'</span><button class="button" data-action="reset-filter">返回全部</button></div>';
 else if(cur().layout==='gallery'&&!h)html+='<div class="gallery">'+visible.map(r=>'<button class="gallery-card" data-select="'+r.id+'" aria-label="预览 '+E(r.title)+'"><div class="gallery-art">'+art(r)+'</div><div class="gallery-copy"><strong>'+E(r.title)+'</strong><span>'+E(r.group)+' · '+E(r.domain)+'</span></div></button>').join('')+'</div>';
 else {html+=visible.map((r,i)=>rowHTML(r,i+1)).join('');}
 html+='<p class="list-footnote">'+I('eye')+'悬停查看网页缩略图 · 点击眼睛可固定预览</p></section>'+inspectorShell()+'</div>';
 $('#workspace').innerHTML=html+footer();bindHover();if($('#date'))$('#date').onchange=e=>{state.date=e.target.value;render();};
}
const FAVC={'github.com':'#24292F','figma.com':'#A259FF','developer.mozilla.org':'#1B1B1B','stackoverflow.com':'#F48024','npmjs.com':'#CB3837','learn.microsoft.com':'#0078D4','wikipedia.org':'#3A3A3A','zh.wikipedia.org':'#3A3A3A','youtube.com':'#FF0033','css-tricks.com':'#E8A33D','canva.com':'#00C4CC','unsplash.com':'#111111','pinterest.com':'#E60023','behance.net':'#1769FF','dribbble.com':'#EA4C89','fonts.google.com':'#4285F4','adobe.com':'#FA0F00','maps.google.com':'#34A853','mail.google.com':'#EA4335','calendar.google.com':'#1A73E8','drive.google.com':'#FBBC04','notion.so':'#111111','trello.com':'#0079BF','slack.com':'#4A154B','open.spotify.com':'#1DB954','bilibili.com':'#00A1D6','booking.com':'#003580','airbnb.com':'#FF385C','react.dev':'#149ECA','typescriptlang.org':'#3178C6','developer.chrome.com':'#1A73E8','web.dev':'#3740FF','vitejs.dev':'#646CFF','playwright.dev':'#2EAD33','linear.app':'#5E6AD2','sspai.com':'#D7191A','xiaohongshu.com':'#FF2442','taobao.com':'#FF5000','strava.com':'#FC4C02','news.ycombinator.com':'#FF6600','nasa.gov':'#0B3D91','apod.nasa.gov':'#0B3D91','book.douban.com':'#2E963D','douban.com':'#2E963D','12306.cn':'#3B7BD8','dianping.com':'#FF6633','bbc.com':'#B80000'};
const FAVP=['#5B5BD6','#0E9F6E','#D97706','#DB2777','#2563EB','#7C3AED','#0891B2','#B45309','#4D7C0F','#BE123C'];
function favColor(d){if(FAVC[d])return FAVC[d];let h=0;for(const c of d)h=(h*31+c.charCodeAt(0))>>>0;return FAVP[h%FAVP.length];}
function siteName(r){return r.title.includes(' · ')?r.title.split(' · ')[0]:r.domain.split('.')[0].replace(/^./,c=>c.toUpperCase());}
function pageTitle(r){return r.title.includes(' · ')?r.title.split(' · ').slice(1).join(' · '):r.title;}
function FAV(r,cls=''){const n=siteName(r),ch=[...n][0]||'?';return `<span class="fav ${cls}" style="--fc:${favColor(r.domain)}" aria-hidden="true">${E(/[a-z]/i.test(ch)?ch.toUpperCase():ch)}</span>`;}
function stateOf(r){
 const n=Number(String(r.id).replace(/\D/g,''))||0;
 if(String(r.id).startsWith('b')){const d=new Date('2026-10-13T12:00:00');d.setDate(d.getDate()-((n*13)%160+1));return {time:d.toISOString().slice(5,10).replace('-','.'),label:'添加于 '+d.toISOString().slice(0,10),flags:[]};}
 if(String(r.id).startsWith('h')){return {time:['09:12','09:40','10:04','10:19','10:42','13:05','15:30','16:02','17:48'][n%9],label:'当天打开时间',flags:[]};}
 const mins=[2,5,9,14,22,35,48,61,90,120,180,240,300,420][n%14]+(n>13?n%7:0);
 const time=mins<60?mins+' 分钟前':Math.floor(mins/60)+' 小时前';
 const flags=[];if(n<2)flags.push(['pin','已固定']);if(/spotify|youtube|bilibili/.test(r.domain)&&n%2===0)flags.push(['sound','正在播放']);if(n%7===5)flags.push(['sleep','已休眠']);
 return {time,label:'最后访问 · 窗口 '+(1+n%3),win:1+n%3,flags};
}
function catFavs(name){const k=key(),seen=[],out=[];all().filter(r=>r[k]===name).forEach(r=>{if(!seen.includes(r.domain)&&seen.length<3){seen.push(r.domain);out.push(r);}});return '<span class="favstack">'+out.map(r=>FAV(r,'xs')).join('')+'</span>';}
function rowHTML(r,i){
 const st=stateOf(r);
 return '<div class="item" data-row="'+r.id+'"><div class="row-origin">'+FAV(r)+'<span class="row-origin-text"><strong>'+E(siteName(r))+'</strong></span></div><div class="row-stripes" aria-hidden="true">'+Array.from({length:12},(_,n)=>'<i style="--weight:'+1/(n+2)+';--delay:'+(180+n*12)+'ms"></i>').join('')+'</div><div class="row-details"><button class="item-main" data-open="'+r.id+'"><span class="item-title">'+E(pageTitle(r))+(r.manual?'<span class="manual-tag">手动</span>':'')+'</span><span class="item-meta">'+E(state.mode==='bookmarks'&&cur().view==='folders'?r.folder:r.domain)+'</span></button><span class="row-state mono" title="'+E(st.label)+'">'+st.flags.map(f=>'<span class="flag" title="'+f[1]+'" aria-label="'+f[1]+'">'+I(f[0])+'</span>').join('')+(st.win?'<span class="win">W'+st.win+'</span>':'')+'<span class="ago">'+st.time+'</span></span><span class="row-group">'+E(r.group)+'</span><span class="item-actions"><button class="tool preview-button" data-select="'+r.id+'" aria-label="预览 '+E(r.title)+'">'+I('eye')+'</button><button class="tool arrow-action" data-detail="'+r.id+'" aria-label="调整 '+E(r.title)+' 的分类">'+I('more')+'</button></span></div></div>';
}

function footer(){return '<footer class="app-footer"><span>拾签 · 交互原型</span><span>所有数据为模拟数据，刷新后恢复</span><a href="index.html">交接说明 ↗</a></footer>';}

const esc=E;
  function specimenArtwork(item) {
    const head = `<text x="28" y="32" font-size="13" font-weight="700">${esc(item.site.toUpperCase())}</text><text x="518" y="32" font-size="9" letter-spacing="1">INDEX / 2026</text><path d="M28 48H612" stroke="currentColor" stroke-opacity=".22"/>`;
    const compositions = {
      forma:`<rect width="640" height="420" fill="#ecdcdf"/><g fill="#8c2638">${head}<text x="27" y="143" font-size="83" font-weight="900" letter-spacing="-6">FORM</text><text x="27" y="226" font-size="83" font-weight="900" letter-spacing="-6">&amp; FEEL.</text><text x="30" y="285" font-size="11" letter-spacing="2">A STUDY IN SHAPE &amp; SENSATION</text><text x="30" y="386" font-size="10">SELECTED OBJECTS — NO. 028</text></g><ellipse cx="464" cy="352" rx="106" ry="15" fill="#a24d5b" opacity=".15"/><path d="M389 342V206a76 76 0 0 1 152 0v136h-46V206a30 30 0 0 0-60 0v136z" fill="#b7444d"/><path d="M389 342V206a76 76 0 0 1 117-64 76 76 0 0 0-97 72v128z" fill="#d76b70"/><circle cx="464" cy="300" r="35" fill="#7e2c3f"/><path d="M509 343V206a50 50 0 0 0-19-40" fill="none" stroke="#cc6669" stroke-width="5"/>`,
      orbit:`<rect width="640" height="420" fill="#193dde"/><g fill="#f2f5ff">${head}<text x="27" y="172" font-size="116" font-weight="800" letter-spacing="-8">ORBIT</text><text x="30" y="387" font-size="10" letter-spacing="2">INDEPENDENT BY DESIGN.</text></g><circle cx="450" cy="292" r="102" fill="#d9ecff"/><ellipse cx="450" cy="291" rx="161" ry="36" fill="none" stroke="#8daefb" stroke-width="12" transform="rotate(-24 450 291)"/><circle cx="313" cy="358" r="16" fill="#f9bd82"/><text x="30" y="259" fill="#c6d8ff" font-size="12">NEW IDEAS.</text><text x="30" y="279" fill="#c6d8ff" font-size="12">DIFFERENT ORBITS.</text>`,
      type:`<rect width="640" height="420" fill="#efeeeb"/><g fill="#252324">${head}<text x="24" y="320" font-family="Georgia,serif" font-size="295" letter-spacing="-25">Ag</text><text x="447" y="135" font-size="12">LETTERS</text><text x="447" y="153" font-size="12">WITH</text><text x="447" y="171" font-size="12">CHARACTER.</text><text x="28" y="391" font-size="10" letter-spacing="2">TYPE SPECIMEN — 001</text></g><path d="M25 325H610M435 66V350" stroke="#f1472f"/><circle cx="436" cy="325" r="5" fill="#f1472f"/>`,
      field:`<rect width="640" height="420" fill="#b8c0d9"/><g fill="#283342">${head}</g><circle cx="441" cy="143" r="48" fill="#f9f1e0"/><path d="m0 329 133-171 160 105 167-91 180 89v159H0z" fill="#7b8cab"/><path d="m0 360 242-124 99 91 125-67 174 104v56H0z" fill="#536b87"/><path d="m0 385 177-43 95 37 368-50v91H0z" fill="#394f6f"/><text x="27" y="139" fill="#26354c" font-size="63" font-weight="700" letter-spacing="-3">Out of office.</text><text x="29" y="390" fill="#fff" font-size="11" letter-spacing="2">FIELD NOTES / THE LONG WAY HOME</text>`,
      grid:`<rect width="640" height="420" fill="#edf2ff"/><g stroke="#c4d0ed" stroke-width="1">${Array.from({length:13},(_,i)=>`<path d="M${i*50} 55v340"/>`).join('')}${Array.from({length:7},(_,i)=>`<path d="M20 ${80+i*50}H620"/>`).join('')}</g><g fill="#244ac5">${head}<rect x="50" y="80" width="200" height="150" rx="3"/><rect x="270" y="80" width="130" height="70" rx="3"/><rect x="270" y="170" width="280" height="60" rx="3"/><text x="46" y="333" font-size="67" font-weight="800" letter-spacing="-4">Good structure.</text><text x="50" y="379" font-size="11" letter-spacing="2">ROOM FOR EVERYTHING.</text></g><rect x="420" y="80" width="130" height="70" rx="3" fill="#7c9aec"/>`,
      objects:`<rect width="640" height="420" fill="#e9d6c9"/><g fill="#744834">${head}<text x="26" y="135" font-size="72" font-weight="400" letter-spacing="-4">Ordinary,</text><text x="28" y="204" font-size="72" font-weight="400" letter-spacing="-4">beautiful.</text><text x="30" y="388" font-size="10" letter-spacing="2">OBJECTS / EVERYDAY STUDIES</text></g><ellipse cx="460" cy="349" rx="99" ry="13" fill="#93634e" opacity=".17"/><path d="M421 189h66v24c0 30 46 42 46 85 0 30-27 51-77 51s-76-19-76-51c0-44 41-55 41-85z" fill="#af6e50"/><path d="M434 199v33c0 27-26 44-26 72 0 13 9 26 18 33" fill="none" stroke="#d29979" stroke-width="16"/><ellipse cx="454" cy="190" rx="33" ry="8" fill="#7a432f"/>`,
      margins:`<rect width="640" height="420" fill="#e7e3ed"/><g fill="#4c3c63">${head}<text x="29" y="132" font-size="54" font-weight="500" letter-spacing="-3">Room to</text><text x="29" y="188" font-size="54" font-weight="500" letter-spacing="-3">think again.</text><text x="31" y="224" font-size="10" letter-spacing="2">ESSAYS FROM THE EDGES</text><text x="31" y="388" font-size="10">READ SLOWLY. KEEP SOMETHING.</text></g><rect x="368" y="89" width="196" height="264" fill="#f9f7fc" transform="rotate(7 466 221)"/><rect x="361" y="93" width="196" height="264" fill="#fcfbfd"/><g stroke="#c7bfce" stroke-width="3">${Array.from({length:12},(_,i)=>`<path d="M390 ${142+i*14}h137"/>`).join('')}</g><rect x="390" y="114" width="63" height="9" fill="#6c588a"/>`,
      motion:`<rect width="640" height="420" fill="#fa573c"/><g fill="#4a1b18">${head}<text x="26" y="136" font-size="72" font-weight="900" letter-spacing="-5">IN MOTION.</text><text x="30" y="388" font-size="10" letter-spacing="2">MOVE WITH INTENTION.</text></g>${Array.from({length:6},(_,i)=>`<rect x="${120+i*62}" y="${192+i*9}" width="90" height="112" rx="44" fill="${['#64271f','#813325','#a2402b','#c64d30','#ec603b','#ffb390'][i]}" transform="rotate(-28 ${165+i*62} ${248+i*9})"/>`).join('')}`
    };
    return `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(item.site)} 的模拟网页缩略图" font-family="Arial, Helvetica, sans-serif" style="color:#333">${compositions[item.art]}</svg>`;
  }

function art(r){if(!r?.art)return '<div class="placeholder-art"><span class="mono">NO PREVIEW YET</span><strong>这一页，<br>等你再回来。</strong><p>暂无预览 · '+E(r?.domain||'未选择页面')+'</p></div>';const map={poster:'forma',design:'orbit',objects:'objects',type:'type',code:'grid',grid:'grid',landscape:'field',article:'margins'};return specimenArtwork({site:r.title.split(/[·—]/)[0].trim(),art:map[r.art]||'forma'});}

function inspectorShell(){return '<aside class="inspector" id="inspector" aria-hidden="true" aria-label="模拟网页缩略图"></aside>';}
function renderInspector(){
 const panel=$('#inspector'),r=find(activeId);if(!panel||!r)return;
 panel.innerHTML='<div class="floating-art">'+art(r)+'</div><div class="floating-caption"><span>'+E(r.domain)+'</span><span>示意缩略图 / '+r.id.toUpperCase()+'</span></div>';positionPreview();
}
function positionPreview(){
 const panel=$('#inspector'),stage=$('.stage');if(!panel||!stage||!activeId||innerWidth<=700)return;
 const box=stage.getBoundingClientRect(),width=Math.min(480,box.width*.47),height=width*420/640+30,bar=$('.topbar').getBoundingClientRect().bottom;
 if(box.bottom<bar+80||box.top>innerHeight-60){clearHover();return;}
 const top=Math.min(innerHeight-height-20,Math.max(box.top+40,Math.min(box.bottom-20,innerHeight-20)-height));
 panel.style.width=width+'px';panel.style.left=(box.right-width)+'px';panel.style.top=Math.max(bar+8,top)+'px';
}
function select(id,explicit=false,trigger=null){
 if(explicit){clearHover();const r=find(id);if(!r)return;cur().selected=id;modal('页面预览','<div class="detail-art">'+art(r)+'</div><p class="dialog-copy" style="font-size:15px;color:var(--ink)">'+E(r.title)+'</p><p class="dialog-copy">'+E(r.desc)+'</p><div class="dialog-strip">'+E(r.domain)+' · 模拟网页缩略图</div>','<button class="button" data-detail="'+r.id+'">调整分类</button><button class="button primary" data-open="'+r.id+'">打开演示 '+I('arrow')+'</button>');return;}
 cur().selected=id;activeId=id;renderInspector();$('#inspector')?.classList.add('is-visible');$('#inspector')?.setAttribute('aria-hidden','false');
}
function clearHover(){
 clearTimeout(hoverTimer);activeId=null;$$('.item.is-hovered').forEach(r=>r.classList.remove('is-hovered'));const p=$('#inspector');if(p){p.classList.remove('is-visible');p.setAttribute('aria-hidden','true');}
}
function closePreview(){clearHover();$('#preview-overlay').classList.remove('show');}

$('#preview-overlay').onclick=closePreview;
function bindHover(){
 $$('[data-row]').forEach(row=>{
  const enter=()=>{if(activeId===row.dataset.row)return;clearHover();row.classList.add('is-hovered');activeId=row.dataset.row;
   if(!state.previewEnabled||innerWidth<=700)return;
   const id=activeId;hoverTimer=setTimeout(()=>{if(activeId===id&&row.isConnected&&!$('#dialog').open&&!$('#command').open)select(id);},matchMedia('(prefers-reduced-motion:reduce)').matches?0:480);
  };
  row.onmouseenter=()=>{if(matchMedia('(hover:hover)').matches)enter();};
  row.onmouseleave=()=>{if(activeId===row.dataset.row&&!row.querySelector(':focus-visible'))clearHover();};
  row.addEventListener('focusin',e=>{if(e.target.matches(':focus-visible'))enter();});
  row.addEventListener('focusout',e=>{if(!row.contains(e.relatedTarget)&&activeId===row.dataset.row)clearHover();});
 });
}

function reviewHTML(){
 const values=[68,42,28,16],colors=['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)'],labels=state.reviewBy==='site'?['figma.com','github.com','field.example','其他网站']:groups.slice(0,4);
 return '<div class="summary-strip"><span class="summary-copy">'+I('clock')+'14 个页面 / 24 段浏览片段</span><span class="mono">2026.10.13</span></div><div class="review-layout"><section class="review-panel"><div class="section-heading"><h2>时间分布</h2><div class="segmented"><button data-review-by="site" aria-pressed="'+(state.reviewBy==='site')+'">网站</button><button data-review-by="group" aria-pressed="'+(state.reviewBy==='group')+'">工作区</button></div></div><p class="review-value">'+DM('2')+'<small>h</small>'+DM('34')+'<small>min</small></p><p class="review-sub">浏览投入 · 模拟估算</p><div class="distribution">'+values.map((v,i)=>'<span style="width:'+v/154*100+'%;background:'+colors[i]+'"></span>').join('')+'</div>'+values.map((v,i)=>'<p class="legend"><span><i style="--tone:'+colors[i]+'"></i>'+labels[i]+'</span><span class="mono">'+v+' min</span></p>').join('')+'</section><section class="review-panel"><div class="section-heading"><h2>一天的节奏</h2><span class="mono muted">每格 1 小时</span></div><p class="review-value">'+DM(String(state.hour).padStart(2,'0'))+'<small>:00</small></p><p class="review-sub">选择时段，回看浏览路径</p><div class="bars">'+[12,21,72,100,34,9,48,76,29,17,9,2].map((v,i)=>'<button class="bar '+(state.hour===i+7?'active':'')+'" data-hour="'+(i+7)+'" style="height:'+v+'%" aria-label="查看 '+(i+7)+' 点浏览路径" aria-pressed="'+(state.hour===i+7)+'"></button>').join('')+'</div><div class="bar-axis mono"><span>07:00</span><span>12:00</span><span>18:00</span></div><p class="review-note">空白时间不补记。</p></section></div><div class="stage timeline"><section class="index"><div class="list-tools"><strong>浏览路径</strong><span class="mono">'+state.hour+':00 — '+(state.hour+1)+':00</span></div>'+[tabs[state.hour%6],tabs[(state.hour+1)%6],tabs[(state.hour+2)%6]].map((r,i)=>'<div class="timeline-step"><time class="mono">'+state.hour+':'+['04','19','42'][i]+'</time>'+rowHTML(r,i+1)+'</div>').join('')+'</section>'+inspectorShell()+'</div>';
}

function toast(msg){clearTimeout(toastTimer);$('#toast').textContent=msg;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3400);}
function modal(title,body,actions=''){clearTimeout(hoverTimer);closePreview();$('#dialog').innerHTML=`<div class="dialog-shell"><div class="dialog-kicker mono">PICKMARK / INTERACTION STUDY</div><div class="dialog-heading"><h2>${title}</h2><button class="tool" data-close aria-label="关闭对话框">${I('close')}</button></div>${body}<div class="dialog-actions">${actions||'<button class="button primary" data-close>明白了</button>'}</div></div>`;if(!$('#dialog').open)$('#dialog').showModal();$('#dialog [data-close]').focus();}
function openPage(r){modal('把这条思路，接下去。',`<p class="dialog-copy" style="color:var(--ink);font-size:15px">${E(r.title)}</p><p class="dialog-copy mono" style="font-size:10px;margin-top:5px">${E(r.domain)}</p><div class="dialog-strip">实际插件会打开页面，或切换至已有标签。<br>这份独立原型只演示交互，不访问目标网站。</div>`);}
function detail(r){modal('让它有一个位置。',`<p class="dialog-copy">${E(r.title)}</p>${r.id.startsWith('b')?`<div class="dialog-strip">原文件夹：${E(r.folder)}<br>调整智能分类不会移动这条书签。</div>`:''}<label class="field">${r.id.startsWith('b')?'智能分类':'所属工作区'}<select id="group-select">${groups.map(g=>`<option ${r.group===g?'selected':''}>${g}</option>`).join('')}</select></label><p class="dialog-copy" style="font-size:10px;margin-top:14px">人工调整会保留；刷新原型后恢复初始模拟数据。</p>`,`<button class="button" data-close>取消</button><button class="button primary" id="save-group">保存分类 ${I('right')}</button>`);$('#save-group').onclick=()=>{r.group=$('#group-select').value;if(r.id.startsWith('h'))r.snapshotGroup=r.group;r.manual=true;$('#dialog').close();render();toast('已保存模拟分类 · 原文件夹不变');};}
function classify(){const candidates=rows().filter(r=>r.group==='待整理'&&!r.manual);if(!candidates.length){toast('当前范围已经整理好，人工分类保持不变。');return;}modal(cur().view==='history'?'把遗漏的灵感，归回原处。':'为新的灵感，建立索引。',`<p class="dialog-copy">只处理当前范围中的 ${candidates.length} 条待整理记录。已有分类、人工调整${state.mode==='bookmarks'?'与原文件夹':''}保持不变。</p><div class="dialog-strip">${candidates.map(r=>E(r.title)).join('<br>')}</div><label class="check-line"><input type="checkbox" id="ai-demo">演示 AI 辅助分类</label><p class="dialog-copy" style="font-size:10px;margin-top:13px">原型仅演示结果，不调用 AI，也不发送数据。</p>`,`<button class="button" data-close>暂时放着</button><button class="button primary" id="classify-confirm">开始整理 ${I('spark')}</button>`);$('#classify-confirm').onclick=()=>{candidates.forEach((r,i)=>{r.group=rules.find(rule=>rule.enabled&&rule.mode===state.mode&&r.domain.includes(rule.domain))?.group||groups[i%3];if(cur().view==='history')r.snapshotGroup=r.group;});$('#dialog').close();if(state.mode==='bookmarks'){cur().view='smart';cur().filter='全部';}render();toast(`已整理 ${candidates.length} 条模拟记录 · 人工调整保留`);};}
function applyTheme(){state.night=state.appearance==='dark'||state.appearance==='system'&&matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('night',state.night);$('#theme').innerHTML=I(state.night?'sun':'moon');$('#theme').setAttribute('aria-label',state.night?'切换浅色主题':'切换深色主题');}
function theme(){state.appearance=state.night?'light':'dark';applyTheme();if(cur().view==='settings')render();}
function settings(){cur().view='settings';cur().q='';render();closeRail();window.scrollTo(0,0);}
function settingsHTML(){return '<div class="settings-grid"><section class="settings-section"><div class="section-heading"><h2>界面与交互</h2><span class="mono">01 / APPEARANCE</span></div><div class="setting-row"><div><strong>外观</strong><p>黑白的秩序，点阵的刻度。</p></div><div class="segmented">'+[['system','跟随系统'],['light','浅色'],['dark','深色']].map(([key,label])=>'<button data-appearance="'+key+'" aria-pressed="'+(state.appearance===key)+'">'+label+'</button>').join('')+'</div></div><div class="setting-row"><div><strong>悬停缩略图</strong><p>条纹反色之后，展示对应页面。</p></div><button class="toggle" data-preview-toggle aria-pressed="'+state.previewEnabled+'" aria-label="悬停缩略图">'+(state.previewEnabled?'开启':'关闭')+'</button></div><div class="setting-row"><div><strong>减少动态效果</strong><p>跟随系统偏好，保留静态反色与预览。</p></div><span class="muted">'+(matchMedia('(prefers-reduced-motion:reduce)').matches?'已开启':'跟随系统')+'</span></div></section><section class="settings-section"><div class="section-heading"><h2>AI 与隐私</h2><span class="mono">02 / PRIVACY</span></div><div class="setting-row"><div><strong>分类方式</strong><p>先使用规则，再演示补分类。</p></div><span class="status-chip">模拟模式</span></div><div class="setting-row"><div><strong>书签与标签分开处理</strong><p>已有分类、原文件夹和人工调整保留。</p></div>'+I('lock')+'</div><div class="setting-row"><div><strong>预览来源</strong><p>内置示意图，不采集真实网页。</p></div><span class="muted">本地演示</span></div></section></div><div class="settings-note"><p>完整设计原型 · 所有操作只改变当前页面中的模拟数据。</p><button class="button" data-reset-demo>重置演示 '+I('refresh')+'</button></div>';}
function manageHTML(){return '<div class="list-tools"><strong>你的工作区</strong><button class="button primary" data-add-group>新建工作区 ＋</button></div><div class="management-list">'+groups.filter(g=>g!=='待整理').map((g,i)=>'<div class="management-row"><span class="management-number mono">'+String(i+1).padStart(2,'0')+'</span><div><h2>'+E(g)+'</h2><p>'+tabs.filter(r=>r.group===g).length+' 个标签 · '+bookmarks.filter(r=>r.group===g).length+' 个书签</p></div><button class="button" data-edit-group="'+E(g)+'">重命名 '+I('arrow')+'</button></div>').join('')+'</div><p class="management-note">工作区用于组织内容，书签的原文件夹单独保留。</p>';}
function rulesHTML(){const current=rules.filter(r=>r.mode===state.mode);return '<div class="summary-strip"><span>规则范围：'+(state.mode==='tabs'?'标签页与历史记录':'书签智能分类')+'</span><button class="button primary" data-add-rule>新建规则 ＋</button></div><div class="management-list">'+(current.length?current.map(r=>'<div class="management-row"><span class="rule-domain mono">'+E(r.domain)+'</span><div><h2>'+E(r.group)+'</h2><p>网站匹配 · 仅处理待整理内容</p></div><button class="toggle" data-rule-toggle="'+rules.indexOf(r)+'" aria-pressed="'+r.enabled+'">'+(r.enabled?'开启':'关闭')+'</button></div>').join(''):'<div class="empty"><p>还没有规则</p><span>添加一条网站规则，让新内容自动归位。</span></div>')+'</div><p class="management-note">规则不会覆盖手动分类。这里仅演示规则配置与分类结果。</p>';}
function editGroup(oldName=''){modal(oldName?'重命名工作区':'新建工作区','<label class="field">工作区名称<input id="group-name" value="'+E(oldName)+'" maxlength="30" autocomplete="off"></label>','<button class="button" data-close>取消</button><button class="button primary" id="confirm-group">保存</button>');$('#confirm-group').onclick=()=>{const input=$('#group-name'),name=input.value.trim();if(!name||groups.some(g=>g===name&&g!==oldName)){input.setCustomValidity('请输入一个不重复的名称');input.reportValidity();return;}input.setCustomValidity('');if(oldName){groups[groups.indexOf(oldName)]=name;[...tabs,...bookmarks,...history].forEach(r=>{if(r.group===oldName)r.group=name;if(r.snapshotGroup===oldName)r.snapshotGroup=name;});rules.forEach(r=>{if(r.group===oldName)r.group=name;});['tabs','bookmarks'].forEach(mode=>{if(state[mode].filter===oldName)state[mode].filter=name;});}else groups.splice(groups.length-1,0,name);$('#dialog').close();render();toast('工作区已保存');};$('#group-name').oninput=e=>e.target.setCustomValidity('');}
function addRule(){modal('新建分类规则','<label class="field">匹配网站<input id="rule-domain" placeholder="例如 new.example" maxlength="120" autocomplete="off"></label><label class="field">归入分类<select id="rule-group">'+groups.filter(g=>g!=='待整理').map(g=>'<option>'+E(g)+'</option>').join('')+'</select></label>','<button class="button" data-close>取消</button><button class="button primary" id="confirm-rule">保存规则</button>');$('#confirm-rule').onclick=()=>{const input=$('#rule-domain'),domain=input.value.trim().toLowerCase();if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)){input.setCustomValidity('请输入域名，例如 new.example');input.reportValidity();return;}rules.push({domain,group:$('#rule-group').value,mode:state.mode,enabled:true});$('#dialog').close();render();toast('已保存模拟规则');};$('#rule-domain').oninput=e=>e.target.setCustomValidity('');}

function search(){clearTimeout(hoverTimer);closePreview();$('#query').value=cur().q;$('#command').showModal();searchResults();$('#query').focus();}
function searchResults(){const q=$('#query').value.trim().toLowerCase(),list=all().filter(r=>`${r.title} ${r.domain} ${r.group} ${r.folder}`.toLowerCase().includes(q));$('#search-output').innerHTML=list.length?list.slice(0,9).map((r,i)=>`<button class="search-result" data-result="${r.id}"><span class="mono muted">${String(i+1).padStart(2,'0')}</span><div><strong>${E(r.title)}</strong><small>${E(state.mode==='bookmarks'?r.folder:r.group)} · ${E(r.domain)}</small></div>${I('arrow')}</button>`).join(''):'<div class="empty"><p class="serif">Not here. Yet.</p><p>没有找到匹配内容，试试“设计”或“GitHub”。</p></div>';}
$('#query').oninput=searchResults;$('#query').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();cur().q=e.target.value.trim();if(['review','settings','manage','rules'].includes(cur().view))cur().view=state.mode==='tabs'?'workspace':'folders';$('#command').close();render();}};$('#command-close').onclick=()=>$('#command').close();$('#search').onclick=search;
function railAccess(){$('#rail').inert=innerWidth<=800&&!$('#rail').classList.contains('open');$('#rail').setAttribute('aria-hidden',$('#rail').inert);}
function closeRail(){const opened=$('#rail').classList.contains('open');$('#rail').classList.remove('open');$('#rail-overlay').hidden=true;$('#menu').setAttribute('aria-expanded','false');railAccess();if(opened)$('#menu').focus();}
$('#menu').onclick=()=>{$('#rail').classList.add('open');$('#rail-overlay').hidden=false;$('#menu').setAttribute('aria-expanded','true');railAccess();$('#rail .nav').focus();};$('#rail-close').onclick=closeRail;$('#rail-overlay').onclick=closeRail;$('#theme').onclick=theme;$('#settings').onclick=settings;$('#rail-about').onclick=settings;
$('#brand').onclick=()=>{state.mode='tabs';state.tabs.view='workspace';state.tabs.filter='全部';state.tabs.q='';render();closeRail();window.scrollTo(0,0);};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.mode){closePreview();cur().scroll=scrollY;state.mode=b.dataset.mode;transition(()=>{render();window.scrollTo(0,cur().scroll);});}
 else if(b.dataset.view){closePreview();cur().view=b.dataset.view;cur().filter='全部';cur().q='';transition(render);closeRail();window.scrollTo(0,0);}
 else if(b.dataset.filter){closePreview();cur().filter=b.dataset.filter;cur().q='';render();closeRail();window.scrollTo(0,0);}
 else if(b.dataset.layout){cur().layout=b.dataset.layout;transition(render);}
 else if(b.dataset.select){select(b.dataset.select,true,b);}
 else if(b.dataset.detail){detail(find(b.dataset.detail));}
 else if(b.dataset.open){openPage(find(b.dataset.open));}
 else if(b.dataset.hour){state.hour=Number(b.dataset.hour);render();}
 else if(b.dataset.result){const r=find(b.dataset.result);$('#command').close();detail(r);}
 else if(b.hasAttribute('data-close'))$('#dialog').close();
 else if(b.dataset.themeChoice){const night=b.dataset.themeChoice==='dark';if(night!==state.night)theme();b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));}
 else if(b.dataset.action){const a=b.dataset.action;if(a==='classify')classify();else if(a==='clear-search'){cur().q='';render();}else if(a==='reset-filter'){cur().q='';cur().filter='全部';if(cur().view==='history')state.date='2026-10-12';render();}else if(a==='restore'){if(!rows().length){toast('这个日期没有可以恢复的模拟页面。');return;}modal('重新走进，那一天。','<p class="dialog-copy">恢复当前清单中的页面，复用已经打开的标签，并保留历史分类。</p><div class="dialog-strip">此处是恢复演示，不会实际打开网页。</div>','<button class="button" data-close>取消</button><button class="button primary" id="restore-confirm">演示恢复 '+I('arrow')+'</button>');$('#restore-confirm').onclick=()=>{let added=0;rows().forEach(r=>{if(!tabs.some(t=>t.domain===r.domain&&t.title===r.title)){tabs.push({...r,id:'restored-'+r.id,group:r.snapshotGroup||r.group,manual:true});added++;}});$('#dialog').close();render();toast('模拟恢复完成 · 新增 '+added+' 页，已有标签已复用');};}}
});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#dialog').open)search();}if(e.key==='Escape'){closePreview();closeRail();}if(e.key==='Tab'){const p=$('#inspector.mobile-open')||$('#rail.open');if(p){const focusable=[...p.querySelectorAll('button:not(:disabled),input,select')].filter(x=>x.offsetParent!==null);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}});
window.addEventListener('resize',()=>{if(innerWidth>800)closeRail();if(innerWidth>620)closePreview();railAccess();});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.reviewBy){state.reviewBy=b.dataset.reviewBy;render();}
 else if(b.dataset.density){state.density=b.dataset.density;render();}
 else if(b.dataset.appearance){state.appearance=b.dataset.appearance;applyTheme();render();}
 else if(b.hasAttribute('data-preview-toggle')){state.previewEnabled=!state.previewEnabled;render();}
 else if(b.hasAttribute('data-add-group'))editGroup();
 else if(b.dataset.editGroup)editGroup(b.dataset.editGroup);
 else if(b.hasAttribute('data-add-rule'))addRule();
 else if(b.dataset.ruleToggle!==undefined){rules[Number(b.dataset.ruleToggle)].enabled=!rules[Number(b.dataset.ruleToggle)].enabled;render();}
 else if(b.hasAttribute('data-reset-demo'))location.reload();
});
window.addEventListener('scroll',positionPreview,{passive:true});
function heroMini(){const r=document.documentElement,m=r.classList.contains('hero-mini');if(!m&&scrollY>60)r.classList.add('hero-mini');else if(m&&scrollY<8)r.classList.remove('hero-mini');}
window.addEventListener('scroll',heroMini,{passive:true});
window.addEventListener('resize',positionPreview);
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(state.appearance==='system')applyTheme();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHover();});
new MutationObserver(()=>renderStatus()).observe($('#workspace'),{childList:true});
document.addEventListener('focusin',e=>{const b=e.target.closest&&e.target.closest('.stage .item [data-open]');if(b){cur().selected=b.dataset.open;renderStatus();}});
const heroWatch=new IntersectionObserver(es=>es.forEach(en=>document.documentElement.classList.toggle('hero-out',!en.isIntersecting&&en.boundingClientRect.top<0)),{rootMargin:'-80px 0px 0px 0px'});
new MutationObserver(()=>{heroWatch.disconnect();const h=$('.hero');if(h)heroWatch.observe(h);}).observe($('#workspace'),{childList:true});
$('.archive-mark').innerHTML=DM('03')+'<span>OFFSET</span>';
applyTheme();render();railAccess();

