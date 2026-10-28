import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 const shot=name=>page.screenshot({path:path.join(import.meta.dirname,`living-index-${name}.png`),animations:'disabled',style:'#toast{visibility:hidden}'});
 await page.goto(pathToFileURL(path.join(import.meta.dirname,'tabkeep-living-index.html')).href);
 assert.equal(await page.locator('.item').count(),14);await shot('tabs');
 await page.locator('[data-row="t8"]').hover();await page.waitForFunction(()=>document.querySelector('.preview-title')?.textContent.includes('山野'));assert.match(await page.locator('.preview-cover').innerText(),/模拟画面/);
 await page.locator('#search').click();await page.locator('#query').fill('no-matching-page');assert.match(await page.locator('#search-output').innerText(),/没有找到/);await page.locator('#query').fill('GitHub');await page.locator('#query').press('Enter');assert.equal(await page.locator('.item').count(),1);
 await page.locator('[data-mode="bookmarks"]').click();assert.equal(await page.locator('.item').count(),16);await shot('bookmarks');
 await page.locator('[data-mode="tabs"]').click();assert.equal(await page.locator('.item').count(),1);await page.locator('[data-action="clear-search"]').click();
 await page.locator('[data-mode="bookmarks"]').click();await page.locator('[data-filter="书签栏 / 设计档案"]').click();await page.locator('[data-action="classify"]').click();assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false);
 await page.locator('[data-filter="全部"]').click();await page.locator('[data-detail="b0"]').focus();await page.locator('[data-detail="b0"]').click();await page.locator('#group-select').selectOption('阅读与远方');await page.locator('#save-group').click();assert.match(await page.locator('[data-row="b0"]').innerText(),/书签栏 \/ 设计档案/);
 await page.locator('[data-action="classify"]').click();await page.locator('#classify-confirm').click();assert.equal(await page.locator('[data-view="smart"]').getAttribute('aria-current'),'page');assert.match(await page.locator('[data-row="b0"]').innerText(),/手动/);
 await page.locator('[data-layout="gallery"]').click();assert.equal(await page.locator('.gallery-card').count(),16);await shot('gallery');
 await page.locator('#theme').click();assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('night')),true);await page.locator('[data-layout="list"]').click();await shot('night');await page.locator('#theme').click();
 await page.locator('[data-mode="tabs"]').click();await page.locator('[data-view="history"]').click();await page.locator('[data-action="classify"]').click();await page.locator('#classify-confirm').click();assert.match(await page.locator('[data-row="h2"]').innerText(),/手动/);await page.locator('[data-action="restore"]').click();await page.locator('#restore-confirm').click();
 await page.locator('[data-view="review"]').click();await page.locator('[data-hour="12"]').click();assert.match(await page.locator('.timeline').innerText(),/12:04/);await shot('review');
 await page.locator('[data-view="workspace"]').click();
 for(const width of [1280,1024,768,390,320]){
  await page.setViewportSize({width,height:920});
  for(const mode of ['tabs','bookmarks']){await page.locator(`[data-mode="${mode}"]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} overflow at ${width}`);}
  if(width===390){await shot('mobile');await page.locator('[data-select="b0"]').click();assert.equal(await page.locator('#inspector').isVisible(),true);await shot('mobile-preview');await page.keyboard.press('Escape');}
 }
 await page.locator('#menu').click();await page.locator('[data-view="folders"]').click();assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
 await page.locator('[data-mode="tabs"]').click();await page.locator('#menu').click();await page.locator('[data-view="history"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'history overflow at 320');
 await page.locator('#date').fill('2026-10-11');assert.equal(await page.locator('.item').count(),0);await page.locator('[data-action="reset-filter"]').click();
 await page.locator('[data-open="h0"]').first().click();assert.match(await page.locator('#dialog').innerText(),/不访问目标网站/);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log('PASS: panel state, search, directory preservation, manual classification, scoped classification, history repair/recovery demo, review, gallery, day/night, preview, 1280/1024/768/390/320px, no page errors or network requests.');
}finally{await browser.close();}
