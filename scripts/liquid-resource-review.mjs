import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4196';
const browser=await chromium.launch({channel:'chrome',headless:true});
const reports=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:844}});
 await context.addInitScript(()=>localStorage.setItem('pickmark-guide-v1','seen'));
 const original=await fs.readFile(new URL('../extension/hero-flow.js',import.meta.url),'utf8');
 const measured=original.replace("import {createLiquidRenderer} from './liquid-art.js';",`import {createLiquidRenderer as originalRenderer} from './liquid-art.js';
 const createLiquidRenderer=(...args)=>{
  const render=originalRenderer(...args);if(!render)return null;
  window.liquidMetrics ||= {next:0,frames:0,ms:0,max:0,byId:{}};
  const id=++liquidMetrics.next;liquidMetrics.byId[id]=0;
  return time=>{const start=performance.now();render(time);const cost=performance.now()-start;
   liquidMetrics.frames++;liquidMetrics.ms+=cost;liquidMetrics.max=Math.max(liquidMetrics.max,cost);liquidMetrics.byId[id]++;};
 };`);
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(!url.startsWith(base+'/'))return route.abort();
  if(new URL(url).pathname==='/hero-flow.js')return route.fulfill({contentType:'text/javascript',body:measured});
  return route.continue();
 });
 const errors=[];
 const open=async()=>{const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/dashboard.html');await p.locator('.hero-flow').waitFor();return p;};
 const p=await open();
 const browserCDP=await browser.newBrowserCDPSession();
 const rendererCPU=async()=> (await browserCDP.send('SystemInfo.getProcessInfo')).processInfo.filter(process=>process.type==='renderer').reduce((sum,process)=>sum+process.cpuTime,0);
 const snapshot=page=>page.evaluate(()=>structuredClone(liquidMetrics));
 const measure=async(page,label,duration=1200)=>{
  const a=await snapshot(page);await page.waitForTimeout(duration);const b=await snapshot(page);
  const frames=b.frames-a.frames,ms=b.ms-a.ms;
  const report={label,frames,fps:+(frames*1000/duration).toFixed(1),renderMs:+ms.toFixed(1),meanFrameMs:+(ms/Math.max(1,frames)).toFixed(2)};
  reports.push(report);return report;
 };
 const cpuStart=await rendererCPU();
 const visible=await measure(p,'one visible panel');assert.ok(visible.frames>5&&visible.fps<35);
 reports.push({label:'single-panel renderer CPU (whole page, 1.2s)',cpuMs:Math.round(((await rendererCPU())-cpuStart)*1000)});
 await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(100);
 assert.equal((await measure(p,'scrolled offscreen',400)).frames,0);
 await p.evaluate(()=>scrollTo(0,0));assert.ok((await measure(p,'returned onscreen',400)).frames>0);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(60);
 assert.equal((await measure(p,'reduced motion',400)).frames,0);
 await p.emulateMedia({reducedMotion:'no-preference'});
 // Headless pages do not reliably become hidden when another tab is opened.
 // Exercise the real visibility handler with a controlled visibility signal.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal((await measure(p,'simulated document hidden',400)).frames,0);
 await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.ok((await measure(p,'visibility restored',400)).frames>0);
 const cdp=await context.newCDPSession(p);await cdp.send('HeapProfiler.collectGarbage');
 const heapBefore=(await cdp.send('Runtime.getHeapUsage')).usedSize;
 for(let i=0;i<60;i++){
  await p.locator(`.nav-primary [data-pm-view=${i%2?'workspace':'review'}]`).evaluate(e=>e.click());
 }
 await p.waitForTimeout(100);const old=await snapshot(p);await p.waitForTimeout(350);const current=await snapshot(p);
 for(const id of Object.keys(old.byId))if(+id!==old.next)assert.equal(current.byId[id],old.byId[id],'Disposed renderer must stop');
 assert.equal(await p.locator('.hero-flow').count(),1);
 await cdp.send('HeapProfiler.collectGarbage');const heapAfter=(await cdp.send('Runtime.getHeapUsage')).usedSize;
 reports.push({label:'60 switches, GC heap delta',bytes:heapAfter-heapBefore});
 assert.ok(heapAfter-heapBefore<5*1024*1024,'No large retained heap after navigation');
 for(let i=0;i<60;i++)await p.locator(`.nav-primary [data-pm-view=${i%2?'workspace':'review'}]`).evaluate(e=>e.click());
 await cdp.send('HeapProfiler.collectGarbage');const heapSecond=(await cdp.send('Runtime.getHeapUsage')).usedSize;
 reports.push({label:'second 60 switches, GC heap delta',bytes:heapSecond-heapAfter});
 assert.ok(heapSecond-heapAfter<2*1024*1024,'Retained memory must not keep climbing after warmup');
 const panels=[p];for(let i=0;i<5;i++)panels.push(await open());
 const starts=await Promise.all(panels.map(snapshot)),multiCPU=await rendererCPU();await p.waitForTimeout(1500);
 const ends=await Promise.all(panels.map(snapshot));
 reports.push({label:'six simultaneous headless panels (all visible)',frames:ends.map((end,i)=>end.frames-starts[i].frames),totalRenderMs:+ends.reduce((sum,end,i)=>sum+end.ms-starts[i].ms,0).toFixed(1)});
 reports.push({label:'six-panel renderer CPU (whole pages, 1.5s)',cpuMs:Math.round(((await rendererCPU())-multiCPU)*1000)});
 for(let i=0;i<6;i++)assert.ok(ends[i].frames>starts[i].frames,'Every visible panel animates');
 await Promise.all(panels.slice(1).map(page=>page.close()));
 assert.ok((await measure(p,'remaining panel after five close',400)).frames>0);
 await p.locator('#settings').evaluate(e=>e.click());assert.equal(await p.locator('.hero-flow').count(),0);
 assert.equal((await measure(p,'settings: no icon',400)).frames,0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(reports,null,2));
 console.log('PASS: resource review with isolated mock data; no external requests');
}finally{await browser.close();}
