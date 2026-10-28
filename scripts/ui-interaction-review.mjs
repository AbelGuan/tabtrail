// Isolated UI review; all records are examples, previews are locally generated.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4193',failures=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN',reducedMotion:'reduce'});
 const errors=[],network=[];
 await context.route('**/*',route=>{if(route.request().url().startsWith(base+'/'))return route.continue();network.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/dashboard.html');await page.locator('.item').first().waitFor();
 await page.evaluate(async()=>{const {OffsetUI}=await import('./offset-ui.js'),render=OffsetUI.prototype.render;OffsetUI.prototype.render=function(){window.reviewUI=this;return render.call(this);};document.querySelector('#language-zh').click();});
 const run=async(name,fn)=>{try{await fn();console.log('PASS '+name);}catch(error){failures.push(name+': '+error.message);console.log('FAIL '+name+': '+error.message);}};
 await run('menu stays reachable after resize and dismisses on scrolling',async()=>{
  await page.locator('.item [data-pm-actions]').first().click();await page.locator('#mono-row-menu:popover-open').waitFor();
  await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));assert.equal(await page.locator('#mono-row-menu:popover-open').count(),1);
  await page.setViewportSize({width:390,height:900});await page.waitForTimeout(100);
  assert.equal(await page.locator('#mono-row-menu:popover-open').count(),0);
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.item [data-pm-actions]').first().click();await page.evaluate(()=>window.scrollTo(0,100));await page.waitForTimeout(100);
  assert.equal(await page.locator('#mono-row-menu:popover-open').count(),0);
 });
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{window.reviewUI.closeActions();window.scrollTo(0,0);});
 await run('cross-panel language change preserves pending large preview and exclusion blocks cached image',async()=>{
  await page.evaluate(()=>{
   const ui=window.reviewUI,r=ui.rows[0],canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;canvas.getContext('2d').fillRect(0,0,800,500);
   window.reviewImage=canvas.toDataURL('image/jpeg');window.reviewRow=r;
   ui.thumbnails.clear();ui.api.extension=true;
   window.reviewImagePromise=new Promise(resolve=>{window.releaseReviewImage=resolve;});
   ui.api.send=async message=>message.type==='thumbnail:get'?window.reviewImagePromise:message.type==='preview:status'?{enabled:false,visible:false,blocked:ui.api.state().config.excluded.includes(r.domain)}:null;
   ui.preview(r,true);
  });
  const other=await context.newPage();await other.goto(base+'/dashboard.html');
  await other.evaluate(()=>localStorage.setItem('atlas-language-v1','en'));
  await page.waitForFunction(()=>document.documentElement.lang==='en-US');
  await page.evaluate(()=>window.releaseReviewImage(window.reviewImage));
  await page.locator('#mono-preview img').waitFor({timeout:2500});assert.equal(await page.locator('#mono-preview-open').innerText(),'Open page');
  await page.evaluate(()=>{window.reviewUI.api.state().config.excluded.push(window.reviewRow.domain);window.reviewUI.api.render();});
  assert.equal(await page.locator('#mono-preview img').count(),0);assert.match(await page.locator('#mono-preview').innerText(),/excluded/i);
  await other.close();
 });
 await run('late preview status cannot undo newer automatic-preview state',async()=>{
  const enabled=await page.evaluate(async()=>{
   const ui=window.reviewUI;ui.api.state().config.excluded=[];ui.autoPreview=false;let release,calls=0;
   ui.api.send=async m=>m.type==='preview:status'?(++calls===1?new Promise(resolve=>release=resolve):{enabled:true,visible:false,blocked:false}):window.reviewImage;
   ui.preview(window.reviewRow,true);await ui.syncAutoPreview();release({enabled:false,visible:false,blocked:false});await Promise.resolve();await Promise.resolve();return ui.autoPreview;
  });assert.equal(enabled,true);
 });
 await run('rapid close/reopen rejects stale close events and retains current preview',async()=>{
  await page.evaluate(()=>{const ui=window.reviewUI;ui.thumbnails.clear();ui.api.send=async m=>m.type==='thumbnail:get'?new Promise(resolve=>window.releaseReopened=resolve):{enabled:true,visible:false,blocked:false};document.querySelector('#mono-preview').close();ui.preview(window.reviewRow,true);});
  await page.waitForTimeout(100);await page.evaluate(()=>window.releaseReopened(window.reviewImage));
  await page.locator('#mono-preview img').waitFor({timeout:2500});assert.equal(await page.evaluate(()=>window.reviewUI.explicitPreview?.row.id),await page.evaluate(()=>window.reviewRow.id));
 });
 await run('out-of-order automatic-preview reads retain the latest state',async()=>{
  const enabled=await page.evaluate(async()=>{
   const ui=window.reviewUI;document.querySelector('#mono-preview').close();ui.autoPreview=false;const replies=[];
   ui.api.send=async()=>new Promise(resolve=>replies.push(resolve));const first=ui.syncAutoPreview(),second=ui.syncAutoPreview();
   replies[1]({enabled:true});await second;replies[0]({enabled:false});await first;return ui.autoPreview;
  });assert.equal(enabled,true);
 });
 await run('clearing preview cache rejects the previous pending image',async()=>{
  await page.evaluate(()=>{
   const ui=window.reviewUI;ui.thumbnails.clear();let gets=0;
   ui.api.send=async m=>m.type==='thumbnail:get'?(++gets===1?new Promise(resolve=>window.releaseCleared=resolve):null):{enabled:true,visible:false,blocked:false};
   ui.preview(window.reviewRow,true);ui.thumbnails.clear();ui.preview(window.reviewRow,true);
  });
  await page.evaluate(()=>window.releaseCleared(window.reviewImage));await page.waitForTimeout(50);
  assert.equal(await page.locator('#mono-preview img').count(),0);assert.equal(await page.evaluate(()=>!!window.reviewUI.thumbnails.get(window.reviewRow.url)),false);
 });
 await run('deleted row closes its large preview and late image cannot restore it',async()=>{
  await page.evaluate(()=>{
   const ui=window.reviewUI;ui.thumbnails.clear();window.savedReviewRecords=ui.api.state().records;
   ui.api.send=async m=>m.type==='thumbnail:get'?new Promise(resolve=>window.releaseDeleted=resolve):{enabled:true,visible:false,blocked:false};
   ui.preview(window.reviewRow,true);ui.api.state().records=ui.api.state().records.filter(r=>r.id!==window.reviewRow.id);ui.api.render();
  });
  assert.equal(await page.locator('#mono-preview').evaluate(d=>d.open),false);
  await page.evaluate(()=>window.releaseDeleted(window.reviewImage));await page.waitForTimeout(50);
  assert.equal(await page.locator('#mono-preview').evaluate(d=>d.open),false);assert.equal(await page.evaluate(()=>!!window.reviewUI.thumbnails.get(window.reviewRow.url)),false);
  await page.evaluate(()=>{window.reviewUI.api.state().records=window.savedReviewRecords;});
 });
 await page.evaluate(()=>{const ui=window.reviewUI;document.querySelector('#mono-preview').close();ui.api.extension=false;ui.api.state().config.excluded=[];ui.api.render();document.querySelector('#language-zh').click();});
 await run('language switches retain unsaved settings and preview toggle state',async()=>{
  await page.locator('#settings').click();await page.locator('#model-choice').selectOption('');await page.locator('#model').fill('review-unsaved-model');await page.locator('#api-key').fill('synthetic-unsaved-key');
  const before=await page.locator('[data-pm=preview-toggle]').getAttribute('aria-pressed');
  await page.locator('#language-en').click();await page.locator('#language-zh').click();
  assert.equal(await page.locator('#model').inputValue(),'review-unsaved-model');assert.equal(await page.locator('#api-key').inputValue(),'synthetic-unsaved-key');assert.equal(await page.locator('[data-pm=preview-toggle]').getAttribute('aria-pressed'),before);
  assert.doesNotMatch(await page.locator('#mono-appearance').innerText(),/Hover previews|Automatically save previews/);
 });
 assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
 if(failures.length)throw Error(failures.join('\n'));
}finally{await browser.close();}
