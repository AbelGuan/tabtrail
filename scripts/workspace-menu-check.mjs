import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1163,height:844},locale:'zh-CN'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PREVIEW_URL||'http://127.0.0.1:4193';
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/dashboard.html');await page.locator('.item').first().waitFor();
 await page.locator('[data-pm-view="manage"]').click();
 const row=name=>page.locator('#workspace-list .rule-row').filter({has:page.locator('.workspace-name',{hasText:name})});
 const action=async(name,key)=>{await row(name).locator('summary').click();await row(name).locator(`[data-workspace-action="${key}"]`).click();};
 await row('开发与技术').locator('.workspace-name').click();await page.locator('.workspace-name-input').fill('取消名称');await page.keyboard.press('Escape');assert.equal(await row('开发与技术').count(),1);
 await row('开发与技术').locator('.workspace-name').click();await page.locator('.workspace-name-input').fill('开发收藏');await page.keyboard.press('Enter');await row('开发收藏').waitFor();
 await action('开发收藏','icon');await page.locator('.workspace-icon-choice').filter({hasText:'音乐'}).click();
 const selectedPath=await row('开发收藏').locator('.workspace-icon path').getAttribute('d');
 await page.reload();await page.locator('.item').first().waitFor();assert.equal(await page.locator('[data-pm-filter="开发收藏"] svg path').getAttribute('d'),selectedPath);
 await page.locator('[data-pm-view="manage"]').click();
 await action('开发收藏','merge');await page.locator('#workspace-target').selectOption('设计与灵感');await page.locator('#workspace-edit-save').click();await row('开发收藏').waitFor({state:'detached'});
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-demo')));assert.ok(saved.records.filter(r=>r.domain==='github.com').every(r=>r.group==='设计与灵感'&&r.manualGroup));
 await page.locator('#workspace-name').fill('临时分类');await page.locator('#workspace-create button').click();await row('临时分类').waitFor();await action('临时分类','delete');await page.locator('#workspace-edit-save').click();await row('临时分类').waitFor({state:'detached'});
 await row('设计与灵感').locator('summary').click();await page.screenshot({path:'docs/offset-live/workspace-actions.png'});
 assert.deepEqual(errors,[]);console.log('PASS inline rename/cancel, icon persistence/sidebar, merge protections and delete');
}finally{await browser.close();}
