import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.PREVIEW_URL||'http://127.0.0.1:4188'}/dashboard.html#review`);
 await page.locator('.rv-hour').first().waitFor();
 assert.ok(await page.locator('.rv-swim-segment').count()>0);assert.ok(await page.locator('.rv-swim-links path').count()>0);
 await page.locator('.rv-swim-segment').first().click();assert.equal(await page.locator('.rv-stop-button[aria-expanded=true]').count(),1);
 await page.locator('.rv-page-link').first().click();
 assert.match(await page.locator('#toast').textContent(),/示例/);
 assert.equal(page.url().split('#')[1],'review');
 await page.getByRole('button',{name:'轨迹图',exact:true}).click();
 await page.screenshot({path:'docs/review-swimlane.png',fullPage:true});
 await page.screenshot({path:'docs/review-preview.png',fullPage:true});
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:1400,height:1100});await page.getByRole('button',{name:'详细记录',exact:true}).click();
 await page.locator('.rv-stop-button[aria-expanded=true]').click();assert.equal(await page.locator('.rv-hour').count(),24);assert.ok(await page.locator('.rv-stop').count()<=6);assert.equal(await page.locator('.rv-pages').count(),0);
 await page.getByRole('button',{name:'工作区',exact:true}).last().click();assert.match(await page.locator('.rv-donut').getAttribute('aria-label'),/开发|音乐|旅行/);
 await page.getByRole('button',{name:'网站',exact:true}).click();
 await page.locator('.rv-stop-button').first().click();assert.equal(await page.locator('.rv-stop-button[aria-expanded=true]').count(),1);assert.ok(await page.locator('.rv-page').count()<=6);
 await page.locator('.rv-hour[data-hour="10"]').click();assert.equal(await page.locator('.rv-hour[aria-pressed=true]').getAttribute('data-hour'),'10');assert.equal(await page.locator('.rv-page').count(),0);
 await page.getByRole('button',{name:'10:15',exact:true}).click();assert.ok(await page.locator('.rv-stop').count()<=6);
 await page.getByRole('button',{name:'整小时',exact:true}).click();await page.locator('.rv-hour[data-hour="9"]').click();
 await page.screenshot({path:'docs/review-desktop.png',fullPage:true});
 for(const width of [390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);if(width===390)await page.screenshot({path:'docs/review-mobile.png',fullPage:true});}
 await page.locator('#theme-toggle').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1400,height:1100});await page.screenshot({path:'docs/review-classic.png',fullPage:true});
 // A real twelve-hour volume, rather than checking only a short demo.
 await page.evaluate(async()=>{
  const {demoState}=await import('./demo.js');const state=demoState(),start=new Date(`${state.today}T09:00:00`).getTime();
  state.visits=Array.from({length:720},(_,i)=>{const source=[0,15,9][Math.floor(i/8)%3],r=state.records[source];return {...r,title:`第 ${i+1} 个页面 · ${r.title}`,url:r.url+`?page=${i}`,start:start+i*60000,end:start+(i+1)*60000,visit:`busy-${i}`,chain:'busy',mode:'active'};});
  localStorage.setItem('atlas-demo',JSON.stringify(state));
 });await page.reload();await page.getByRole('button',{name:'详细记录',exact:true}).click();await page.locator('.rv-stop-button').first().waitFor();
 assert.equal(await page.locator('.rv-hour').count(),24);assert.equal(await page.locator('.rv-stop').count(),6);assert.equal(await page.locator('.rv-page').count(),0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<1300),'12 hours must not create a giant page');
 await page.getByRole('button',{name:'浏览路径下一页'}).click();assert.equal(await page.locator('.rv-stop').count(),2);
 await page.getByRole('button',{name:'浏览路径上一页'}).click();await page.locator('.rv-stop-button').first().click();assert.equal(await page.locator('.rv-page').count(),6);
 await page.getByRole('button',{name:'页面记录下一页'}).click();assert.equal(await page.locator('.rv-page').count(),2);
 await page.locator('.rv-stop-button').first().click();await page.screenshot({path:'docs/review-busy-day.png',fullPage:true});
 await page.locator('.rv-hour[data-hour="0"]').click();assert.match(await page.locator('.rv-journey').textContent(),/没有采集/);
 await page.locator('#day').fill('2000-01-01');assert.match(await page.locator('#review-dashboard').textContent(),/尚未采集/);assert.equal(await page.locator('.rv-hour').count(),0);
 // A panel left open overnight updates date limits and keeps explicit history choices.
 const overnight=await browser.newPage();
 await overnight.clock.install({time:new Date(2026,8,20,23,59)});
 await overnight.goto(`${process.env.PREVIEW_URL||'http://127.0.0.1:4188'}/dashboard.html#review`);
 await overnight.locator('.rv-hour').first().waitFor();
 await overnight.clock.setFixedTime(new Date(2026,8,21,0,1));
 await overnight.locator('#quicklinks').click();await overnight.locator('#daily-review').click();
 assert.equal(await overnight.locator('#day').getAttribute('max'),'2026-09-21');
 assert.equal(await overnight.locator('#day').inputValue(),'2026-09-21');
 assert.equal(await overnight.locator('#day').evaluate(e=>e.validity.rangeOverflow),false);
 await overnight.locator('#day').fill('2026-09-19');
 await overnight.clock.setFixedTime(new Date(2026,8,22,0,1));
 await overnight.locator('#quicklinks').click();await overnight.locator('#daily-review').click();
 assert.equal(await overnight.locator('#day').inputValue(),'2026-09-19');
 assert.equal(await overnight.locator('#day').getAttribute('max'),'2026-09-22');
 await overnight.locator('#continue-browsing').click();assert.equal(await overnight.locator('#day').inputValue(),'2026-09-21');
 await overnight.close();
 assert.deepEqual(errors,[]);console.log('Review passed: hourly drill-down, quarter filter, bounded paths, nested page records, 720-visit day, both themes, 390/320px, empty states.');
}finally{await browser.close();}
