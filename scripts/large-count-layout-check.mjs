import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await browser.newContext({locale:'zh-CN',reducedMotion:'reduce'});
 await c.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4194/')?r.continue():r.abort());
 const p=await c.newPage(),issues=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4194/dashboard.html');await p.locator('.item').first().waitFor();
 await p.evaluate(async()=>{const {OffsetUI}=await import('./offset-ui.js');const render=OffsetUI.prototype.render;OffsetUI.prototype.render=function(){window.countUI=this;return render.call(this);};document.querySelector('#language-zh').click();Object.defineProperty(OffsetUI.prototype,'rows',{get(){return window.countRows;}});});
 for(const mode of ['tabs','bookmarks'])for(const count of [100,1000,10000]){
  await p.evaluate(({mode,count})=>{window.countRows=Array.from({length:count},(_,i)=>({id:'mock-'+i,tabId:i+1,url:'https://example.invalid/'+i,title:'模拟页面 '+i,domain:'example.invalid',folder:'模拟书签',group:'待整理',manualGroup:false}));const ui=window.countUI;ui.mode=mode;ui.book={rows:window.countRows,groups:[],rules:[]};ui.render();},{mode,count});
  for(const theme of ['light','dark'])for(const width of [320,390,700,818,900,1023,1440]){
   await p.setViewportSize({width,height:844});await p.evaluate(t=>window.atlasColorMode.set(t),theme);
   const result=await p.locator('#mono-hero').evaluate(el=>{
    const h=el.querySelector('h1'),s=el.querySelector('.hero-stat'),a=el.querySelector('.hero-action');const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width};};
    const boxes=[h,s,a].filter(Boolean).map(r);const overlap=boxes.some((b,i)=>boxes.slice(i+1).some(d=>Math.min(b.right,d.right)>Math.max(b.x,d.x)+1&&Math.min(b.bottom,d.bottom)>Math.max(b.y,d.y)+1));
    return {label:s.querySelector('.hero-count').textContent,clipped:h.scrollWidth>h.clientWidth+1,overlap,overflow:document.documentElement.scrollWidth>innerWidth,boxes};
   });
   if(result.label!==String(count)||result.clipped||result.overlap||result.overflow)issues.push({mode,count,theme,width,...result});
   if(count===10000&&[320,900].includes(width))await p.screenshot({path:`/tmp/count-${mode}-${theme}-${width}.png`});
  }
 }
 console.log(JSON.stringify({issues,errors}));assert.deepEqual(issues,[]);assert.deepEqual(errors,[]);console.log('PASS 84 combinations: 100/1000/10000 simulated rows, tabs/bookmarks, light/dark, seven widths; exact count, title/button bounds');
}finally{await browser.close();}
