import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try{
 const c=await browser.newContext({viewport:{width:1440,height:844},locale:'zh-CN',reducedMotion:'reduce'});
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();
 let cases=0;
 for(const source of ['tabs','bookmarks']){
  await p.locator(`[data-mode=${source}]`).click();
  if(source==='bookmarks')await p.locator('#mono-list [data-pm=connect]').click();
  for(const language of ['zh','en'])for(const theme of ['light','dark'])for(const width of [320,390,700,838,1024,1440])for(const density of ['compact','comfortable']){
   await p.locator('#language-'+language).evaluate(e=>e.click());
   await p.evaluate(t=>window.atlasColorMode.set(t),theme);
   await p.setViewportSize({width,height:844});await p.locator(`[data-pm-density=${density}]`).click();
   const row=p.locator('.item').first(),origin=row.locator('.row-origin'),title=row.locator('.item-title');
   assert.ok(await origin.isVisible());assert.ok(await origin.locator('.fav').isVisible());
   const name=await origin.locator('strong').boundingBox(),detail=await title.boundingBox();
   assert.ok((await origin.boundingBox()).width>120,'Keep useful source-name width');
   assert.ok(await origin.locator('strong').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'GitHub should not be truncated');
   if(width<=700)assert.ok(detail.y>=name.y+name.height-1,'Page title below source');
   if(width<=1180)assert.equal(await row.locator('.item-meta').isVisible(),false);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.ok(await row.locator('[data-pm-actions]').isVisible());
   const icon=await p.locator('.hero-flow').boundingBox(),heading=await p.locator('.hero-text').boundingBox();
   assert.ok(icon.x+icon.width<=heading.x+1,'Hero icon does not overlap heading');
   if(language==='en'&&density==='compact'&&[390,838].includes(width))await p.screenshot({path:`/tmp/identity-${source}-${theme}-${width}.png`});
   cases++;
  }
  await p.locator('.item [data-pm-actions]').first().click();assert.ok(await p.locator('#mono-row-menu').isVisible());await p.keyboard.press('Escape');
 }
 await p.setViewportSize({width:390,height:844});await p.locator('.item').first().hover();
 const stripes=await p.locator('.item').first().locator('.row-stripes i').evaluateAll(es=>es.map(e=>getComputedStyle(e,'::before').transform));
 assert.ok(stripes.length&&stripes.every(t=>t==='matrix(1, 0, 0, 1, 0, 0)'));
 assert.deepEqual(errors,[]);console.log(`PASS ${cases} source/language/theme/width/density combinations, retained source identity, two-line mobile rows, menus and narrow hover stripes`);
}finally{await browser.close();}
