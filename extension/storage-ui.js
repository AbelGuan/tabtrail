import {getLanguage} from './i18n.js';
const L=(zh,en)=>getLanguage()==='en'?en:zh;
export function storageUI({send,reload,toast,clearPreviews}){
 const root=document.createElement('section');root.id='storage-controls';
 document.querySelector('#recording').closest('label').nextElementSibling.replaceWith(root);
 root.innerHTML=`<h3>${L('数据与存储','Data and storage')}</h3><label>${L('记录保留时间','History retention')}<select id="retention-days"><option value="30">${L('30 天（默认）','30 days (default)')}</option><option value="14">${L('14 天','14 days')}</option><option value="7">${L('7 天','7 days')}</option></select></label><p class="help">${L('每天自动维护；关闭或休眠后下次启动补做。达到条数或容量上限时可能提前清理。当前标签状态、书签和分类规则保留。','Daily maintenance resumes after startup or sleep. Count and size limits may shorten retention. Current tab state, bookmarks and rules are preserved.')}</p><p id="storage-summary" class="help" role="status"></p><div class="connection-actions"><button type="button" id="clear-preview-cache">${L('清理预览缓存','Clear preview cache')}</button><select id="cleanup-days" aria-label="${L('旧记录范围','Old history range')}"><option value="7">${L('7 天以前','Older than 7 days')}</option><option value="14">${L('14 天以前','Older than 14 days')}</option><option value="30">${L('30 天以前','Older than 30 days')}</option></select><button type="button" id="clear-old-history">${L('清理旧记录','Clear old history')}</button></div>`;
 const clear=document.querySelector('#clear-data');clear.textContent=L('清空回顾记录','Clear review history');root.append(clear);
 const cleanupActions=root.querySelector('.connection-actions');
 for(const [id,controls] of [['cache',['clear-preview-cache']],['old',['cleanup-days','clear-old-history']],['all',['clear-data']]]){
  const section=document.createElement('div');section.className='storage-action';section.dataset.cleanup=id;
  section.innerHTML='<h4></h4><p class="help"></p><div class="storage-action-controls"></div>';
  for(const control of controls)section.lastElementChild.append(root.querySelector('#'+control));
  root.append(section);
 }
 cleanupActions.remove();
 function actionLabels(){
  const labels={cache:[L('网页预览缓存','Page preview cache'),L('只删除已保存的缩略图，不影响页面记录和分类。','Removes saved thumbnails only; history and classifications stay intact.')],old:[L('清理较早的记录','Remove older history'),L('选择时间范围后清理；删除的记录将无法回顾或补分类。','Choose an age range. Removed history cannot be revisited or classified.')],all:[L('清空全部回顾记录','Remove all review history'),L('保留当前标签的分类、书签和规则。执行前会显示删除范围并再次确认。','Keeps current tab classifications, bookmarks and rules. Review the scope and confirm before deletion.')]};
  for(const section of root.querySelectorAll('.storage-action')){const [title,help]=labels[section.dataset.cleanup];section.querySelector('h4').textContent=title;section.querySelector('p').textContent=help;}
  root.querySelector('#cleanup-days').setAttribute('aria-label',L('旧记录范围','Old history range'));
 }
 actionLabels();
 async function refresh(config){
  if(config)root.querySelector('#retention-days').value=String(config.retentionDays||30);
  const info=await send({type:'storageInfo'});
  root.querySelector('#storage-summary').textContent=L(`页面记录 ${info.records} · 停留片段 ${info.visits} · 本地存储 ${(info.bytes/1048576).toFixed(2)} MB · 最近维护：${info.lastCleanupAt?new Date(info.lastCleanupAt).toLocaleString():'—'}`,`Pages ${info.records} · Visits ${info.visits} · Local storage ${(info.bytes/1048576).toFixed(2)} MB · Last maintenance: ${info.lastCleanupAt?new Date(info.lastCleanupAt).toLocaleString():'—'}`);
 }
 const impact=p=>L(`将删除 ${p.records} 条页面记录、${p.visits} 段停留记录${p.from?'（'+p.from+' 至 '+p.to+'）':''}。当前打开标签的分类、书签和规则保留；已删除日期无法回顾或补分类。继续？`,`Remove ${p.records} page records and ${p.visits} visits${p.from?' ('+p.from+' to '+p.to+')':''}? Current tab classifications, bookmarks and rules remain. Deleted history cannot be reviewed or classified.`);
 let busy=false;
 async function clean(mode){
  if(busy)return;busy=true;
  try{
   const days=Number(root.querySelector('#cleanup-days').value),scope={mode,days};
   const p=await send({type:'cleanupPreview',...scope});
   if(!confirm(mode==='cache'?L(`清理 ${p.thumbnails} 张缓存缩略图？分类和记录不受影响。`,`Clear ${p.thumbnails} cached previews? Classifications and history remain.`):impact(p)))return;
   await send({type:'cleanup',...scope});clearPreviews();await reload();await refresh();toast(L('清理完成。','Cleanup complete.'));
  }catch(e){toast(e.message);}finally{busy=false;}
 }
 root.querySelector('#clear-preview-cache').onclick=()=>clean('cache');root.querySelector('#clear-old-history').onclick=()=>clean('old');clear.onclick=()=>clean('all');
 function translate(){
  actionLabels();
  root.querySelector('h3').textContent=L('数据与存储','Data and storage');
  root.querySelector('label').firstChild.textContent=L('记录保留时间','History retention');
  for(const o of root.querySelectorAll('#retention-days option'))o.textContent=o.value==='30'?L('30 天（默认）','30 days (default)'):L(`${o.value} 天`,`${o.value} days`);
  root.querySelector('p.help').textContent=L('每天自动维护；关闭或休眠后下次启动补做。达到条数或容量上限时可能提前清理。当前标签状态、书签和分类规则保留。','Daily maintenance resumes after startup or sleep. Count and size limits may shorten retention. Current tab state, bookmarks and rules are preserved.');
  root.querySelector('#clear-preview-cache').textContent=L('清理预览缓存','Clear preview cache');root.querySelector('#clear-old-history').textContent=L('清理旧记录','Clear old history');clear.textContent=L('清空回顾记录','Clear review history');
  for(const o of root.querySelectorAll('#cleanup-days option'))o.textContent=L(`${o.value} 天以前`,`Older than ${o.value} days`);
  void refresh().catch(e=>toast(e.message));
 }
 return {refresh,translate,get days(){return Number(root.querySelector('#retention-days').value);},async confirmRetention(days,current){if(days>=current)return true;return confirm(impact(await send({type:'cleanupPreview',mode:'old',days})));}};
}
