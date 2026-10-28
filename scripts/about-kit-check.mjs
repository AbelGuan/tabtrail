import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync(new URL('../extension/manifest.json',import.meta.url))).version;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4196';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 const p=await context.newPage(),errors=[];p.on('pageerror',error=>errors.push(error.message));
 await p.goto(base+'/dashboard.html');await p.locator('#top-help').waitFor();
 for(const language of ['zh','en'])for(const theme of ['light','dark'])for(const width of [320,390,838,1280]){
  await p.locator('#language-'+language).evaluate(e=>e.click());await p.evaluate(t=>atlasColorMode.set(t),theme);await p.setViewportSize({width,height:900});
  await p.locator('#top-help').click();await p.waitForFunction(()=>!document.querySelector('[data-version-copy]').disabled);
  const dialog=p.locator('#pickmark-about');
  assert.equal(await dialog.locator('[data-version]').textContent(),'v'+version);
  assert.equal(await dialog.locator('a').count(),0,'No fabricated links');
  assert.equal(await dialog.locator('[data-update],[data-update-status],[data-reload],.about-update').count(),0,'Update area removed');
  const background=await dialog.evaluate(e=>getComputedStyle(e).backgroundColor);
  assert.equal(background,theme==='light'?'rgb(255, 255, 255)':'rgb(17, 17, 17)');
  assert.equal(await dialog.locator('.about-version').evaluate(e=>getComputedStyle(e).color),theme==='light'?'rgb(36, 90, 176)':'rgb(149, 189, 255)');
  assert.match(await dialog.locator('.about-cursor').evaluate(e=>getComputedStyle(e).backgroundImage),/linear-gradient/);
  assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false,'No horizontal overflow');
  assert.equal(await dialog.locator('.about-name').evaluate(e=>getComputedStyle(e).animationName),'none');
  await dialog.locator('[data-about-link=support]').click();assert.equal(await dialog.locator('#about-support-panel').isVisible(),true);
  await dialog.locator('[data-about-link=support]').click();
  if((width===1280&&language==='zh')||(width===320&&language==='en'))await p.screenshot({path:`/tmp/about-kit-${language}-${theme}-${width}.png`});
  await p.keyboard.press('1');assert.equal(await p.locator(':focus').getAttribute('data-about-link'),'repo');
  await p.keyboard.press('ArrowDown');assert.equal(await p.locator(':focus').getAttribute('data-about-link'),'feedback');
  await p.keyboard.press('Escape');assert.equal(await dialog.evaluate(e=>e.open),false);
 }
 await p.locator('#top-help').click();await p.locator('[data-guide]').click();assert.equal(await p.locator('#pickmark-guide').evaluate(e=>e.open),true);await p.locator('[data-skip]').click();
 // Clipboard is mocked so the regression never changes the user's clipboard.
 await p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedVersion=text;}}});});
 await p.locator('#top-help').click();await p.waitForFunction(()=>!document.querySelector('[data-version-copy]').disabled);
 await p.emulateMedia({reducedMotion:'no-preference'});
 assert.equal(await p.locator('.about-cursor').evaluate(e=>getComputedStyle(e).animationName),'none','Gradient cursor stays static with animations enabled');
 await p.locator('[data-version-copy]').click();assert.equal(await p.evaluate(()=>copiedVersion),version);
 assert.match(await p.locator('[data-copy-status]').textContent(),/copied/);
 await p.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('Denied');};});
 await p.locator('[data-version-copy]').click();assert.match(await p.locator('[data-copy-status]').textContent(),/Could not copy/);
 await p.keyboard.press('Escape');
 await p.evaluate(()=>{chrome.runtime={id:'mock',getManifest:()=>({version:'9.8.7'}),requestUpdateCheck:()=>{throw Error('Removed update must not run');},reload:()=>{throw Error('Removed reload must not run');}};});
 await p.locator('#top-help').click();assert.equal(await p.locator('[data-version]').textContent(),'v9.8.7');
 await p.keyboard.press('u');assert.equal(await p.locator('[data-update]').count(),0);
 await p.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS: 16 monochrome layout/theme/language cases, placeholders, keyboard/Escape, guide, real manifest version, mocked clipboard success/failure, update removal, reduced motion');
}finally{await browser.close();}
