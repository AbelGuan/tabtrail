import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:781,height:844},locale:'zh-CN'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:4193';
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/dashboard.html');await page.locator('.item').first().waitFor();await page.locator('#menu').click();await page.locator('[data-pm-view="rules"]').click();
 assert.equal(await page.locator('#rule-sort-hint').isVisible(),false);assert.equal(await page.locator('.rules-empty').isVisible(),true);assert.equal(await page.locator('#preference-form').isVisible(),false);
 await page.waitForTimeout(350);await page.screenshot({path:'docs/offset-live/rules-clean-empty.png',fullPage:true});
 for(const word of ['github.com','github']){await page.locator('#rule-keyword').fill(word);await page.locator('#rule-save').click();await page.waitForTimeout(100);}
 assert.equal(await page.locator('#saved-rules .drag-handle').count(),2);assert.equal(await page.locator('#rule-sort-hint').isVisible(),true);
 await page.locator('#saved-rules .drag-handle').nth(1).focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(150);assert.equal(await page.locator('#saved-rules .rule-copy strong').first().innerText(),'github');
 await page.locator('#saved-rules button[aria-label^="编辑规则"]').first().click();await page.locator('#rule-keyword').fill('example.com');await page.locator('#rule-save').click();await page.waitForTimeout(100);assert.equal(await page.locator('#saved-rules .rule-copy strong').first().innerText(),'example.com');
 await page.locator('.rules-disclosure summary').first().click();await page.locator('#ai-preference').fill('按项目分类');await page.locator('#save-preference').check();await page.locator('#preference-form button').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-demo')).config.savedPreference),'按项目分类');
 await page.locator('.rules-disclosure summary').first().click();await page.locator('.rules-disclosure summary').nth(1).click();assert.equal(await page.locator('#import-rules').isVisible(),true);const download=page.waitForEvent('download');await page.locator('#export-rules').click();await download;await page.locator('.rules-disclosure summary').nth(1).click();
 for(const width of [1440,781,390,320]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'docs/offset-live/rules-clean-saved.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS rules empty state, conditional sorting, add/edit/reorder, preference, backup and responsive layout');
}finally{await browser.close();}
