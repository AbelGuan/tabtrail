(() => {
  'use strict';
  const concepts = [
    {id:'optic', n:'01', name:'光学界面', file:'01-optic.html'},
    {id:'signal', n:'02', name:'信号界面', file:'02-signal.html'},
    {id:'offset', n:'03', name:'错位秩序', file:'03-offset.html'},
    {id:'prism', n:'04', name:'棱镜视窗', file:'04-prism.html'}
  ];
  const concept = concepts.find(c => c.id === document.body.dataset.direction);
  const items = [
    {id:1, title:'Forma — 形状的另一种可能', site:'Forma', domain:'forma.example', folder:'设计档案', desc:'形状、材质与留白的实验。一份关于视觉语言的持续收藏。', art:'forma', glyph:'f', color:'#bd412c', bg:'#f7e9e5'},
    {id:2, title:'Orbit — 独立设计的运行轨道', site:'Orbit', domain:'orbit.example', folder:'设计档案', desc:'来自独立设计者的数字作品，把熟悉的界面带往不同的方向。', art:'orbit', glyph:'◉', color:'#2144d1', bg:'#e9edff'},
    {id:3, title:'Type Foundry — 字体即表达', site:'Type Foundry', domain:'typefoundry.example', folder:'设计档案', desc:'从一个字母开始，研究文字的比例、节奏与视觉性格。', art:'type', glyph:'Aa', color:'#222', bg:'#eee'},
    {id:4, title:'Fieldwork — 走进旷野', site:'Fieldwork', domain:'fieldwork.example', folder:'灵感与生活', desc:'一段山路，一片海岸，一些暂时离开屏幕的理由。', art:'field', glyph:'↟', color:'#515985', bg:'#ececf4'},
    {id:5, title:'Grid Systems — 秩序的底层', site:'Grid Systems', domain:'grids.example', folder:'开发工具', desc:'构建响应式网格的细节笔记，让复杂内容仍然拥有清晰的秩序。', art:'grid', glyph:'▦', color:'#2152b6', bg:'#e7efff'},
    {id:6, title:'Objects — 日常的微小雕塑', site:'Objects', domain:'objects.example', folder:'灵感与生活', desc:'观察日常器物的弧线、光影与触感，重新发现生活中的设计。', art:'objects', glyph:'o', color:'#8c4b38', bg:'#f5e7e0'},
    {id:7, title:'Margins — 在边界之外阅读', site:'Margins', domain:'margins.example', folder:'阅读清单', desc:'设计、文化与技术之间的长文章。为值得停留的观点留一页。', art:'margins', glyph:'m', color:'#53484f', bg:'#f0ecf0'},
    {id:8, title:'Motion Practice — 动态练习', site:'Motion Practice', domain:'motion.example', folder:'设计档案', desc:'用运动说明关系，而不只是增添装饰。交互中的节奏与反馈。', art:'motion', glyph:'↗', color:'#a03932', bg:'#fce9e5'},
    {id:9, title:'Layers — 数字空间观察', site:'Layers', domain:'layers.example', folder:'设计档案', desc:'整理关于数字空间、窗口和层级的设计观察。', art:'orbit', glyph:'▱', color:'#4957a8', bg:'#ecefff'},
    {id:10, title:'Open Form — 组件实验室', site:'Open Form', domain:'openform.example', folder:'开发工具', desc:'小而清晰的界面组件，探索可访问性和交互细节。', art:'grid', glyph:'⌘', color:'#2152b6', bg:'#e7efff'},
    {id:11, title:'The Quiet Web — 安静的网络', site:'The Quiet Web', domain:'quietweb.example', folder:'阅读清单', desc:'关于有意识地使用互联网，以及如何保留真正有价值的信息。', art:'margins', glyph:'q', color:'#53484f', bg:'#f0ecf0'},
    {id:12, title:'Index Studio — 视觉索引', site:'Index Studio', domain:'indexstudio.example', folder:'设计档案', desc:'一个小型视觉研究档案，收集版式、符号和结构的可能性。', art:'type', glyph:'i', color:'#222', bg:'#eee'}
  ];
  const groups = ['全部书签','设计档案','开发工具','阅读清单','灵感与生活'];
  const state = {folder:'全部书签', query:'', selected:1};
  const icons = {
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    folder:'<path d="M3 6h6l2 2h10v12H3z"/>',
    all:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    arrow:'<path d="M5 19 19 5M5 5h14v14"/>',
    bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>'
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.bookmark}</svg>`;
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => String(value).padStart(2,'0');
  // All artwork is original vector illustration for fictional pages. No fetched previews.
  function artwork(item) {
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
  const switcher = `<nav class="concept-switch" aria-label="比较四种设计"><a class="compare-label" href="index.html">方案</a>${concepts.map(c=>`<a href="${c.file}" aria-label="${c.n} ${c.name}" ${c.id===concept.id?'aria-current="page"':''}>${c.n}</a>`).join('')}</nav>`;
  const search = `<label class="search">${icon('search')}<input type="search" id="query" placeholder="搜索书签" aria-label="搜索模拟书签" autocomplete="off"><kbd>⌘ K</kbd></label>`;
  const navigation = `<aside class="navigation"><div class="nav-caption">收藏目录 <span>COLLECTIONS</span></div><nav id="folders" aria-label="书签文件夹"></nav><div class="nav-bottom"><div class="concept-monogram">${concept.id==='prism'?'◈':concept.id==='optic'?'◌':concept.n}</div><span>${concept.id.toUpperCase()}<br>${concept.name}</span></div></aside>`;
  const heading = `<header class="page-heading"><div class="heading-label"><span>YOUR PERSONAL INDEX</span><span class="heading-date">OCT. 2026</span></div><div class="heading-title"><div><p class="eyebrow">书签收藏 / <span id="heading-folder">全部书签</span></p><h1>${concept.id==='offset'?'BOOK<br><span>MARKS.</span>':concept.id==='signal'?'BOOKMARKS<span class="title-dot">.</span>':concept.id==='prism'?'收藏，让灵感有迹可循。':'每一页，都值得再见。'}</h1></div><span class="hero-count">12<span>SAVED PAGES</span></span></div></header>`;
  document.querySelector('#app').innerHTML = `<header class="topbar"><a class="brand" href="index.html" aria-label="Tabkeep 四版比较"><span class="brand-symbol">${icon('bookmark')}</span><span>tabkeep<span class="brand-cn">拾页</span></span></a><div class="current-panel">${icon('bookmark')}<span>书签</span><span class="panel-caption">PERSONAL COLLECTION</span></div>${switcher}</header><div class="shell">${navigation}<main>${heading}<div class="workspace-toolbar"><div class="collection-caption"><span class="tiny-mark"></span><span id="collection-title">全部书签</span><span id="result-count" aria-live="polite">12</span></div>${search}<span class="sort-label">按收藏顺序 ↓</span></div><div class="workspace"><section class="index-panel" aria-label="书签索引"><div class="column-head"><span>名称 / NAME</span><span>原文件夹</span></div><div id="list"></div></section><aside id="preview" class="preview" aria-label="书签预览"></aside></div><div id="filmstrip" class="filmstrip" aria-label="视觉索引"></div><footer class="page-footer"><span><i></i> 概念预览 · 12 条模拟书签</span><span>${concept.n} / ${concept.id.toUpperCase()}<span class="footer-extra"> — ${concept.name}</span></span></footer></main></div><dialog id="detail" aria-labelledby="dialog-title"><div class="dialog-top"><span>页面预览 <small>SIMULATED PREVIEW</small></span><button id="close-dialog" class="icon-button" aria-label="关闭预览">${icon('close')}</button></div><div id="dialog-content"></div></dialog>`;
  const list = document.querySelector('#list');
  const preview = document.querySelector('#preview');
  const query = document.querySelector('#query');
  const dialog = document.querySelector('#detail');
  let currentItems = items;
  function renderFolders() {
    document.querySelector('#folders').innerHTML = groups.map((g,i)=>`<button class="folder-button" data-folder="${g}" aria-pressed="${state.folder===g}">${icon(i===0?'all':'folder')}<span>${g}</span><small>${number(i===0?items.length:items.filter(b=>b.folder===g).length)}</small></button>`).join('');
  }
  function row(item) {
    return `<div class="entry-wrap" data-wrap="${item.id}"><button class="entry" data-id="${item.id}" aria-label="预览 ${esc(item.title)}" aria-pressed="${state.selected===item.id}"><span class="entry-number">${number(item.id)}</span><span class="favicon" style="--favicon-color:${item.color};--favicon-bg:${item.bg}">${item.glyph}</span><span class="row-thumb">${artwork(item)}</span><span class="entry-text"><strong>${esc(item.title)}</strong><small>${esc(item.domain)}</small></span><span class="entry-folder">${item.folder}</span><span class="entry-arrow">${icon('arrow')}</span></button></div>`;
  }
  function previewMarkup(item) {
    return `<div class="preview-head"><span><i></i> 当前预览</span><span>${number(item.id)} / 12</span><button class="icon-button" data-expand="${item.id}" aria-label="展开 ${esc(item.site)} 的预览">${icon('expand')}</button></div><div class="preview-window"><div class="window-bar"><span class="window-dots"><i></i><i></i><i></i></span><span>${esc(item.domain)}</span>${icon('bookmark')}</div><div class="preview-art">${artwork(item)}</div><span class="image-note">示意缩略图</span></div><div class="preview-copy"><div class="preview-category">${item.folder}<span>BOOKMARK / ${number(item.id)}</span></div><h2>${esc(item.site)}<span>↗</span></h2><p>${item.desc}</p><div class="preview-bottom"><span>${esc(item.domain)}</span><button class="preview-open" data-expand="${item.id}">展开预览 ${icon('arrow')}</button></div></div>`;
  }
  function showPreview(id, moveInline=false) {
    const item = items.find(b=>b.id===id);
    if (!item) return;
    state.selected = id;
    list.querySelectorAll('.entry').forEach(row=>row.setAttribute('aria-pressed',String(Number(row.dataset.id)===id)));
    preview.hidden=false;
    preview.innerHTML=previewMarkup(item);
    if (concept.id==='optic' && (moveInline || !preview.closest('.entry-wrap'))) {
      list.querySelector(`[data-wrap="${id}"]`)?.append(preview);
    }
    document.querySelectorAll('.film-item').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.id)===id)));
  }
  function renderList() {
    // Keep the preview node alive when replacing its previous inline parent.
    if (preview.closest('#list')) document.querySelector('.workspace').append(preview);
    const text = state.query.trim().toLocaleLowerCase();
    currentItems = items.filter(b=>(state.folder==='全部书签'||b.folder===state.folder) && `${b.title} ${b.domain} ${b.folder}`.toLocaleLowerCase().includes(text));
    if (!currentItems.some(b=>b.id===state.selected)) state.selected=currentItems[0]?.id ?? null;
    list.innerHTML = currentItems.length ? currentItems.map(row).join('') : `<div class="empty-state">${icon('search')}<h2>没有找到这页</h2><p>换个关键词，或者回到全部书签。</p><button id="reset">清除筛选</button></div>`;
    document.querySelector('#result-count').textContent=number(currentItems.length);
    document.querySelector('#collection-title').textContent=state.folder;
    document.querySelector('#heading-folder').textContent=state.folder;
    document.querySelector('.hero-count').firstChild.textContent=number(currentItems.length);
    preview.hidden=!currentItems.length;
    if (currentItems.length) showPreview(state.selected,true);
    renderFilmstrip();
  }
  function renderFilmstrip() {
    document.querySelector('#filmstrip').innerHTML = concept.id==='prism' && currentItems.length ? `<div class="filmstrip-label"><span>视觉索引</span><small>QUICK LOOK</small></div><div class="film-items">${currentItems.slice(0,6).map(b=>`<button class="film-item" data-id="${b.id}" aria-label="预览 ${esc(b.site)}" aria-pressed="${state.selected===b.id}"><span>${artwork(b)}</span><small>${esc(b.site)}</small></button>`).join('')}</div>` : '';
  }
  function openDetail(id) {
    const b = items.find(item=>item.id===id);
    document.querySelector('#dialog-content').innerHTML=`<div class="dialog-art">${artwork(b)}</div><div class="dialog-description"><span>${b.folder} / ${b.domain}</span><h2 id="dialog-title">${esc(b.title)}</h2><p>${b.desc}</p><small>模拟书签 · 原创示意缩略图</small></div>`;
    dialog.showModal();
    document.querySelector('#close-dialog').focus();
  }
  document.addEventListener('click', event=>{
    const folder=event.target.closest('[data-folder]');
    if (folder) {state.folder=folder.dataset.folder;renderFolders();renderList();return;}
    const expand=event.target.closest('[data-expand]');
    if (expand) {openDetail(Number(expand.dataset.expand));return;}
    const entry=event.target.closest('.entry,.film-item');
    if (entry) {
      showPreview(Number(entry.dataset.id),concept.id==='optic');
      if (concept.id==='optic' && !matchMedia('(max-width: 700px)').matches) entry.scrollIntoView({block:'nearest',behavior:'instant'});
      if (concept.id!=='optic' || matchMedia('(max-width: 700px)').matches) openDetail(Number(entry.dataset.id));
    }
    if (event.target.closest('#reset')) {state.folder=groups[0];state.query='';query.value='';renderFolders();renderList();query.focus();}
  });
  document.addEventListener('pointerover', event=>{
    const target=event.target.closest('.entry,.film-item');
    // The inline layout expands on click so a stationary pointer cannot trigger a reflow cascade.
    if (target && !target.contains(event.relatedTarget) && concept.id!=='optic' && event.pointerType!=='touch') showPreview(Number(target.dataset.id));
  });
  document.addEventListener('focusin',event=>{
    const target=event.target.closest('.entry,.film-item');
    if(target && concept.id!=='optic') showPreview(Number(target.dataset.id));
  });
  query.addEventListener('input',()=>{state.query=query.value;renderList();});
  document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  document.addEventListener('keydown',event=>{
    if ((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==='k' && !dialog.open) {event.preventDefault();query.focus();query.select();}
    if(event.key==='Escape' && document.activeElement===query && !dialog.open) {state.query='';query.value='';renderList();}
  });
  renderFolders();renderList();
})();
