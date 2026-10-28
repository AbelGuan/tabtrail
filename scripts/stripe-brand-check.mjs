import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await browser.newContext({locale:'zh-CN',viewport:{width:1280,height:844}});
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4194/')?r.continue():r.abort());
 const p=await c.newPage();await p.goto('http://127.0.0.1:4194/dashboard.html');await p.locator('.item').first().waitFor();
 for(const theme of ['light','dark']){
  await p.evaluate(t=>window.atlasColorMode.set(t),theme);
  assert.equal(await p.locator('#mono-hero circle,.brand-logo circle,.brand-logo linearGradient').count(),0);
  assert.equal(await p.locator('.hero-count').textContent(),'39');
  await p.locator('.item').first().hover();await p.waitForTimeout(1000);
  assert.ok(await p.locator('.item').first().evaluate(e=>e.classList.contains('is-hovered')));
  const transforms=await p.locator('.item').first().locator('.row-stripes i').evaluateAll(els=>els.map(e=>getComputedStyle(e,'::before').transform));
  assert.ok(transforms.length>0&&transforms.every(t=>t==='matrix(1, 0, 0, 1, 0, 0)'));
  await p.screenshot({path:`/tmp/pickmark-stripe-${theme}.png`});await p.mouse.move(800,80);
 }
 console.log('PASS stripe logo, monospace count, retained hover stripe transition in light/dark');
}finally{await browser.close();}
