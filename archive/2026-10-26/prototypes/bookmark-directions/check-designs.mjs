import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const dir=import.meta.dirname;
// The expanded OFFSET app has its own regression suite: check-offset-app.mjs.
const variants=['01-optic','02-signal','04-prism'];
const errors=[],requests=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  // A disposable profile and a network guard keep every scenario fully local.
  await context.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  for(const variant of variants){
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(pathToFileURL(path.join(dir,variant+'.html')).href);
    await page.locator('.entry').first().waitFor();
    assert.equal(await page.locator('.entry').count(),12);
    assert.match(await page.locator('#preview h2').innerText(),/^Forma\s*↗$/);
    await page.screenshot({path:path.join(dir,variant+'-desktop.png'),animations:'disabled'});
    await page.locator('[data-folder="开发工具"]').click();
    assert.equal(await page.locator('.entry').count(),2);
    assert.match(await page.locator('#preview h2').innerText(),/Grid Systems/);
    await page.locator('[data-folder="全部书签"]').click();
    await page.locator('#query').fill('margins');
    assert.equal(await page.locator('.entry').count(),1);
    await page.locator('#query').fill('不存在的模拟页面');
    assert.equal(await page.locator('.entry').count(),0);
    assert.match(await page.locator('#list').innerText(),/没有找到/);
    assert.equal(await page.locator('#preview').isVisible(),false);
    await page.locator('#reset').click();
    assert.equal(await page.locator('.entry').count(),12);
    if(variant==='01-optic'){
      await page.locator('.entry[data-id="3"]').click();
      assert.equal(await page.locator('[data-wrap="3"] #preview').count(),1);
      await page.locator('#preview [data-expand]').first().click();
    } else {
      await page.locator('.entry[data-id="3"]').hover();
      assert.match(await page.locator('#preview h2').innerText(),/Type Foundry/);
      await page.locator('.entry[data-id="2"]').focus();
      assert.match(await page.locator('#preview h2').innerText(),/Orbit/);
      await page.keyboard.press('Enter');
    }
    assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);
    assert.match(await page.locator('#detail').innerText(),/模拟书签/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
    await page.keyboard.press('Meta+k');
    assert.equal(await page.locator('#query').evaluate(e=>e===document.activeElement),true);
    for(const width of [1024,768,390,320]){
      await page.setViewportSize({width,height:920});
      await page.goto(pathToFileURL(path.join(dir,variant+'.html')).href);
      await page.locator('.entry').first().waitFor();
      const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1 && getComputedStyle(e).position!=='fixed').map(e=>e.className?.baseVal||e.className).slice(0,6)}));
      assert.ok(overflow.document<=width,`${variant} overflow at ${width}: ${JSON.stringify(overflow)}`);
      if(width===390){
        await page.screenshot({path:path.join(dir,variant+'-mobile.png'),animations:'disabled'});
        await page.locator('.entry[data-id="2"]').click();
        assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);
        await page.keyboard.press('Escape');
      }
    }
    console.log(`PASS ${variant}: search, folders, preview, keyboard, empty state, 1440/1024/768/390/320px.`);
  }
  await page.setViewportSize({width:1440,height:1150});
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
  assert.equal(await page.locator('a.card').count(),4);
  assert.ok(await page.locator('.frame img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)));
  await page.screenshot({path:path.join(dir,'comparison.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(requests,[],'Prototype attempted an HTTP request');
  assert.deepEqual(errors,[],'Browser errors');
  console.log('PASS comparison page; zero external requests; zero console or page errors.');
} finally { await browser.close(); }
