import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try{
 const c=await browser.newContext({viewport:{width:1440,height:900},locale:'zh-CN'});
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();
 await p.evaluate(async()=>{const {OffsetUI}=await import('./offset-ui.js'),render=OffsetUI.prototype.render;OffsetUI.prototype.render=function(){window.testUI=this;return render.call(this);};document.querySelector('#language-zh').click();});
 let cases=0;const issues=[];
 for(const source of ['tabs','bookmarks']){
  await p.locator(`[data-mode=${source}]`).evaluate(e=>e.click());
  if(source==='bookmarks')await p.locator('#mono-list [data-pm=connect]').click();
  for(const lang of ['zh','en'])for(const theme of ['light','dark'])for(const density of ['compact','comfortable']){
   await p.locator('#language-'+lang).evaluate(e=>e.click());await p.evaluate(t=>window.atlasColorMode.set(t),theme);
   await p.locator(`[data-pm-density=${density}]`).click();
   await p.evaluate(()=>{const rows=testUI.rows.map(r=>({...r}));rows[0].title='Microsoft Learn — 开发者技术文档与学习中心 · A very long page title / 很长的页面标题与项目说明 '.repeat(3);rows[0].manualGroup=true;testUI.renderList(rows);});
   for(const width of [1440,1181,1180,1179,1101,1100,1099,951,950,949,801,800,799,701,700,699,390,320,700,701,1100,1101,1440]){
    await p.setViewportSize({width,height:900});await p.waitForTimeout(45);
    assert.equal(await p.locator('#mono-row-menu:popover-open').count(),0,'Resize dismisses old menu');
    const geometry=await p.locator('.item').first().evaluate(row=>{
     const origin=row.querySelector('.row-origin'),name=row.querySelector('strong'),title=row.querySelector('.item-title'),action=row.querySelector('[data-pm-actions]'),a=action.getBoundingClientRect(),r=row.getBoundingClientRect();
     return {overflow:document.documentElement.scrollWidth>innerWidth,source:getComputedStyle(origin).visibility,nameHeight:name.clientHeight,nameScroll:name.scrollHeight,titleHeight:title.clientHeight,titleScroll:title.scrollHeight,actionInside:a.top>=r.top&&a.bottom<=r.bottom+1,rightGap:r.right-a.right,hit:action.contains(document.elementFromPoint(a.x+a.width/2,a.y+a.height/2)),titleBelow:title.getBoundingClientRect().top>=name.getBoundingClientRect().bottom-1};
    });
    if(geometry.overflow||geometry.source!=='visible'||geometry.nameScroll>geometry.nameHeight+1||geometry.titleScroll>geometry.titleHeight+1||!geometry.actionInside||geometry.rightGap>12||!geometry.hit||(width<=700&&!geometry.titleBelow))issues.push({source,lang,theme,density,width,geometry});
    await p.locator('.item [data-pm-actions]').first().focus();await p.keyboard.press('Enter');
    const menu=p.locator('#mono-row-menu'),box=await menu.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=900,'Menu fits');
    await p.keyboard.press('Escape');assert.ok(await p.locator('.item [data-pm-actions]').first().evaluate(e=>e===document.activeElement),'Escape restores trigger');
    await p.locator('.item [data-pm-actions]').first().click();cases++;
   }
   await p.keyboard.press('Escape');
  }
 }
 for(const source of ['tabs','bookmarks']){
  await p.locator(`[data-mode=${source}]`).evaluate(e=>e.click());
  for(const width of [390,701,1440]){
   await p.setViewportSize({width,height:900});await p.evaluate(()=>scrollTo(0,0));
   const row=p.locator('.item').first();await row.locator('.row-origin').hover();await p.waitForTimeout(650);
   const transforms=await row.locator('.row-stripes i').evaluateAll(es=>es.map(e=>getComputedStyle(e,'::before').transform));
   assert.ok(transforms.length===12&&transforms.every(t=>t==='matrix(1, 0, 0, 1, 0, 0)'),'Animated stripe transition completes');
   if(width===390)await p.screenshot({path:`/tmp/responsive-hover-${source}.png`});
   await p.mouse.move(5,5);await p.waitForTimeout(650);
   assert.equal(await row.evaluate(e=>e.classList.contains('is-hovered')),false,'Hover clears');
   await p.locator('.item [data-pm-actions]').last().click();
   const menu=await p.locator('#mono-row-menu').boundingBox();assert.ok(menu.y>=0&&menu.y+menu.height<=900,'Bottom menu remains reachable');
   await p.keyboard.press('Escape');
   await p.locator('[data-pm-layout=gallery]').click();assert.equal(await p.locator('.item').count(),0);assert.ok(await p.locator('.gallery-card').count());
   await p.locator('[data-pm-layout=list]').click();assert.ok(await p.locator('.row-origin .fav').first().isVisible());
  }
 }
 console.log(JSON.stringify({cases,issues,errors}));assert.deepEqual(issues,[]);assert.deepEqual(errors,[]);
 console.log('PASS breakpoint round trips, long/manual titles, menu bounds and keyboard focus');
}finally{await browser.close();}
