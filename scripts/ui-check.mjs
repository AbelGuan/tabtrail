import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1512,height:1100}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${process.env.PREVIEW_URL || 'http://127.0.0.1:4187'}/dashboard.html`);
 await page.locator('.tab-row').first().waitFor();
 assert.equal(await page.locator('.tab-row').count(),39);
 assert.equal(await page.locator('.group-card').count(),6);
 // A legacy preview cache must not restore private examples or old group names.
 await page.evaluate(()=>{
  localStorage.setItem('atlas-demo',JSON.stringify({records:[{title:'Legacy private fixture',group:'Legacy group'}],config:{}}));
  localStorage.setItem('atlas-card-layout-v1',JSON.stringify({'Legacy group':{width:400,height:300}}));
  localStorage.setItem('atlas-card-layout-classic-v1',JSON.stringify({'Legacy group':{width:400,height:300}}));
 });
 await page.reload();await page.locator('.tab-row').first().waitFor();
 assert.equal(await page.locator('.tab-row').count(),39);
 assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-demo').includes('Legacy private fixture')),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-card-layout-v1')),null);
 assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-card-layout-classic-v1')),null);

 assert.equal(await page.locator('.domain,.stats,.sidebar,.status-select').count(),0);
 assert.equal(await page.locator('dialog[open]').count(),0);
 // Workspace management is reachable from every primary view.
 for(const id of ['daily-review','continue-browsing','quicklinks']){
  await page.locator('#'+id).click();
  await page.locator('#more-menu summary').click();await page.locator('#workspaces-button').click();
  await page.locator('#workspaces-dialog[open]').waitFor();
  assert.equal(await page.locator('#workspace-list .rule-row').count(),6);
  await page.locator('[data-close="workspaces-dialog"]').click();
 }
 await page.locator('#search-toggle').click();
 await page.locator('#search').fill('音乐');assert.equal(await page.locator('.tab-row').count(),2);
 await page.locator('#search').press('Escape');assert.equal(await page.locator('.tab-row').count(),39);
 await page.locator('.tab-row').first().hover();await page.locator('.tab-more').first().click();
 await page.locator('#tab-form .primary').click();
 await page.reload();await page.locator('.tab-row').first().waitFor();
 await page.locator('#daily-review').click();
 assert.equal(await page.locator('.tab-row').count(),0);assert.equal(await page.locator('#board').isVisible(),false);
 assert.equal(await page.locator('#filters,.history-meta').count(),0);
 assert.match(await page.locator('#recap-summary').textContent(),/标签切换/);assert.equal(await page.locator('#restore-day').isVisible(),false);
 const reviewDate=await page.locator('#day').inputValue();await page.locator('#day').fill('2000-01-01');assert.equal(await page.locator('.tab-row').count(),0);
 await page.locator('#day').fill(reviewDate);assert.equal(await page.locator('.tab-row').count(),0);
 assert.ok((await page.locator('#review-metrics').textContent()).includes('39'));
 assert.equal(await page.locator('#search-toggle').isVisible(),true);
 if(!await page.locator('#search-toolbar').isVisible())await page.locator('#search-toggle').click();
 assert.equal(await page.locator('#search-toolbar').isVisible(),true);
 await page.locator('#search').fill('音乐');
 assert.equal(await page.locator('.tab-row').count(),2);
 assert.equal(await page.locator('#review-metrics strong').first().textContent(),'2');
 assert.match(await page.locator('#recap-summary').textContent(),/匹配 2 \/ 39/);
 await page.locator('#search').fill('no-such-page-123');
 assert.equal(await page.locator('#review-metrics strong').first().textContent(),'0');
 assert.match(await page.locator('#board').textContent(),/没有匹配/);
 await page.locator('#search').press('Escape');
 assert.equal(await page.locator('#board').isVisible(),false);
 assert.equal(await page.locator('#review-metrics strong').first().textContent(),'39');

 await page.locator('#continue-browsing').click();await page.locator('#day').fill(reviewDate);assert.equal(await page.locator('.tab-row').count(),39);
 assert.equal(await page.locator('#reorganize').isVisible(),false);
 await page.locator('#quicklinks').click();assert.equal(await page.locator('.tab-row').count(),39);
 await page.locator('#more-menu summary').click();await page.locator('#rules-button').click();
 await page.locator('#rule-keyword').fill('web-guide');await page.locator('#rule-group').selectOption('开发与技术');
 await page.locator('#rule-save').click();await page.locator('#saved-rules').getByText('web-guide',{exact:true}).waitFor();
 await page.locator('#rule-keyword').fill('research-test');await page.locator('#rule-group').selectOption('');await page.locator('#rule-new-group').fill('研究');await page.locator('#rule-save').click();
 assert.ok((await page.locator('#rule-group option').allTextContents()).includes('研究'));
 const drag=async(from,to)=>{const a=await from.boundingBox(),b=await to.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();};
 await drag(page.getByRole('button',{name:'排序规则：research-test',exact:true}),page.getByRole('button',{name:'排序规则：web-guide',exact:true}));
 assert.equal(await page.locator('#saved-rules .rule-copy strong').first().textContent(),'research-test');
 await page.getByRole('button',{name:'编辑规则：research-test',exact:true}).click();
 await page.locator('#rule-keyword').fill('web-guide');await page.locator('#rule-save').click();
 assert.ok((await page.locator('#toast').textContent()).includes('已有规则'));
 await page.locator('#rule-keyword').fill('research-test');await page.locator('#rule-group').selectOption('音乐与放松');await page.locator('#rule-save').click();
 assert.equal(await page.locator('#saved-rules .rule-copy small').first().textContent(),'音乐与放松');
 await page.getByRole('button',{name:'编辑规则：research-test',exact:true}).click();await page.locator('#rule-group').selectOption('开发与技术');await page.locator('#rule-cancel').click();
 assert.equal(await page.locator('#saved-rules .rule-copy small').first().textContent(),'音乐与放松');
 await page.reload();await page.locator('#more-menu summary').click();await page.locator('#rules-button').click();
 assert.equal(await page.locator('#saved-rules .rule-copy strong').first().textContent(),'research-test');
 await page.getByRole('button',{name:'删除规则：research-test',exact:true}).click();
 assert.equal(await page.locator('#saved-rules .rule-row').count(),1);
 await page.locator('[data-close="rules-dialog"]').click();
 const originalOrder=await page.locator('.card-heading h2').allTextContents();
 await drag(page.locator('.card-drag').nth(1),page.locator('.card-drag').first());
 assert.equal(await page.locator('.card-heading h2').first().textContent(),originalOrder[1]);
 await page.reload();await page.locator('.tab-row').first().waitFor();
 assert.equal(await page.locator('.card-heading h2').first().textContent(),originalOrder[1]);
 await page.locator('.card-drag').first().press('ArrowRight');
 assert.deepEqual(await page.locator('.card-heading h2').allTextContents(),originalOrder);
 await page.locator('#more-menu summary').click();await page.locator('#settings-shortcut').click();
 await page.locator('#ai-provider').selectOption('openai');assert.equal(await page.locator('#model').inputValue(),'gpt-4.1-mini');
 await page.locator('#test-connection').click();assert.ok((await page.locator('#connection-result').textContent()).includes('示例预览'));
 await page.locator('#ai-provider').selectOption('deepseek');

 await page.locator('#excluded').fill('mail.google.com');
 await page.locator('#settings-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelectorAll('.tab-row').length===36);
 await page.locator('#quicklinks').click();
 assert.equal(await page.locator('.tab-row').count(),36);
 await page.locator('#quicklinks').click();assert.equal(await page.locator('.tab-row').count(),36);
 await page.evaluate(()=>localStorage.removeItem('atlas-demo'));await page.reload();
 await page.locator('.tab-row').first().waitFor();
 fs.mkdirSync('docs',{recursive:true});await page.screenshot({path:'docs/dashboard-preview.png',fullPage:true});
 assert.ok(await page.evaluate(()=>{const cards=[...document.querySelectorAll('.group-card')];return cards.slice(0,3).every(e=>e.getBoundingClientRect().top===cards[0].getBoundingClientRect().top)&&cards[3].getBoundingClientRect().top>cards[0].getBoundingClientRect().top;}),'three columns on desktop');
 assert.ok(await page.locator('.tab-link').first().evaluate(e=>e.getBoundingClientRect().height<=50),'compact label height');
 const card=page.locator('.group-card').first();const before=await card.boundingBox();
 const handle=await page.locator('.card-resize').first().boundingBox();
 await page.mouse.move(handle.x+11,handle.y+11);await page.mouse.down();await page.mouse.move(handle.x+111,handle.y-89,{steps:8});await page.mouse.up();
 const resized=await card.boundingBox();assert.ok(resized.width>before.width+80,'drag increases width');assert.ok(resized.height<before.height-80,'drag decreases height');
 assert.ok(await card.locator('.card-items').evaluate(e=>e.scrollHeight>e.clientHeight),'short card scrolls');
 await card.locator('.card-scrollbar').waitFor({state:'visible'});
 assert.ok(await card.locator('.card-scroll-thumb').isVisible(),'overflow scrollbar stays visible');
 await page.screenshot({path:'docs/dashboard-resized.png',fullPage:false});
 await card.locator('.card-items').evaluate(e=>{e.scrollTop=e.scrollHeight;});
 assert.ok(await card.locator('.card-items').evaluate(e=>e.scrollTop>0),'overflow labels are reachable');
 await card.locator('.card-scroll-thumb').focus();await page.keyboard.press('Home');
 assert.equal(await card.locator('.card-items').evaluate(e=>e.scrollTop),0);
 await page.keyboard.press('End');assert.ok(await card.locator('.card-items').evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<2),'scrollbar reaches final label');
 await page.reload();await page.locator('.tab-row').first().waitFor();
 const restored=await card.boundingBox();assert.ok(Math.abs(restored.width-resized.width)<2&&Math.abs(restored.height-resized.height)<2,'sizes persist after reload');
 await page.locator('#search-toggle').click();await page.locator('#search').fill('音乐');await page.locator('#search').press('Escape');
 assert.ok(Math.abs((await card.boundingBox()).width-resized.width)<2,'sizes survive filtering');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'resized card fits mobile');
 await page.setViewportSize({width:1512,height:1100});
 await page.locator('.card-resize').first().focus();await page.keyboard.press('ArrowRight');
 assert.ok((await card.boundingBox()).width>restored.width+8,'keyboard resizes');
 await page.keyboard.press('Home');assert.ok(Math.abs((await card.boundingBox()).width-before.width)<2,'Home resets size');
 await page.locator('#more-menu summary').click();await page.locator('#reset-layout').click();
 await page.locator('#search-toggle').click();
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
 await page.screenshot({path:'docs/dashboard-mobile.png',fullPage:true});
 // Theme switching preserves content, filters and independent card dimensions.
 await page.setViewportSize({width:1512,height:1100});
 await page.locator('#theme-toggle').click();
 assert.equal(await page.locator('.tab-row').count(),39);
 assert.equal(await card.evaluate(e=>getComputedStyle(e).borderRadius),'0px');
 assert.equal(await page.locator('.tab-url').first().isVisible(),false);
 const classicSize=await card.boundingBox();
 await card.locator('.card-resize').focus();await page.keyboard.press('ArrowRight');
 const classicResized=await card.boundingBox();assert.ok(classicResized.width>classicSize.width+8);
 await page.locator('#theme-toggle').click();
 assert.ok(Math.abs((await card.boundingBox()).width-before.width)<2,'rounded layout preserved');
 await page.locator('#theme-toggle').click();
 assert.ok(Math.abs((await card.boundingBox()).width-classicResized.width)<2,'classic layout preserved');
 await page.reload();await page.locator('.tab-row').first().waitFor();
 assert.equal(await page.locator('#theme-toggle').getAttribute('data-current'),'classic','theme persists on reload');
 await page.locator('.card-resize').first().focus();await page.keyboard.press('Home');
 await page.screenshot({path:'docs/dashboard-classic.png',fullPage:true});
 await page.locator('#search-toggle').click();await page.locator('#search').fill('音乐');
 await page.locator('#theme-toggle').click();
 assert.equal(await page.locator('.tab-row').count(),2,'switch keeps search');
 await page.locator('#theme-toggle').click();
 await page.locator('#search').press('Escape');
 assert.equal(await page.locator('.tab-row').count(),39);
 await page.locator('#quicklinks').click();
 await page.locator('#daily-review').click();
 assert.equal(await page.locator('#recap').isVisible(),true);assert.equal(await page.locator('.tab-row').count(),0);
 await page.locator('#quicklinks').click();
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'classic fits '+width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'docs/dashboard-classic-mobile.png',fullPage:true});
 await page.evaluate(()=>localStorage.setItem('atlas-theme-v1','unknown'));
 await page.reload();await page.locator('.tab-row').first().waitFor();
 assert.equal(await page.locator('#theme-toggle').getAttribute('data-current'),'rounded','invalid preference uses original theme');
 assert.deepEqual(errors,[]);
 console.log('Reference UI passed: 39 labels, three desktop columns, search, page details, rules, exclusion, mobile width.');
 // Run the actual dashboard and AI module against a mocked Chrome boundary.
 const live=await browser.newPage({viewport:{width:1512,height:1100}});live.on('pageerror',error=>errors.push(error.message));
 await live.addInitScript(()=>{
  const day=new Date().toLocaleDateString('sv-SE');
  const saved=JSON.parse(sessionStorage.getItem('mock-state')||'null');
  window.mock=saved||{records:[{id:'one',day,url:'https://example.com/a',domain:'example.com',title:'Video research',group:'待整理',firstSeen:Date.now(),activations:0}],tabs:[{id:1,url:'https://example.com/a'}],today:day,hasKey:true,config:{recording:true,model:'test-model',excluded:[],rules:[]}};
  const listeners=[],storageListeners=[];window.getCalls=0;
  window.changed=(info={status:'complete'})=>listeners.forEach(fn=>fn(0,info));
  window.updateRecords=mutate=>{const oldValue=structuredClone(mock.records);mutate(mock.records);storageListeners.forEach(fn=>fn({records:{oldValue,newValue:structuredClone(mock.records)}},'local'));};
  const event={addListener:fn=>listeners.push(fn)};
  window.chrome={storage:{onChanged:{addListener:fn=>storageListeners.push(fn)}},runtime:{id:'test',sendMessage:async msg=>{
   if(msg.type==='get'){getCalls++;updateRecords(records=>records.forEach(r=>r.lastSeen=Date.now()));return {value:structuredClone(window.mock)};}
   if(msg.type==='settings'){
    const {assertSettingsCurrent}=await import('./core.js');
    try{assertSettingsCurrent(mock.config,msg.expectedSettings);}catch(e){return {error:e.message};}
    Object.assign(mock.config,msg.value);return {value:true};
   }
   if(msg.type==='jumpVisit'){window.lastReviewJump=msg;return {value:true};}
   if(msg.type==='applyRules')return {value:{matched:0}};
   if(msg.type==='getKey')return {value:'mock-key'};
   if(msg.type==='assign')for(const a of msg.assignments){const r=window.mock.records.find(r=>r.id===a.id);if(r&&r.title===a.baseTitle&&r.group===a.baseGroup){r.group=a.group;r.aiTitle=r.title;}}
   sessionStorage.setItem('mock-state',JSON.stringify(window.mock));return {value:true};
  }},tabs:{onCreated:event,onRemoved:event,onUpdated:event}};
 });
 let calls=0;
 await live.route('https://api.deepseek.com/chat/completions',async route=>{
   calls++;const payload=JSON.parse(route.request().postData());const data=JSON.parse(payload.messages[1].content);
   assert.equal(data.tabs.length,1);
   if(calls===2)assert.ok(data.existingWorkspaces.includes('视频研究'));
   await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({assignments:data.tabs.map(t=>({id:t.id,group:'视频研究'})),suggestedRules:[{keyword:'Video',group:'视频研究'}]})}}]})});
 });
 await live.goto(`${process.env.PREVIEW_URL || 'http://127.0.0.1:4187'}/dashboard.html`);
 await live.waitForFunction(()=>document.querySelector('.card-heading h2')?.textContent==='视频研究');
 assert.equal(calls,1);assert.equal(await live.locator('dialog[open]').count(),0);
 await live.reload();await live.waitForFunction(()=>document.querySelector('.card-heading h2')?.textContent==='视频研究');
 await live.evaluate(()=>{const r={...mock.records[0],id:'two',url:'https://example.com/b',title:'Video editing',group:'待整理',aiTitle:''};mock.records.push(r);mock.tabs.push({id:2,url:r.url});changed();});
 await live.waitForFunction(()=>window.mock.records[1].group==='视频研究');
 assert.equal(calls,2);
 await live.evaluate(()=>{mock.tabs=mock.tabs.filter(t=>t.id===2);changed();});
 await live.waitForFunction(()=>document.querySelectorAll('.tab-row').length===1);
 assert.equal(calls,2);assert.equal(await live.locator('dialog[open]').count(),0);
 // A title-only change must request fresh classification without a navigation event.
 await live.evaluate(()=>{mock.records[1].title='New topic title';changed({title:'New topic title'});});
 await live.waitForFunction(()=>mock.records[1].aiTitle==='New topic title');assert.equal(calls,3);
 await live.waitForFunction(()=>document.querySelector('#organize-progress').textContent.includes('整理完成'));
 // Simulate another panel saving workspace ownership.
 await live.evaluate(()=>updateRecords(records=>Object.assign(records[1],{group:'远端修改',manualGroup:true})));
 await live.waitForFunction(()=>document.querySelector('.card-heading h2')?.textContent==='远端修改');
 assert.equal(await live.locator('.tab-row').count(),1);
 // A change arriving while a dialog is open must be loaded after it closes.
 await live.locator('#more-menu summary').click();await live.locator('#rules-button').click();
 await live.evaluate(()=>updateRecords(records=>records[1].group='弹窗期间更新'));
 await live.waitForTimeout(350);
 await live.locator('[data-close="rules-dialog"]').click();
 await live.waitForFunction(()=>document.querySelector('.card-heading h2')?.textContent==='弹窗期间更新');
 await live.waitForTimeout(2500);const settled=await live.evaluate(()=>getCalls);
 await live.waitForTimeout(2500);assert.equal(await live.evaluate(()=>getCalls),settled,'timestamp writes must not cause a refresh loop');
 assert.equal(calls,3,'storage synchronization must not repeat cached AI requests');
 assert.deepEqual(errors,[]);
 // Keep an old form open while a second panel changes privacy settings.
 await live.locator('#more-menu summary').click();await live.locator('#settings-shortcut').click();
 await live.evaluate(()=>{mock.config.recording=false;mock.config.excluded=['private.test'];});
 await live.locator('#model').fill('new-model');await live.locator('#save-settings').click();
 await live.waitForFunction(()=>document.querySelector('#toast').textContent.includes('其他窗口'));
 assert.equal(await live.locator('#settings-dialog').evaluate(e=>e.open),true);
 assert.deepEqual(await live.evaluate(()=>[mock.config.recording,mock.config.excluded]),[false,['private.test']]);
 await live.locator('[data-close="settings-dialog"]').click();
 await live.locator('#more-menu summary').click();await live.locator('#settings-shortcut').click();
 assert.equal(await live.locator('#recording').isChecked(),false);
 await live.locator('#model').fill('new-model');await live.locator('#save-settings').click();
 await live.waitForFunction(()=>!document.querySelector('#settings-dialog').open);
 assert.equal(await live.evaluate(()=>mock.config.model),'new-model');
 // Review passes the stored visit identity even when the daily page no longer exists.
 await live.evaluate(()=>{const start=new Date(`${mock.today}T09:00:00`).getTime();mock.visits=[{day:mock.today,visit:'orphan',chain:'one',url:'https://orphan.test/',domain:'orphan.test',title:'Retained page',group:'研究',start,end:start+60000}];mock.records=[];mock.tabs=[];});
 await live.locator('#daily-review').click();await live.locator('.rv-swim-segment').click();
 await live.locator('.rv-page-link').click();
 assert.equal(await live.evaluate(()=>lastReviewJump.visit),'orphan');
 assert.equal(await live.evaluate(()=>lastReviewJump.url),'https://orphan.test/');
 assert.deepEqual(errors,[]);
 console.log('Automatic AI browser flow passed with mocked Chrome/network: initial call, cached revisit, incremental new tab, existing workspace reuse, immediate closed-tab removal, title-only changes, cross-panel state, dialog deferral, no refresh loop.');
} finally {await browser.close();}
