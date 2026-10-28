import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const dir=import.meta.dirname;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});
 const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await page.goto(pathToFileURL(path.join(dir,'tabkeep-dual-panel.html')).href);
 await page.screenshot({path:path.join(dir,'dual-panel-tabs.png')});
 assert.equal(await page.locator('.row').count(),14);
 await page.locator('.row').first().hover();await page.locator('#preview').waitFor({state:'visible'});
 assert.match(await page.locator('#preview').innerText(),/模拟缩略图/);
 await page.screenshot({path:path.join(dir,'dual-panel-preview.png')});await page.keyboard.press('Escape');
 await page.locator('[data-mode="bookmarks"]').click();assert.equal(await page.locator('.row').count(),16);
 await page.screenshot({path:path.join(dir,'dual-panel-bookmarks.png')});
 await page.locator('[data-view="smart"]').click();assert.equal(await page.locator('.row').count(),16);
 const title=await page.locator('[data-row="b0"] .row-title').innerText();
 await page.locator('[data-detail="b0"]').focus();await page.locator('[data-detail="b0"]').click();
 await page.locator('#edit-group').selectOption('阅读与灵感');await page.locator('#save-group').click();
 assert.match(await page.locator('[data-row="b0"]').innerText(),/书签栏 \/ 设计素材/);
 await page.locator('[data-view="folders"]').click();assert.match(await page.locator('[data-row="b0"] .row-title').innerText(),new RegExp(title));
 await page.locator('[data-filter="书签栏 / 设计素材"]').click();await page.locator('[data-action="classify"]').click();assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false);assert.match(await page.locator('#toast').innerText(),/当前范围没有/);await page.locator('[data-filter="全部"]').click();
 await page.locator('#search-open').click();await page.locator('#query').fill('no-match-test');assert.match(await page.locator('#search-results').innerText(),/没有找到/);await page.locator('#query').fill('GitHub');await page.locator('#query').press('Enter');assert.equal(await page.locator('.row').count(),1);
 await page.locator('[data-mode="tabs"]').click();assert.equal(await page.locator('.row').count(),14);
 await page.locator('[data-mode="bookmarks"]').click();assert.equal(await page.locator('.row').count(),1);await page.locator('[data-action="clear-search"]').click();
 await page.locator('[data-action="classify"]').click();await page.locator('#confirm-classify').click();assert.equal(await page.locator('[data-view="smart"]').getAttribute('aria-current'),'page');
 await page.locator('[data-mode="tabs"]').click();await page.locator('[data-view="history"]').click();assert.equal(await page.locator('.row').count(),9);
 await page.locator('[data-action="history-classify"]').click();await page.locator('#confirm-classify').click();assert.equal(await page.locator('[data-action="history-classify"]').isDisabled(),true);assert.match(await page.locator('[data-row="h2"]').innerText(),/手动/);
 await page.locator('[data-action="restore"]').click();await page.locator('#restore-confirm').click();
 await page.locator('[data-view="review"]').click();await page.locator('[data-hour="12"]').click();assert.match(await page.locator('.timeline').innerText(),/12:04/);
 await page.screenshot({path:path.join(dir,'dual-panel-review.png')});
 await page.locator('.top-actions [data-action="settings"]').click();await page.locator('[data-color="dark"]').click();await page.locator('[data-style="classic"]').click();await page.locator('#dialog [data-close]').first().click();
 assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('dark')&&e.classList.contains('classic')),true);
 await page.locator('[data-mode="bookmarks"]').click();await page.screenshot({path:path.join(dir,'dual-panel-dark.png'),animations:'disabled',style:'#toast{visibility:hidden}'});
 await page.locator('.top-actions [data-action="settings"]').click();await page.locator('[data-color="light"]').click();await page.locator('[data-style="rounded"]').click();await page.locator('#dialog [data-close]').first().click();
 for(const width of [1024,768,390,320]){
  await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
  await page.locator('[data-preview]').first().click();assert.equal(await page.locator('#preview').isVisible(),true);assert.ok(await page.locator('#preview').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));await page.keyboard.press('Escape');
  if(width===390)await page.screenshot({path:path.join(dir,'dual-panel-mobile.png'),animations:'disabled',style:'#toast{visibility:hidden}'});
 }
 await page.locator('#mobile-menu').click();await page.locator('[data-view="folders"]').click();assert.equal(await page.locator('#mobile-menu').getAttribute('aria-expanded'),'false');
 await page.locator('[data-open]').first().click();assert.match(await page.locator('#dialog').innerText(),/不访问目标网站/);
 assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
 console.log('PASS: both panels, independent search, folder preservation, manual categorization, history classification, recovery demonstration, review drilldown, preview, themes, 1024/768/390/320px, zero HTTP requests and page errors.');
}finally{await browser.close();}
