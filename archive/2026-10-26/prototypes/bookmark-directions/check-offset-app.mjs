import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=import.meta.dirname,url=pathToFileURL(path.join(dir,'03-offset.html')).href;
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],network=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'no-preference'});
 await context.route(/^https?:/,route=>{network.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const shot=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(dir,'offset-full-'+name+'.png'),animations:'disabled',style:'#toast{visibility:hidden}'});};
 const ready=async()=>{await page.locator('.hero h1').waitFor();await page.waitForTimeout(180);};
 const view=async name=>{if(await page.locator('#menu').isVisible())await page.locator('#menu').click();await page.locator(`[data-view="${name}"]`).click();await ready();};
 await page.goto(url);await ready();assert.equal(await page.locator('.item').count(),64);assert.equal(await page.locator('#inspector').isVisible(),false);await shot('bookmarks');
 const first=page.locator('[data-row="b0"]'),before=await first.boundingBox();
 await first.hover();await page.waitForTimeout(100);
 const stages=await first.evaluate(e=>['.row-origin','.row-stripes i','.row-details'].map(s=>getComputedStyle(e.querySelector(s),'::before').transform));
 assert.notEqual(stages[0],'matrix(0, 0, 0, 1, 0, 0)');
 assert.match(stages[2],/^matrix\(0,/,'Right block should wait for the leading block');
 await page.waitForFunction(()=>document.querySelector('#inspector')?.classList.contains('is-visible'));await page.waitForTimeout(360);
 assert.deepEqual(await first.boundingBox(),before,'Hover must not move or resize the row');
 assert.match(await page.locator('#inspector').innerText(),/form.example/);await shot('hover');
 const previewRect=await page.locator('#inspector').boundingBox();await page.mouse.move(before.x+before.width-90,before.y+before.height/2);assert.deepEqual(await page.locator('#inspector').boundingBox(),previewRect,'Preview is anchored, not attached to the cursor');
 await page.locator('[data-row="b1"]').hover();await page.waitForTimeout(80);await page.locator('[data-row="b2"]').hover();await page.waitForTimeout(80);await page.locator('[data-row="b3"]').hover();await page.waitForTimeout(700);assert.match(await page.locator('#inspector').innerText(),/type.example/);
 await page.locator('h1').hover();await page.waitForTimeout(240);assert.equal(await page.locator('#inspector').isVisible(),false);
 await page.locator('[data-row="b14"]').hover();await page.waitForTimeout(700);assert.match(await page.locator('#inspector').innerText(),/暂无预览/);await page.keyboard.press('Escape');assert.equal(await page.locator('#inspector').getAttribute('aria-hidden'),'true');
 await page.locator('[data-select="b0"]').click();assert.equal(await page.locator('#dialog').evaluate(e=>e.open),true);assert.match(await page.locator('#dialog').innerText(),/页面预览/);await page.keyboard.press('Escape');
 await page.locator('.item [data-detail="b0"]').click();await page.locator('#group-select').selectOption('阅读与远方');await page.locator('#save-group').click();assert.match(await page.locator('[data-row="b0"]').innerText(),/手动/);assert.match(await page.locator('[data-row="b0"]').innerText(),/书签栏 \/ 设计档案/);
 await view('smart');await shot('smart');await page.locator('[data-action="classify"]').click();await page.locator('#classify-confirm').click();assert.match(await page.locator('[data-row="b0"]').innerText(),/阅读与远方/);
 await page.locator('[data-layout="gallery"]').click();await ready();assert.equal(await page.locator('.gallery-card').count(),64);await shot('gallery');await page.locator('[data-layout="list"]').click();await ready();
 await page.keyboard.press('Meta+k');await page.locator('#query').fill('no-page-matches');await page.keyboard.press('Enter');assert.equal(await page.locator('.item').count(),0);assert.equal(await page.locator('#inspector').isVisible(),false);await page.locator('[data-action="clear-search"]').click();
 await page.locator('[data-mode="tabs"]').click();await ready();assert.equal(await page.locator('.item').count(),74);await shot('tabs');
 await view('history');assert.equal(await page.locator('.item').count(),9);await shot('history');
 await page.locator('[data-detail="h6"]').click();await page.locator('#group-select').selectOption('待整理');await page.locator('#save-group').click();
 const h0=await page.locator('[data-row="h0"]').innerText();await page.locator('[data-action="classify"]').click();await page.locator('#classify-confirm').click();assert.equal(await page.locator('[data-row="h0"]').innerText(),h0);assert.match(await page.locator('[data-row="h6"]').innerText(),/待整理/);assert.match(await page.locator('[data-row="h6"]').innerText(),/手动/);assert.doesNotMatch(await page.locator('[data-row="h7"]').innerText(),/待整理/);
 await page.locator('[data-detail="h7"]').click();await page.locator('#group-select').selectOption('日常与生活');await page.locator('#save-group').click();assert.equal(await page.evaluate(()=>history.find(r=>r.id==='h7').snapshotGroup),'日常与生活','Manual history adjustment must update the restore snapshot');
 await page.locator('[data-action="restore"]').click();await page.locator('#restore-confirm').click();assert.match(await page.locator('#toast').innerText(),/已有标签已复用/);
 await page.locator('#date').fill('2026-10-11');assert.equal(await page.locator('.item').count(),0);await page.locator('[data-action="reset-filter"]').click();
 await view('review');await page.locator('[data-hour="12"]').click();assert.match(await page.locator('.timeline').innerText(),/12:04/);await page.locator('[data-review-by="site"]').click();assert.match(await page.locator('.legend').first().innerText(),/figma.com/);await shot('review');
 await view('manage');await shot('manage');await page.locator('[data-add-group]').click();await page.locator('#group-name').fill('交互研究');await page.locator('#confirm-group').click();assert.match(await page.locator('.management-list').innerText(),/交互研究/);
 await view('rules');await page.locator('[data-add-rule]').click();await page.locator('#rule-domain').fill('new.example');await page.locator('#rule-group').selectOption('交互研究');await page.locator('#confirm-rule').click();assert.match(await page.locator('.management-list').innerText(),/new.example/);await shot('rules');
 await view('workspace');await page.locator('[data-action="classify"]').click();await page.locator('#classify-confirm').click();assert.match(await page.locator('[data-row="t12"]').innerText(),/交互研究/);
 await view('settings');await shot('settings');await page.locator('[data-appearance="dark"]').click();assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('night')),true);await shot('night');await page.locator('[data-appearance="light"]').click();
 await page.locator('[data-preview-toggle]').click();await view('workspace');await page.locator('[data-row="t0"]').hover();await page.waitForTimeout(650);assert.equal(await page.locator('#inspector').isVisible(),false);
 for(const width of [1024,818,768,390,320]){
  await page.setViewportSize({width,height:920});
  for(const panel of ['tabs','bookmarks']){
   await page.locator(`[data-mode="${panel}"]`).click();await ready();
   for(const name of panel==='tabs'?['workspace','review','history','manage','rules','settings']:['folders','smart']){
    await view(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${panel}/${name} overflow at ${width}`);
    if(width===390&&(name==='folders'||name==='review'))await shot('mobile-'+name);
   }
  }
 }
 await page.locator('[data-select="b0"]').click();assert.equal(await page.locator('#dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);await page.mouse.move(500,30);await page.locator('[data-open="b0"]').focus();await page.keyboard.press('Tab');await page.waitForTimeout(100);assert.equal(await page.locator('#inspector').getAttribute('aria-hidden'),'false');await page.keyboard.press('Tab');assert.match(await page.locator('#inspector').innerText(),/form.example/);await page.keyboard.press('Tab');await page.waitForTimeout(100);assert.match(await page.locator('#inspector').innerText(),/figma.com/);await page.keyboard.press('Escape');assert.equal(await page.locator('#inspector').getAttribute('aria-hidden'),'true');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log('PASS: staged hover, stable rows and preview, rapid changes, leave/Escape, missing thumbnails, keyboard/touch preview, all 8 views, manual/folder preservation, history repair and restore, scoped rules, gallery/search, themes, 1440/1024/818/768/390/320px; zero errors or external requests.');
}finally{await browser.close();}
