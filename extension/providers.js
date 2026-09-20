import {t} from './i18n.js';
// Fixed official endpoints keep each credential scoped to its provider.
export const PROVIDERS = [
  {id:'deepseek',name:'DeepSeek',model:'deepseek-flash',url:'https://api.deepseek.com/chat/completions'},
  {id:'openai',name:'OpenAI',model:'gpt-4.1-mini',url:'https://api.openai.com/v1/chat/completions'},
  {id:'anthropic',name:'Anthropic · Claude',model:'claude-sonnet-4-6',url:'https://api.anthropic.com/v1/messages'},
  {id:'gemini',name:'Google · Gemini',model:'gemini-3.8-flash',url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'},
  {id:'qwen',name:'通义千问 · 百炼（北京）',model:'qwen-plus',url:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'},
  {id:'moonshot',name:'Kimi · 月之暗面（中国）',model:'kimi-k2.5',url:'https://api.moonshot.cn/v1/chat/completions'}
];
export function providerFor(id='deepseek') {
  const provider=PROVIDERS.find(p=>p.id===id);
  if(!provider) throw new Error(t('不支持的 AI 供应商，请重新选择。'));
  return provider;
}
export function sessionKeys(session) {
  const keys={...(session.apiKeys || {})};
  if(!Object.hasOwn(keys,'deepseek') && session.apiKey) keys.deepseek=session.apiKey;
  return keys;
}
