import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url=`${process.env.PREVIEW_URL||'http://127.0.0.1:4173'}/dashboard.html`;
 await page.goto(url);await page.locator('.tab-row').first().waitFor();
 const title=await page.locator('.tab-text').first().textContent(),group=await page.locator('.card-heading h2').first().textContent();
 await page.locator('#language-en').click();
 assert.equal(await page.locator('html').getAttribute('lang'),'en-US');
 assert.equal(await page.locator('#quicklinks').textContent(),'Workspaces');
 assert.equal(await page.locator('.tab-text').first().textContent(),title);
 assert.equal(await page.locator('.card-heading h2').first().textContent(),group);
 await page.locator('.tab-row').first().hover();await page.locator('.tab-more').first().click();
 assert.equal(await page.locator('#tab-dialog label').count(),1);
 assert.equal(await page.locator('[id=tab-status],[id=workspace-filter]').count(),0);
 await page.locator('#tab-form .primary').click();
 await page.locator('#more-menu summary').click();await page.locator('#settings-shortcut').click();
 assert.equal(await page.locator('#save-settings').textContent(),'Save settings');
 assert.equal(await page.locator('#ai-provider option[value=qwen]').textContent(),'Qwen · Bailian (Beijing)');
 // All static settings copy, including placeholders and accessibility labels, is English.
 assert.equal(await page.locator('#settings-dialog').evaluate(el=>/[\u3400-\u9fff]/.test(el.textContent)),false);
 await page.locator('[data-close="settings-dialog"]').click();
 await page.locator('#more-menu summary').click();await page.locator('#rules-button').click();
 assert.equal(await page.locator('#rule-save').textContent(),'Save rule');
 await page.locator('[data-close="rules-dialog"]').click();
 await page.locator('#daily-review').click();
 assert.ok((await page.locator('#review-dashboard').textContent()).includes('Time distribution'));
 await page.getByRole('button',{name:'Details',exact:true}).click();
 await page.locator('.rv-stop-button').first().click();
 assert.ok((await page.locator('.rv-page').first().textContent()).includes('min'));
 for(const width of [390,320]){
  await page.setViewportSize({width,height:1000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English review overflow at ${width}`);
 }
 await page.locator('#theme-toggle').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'docs/review-english-mobile.png',fullPage:true});
 await page.locator('#quicklinks').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await page.locator('#language-en').isVisible(),true);
 await page.reload();await page.locator('.tab-row').first().waitFor();
 assert.equal(await page.locator('#quicklinks').textContent(),'Workspaces');
 const other=await context.newPage();await other.goto(url);await other.locator('.tab-row').first().waitFor();
 assert.equal(await other.locator('#quicklinks').textContent(),'Workspaces');
 // Remote language changes relabel an open settings dialog without clearing edits.
 await other.locator('#more-menu summary').click();await other.locator('#settings-shortcut').click();
 await other.locator('#model').fill('unsaved-model');
 await page.locator('#language-zh').click();
 await other.waitForFunction(()=>document.documentElement.lang==='zh-CN');
 assert.equal(await other.locator('#quicklinks').textContent(),'工作区');
 assert.equal(await other.locator('#model').inputValue(),'unsaved-model');
 assert.equal(await other.locator('#save-settings').textContent(),'保存设置');
 await other.locator('[data-close="settings-dialog"]').click();
 // The system workspace is translated, but its stored name is stable.
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('atlas-demo'));state.records[0].group='待整理';localStorage.setItem('atlas-demo',JSON.stringify(state));});
 await page.reload();await page.locator('.tab-row').first().waitFor();await page.locator('#language-en').click();
 assert.ok((await page.locator('#board').textContent()).includes('Unsorted'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-demo')).records[0].group),'待整理');
 assert.deepEqual(errors,[]);
 console.log('Language passed: full settings, review, unchanged user data, reload, multiple panels, English mobile and both themes.');
}finally{await browser.close();}
