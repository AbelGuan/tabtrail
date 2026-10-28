import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try{
 const context=await browser.newContext({viewport:{width:1129,height:844},locale:'zh-CN',colorScheme:'light'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();
 const other=await context.newPage();await other.goto(base+'/dashboard.html');await other.locator('.item').first().waitFor();
 await p.locator('#settings').click();
 const glyphs=new Set();
 for(const mode of ['light','dark','system']){
  await p.locator('#theme').click();await p.locator(`#appearance-menu [data-appearance=${mode}]`).click();
  assert.equal(await p.locator(`[data-color-choice=${mode}]`).getAttribute('aria-pressed'),'true');
  assert.equal(await p.locator('#theme').getAttribute('data-appearance'),mode);
  glyphs.add(await p.locator('#theme').innerHTML());
  await other.waitForFunction(m=>document.querySelector('#theme').dataset.appearance===m,mode);
 }
 assert.equal(glyphs.size,3);
 await p.emulateMedia({colorScheme:'dark'});await p.waitForFunction(()=>document.documentElement.dataset.colorScheme==='dark');
 assert.equal(await p.locator('#theme').getAttribute('data-appearance'),'system');
 await p.locator('[data-color-choice=light]').click();assert.equal(await p.locator('#theme').getAttribute('data-appearance'),'light');
 await p.locator('#theme').focus();await p.keyboard.press('Enter');await p.locator('#appearance-menu:popover-open').waitFor();
 await p.keyboard.press('End');await p.keyboard.press('Enter');assert.equal(await p.locator('#theme').getAttribute('data-appearance'),'system');
 await p.locator('#theme').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#theme').evaluate(e=>e===document.activeElement),true);
 await p.locator('#language-en').click();assert.equal(await p.locator('#theme').getAttribute('aria-label'),'Appearance: System');
 await p.reload();await p.locator('.item').first().waitFor();assert.equal(await p.locator('#theme').getAttribute('data-appearance'),'system');
 await p.setViewportSize({width:390,height:844});await p.locator('#theme').click();
 const rect=await p.locator('#appearance-menu').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=390);
 await p.locator('#mono-hero').click();assert.equal(await p.locator('#appearance-menu:popover-open').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS three modes/icons, settings and cross-page sync, OS change, reload, keyboard, dismissal, language, narrow viewport');
}finally{await browser.close();}
