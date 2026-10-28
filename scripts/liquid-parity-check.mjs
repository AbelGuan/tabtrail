import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const production=process.env.PREVIEW_URL||'http://127.0.0.1:4196';
const study=process.env.STUDY_URL||'http://127.0.0.1:4197';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',r=>[production,study].some(base=>r.request().url().startsWith(base+'/'))?r.continue():r.abort());
 const sample=await context.newPage(),formal=await context.newPage();
 await sample.goto(study+'/');await formal.goto(production+'/dashboard.html');
 for(const [view,shape] of [['workspace','folder'],['review','clock'],['history','history'],['smart','spark']]){
  await formal.evaluate(async kind=>{
   const {createLiquidRenderer}=await import('./liquid-art.js');
   window.parityCanvas=document.createElement('canvas');parityCanvas.width=parityCanvas.height=288;
   window.parityRender=createLiquidRenderer(parityCanvas.getContext('2d'),kind);
  },shape);
  for(const time of [0,3,20,10000]){
   const expected=await sample.evaluate(({view,time})=>{
    selectPage(view);const canvas=document.querySelector('canvas.art');canvas.width=canvas.height=288;draw(time);return canvas.toDataURL();
   },{view,time});
   const actual=await formal.evaluate(t=>{parityRender(t);return parityCanvas.toDataURL();},time);
   assert.equal(actual,expected,`${view} at ${time}s must match approved study exactly`);
  }
 }
 console.log('PASS 16 pixel-exact comparisons against approved study, including long-running cache coordinates');
}finally{await browser.close();}
