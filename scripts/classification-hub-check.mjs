// Isolated demo data; external requests are blocked.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try{
 const context=await browser.newContext({viewport:{width:1129,height:844},locale:'zh-CN'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/dashboard.html');await page.locator('.item').first().waitFor();
 await page.locator('#pickmark-guide [data-skip]').click();
 await page.evaluate(async()=>{const {OffsetUI}=await import('./offset-ui.js'),render=OffsetUI.prototype.render;OffsetUI.prototype.render=function(){window.hubUI=this;return render.call(this);};document.querySelector('#language-zh').click();});
 assert.equal(await page.locator('.nav-dock button').count(),2);
 await page.locator('.nav-dock [data-pm-view=manage]').click();await page.locator('#workspace-name').waitFor();
 await page.locator('#workspace-name').fill('Tabs only');await page.locator('#workspace-create button').click();
 await page.waitForFunction(()=>window.hubUI.api.state().config.workspaces.includes('Tabs only'));
 const tabsBefore=await page.evaluate(()=>JSON.stringify(window.hubUI.api.state()));
 await page.locator('[data-classification-source=bookmarks]').click();
 await page.locator('#mono-panel [data-pm=connect]').click();await page.locator('#book-group-name').waitFor();
 await page.locator('#book-group-name').fill('Bookmarks only');await page.locator('#book-group-create button').click();
 await page.waitForFunction(()=>window.hubUI.book.groups.includes('Bookmarks only'));
 await page.locator('#classification-navigation [data-pm-view=rules]').click();
 await page.locator('#book-rule-keyword').fill('example.test');await page.locator('#book-rule-group').fill('Bookmarks only');
 await page.locator('#book-rule-form button.primary').click();await page.waitForFunction(()=>window.hubUI.book.rules.length===1);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.hubUI.api.state())),tabsBefore);
 const bookBefore=await page.evaluate(()=>JSON.stringify(window.hubUI.book));
 await page.locator('[data-classification-source=tabs]').click();await page.locator('#rule-keyword').waitFor();
 assert.equal(await page.locator('#classification-navigation [data-pm-view=rules]').getAttribute('aria-pressed'),'true');
 await page.locator('#rule-keyword').fill('tab-example.test');await page.locator('#rule-group').selectOption('Tabs only');await page.locator('#rule-save').click();
 await page.waitForFunction(()=>window.hubUI.api.state().config.rules.length===1);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.hubUI.book)),bookBefore);
 // Top-level source switching keeps the current management section too.
 await page.locator('[data-mode=bookmarks]').click();await page.locator('#book-rule-keyword').waitFor();
 assert.equal(await page.locator('#classification-navigation [data-pm-view=rules]').getAttribute('aria-pressed'),'true');
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>window.atlasColorMode.set(theme),theme);
  for(const width of [390,1129]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 }
 await page.locator('#brand').click();await page.locator('.item').first().waitFor();
 assert.equal(await page.locator('#classification-navigation').isVisible(),false);
 await page.locator('.nav-dock [data-pm-view=manage]').click();await page.locator('#workspace-name').waitFor();
 await page.evaluate(()=>{const ui=window.hubUI;ui.navigate('rules');ui.changeMode('bookmarks');ui.navigate('manage');});
 await page.locator('#book-group-name').waitFor();await page.waitForTimeout(150);
 assert.equal(await page.locator('body').getAttribute('data-mono-view'),'manage');
 assert.equal(await page.locator('[data-classification-source=bookmarks]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);
 console.log('PASS classification hub, independent categories/rules, direct source switching, rapid navigation, light/dark/mobile, home return');
}finally{await browser.close();}
