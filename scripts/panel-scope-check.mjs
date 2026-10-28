import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1163,height:844},locale:'zh-CN'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:4193';await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/dashboard.html');await page.locator('.item').first().waitFor();
 assert.equal(await page.locator('#more-menu #reorganize,#more-menu #refresh,#more-menu #rules-button,#more-menu #workspaces-button').count(),0);
 await page.locator('[data-pm=refresh]').click();assert.match(await page.locator('[data-pm=refresh]').innerText(),/标签/);
 const before=await page.evaluate(()=>localStorage.getItem('atlas-demo'));
 await page.locator('[data-mode=bookmarks]').click();await page.locator('[data-pm=connect]').click();await page.locator('.item').first().waitFor();
 assert.equal(await page.locator('[data-pm=regroup]').count(),0);assert.match(await page.locator('[data-pm=refresh]').innerText(),/书签/);assert.match(await page.locator('[data-pm=organize]').innerText(),/书签规则/);
 await page.locator('[data-pm=refresh]').click();await page.locator('[data-pm=organize]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-demo')),before);
 await page.locator('[data-pm-view=rules]').click();assert.match(await page.locator('#mono-hero h1').innerText(),/书签/);assert.equal(await page.locator('#rule-form').isVisible(),false);
 await page.locator('[data-pm-view=manage]').click();assert.match(await page.locator('#mono-hero h1').innerText(),/书签/);assert.equal(await page.locator('#workspace-list').isVisible(),false);
 await page.locator('[data-pm-view=folders]').click();await page.locator('#more-menu summary').click();await page.screenshot({path:'docs/offset-live/global-menu-scoped.png'});await page.locator('#more-menu summary').click();
 await page.locator('[data-mode=tabs]').click();assert.ok(await page.locator('[data-pm=regroup]').isVisible());await page.locator('[data-pm-view=rules]').click();assert.match(await page.locator('#mono-hero h1').innerText(),/标签/);assert.ok(await page.locator('#rule-form').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS global menu and tab/bookmark refresh, organize, rules and management scope isolation');
}finally{await browser.close();}
