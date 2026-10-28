import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const b=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'});const base='http://127.0.0.1:4193';await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await p.goto(base+'/dashboard.html');await p.locator('.item').first().waitFor();
 await p.evaluate(async()=>{const {OffsetUI}=await import('./offset-ui.js');OffsetUI.prototype.connectBookmarks=async function(){this.book={rules:[{keyword:'fixture',group:'自动分类'}],groups:[],rows:Array.from({length:1000},(_,i)=>({id:'test-'+i,url:'https://fixture.test/'+i,title:'fixture '+i,domain:'fixture.test',folder:'模拟',group:i===0?'人工收藏':'待整理',manualGroup:i===0}))};this.render();};const cache={thumbnails:new Map()};for(let i=0;i<100;i++)OffsetUI.prototype.cacheThumbnail.call(cache,String(i),null);if(cache.thumbnails.size!==20)throw Error('unbounded preview cache');});
 await p.locator('[data-mode=bookmarks]').click();await p.locator('[data-pm=connect]').click();assert.equal(await p.locator('.item').count(),100);
 await p.locator('[data-pm-page="1"]').click();assert.ok(await p.locator('[data-row="test-100"]').isVisible());await p.locator('[data-pm-actions="test-100"]').click();await p.locator('#mono-row-menu [data-pm-edit]').click();await p.locator('#mono-book-group').fill('手动第二页');await p.locator('#mono-book-dialog .primary').click();
 await p.locator('[data-pm-layout=gallery]').click();assert.equal(await p.locator('.gallery-card').count(),100);await p.locator('[data-pm-layout=list]').click();
 await p.locator('[data-pm=organize]').click();assert.match(await p.locator('[data-row="test-100"]').innerText(),/手动第二页/);
 await p.locator('#mono-search-toggle').click();await p.locator('#search').fill('fixture 999');await p.waitForTimeout(100);assert.equal(await p.locator('.item').count(),1);assert.match(await p.locator('.item').innerText(),/自动分类/);
 await p.locator('#search').fill('nothing matches');await p.waitForTimeout(100);assert.equal(await p.locator('.item').count(),0);assert.ok(await p.locator('.empty').isVisible());console.log('PASS pagination bounds, second-page manual edit, full-result classification/search, grid and cache bound');
}finally{await b.close();}
