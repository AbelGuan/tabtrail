import assert from 'node:assert/strict';import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const b=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'}),errors=[];p.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:4193';await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();const tabBefore=await p.evaluate(()=>localStorage.getItem('atlas-demo'));
 await p.locator('[data-mode=bookmarks]').click();await p.locator('[data-pm=connect]').click();await p.locator('[data-pm-view=manage]').click();
 await p.locator('#book-group-name').fill('Test category');await p.locator('#book-group-create button').click();
 const row=name=>p.locator('.book-group-row').filter({has:p.locator('.workspace-name',{hasText:name})});const action=async(name,key)=>{await row(name).locator('summary').click();await row(name).locator(`[data-book-action=${key}]`).click();};
 await row('Test category').locator('.workspace-name').click();await p.locator('.book-rename').fill('Renamed category');await p.keyboard.press('Enter');await row('Renamed category').waitFor();
 await action('Renamed category','icon');await p.locator('input[name=book-icon][value=music]').check();await p.locator('#mono-book-dialog .primary').click();
 await row('Renamed category').locator('.drag-handle').focus();await p.keyboard.press('ArrowUp');await p.waitForTimeout(100);
 await p.locator('[data-pm-view=rules]').click();
 for(const [keyword,group] of [['GitHub','Renamed category'],['Example','Other category']]){await p.locator('#book-rule-keyword').fill(keyword);await p.locator('#book-rule-group').fill(group);await p.locator('#book-rule-form .primary').click();}
 await p.locator('#book-rules-list button[aria-label="编辑规则：GitHub"]').click();await p.locator('#book-rule-keyword').fill('github.com');await p.locator('#book-rule-form .primary').click();assert.equal(await p.locator('#book-rules-list strong').first().innerText(),'github.com');
 await p.locator('#book-rules-list .drag-handle').nth(1).focus();await p.keyboard.press('ArrowUp');await p.waitForTimeout(100);assert.equal(await p.locator('#book-rules-list strong').first().innerText(),'Example');
 await p.locator('#mono-panel .rules-disclosure summary').click();const downloaded=p.waitForEvent('download');await p.locator('#book-rules-export').click();const download=await downloaded;const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(backup.scope,'bookmarks');assert.equal(backup.rules.length,2);assert.equal(backup.metadata,undefined);
 backup.rules.push({keyword:'new-site',group:'Import category'});await p.locator('#book-rules-file').setInputFiles({name:'rules.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await p.locator('#mono-book-dialog .primary').click();assert.equal(await p.locator('#book-rules-list strong').count(),3);
 await p.locator('[data-pm-view=manage]').click();await action('Renamed category','merge');await p.locator('#book-merge-target').selectOption('Other category');await p.locator('#mono-book-dialog .primary').click();assert.equal(await row('Renamed category').count(),0);
 await action('Import category','delete');await p.locator('#mono-book-dialog .primary').click();assert.equal(await row('Import category').count(),0);
 await p.screenshot({path:'docs/offset-live/bookmark-management-phase2.png'});
 await p.locator('[data-pm-view=rules]').click();await p.screenshot({path:'docs/offset-live/bookmark-rules-phase2.png'});
 assert.equal(await p.evaluate(()=>localStorage.getItem('atlas-demo')),tabBefore);
 for(const width of [1440,781,390,320]){await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS bookmark inline rename, icon, ordering, rule edit/reorder/import/export, merge/delete and tab isolation');
}finally{await b.close();}
