import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await browser.newContext();
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4196/')?r.continue():r.abort());
 const p=await c.newPage();await p.goto('http://127.0.0.1:4196/dashboard.html');
 let count=0;
 for(const mode of ['tabs','bookmarks']){
  await p.locator(`[data-mode=${mode}]`).click();
  if(mode==='bookmarks')await p.locator('[data-pm=connect]').click();
  for(const width of [390,1440])for(const theme of ['light','dark'])for(const density of ['compact','comfortable']){
   await p.setViewportSize({width,height:1200});
   await p.evaluate(t=>window.atlasColorMode.set(t),theme);
   await p.locator(`[data-pm-density=${density}]`).click();
   await p.evaluate(()=>scrollTo(0,0));await p.mouse.move(1,1);await p.waitForTimeout(200);
   const positions=[];
   for(let index of [0,1,-1,-2]){
    if(index<0)index=await p.evaluate(extra=>Math.floor(document.querySelector('#inspector .floating-art').getBoundingClientRect().height/document.querySelector('.item').getBoundingClientRect().height)+extra,-index-1);
    const row=p.locator('.item').nth(index);await row.hover();await p.waitForTimeout(800);
    const v=await p.locator('#inspector').boundingBox(),r=await row.boundingBox();
    assert.ok(v&&v.y<r.y+r.height&&v.y+v.height>r.y);
    positions.push({y:v.y,crossing:r.y+r.height/2-v.y});
    if(mode==='tabs'&&density==='compact')await p.screenshot({path:`/tmp/traversal-${width}-${theme}-${index}.png`});
   }
   assert.ok(Math.abs(positions[0].y-positions[1].y)<1,'First two rows share a stationary preview');
   assert.ok(positions[1].crossing>positions[0].crossing,'Rows cross different parts of the image');
   assert.ok(positions[2].y>positions[1].y+10,'Next group moves the preview down');
   assert.ok(Math.abs(positions[2].crossing-positions[0].crossing)<1,'Next group starts crossing at the top again');
   assert.ok(Math.abs(positions[2].y-positions[3].y)<1,'Second group also stays fixed');count++;
  }
 }
 console.log(`PASS ${count} traversal scenarios across sources, themes, widths and densities`);
}finally{await browser.close();}
