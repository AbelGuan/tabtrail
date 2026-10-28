// Synthetic UI stress benchmark. No browser profile or real bookmark API is used.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const results=[];
for(const count of [100,1000,10000]){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN',reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4193')?r.continue():r.abort());
  const pages=[],errors=[];
  const measure=async(page)=>{
   const cdp=await context.newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');await cdp.send('Performance.enable');
   const {metrics}=await cdp.send('Performance.getMetrics'),m=Object.fromEntries(metrics.map(m=>[m.name,m.value]));
   const dom=await cdp.send('Memory.getDOMCounters');await cdp.detach();
   return {heapMB:+(m.JSHeapUsedSize/1048576).toFixed(2),nodes:dom.nodes,listeners:dom.jsEventListeners};
  };
  const rss=async()=>{try{const session=await browser.newBrowserCDPSession();const {processInfo}=await session.send('SystemInfo.getProcessInfo');await session.detach();return +(processInfo.reduce((sum,p)=>{try{return sum+Number(execFileSync('ps',['-o','rss=','-p',String(p.id)],{encoding:'utf8'}).trim());}catch{return sum;}},0)/1024).toFixed(1);}catch{return null;}};
  for(let panel=1;panel<=3;panel++){
   const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4193/dashboard.html');await page.locator('.item').first().waitFor();
   await page.evaluate(async count=>{
    const {OffsetUI}=await import('./offset-ui.js');
    OffsetUI.prototype.connectBookmarks=async function(){this.book={rules:[],groups:[],rows:Array.from({length:count},(_,i)=>({id:'stress-'+i,url:'https://synthetic.example/'+i,title:'Synthetic bookmark '+i,domain:'synthetic.example',folder:'Folder '+i%20,folderId:String(i%20),group:'待整理',manualGroup:i===0,firstSeen:1700000000000}))};this.render();};
   },count);
   const start=performance.now();await page.locator('[data-mode=bookmarks]').click();await page.locator('[data-pm=connect]').click();await page.locator('.item').first().waitFor();
   const listMs=Math.round(performance.now()-start),list=await measure(page);
   const gridStart=performance.now();await page.locator('[data-pm-layout=gallery]').click();await page.locator('.gallery-card').first().waitFor();const gridMs=Math.round(performance.now()-gridStart),grid=await measure(page);
   await page.locator('[data-pm-layout=list]').click();
   results.push({count,panel,listMs,gridMs,list,grid,threePanelHeapMB:panel===3?+(await Promise.all(pages.map(measure))).reduce((s,m)=>s+m.heapMB,0).toFixed(2):null,browserRSSMB:await rss()});
   console.log(JSON.stringify(results.at(-1)));
  }
  const page=pages[0];for(let i=0;i<10;i++){await page.locator('[data-pm-layout=gallery]').click();await page.locator('[data-pm-layout=list]').click();}
  results.push({count,afterTenSwitches:await measure(page),errors});
 }finally{await browser.close();}
}
fs.writeFileSync(process.env.STRESS_OUTPUT||'docs/offset-live/stress-baseline.json',JSON.stringify({date:new Date().toISOString(),note:'Synthetic bookmarks; local UI with mocked connect; GC before heap samples; RSS sum includes shared pages and may double count; timings include automation and paint.',results},null,2));
