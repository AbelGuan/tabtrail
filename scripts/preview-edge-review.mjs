import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await browser.newContext();
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4196/')?r.continue():r.abort());
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4196/dashboard.html');let cases=0;
 for(const mode of ['tabs','bookmarks']){
  await p.locator(`[data-mode=${mode}]`).click();if(mode==='bookmarks')await p.locator('[data-pm=connect]').click();
  for(const theme of ['light','dark'])for(const width of [390,1440]){
   await p.setViewportSize({width,height:600});await p.evaluate(t=>window.atlasColorMode.set(t),theme);
   await p.locator(`[data-pm-density=${width===390?'comfortable':'compact'}]`).click();
   for(const scroll of [0,500]){
    await p.mouse.move(1,1);await p.evaluate(y=>scrollTo(0,y),scroll);await p.waitForTimeout(250);
    const visible=await p.locator('.item').evaluateAll(es=>{
     const bar=Math.max(document.querySelector('.app .topbar').getBoundingClientRect().bottom,document.querySelector('.list-tools').getBoundingClientRect().bottom);
     return es.map((e,i)=>{const r=e.getBoundingClientRect();return{i,x:r.x+30,y:r.y+r.height/2,height:r.height};}).filter(r=>r.y>bar+2&&r.y<innerHeight-40);
    });
    assert.ok(visible.length>1);
    await p.mouse.move(visible[0].x,visible[0].y);await p.waitForTimeout(750);
    const size=await p.locator('#inspector .floating-art').evaluate((e,h)=>Math.max(1,Math.floor(e.getBoundingClientRect().height/h)),visible[0].height);
    const groups=new Map();for(const r of visible){const key=Math.floor(r.i/size);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
    const positions=new Map();
    for(const [key,rows] of groups){
     for(const r of [rows[0],rows.at(-1)]){
      await p.mouse.move(r.x,r.y);await p.waitForTimeout(750);
      const b=await p.locator('#inspector').boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=600.5);
      assert.ok(b.y<r.y+r.height/2&&b.y+b.height>r.y-r.height/2,'Preview overlaps current row');
      if(positions.has(key))assert.ok(Math.abs(positions.get(key)-b.y)<1,'Group position fixed');positions.set(key,b.y);
     }
    }
    const ys=[...positions.values()];for(let i=1;i<ys.length;i++)assert.ok(ys[i]-ys[i-1]>=15,'Distinct groups do not collapse at the bottom');
    for(const [key,rows] of [...groups].reverse()){
     await p.mouse.move(rows[0].x,rows[0].y);await p.waitForTimeout(750);
     assert.ok(Math.abs((await p.locator('#inspector').boundingBox()).y-positions.get(key))<1,'Reverse traversal restores position');
    }
    assert.equal(await p.locator('#inspector').evaluate(e=>getComputedStyle(e).zIndex),'-1');
    if(scroll===500)await p.screenshot({path:`/tmp/group-edge-${mode}-${width}-${theme}.png`});cases++;
   }
  }
 }
 assert.deepEqual(errors,[]);console.log(`PASS ${cases} short-window source/theme/width/scroll scenarios: stable groups, separated edges and reverse traversal`);
}finally{await browser.close();}
