// Rasterize the supplied vector artwork; the source bundle's PNGs contain broken-image placeholders.
import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const size of [16,32,48,128]){
  const page=await browser.newPage({deviceScaleFactor:1,viewport:{width:size,height:size}});
  const source=new URL(size<=32?'../extension/icons/logo.svg':'../tabkeep-icons/svg/tabkeep.svg',import.meta.url);
  const svg=fs.readFileSync(source,'utf8'),padding=size===128?16:0;
  await page.setContent(`<style>html,body{margin:0;background:transparent}body{padding:${padding}px}svg{display:block;width:${size-padding*2}px;height:${size-padding*2}px}</style>${svg}`);
  await page.screenshot({path:new URL(`../extension/icons/${size}.png`,import.meta.url).pathname,omitBackground:true});
  await page.close();
 }
 console.log('Exported logo PNGs: 16, 32, 48 and 128 px.');
}finally{await browser.close();}
