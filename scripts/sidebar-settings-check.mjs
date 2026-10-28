// Only isolated demo pages; never connect to the user's browser profile.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4193';
try{
 const context=await browser.newContext({viewport:{width:1056,height:844},locale:'zh-CN'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/dashboard.html');await page.locator('.item').first().waitFor();
 assert.equal(await page.locator('.top-tools #more-menu').count(),0);
 assert.equal(await page.locator('.row-group').first().isVisible(),false);
 assert.equal(await page.locator('.rail-bottom,#rail-about').count(),0);
 assert.equal(await page.locator('.nav-dock button').count(),2);
 for(const view of ['manage','rules','settings']){
  await page.locator(`${view==='rules'?'#classification-navigation':'.nav-dock'} [data-pm-view="${view}"]`).click();
  await page.waitForFunction(v=>document.body.dataset.monoView===v,view);
 }
 const manifest=await (await context.request.get(base+'/manifest.json')).json();
 await page.waitForFunction(v=>document.querySelector('#mono-version')?.textContent===v,manifest.version);
 await page.locator('#language-zh').click();assert.equal(await page.locator('#mono-about-title').textContent(),'关于拾签');
 await page.locator('#model-choice').selectOption('');await page.locator('#model').fill('custom-deepseek');
 await page.locator('#ai-provider').selectOption('openai');
 await page.locator('#model-choice').selectOption('');await page.locator('#model').fill('custom-openai');
 await page.locator('#ai-provider').selectOption('deepseek');assert.equal(await page.locator('#model').inputValue(),'custom-deepseek');
 await page.locator('#model-choice').selectOption('');
 await page.locator('#api-key').fill('fake-unsaved-key');
 await page.locator('#mono-help-title').click();
 await page.locator('#language-en').click();assert.equal(await page.locator('#mono-about-title').textContent(),'About Pickmark');
 assert.equal(await page.locator('#model').inputValue(),'custom-deepseek');assert.equal(await page.locator('#model').isVisible(),true);
 assert.equal(await page.locator('#api-key').inputValue(),'fake-unsaved-key');
 assert.equal(await page.locator('#storage-controls .storage-action').count(),3);
 for(const id of ['clear-preview-cache','clear-old-history','clear-data']){
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#'+id).click();
 }
 await page.evaluate(()=>window.scrollTo(0,500));assert.equal(await page.locator('#top-title').isVisible(),false);
 for(const width of [390,1056,1406]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.equal(await page.locator('#mono-about details').getAttribute('open'),'');
 await page.locator('#language-zh').click();await page.locator('#brand').click();
 await page.locator('[data-mode="bookmarks"]').click();await page.locator('.nav-dock [data-pm-view="settings"]').click();
 assert.equal(await page.locator('#mono-about').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: navigation, footer removal, bilingual settings, model/provider drafts, cleanup cancellation, responsive layout, no page errors');
}finally{await browser.close();}
