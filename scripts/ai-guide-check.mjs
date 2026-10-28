import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await browser.newContext({locale:'zh-CN',reducedMotion:'reduce'});
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 const requests=[],errors=[];await c.route('**/*',r=>{if(r.request().url().startsWith('http://127.0.0.1:4194/'))return r.continue();requests.push(r.request().url());return r.abort();});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4194/dashboard.html');await p.locator('.item').first().waitFor();
 for(const width of [1440,390,320])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:844});await p.evaluate(t=>window.atlasColorMode.set(t),theme);
  await p.locator('#top-help').click();await p.locator('[data-guide]').click();
  await p.locator('[data-next]').click();await p.locator('[data-next]').click();
  await p.waitForTimeout(80);
  assert.equal(await p.locator('.tour-card').evaluate(e=>e.scrollWidth>e.clientWidth),false,'Guide content must fit');
  const buttons=await p.locator('#pickmark-guide .dialog-actions button').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().y));assert.ok(Math.max(...buttons)-Math.min(...buttons)<1,'Footer actions share one baseline');
  assert.equal(await p.locator('[data-skip]').evaluate(e=>getComputedStyle(e).fontSize),await p.locator('#pickmark-guide .dialog-heading .mono').evaluate(e=>getComputedStyle(e).fontSize));
  const ring=await p.locator('.tour-ring').boundingBox(),target=await p.locator('.nav-dock [data-pm-view=settings]').boundingBox();assert.ok(Math.abs(ring.x-target.x)<=4);
  if(width===390)await p.screenshot({path:`/tmp/ai-guide-${theme}.png`});
  await p.locator('[data-next]').click();await p.waitForFunction(()=>document.activeElement?.id==='ai-provider');
  const box=await p.locator('#ai-provider').boundingBox();assert.ok(box.y>=60&&box.y+box.height<844,'AI provider is visible below header');
  assert.equal(await p.locator('#rail').evaluate(e=>e.classList.contains('open')),false);
  await p.locator('#excluded').fill('draft.example');
 }
 assert.equal(await p.locator('#excluded').inputValue(),'draft.example','Replay preserves settings draft');
 await p.locator('#language-en').click();await p.locator('#top-help').click();await p.locator('[data-guide]').click();await p.locator('[data-next]').click();await p.locator('[data-next]').click();
 assert.equal(await p.locator('[data-next]').textContent(),'Set up AI');await p.locator('[data-later]').click();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);console.log('PASS AI settings target, configure/focus, later, draft retention, bilingual narrow light/dark and no external requests');
}finally{await browser.close();}
