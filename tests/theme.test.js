import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../extension/theme.js',import.meta.url),'utf8');
function boot({saved=null,dark=false,blocked=false}={}){
 const listeners={},mediaListeners={};
 const values=new Map(saved===null?[]:[['atlas-color-mode-v1',saved]]);
 const localStorage={getItem:key=>{if(blocked)throw Error('blocked');return values.get(key)??null;},setItem:(key,value)=>{if(blocked)throw Error('blocked');values.set(key,value);}};
 const media={matches:dark,addEventListener:(name,fn)=>mediaListeners[name]=fn};
 const document={documentElement:{dataset:{}}};
 const window={matchMedia:()=>media,addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:event=>listeners[event.type]?.(event)};
 vm.runInNewContext(source,{window,document,localStorage,Event});
 return {window,values,data:document.documentElement.dataset,system(dark){media.matches=dark;mediaListeners.change();},storage(value,key='atlas-color-mode-v1',storageArea=localStorage){listeners.storage({key,newValue:value,storageArea});}};
}
test('first launch follows system and reacts to live changes',()=>{
 for(const dark of [false,true]){const app=boot({dark});assert.equal(app.data.colorMode,'system');assert.equal(app.data.colorScheme,dark?'dark':'light');app.system(!dark);assert.equal(app.data.colorScheme,dark?'light':'dark');}
});
test('explicit choices persist and ignore system changes until system is selected',()=>{
 const app=boot();
 for(const mode of ['dark','light']){assert.equal(app.window.atlasColorMode.set(mode),true);app.system(mode==='light');assert.equal(app.data.colorScheme,mode);assert.equal(boot({saved:app.values.get('atlas-color-mode-v1')}).data.colorScheme,mode);}
 app.window.atlasColorMode.set('system');assert.equal(app.data.colorScheme,'dark');app.system(false);assert.equal(app.data.colorScheme,'light');
});
test('cross-window changes and cleared preferences update the mode',()=>{
 const app=boot({dark:true});app.storage('light');assert.equal(app.data.colorScheme,'light');app.storage('dark','irrelevant');assert.equal(app.data.colorMode,'light');app.storage('dark','atlas-color-mode-v1',{});assert.equal(app.data.colorMode,'light');app.storage(null,null);assert.equal(app.data.colorMode,'system');assert.equal(app.data.colorScheme,'dark');
});
test('invalid or unavailable storage falls back to system; switching still works',()=>{
 assert.equal(boot({saved:'invalid'}).data.colorMode,'system');const app=boot({blocked:true,dark:true});assert.equal(app.data.colorScheme,'dark');assert.equal(app.window.atlasColorMode.set('light'),false);assert.equal(app.data.colorScheme,'light');assert.equal(app.data.theme,'offset');
});
