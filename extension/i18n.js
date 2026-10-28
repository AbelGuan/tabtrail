import {english} from './translations.js';
export const LANGUAGE_KEY='atlas-language-v1';
export function preferredLanguage(saved,systemLanguage){
 if(saved==='zh'||saved==='en')return saved;
 return /^zh(?:[-_]|$)/i.test(systemLanguage||'zh')?'zh':'en';
}
export function systemLanguage(){
 return globalThis.chrome?.i18n?.getUILanguage?.()||globalThis.navigator?.language||'zh';
}
let savedLanguage;
try { savedLanguage=globalThis.localStorage?.getItem(LANGUAGE_KEY); } catch {}
let language=preferredLanguage(savedLanguage,systemLanguage());
export const getLanguage=()=>language;
export const locale=()=>language==='en'?'en-US':'zh-CN';
export function setLanguage(value){language=value==='en'?'en':'zh';}
// Supports both plain messages and tagged templates; interpolated user data is
// inserted after translation and is never used as a translation lookup key.
export function t(message,...values){
 const key=Array.isArray(message)?message.reduce((s,part,i)=>s+(i?`{${i-1}}`:'')+part,''):message;
 const translated=language==='en'?(english[key]??key):key;
 return values.length?translated.replace(/\{(\d+)\}/g,(match,index)=>index<values.length?String(values[index]):match):translated;
}
export const workspaceLabel=name=>name==='待整理'?t('待整理'):name;
// Capture static HTML before rendering dynamic/user content. Keep option values
// stable so changing the UI language cannot change stored selections.
export function staticTranslations(root){
 const texts=[],attributes=[];
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let node;node=walker.nextNode();){
  const key=node.nodeValue.trim();
  if(english[key]){
   if(node.parentElement?.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))node.parentElement.value=key;
   texts.push({node,key,before:node.nodeValue.match(/^\s*/)[0],after:node.nodeValue.match(/\s*$/)[0]});
  }
 }
 for(const node of root.querySelectorAll('[title],[aria-label],[placeholder],[alt]'))
  for(const name of ['title','aria-label','placeholder','alt']){const key=node.getAttribute(name);if(english[key])attributes.push({node,name,key});}
 return ()=>{
  for(const {node,key,before,after}of texts)if(node.isConnected)node.nodeValue=before+t(key)+after;
  for(const {node,name,key}of attributes)if(node.isConnected)node.setAttribute(name,t(key));
  document.documentElement.lang=locale();
 };
}
