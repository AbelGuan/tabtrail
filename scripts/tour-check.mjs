import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({locale:'zh-CN',reducedMotion:'reduce'});
 await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4194/')?r.continue():r.abort());
 await context.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4194/dashboard.html');await p.locator('.item').first().waitFor();
 const before=await p.evaluate(()=>JSON.stringify({...localStorage}));
 for(const width of [1440,818,390,320])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:844});await p.evaluate(t=>window.atlasColorMode.set(t),theme);
  await p.locator('#top-help').click();await p.locator('[data-guide]').click();
  for(let step=0;step<3;step++){
   await p.waitForTimeout(80);
   const box=await p.locator('.tour-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=845,`Card ${width}/${step}`);
   if(step<2){const ring=await p.locator('.tour-ring').boundingBox();assert.ok(ring.x>=0&&ring.y>=0&&ring.x+ring.width<=width+1&&ring.y+ring.height<=845,`Ring ${width}/${step}`);}
   if(step===1){await p.locator('[data-back]').click();await p.waitForTimeout(40);assert.match(await p.locator('#guide-title').textContent(),/两种/);await p.locator('[data-next]').click();}
   if(step===2)assert.match(await p.locator('.tour-card').innerText(),/书签 AI 整理前需要确认处理范围/);
   if(width===390)await p.screenshot({path:`/tmp/tour-${theme}-${step}.png`});
   await p.locator(step===2?'[data-later]':'[data-next]').click();
  }
  await p.waitForFunction(()=>!document.querySelector('#rail').classList.contains('open'));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 const after=await p.evaluate(()=>JSON.stringify({...localStorage}));
 await p.locator('#top-help').click();await p.locator('[data-guide]').click();await p.locator('[data-next]').click();await p.setViewportSize({width:1000,height:600});await p.waitForTimeout(100);
 assert.equal(await p.locator('.tour-card').evaluate(e=>getComputedStyle(e).animationName),'none','Reduced motion is respected');
 await p.locator('[data-skip]').click();assert.equal(await p.locator('#rail').evaluate(e=>e.classList.contains('open')),false);
 await p.locator('#settings').click();await p.locator('#language-en').click();await p.setViewportSize({width:320,height:844});
 assert.equal(await p.locator('#top-help').textContent(),'About & help');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'English toolbar fits');
 // Only UI theme preferences may change; no records, categories or bookmarks are touched.
 const a=JSON.parse(before),b=JSON.parse(after);for(const key of Object.keys(a))if(!/color|theme/i.test(key))assert.equal(b[key],a[key],key);
 assert.deepEqual(errors,[]);console.log('PASS spotlight targets, back/later, bookmark AI scope notice, sidebar restoration, four widths and both themes, unchanged data');
}finally{await browser.close();}
