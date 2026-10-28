// Runs only in a disposable profile with synthetic tabs/bookmarks.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {defaults,dayKey} from '../extension/core.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pickmark-mv3-')),root=path.resolve(import.meta.dirname,'..');
fs.cpSync(path.join(root,'extension'),path.join(temp,'extension'),{recursive:true});
// Pregrant optional bookmarks ONLY in the test copy; never touch a user's profile.
const manifestPath=path.join(temp,'extension/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
manifest.permissions.push('bookmarks');manifest.optional_permissions=[];fs.writeFileSync(manifestPath,JSON.stringify(manifest));
const context=await chromium.launchPersistentContext(path.join(temp,'profile'),{executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,ignoreDefaultArgs:['--disable-extensions'],args:[`--load-extension=${temp}/extension`,`--disable-extensions-except=${temp}/extension`,'--disable-background-networking'],viewport:{width:1440,height:1000},locale:'zh-CN'});
try{
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('chrome-extension:')||url.startsWith('data:'))return route.continue();if(url.startsWith('https://fixture.test/'))return route.fulfill({contentType:'text/html',body:'<title>Synthetic page</title><h1>Isolated fixture</h1>'});return route.abort();});
 let worker=context.serviceWorkers()[0];if(!worker)worker=await context.waitForEvent('serviceworker');const origin='chrome-extension://'+new URL(worker.url()).hostname;
 const tab=await context.newPage();await tab.goto('https://fixture.test/open');
 const page=await context.newPage();await page.goto(origin+'/dashboard.html');await page.locator('#mono-hero h1').waitFor();
 await page.evaluate(()=>chrome.runtime.sendMessage({type:'get'}));
 await worker.evaluate(async({config,day})=>{
  const keys=Object.keys(await chrome.storage.local.get(null));await chrome.storage.local.remove(keys);
  const data={config:{...config,recording:true},lastCleanupAt:Date.now(),records:[{id:'human',day,url:'https://fixture.test/open',domain:'fixture.test',title:'Synthetic manual',group:'Protected',manualGroup:true}],visits:[],
   'pickmark-bookmarks-v1':{metadata:{},groups:['Saved'],rules:[]},
   'pickmark-thumbnails-v1':{padding:'x'.repeat(1000000)}};
  const folder=await chrome.bookmarks.create({title:'Synthetic only'});await chrome.bookmarks.create({parentId:folder.id,title:'Synthetic bookmark',url:'https://fixture.test/bookmark'});
  const metadata=data['pickmark-bookmarks-v1'].metadata;
  for(let i=0;i<20000;i++)metadata[i]={url:'https://bookmark.test/'+String(i).padEnd(330,'x'),group:'Saved',manualGroup:true};
  const bytes=()=>Object.entries(data).reduce((n,[k,v])=>n+new TextEncoder().encode(k).length+new TextEncoder().encode(JSON.stringify(v)).length,0);
  metadata['19999'].url+='x'.repeat(10*1024*1024-128*1024-32-bytes());
  await chrome.storage.local.set(data);
 },{config:defaults(),day:dayKey(Date.now()-86400000)});
 await page.reload();await page.locator('#storage-warning').waitFor();await page.locator('[data-row="human"]').waitFor();
 assert.match(await page.locator('[data-row="human"]').innerText(),/Protected/);
 await page.locator('#storage-warning button').click();await page.locator('#storage-controls').waitFor();
 await page.waitForFunction(()=>document.querySelector('#storage-summary').textContent.includes('MB'));
 assert.equal(await page.locator('#clear-preview-cache').isEnabled(),true);
 await page.locator('[data-mode="bookmarks"]').click();await page.locator('[data-pm-view="folders"]').click();
 await page.locator('#mono-list').filter({hasText:'Synthetic bookmark'}).waitFor();
 await page.locator('#storage-warning button').click();await page.locator('#storage-controls').waitFor();
 page.once('dialog',dialog=>dialog.accept());await page.locator('#clear-preview-cache').click();
 await page.locator('#storage-warning').waitFor({state:'hidden'});
 const saved=await worker.evaluate(async()=>await chrome.storage.local.get(['records','pickmark-bookmarks-v1']));
 assert.ok(saved.records.some(r=>r.manualGroup&&r.group==='Protected'));
 assert.equal(Object.keys(saved['pickmark-bookmarks-v1'].metadata).length,20000);
 const newTab=await context.newPage();await newTab.goto('https://fixture.test/after-cleanup');
 await page.waitForFunction(async()=>(await chrome.storage.local.get('records')).records.some(r=>r.url==='https://fixture.test/after-cleanup'));
 const recovered=await page.evaluate(()=>chrome.runtime.sendMessage({type:'get'}));assert.equal(recovered.value.storageWarning,undefined);assert.equal(recovered.value.config.recording,true);
 assert.ok(recovered.value.records.some(r=>r.url==='https://fixture.test/open'&&r.manualGroup&&r.group==='Protected'));
 console.log('PASS quota UI: saved manual row, settings, storage stats, synthetic bookmarks, cache cleanup and new tab recording recovery in disposable MV3 profile.');
}finally{await context.close();fs.rmSync(temp,{recursive:true,force:true});}

