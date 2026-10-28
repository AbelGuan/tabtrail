import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({locale:'zh-CN',timezoneId:'America/New_York',viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${process.env.PREVIEW_URL||'http://127.0.0.1:4173'}/dashboard.html`);
 await page.locator('.tab-row').first().waitFor();
 for(const [day,count] of [['2026-03-08',23],['2026-11-01',25]]){
  await page.evaluate(async day=>{
   const {renderReview}=await import('./review.js');
   const {reviewHours}=await import('./activity.js');
   const slots=reviewHours(day),visits=slots.filter(s=>[1,10].includes(s.hour)).map((s,i)=>({day,start:s.start+15*60000,end:s.start+16*60000,domain:`site${i}.test`,url:`https://site${i}.test/`,title:`Page ${i}`,group:'Test',visit:String(i),chain:String(i)}));
   const root=document.getElementById('review-dashboard');root.hidden=false;
   document.body.replaceChildren(root);
   renderReview(root,{visits},day,[]);
  },day);
  assert.equal(await page.locator('.rv-hour').count(),count);
  await page.locator('.rv-hour[data-hour="10"]').click();
  assert.match(await page.locator('.rv-hour-summary').textContent(),/10:00—11:00/);
  await page.getByRole('button',{name:'10:15',exact:true}).click();
  assert.equal(await page.locator('.rv-swim-segment').count(),1);
  const bar=page.locator('.rv-swim-segment');
  assert.equal(await bar.evaluate(e=>parseFloat(e.style.left)),0);
  assert.ok(Math.abs(await bar.evaluate(e=>parseFloat(e.style.width))-100/15)<0.01);
  assert.equal(await page.locator('.rv-swim-axis span').first().textContent(),'10:15');
  if(count===25){
   const repeated=page.locator('.rv-hour[data-hour="1"]');assert.equal(await repeated.count(),2);
   assert.match(await repeated.nth(0).getAttribute('aria-label'),/UTC-04:00/);
   assert.match(await repeated.nth(1).getAttribute('aria-label'),/UTC-05:00/);
   const sites=[];
   for(let i=0;i<2;i++){
    await repeated.nth(i).click();await page.getByRole('button',{name:'01:15',exact:true}).click();
    assert.equal(await page.locator('.rv-swim-segment').count(),1);
    sites.push(await page.locator('.rv-swim-segment').getAttribute('aria-label'));
   }
   assert.notEqual(sites[0],sites[1]);
  }else assert.equal(await page.locator('.rv-hour[data-hour="2"]').count(),0);
  for(const width of [1400,390,320]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${day}: overflow at ${width}`);
  }
 }
 if(process.env.SCREENSHOT_PATH)await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('DST browser checks passed: 23/25 hours, repeated-hour selection, quarter filters, matching graph bounds, 320/390px layouts.');
}finally{await browser.close();}
