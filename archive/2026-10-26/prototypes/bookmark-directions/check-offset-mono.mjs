import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=import.meta.dirname,reference=process.env.OFFSET_REFERENCE_DIR;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const errors=[],network=[];
 const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce'});
 await context.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const url=root=>pathToFileURL(path.join(root,'03-offset.html')).href;
 const load=async(root,mode='bookmarks',view='folders')=>{
  await page.goto(url(root));await page.locator('.hero h1').waitFor();
  await page.locator(`[data-mode="${mode}"]`).click();
  if(await page.locator('#menu').isVisible())await page.locator('#menu').click();
  await page.locator(`[data-view="${view}"]`).click();
  await page.mouse.move(0,0);await page.waitForTimeout(60);
 };
 if(reference){
  for(const name of ['03-offset.html','offset-app.css','offset-app.js'])assert.equal(fs.readFileSync(path.join(dir,name),'utf8').trimEnd(),fs.readFileSync(path.join(reference,name),'utf8').trimEnd(),`${name} must match supplied design`);
  const scenarios=[['bookmarks','folders',1440],['bookmarks','smart',1440],['tabs','workspace',1440],['tabs','review',1440],['tabs','history',1440],['tabs','manage',1440],['tabs','rules',1440],['tabs','settings',1440],['bookmarks','folders',390],['tabs','review',390],['bookmarks','folders',1440,'hover'],['tabs','settings',1440,'dark']];
  for(const [mode,view,width,state] of scenarios){
   await page.setViewportSize({width,height:1000});const captures=[];
   for(const root of [reference,dir]){
    await load(root,mode,view);
    if(state==='hover'){await page.locator('[data-row="b0"]').hover();await page.waitForFunction(()=>document.querySelector('#inspector').classList.contains('is-visible'));}
    if(state==='dark')await page.locator('[data-appearance="dark"]').click();
    captures.push(await page.screenshot({animations:'disabled',caret:'hide',style:'#toast{visibility:hidden}'}));
   }
   assert.ok(captures[0].equals(captures[1]),`Visual mismatch: ${mode}/${view}/${width}/${state||'default'}`);
  }
  console.log('PASS: supplied source parity and 12 identical browser captures.');
 }
 await page.setViewportSize({width:1440,height:1000});await load(dir);
 assert.match(await page.locator('.brand').innerText(),/拾签/);
 const compact=(await page.locator('.item').first().boundingBox()).height;
 await page.locator('[data-density="comfortable"]').click();assert.ok((await page.locator('.item').first().boundingBox()).height>compact);
 await page.locator('[data-density="compact"]').click();assert.equal((await page.locator('.item').first().boundingBox()).height,compact);
 await page.locator('[data-open="b0"]').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-open="b1"]').evaluate(e=>e===document.activeElement),true);assert.match(await page.locator('#statusbar').innerText(),/拾签的下一个形状/);
 await page.keyboard.press('Space');assert.equal(await page.locator('#dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
 await page.keyboard.press('/');assert.equal(await page.locator('#command').evaluate(e=>e.open),true);await page.keyboard.press('Escape');
 await load(dir,'tabs','workspace');const count=await page.locator('.item').count();await page.locator('[data-open="t0"]').focus();await page.keyboard.press('Backspace');assert.equal(await page.locator('.item').count(),count-1);assert.match(await page.locator('#statusbar').innerText(),/73 个标签/);
 await page.locator('#nav-filter').fill('不存在的分类');assert.equal(await page.locator('.nav-none').isVisible(),true);assert.equal(await page.locator('#nav [data-view="settings"]').isVisible(),true);await page.locator('#nav-filter').fill('');
 await page.mouse.move(800,500);await page.mouse.wheel(0,1400);await page.waitForTimeout(100);
 const toolbar=await page.locator('.list-tools').boundingBox(),header=await page.locator('.topbar').boundingBox();assert.ok(toolbar.y>=header.y+header.height-1&&toolbar.y<header.y+header.height+20,'List toolbar stays below topbar');
 assert.equal(await page.locator('#statusbar').isVisible(),true);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log('PASS: compact/comfortable density, keyboard selection/preview/search/close, status counts, category filter and fixed management controls, sticky toolbar; no errors or external requests.');
}finally{await browser.close();}
