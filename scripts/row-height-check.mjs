import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();
 for(const source of ['tabs','bookmarks']){
  await p.locator(`[data-mode=${source}]`).click();
  if(source==='bookmarks')await p.locator('[data-pm=connect]').click();
  for(const scheme of ['light','dark'])for(const width of [1440,390]){
   await p.setViewportSize({width,height:900});await p.evaluate(s=>window.atlasColorMode.set(s),scheme);
   for(const density of ['compact','comfortable']){
    await p.locator(`[data-pm-density=${density}]`).click();
    const sizes=await p.evaluate(()=>({row:document.querySelector('.item').getBoundingClientRect().height,categories:[...document.querySelectorAll('.nav.cat')].map(e=>e.getBoundingClientRect().height)}));
    assert.ok(sizes.row>0);assert.ok(sizes.categories.length>0);
    assert.ok(sizes.categories.every(h=>h===sizes.row),JSON.stringify({source,scheme,width,density,sizes}));
    await p.locator('[data-pm-layout=gallery]').click();
    assert.equal(await p.locator('.nav.cat').first().evaluate(e=>e.getBoundingClientRect().height),39);
   }
  }
  await p.setViewportSize({width:1440,height:900});await p.locator('[data-pm-density=compact]').click();
  await p.locator('.nav.cat').nth(1).click();await p.locator('.item').first().waitFor();
  await p.locator('.item [data-pm-actions]').first().click();assert.equal(await p.locator('#mono-row-menu').isVisible(),true);await p.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);console.log('PASS equal measured heights in both panels, both densities, dark/light, desktop/mobile; gallery default height, filters and menus');
}finally{await browser.close();}
