import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4194';
try{
 const context=await browser.newContext({viewport:{width:1129,height:844},locale:'zh-CN'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();
 for(const mode of ['light','dark','system']){
  await p.emulateMedia({colorScheme:'dark'});
  await p.evaluate(mode=>window.atlasColorMode.set(mode),mode);
  for(const panel of ['tabs','bookmarks']){
   await p.locator(`[data-mode="${panel}"]`).click();await p.mouse.move(700,400);
   const result=await p.evaluate(()=>{
    const css=s=>getComputedStyle(document.querySelector(s));
    return {scheme:document.documentElement.dataset.colorScheme,brand:css('#brand').backgroundColor,nav:css('.nav:not(.active)').backgroundColor,dock:css('.dock:not(.active)').backgroundColor,top:css('.app>.topbar').backgroundColor,paper:css('body').getPropertyValue('--paper').trim(),active:css('.nav.active').backgroundColor,foreground:css('.nav.active').color};
   });
   assert.equal(result.scheme,mode==='light'?'light':'dark');
   for(const key of ['brand','nav','dock'])assert.equal(result[key],'rgba(0, 0, 0, 0)',`${mode}/${panel}/${key}`);
   assert.notEqual(result.active,result.foreground);
   assert.notEqual(result.top,'rgb(32, 38, 47)');
   await p.locator('#brand').hover();
   assert.equal(await p.locator('#brand').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  }
  await p.locator('.nav-dock [data-pm-view="settings"]').click();await p.locator('#mono-about').waitFor();
  await p.locator('#brand').click();
 }
 await p.emulateMedia({colorScheme:'light'});await p.waitForFunction(()=>document.documentElement.dataset.colorScheme==='light');
 await p.evaluate(()=>window.atlasColorMode.set('dark'));
 await p.screenshot({path:'/tmp/pickmark-dark-shell.png'});
 assert.deepEqual(errors,[]);console.log('PASS light/dark/system, tabs/bookmarks, normal/active navigation, settings, system changes; no page errors');
}finally{await browser.close();}
