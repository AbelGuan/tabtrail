import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../extension/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))) execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
for(const file of [manifest.background.service_worker,manifest.side_panel.default_path,manifest.options_page,...Object.values(manifest.icons)])if(!fs.existsSync(new URL(file.split(/[?#]/)[0],root)))throw new Error(`Missing ${file}`);
if(manifest.permissions.some(p=>!['tabs','storage','sidePanel','idle','alarms'].includes(p)))throw new Error('Unexpected permission');
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(new URL(file,root),'utf8');if(/<script(?![^>]*src=)[^>]*>/i.test(html)||/\son\w+=/i.test(html))throw new Error(`Inline script in ${file}`);}
console.log('JavaScript syntax, manifest paths, permissions, and CSP-compatible HTML checked.');
// Catch UI removals that leave runtime null dereferences behind.
const dashboard=fs.readFileSync(new URL('dashboard.html',root),'utf8');
const ids=[...dashboard.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate dashboard id');
const code=fs.readFileSync(new URL('dashboard.js',root),'utf8');
for(const [,id] of code.matchAll(/\$\('#([\w-]+)'\)/g))if(!ids.includes(id))throw new Error(`Missing dashboard element #${id}`);
console.log('Dashboard element references and unique IDs checked.');

if(JSON.stringify(manifest.content_scripts)!==JSON.stringify([{matches:['http://*/*','https://*/*'],js:['media.js'],all_frames:true,run_at:'document_idle'}]))throw new Error('Unexpected media script scope');

// Exact ID locators in smoke tests must track the real navigation and dialogs.
for(const file of ['ui-check.mjs','review-check.mjs','extension-check.mjs','language-check.mjs']) {
 const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
 for(const [,id] of source.matchAll(/\.locator\(['"]#([\w-]+)['"]\)/g))
  if(!ids.includes(id))throw new Error(`Missing #${id} referenced by ${file}`);
}
console.log('Browser regression test element references checked.');

for(const language of ['zh_CN','en']) {
 const messages=JSON.parse(fs.readFileSync(new URL(`_locales/${language}/messages.json`,root),'utf8'));
 for(const key of ['extensionName','extensionDescription','actionTitle'])
  if(!messages[key]?.message)throw new Error(`Missing ${language} manifest message: ${key}`);
}
console.log('Chinese and English extension metadata checked.');
