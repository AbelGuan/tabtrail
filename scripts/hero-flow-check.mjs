import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try {
 const c=await browser.newContext({locale:'zh-CN',viewport:{width:1440,height:844}});
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dashboard.html');await p.locator('.hero-flow').waitFor();
 const bitmap=()=>p.locator('.hero-flow').evaluate(e=>e.toDataURL());
 const nav=async view=>{await p.locator(`.nav-primary [data-pm-view=${view}]`).evaluate(e=>e.click());await p.evaluate(()=>scrollTo(0,0));};
 const logo=await p.locator('#brand .brand-logo').innerHTML();
 for(const theme of ['light','dark'])for(const width of [320,390,768,1024,1440]){
  await p.setViewportSize({width,height:844});await p.evaluate(t=>window.atlasColorMode.set(t),theme);
  for(const mode of ['tabs','bookmarks']){
   await p.locator(`[data-mode=${mode}]`).evaluate(e=>e.click());
   for(const [view,shape] of mode==='tabs'?[['workspace','folder'],['review','clock'],['history','history']]:[['folders','folder'],['smart','spark']]){
    await nav(view);assert.equal(await p.locator('.hero-flow').getAttribute('data-shape'),shape);
    assert.equal(await p.locator('.hero-flow').count(),1);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const icon=await p.locator('.hero-flow').boundingBox(),title=await p.locator('.hero-text').boundingBox();
    assert.ok(icon.x+icon.width<=title.x+1,'Icon must not overlap title');
    if(width===1440||width===390)await p.screenshot({path:`/tmp/liquid-production-${view}-${theme}-${width}.png`});
   }
  }
 }
 assert.equal(await p.locator('#brand .brand-logo').innerHTML(),logo,'Logo unchanged across views');
 await p.locator('[data-mode=tabs]').evaluate(e=>e.click());await nav('workspace');
 await p.waitForTimeout(100);let before=await bitmap();await p.waitForTimeout(250);assert.notEqual(await bitmap(),before,'Animation runs');
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(80);
 before=await bitmap();await p.waitForTimeout(180);assert.equal(await bitmap(),before,'Reduced motion is static');
 await p.evaluate(()=>window.atlasColorMode.set('light'));assert.equal(await bitmap(),before,'Approved palette stays identical across themes');
 await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(100);
 await p.evaluate(()=>{window.oldHero=document.querySelector('.hero-flow');});
 await nav('review');const detached=await p.evaluate(()=>oldHero.toDataURL());await p.waitForTimeout(180);
 assert.equal(await p.evaluate(()=>oldHero.toDataURL()),detached,'Replaced artwork stops drawing');
 await nav('workspace');await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(100);
 before=await bitmap();await p.waitForTimeout(180);assert.equal(await bitmap(),before,'Offscreen artwork stops drawing');
 await p.locator('#settings').evaluate(e=>e.click());assert.equal(await p.locator('.hero-flow').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS 50 view/theme/width cases, logo preservation, motion, reduced motion, theme sync, offscreen and replaced-canvas cleanup');
} finally {await browser.close();}
