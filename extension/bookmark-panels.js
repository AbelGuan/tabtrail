import {E} from './offset-icons.js';
import {groupIcon,groupIconChoices,groupIconLabel} from './group-icons.js';
import {sortableHandle,iconButton} from './controls.js';
import {parseRuleBackup,mergeRuleBackup,exportRuleBackup} from './rule-transfer.js';
import {getLanguage} from './i18n.js';
import {UNGROUPED} from './core.js';
const L=(zh,en)=>getLanguage()==='en'?en:zh;
const $=s=>document.querySelector(s);
export function renderBookmarkPanel(ui,view){
 const target=$('#mono-panel'),book=ui.book;
 if(!book){target.innerHTML=`<div class="empty"><p>${L('请先连接书签','Connect bookmarks first')}</p><button class="primary" data-pm="connect">${L('连接书签','Connect bookmarks')}</button></div>`;return;}
 const revision=book.revision||0,groups=[...new Set([...book.groups,...book.rows.map(r=>r.group),...book.rules.map(r=>r.group)])].filter(g=>g!==UNGROUPED);
 const send=(action,data)=>ui.bookSend(action,{...data,expectedRevision:revision});
 const safe=fn=>async(...args)=>{try{await fn(...args);}catch(e){ui.api.toast(e.message);}};
 const options=selected=>groups.map(g=>`<option ${g===selected?'selected':''} value="${E(g)}">${E(g)}</option>`).join('');
 const sort=(row,container,action,source)=>{const handle=iconButton('grip',L('调整优先级','Reorder'),'drag-handle');row.prepend(handle);sortableHandle({handle,item:row,container,selector:'.rule-row',onBusy:()=>{},onMove:safe(async(from,to)=>{await send(action,action==='reorderRules'?{keyword:from,target:to}:{source:from,target:to});const list=$('#mono-panel');[...list.querySelectorAll('.rule-row')].find(r=>r.dataset.sortKey===from)?.querySelector('.drag-handle')?.focus();})});row.dataset.sortKey=source;};
 if(view==='manage'){
  target.innerHTML=`<p class="help">${L('仅管理书签智能分类，不移动原文件夹，不删除浏览器书签。','Manage bookmark categories only. Original folders and bookmarks stay intact.')}</p><div id="book-group-list"></div><form id="book-group-create"><label>${L('新建分类','New category')}<input id="book-group-name" required maxlength="40"></label><button class="primary">${L('新建','Create')}</button></form>`;
  const list=$('#book-group-list');
  if(!groups.length)list.innerHTML=`<p class="help">${L('还没有分类，可在下方新建。','No categories yet. Create one below.')}</p>`;
  for(const name of groups){
   const row=document.createElement('div');row.className='rule-row book-group-row';
   row.innerHTML=`<span class="book-group-icon">${groupIcon(name,book.icons?.[name])}</span><div class="rule-copy"><button class="workspace-name"><strong>${E(name)}</strong></button><small>${book.rows.filter(r=>r.group===name).length} ${L('条书签','bookmarks')} · ${book.rules.filter(r=>r.group===name).length} ${L('条规则','rules')}</small></div><details class="workspace-menu"><summary aria-label="${E(L('分类操作：','Category actions: ')+name)}">···</summary><div class="workspace-menu-actions">${[['rename','重命名','Rename'],['icon','更换图标','Change icon'],['merge','合并到…','Merge into…'],['delete','删除','Delete']].map(([key,zh,en])=>`<button data-book-action="${key}">${L(zh,en)}</button>`).join('')}</div></details>`;
   list.append(row);sort(row,list,'reorderGroups',name);
   const rename=()=>{const button=row.querySelector('.workspace-name');if(!button)return;const input=document.createElement('input');input.value=name;input.maxLength=40;input.className='book-rename';input.setAttribute('aria-label',L('新名称','New name'));button.replaceWith(input);input.focus();input.select();let saving=false;const cancel=()=>{if(!saving){input.replaceWith(button);button.focus();}};input.onblur=cancel;input.onkeydown=safe(async e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();cancel();}if(e.key==='Enter'&&!saving){e.preventDefault();if(input.value.trim()===name)return cancel();saving=true;input.disabled=true;try{await send('workspace',{action:'rename',name,target:input.value});}finally{saving=false;input.disabled=false;}}});};
   row.querySelector('.workspace-name').onclick=rename;
   const menu=row.querySelector('details');menu.ontoggle=()=>{if(menu.open)list.querySelectorAll('details').forEach(d=>{if(d!==menu)d.open=false;});};menu.onkeydown=e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}};
   row.querySelectorAll('[data-book-action]').forEach(button=>button.onclick=()=>{
    menu.open=false;const action=button.dataset.bookAction;if(action==='rename')return rename();
    if(action==='icon')return ui.bookDialog(L('更换图标','Change icon'),`<div class="book-icon-picker">${groupIconChoices.map(choice=>`<label>${groupIcon(name,choice)}<input type="radio" name="book-icon" value="${choice}" ${(book.icons?.[name]||'auto')===choice?'checked':''}><span>${groupIconLabel(choice,getLanguage())}</span></label>`).join('')}</div>`,()=>send('workspace',{action:'icon',name,icon:$('#mono-book-dialog input[name="book-icon"]:checked').value}));
    if(action==='merge'&&!groups.some(g=>g!==name))return ui.api.toast(L('请先新建一个目标分类','Create another category first'));
    ui.bookDialog(L(action==='merge'?'合并分类':'删除分类',action==='merge'?'Merge category':'Delete category'),`<p>${E(name)}</p><p class="help">${L(action==='merge'?'迁移书签分类与规则，保留人工调整；原文件夹不变。':'分类与规则归入待整理，不删除书签；人工调整仍受保护。',action==='merge'?'Move classification and rules; preserve manual choices and original folders.':'Move to Unclassified. Bookmarks are not deleted; manual choices remain protected.')}</p>${action==='merge'?`<label>${L('目标分类','Target category')}<select id="book-merge-target">${groups.filter(g=>g!==name).map(g=>`<option value="${E(g)}">${E(g)}</option>`).join('')}</select></label>`:''}`,()=>send('workspace',{action,name,target:action==='merge'?$('#book-merge-target').value:UNGROUPED}));
   });
  }
  $('#book-group-create').onsubmit=safe(async e=>{e.preventDefault();await send('workspace',{action:'create',name:$('#book-group-name').value});});
  return;
 }
 target.innerHTML=`<p class="rules-intro">${L('仅在本地匹配书签标题或域名。已有分类、人工调整和原文件夹保持不变。','Match bookmark titles or domains locally. Keep existing categories, manual choices and original folders.')}</p><div class="rules-layout"><section><div class="rules-section-heading"><h3>${L('已保存的规则','Saved rules')}</h3><span>${book.rules.length}</span></div>${book.rules.length>1?`<p class="help">${L('从上到下匹配。拖动左侧手柄，或聚焦后用方向键排序。','First match wins. Drag a handle or focus it and use arrow keys.')}</p>`:''}<div id="book-rules-list"></div></section><section class="rule-editor"><h3>${L('添加或编辑规则','Add or edit a rule')}</h3><form id="book-rule-form"><label>${L('当标题或域名包含','Title or domain contains')}<input id="book-rule-keyword" required minlength="2" maxlength="80"></label><label>${L('归入分类','Category')}<input id="book-rule-group" list="book-group-options" required maxlength="40"><datalist id="book-group-options">${options()}</datalist></label><button class="primary">${L('保存规则','Save rule')}</button><button type="button" id="book-rule-cancel" hidden>${L('取消编辑','Cancel edit')}</button></form></section></div><details class="rules-disclosure"><summary>${L('规则备份','Rule backup')}</summary><p class="help">${L('只包含关键词和分类，不包含网址或浏览记录；导入仅影响书签规则。','Keywords and categories only; no URLs or browsing history. Import affects bookmarks only.')}</p><button id="book-rules-export">${L('导出规则','Export rules')}</button><button id="book-rules-import">${L('导入规则','Import rules')}</button><input type="file" id="book-rules-file" accept=".json,application/json" hidden></details>`;
 let editing=null;const list=$('#book-rules-list');if(!book.rules.length)list.innerHTML=`<div class="rules-empty">${L('尚未添加规则。例如 github.com → 开发与技术。','No rules yet. Example: github.com → Development.')}</div>`;
 for(const rule of book.rules){const row=document.createElement('div');row.className='rule-row';row.innerHTML=`<div class="rule-copy"><strong>${E(rule.keyword)}</strong><small>${E(rule.group)}</small></div>`;list.append(row);sort(row,list,'reorderRules',rule.keyword);
  const edit=iconButton('edit',L('编辑规则：','Edit rule: ')+rule.keyword);edit.onclick=()=>{editing=rule.keyword;$('#book-rule-keyword').value=rule.keyword;$('#book-rule-group').value=rule.group;$('#book-rule-cancel').hidden=false;$('#book-rule-keyword').focus();};
  const remove=iconButton('trash',L('删除规则：','Delete rule: ')+rule.keyword);remove.onclick=safe(()=>send('deleteRule',{keyword:rule.keyword}));row.append(edit,remove);
 }
 $('#book-rule-cancel').onclick=()=>{editing=null;$('#book-rule-form').reset();$('#book-rule-cancel').hidden=true;};
 $('#book-rule-form').onsubmit=safe(async e=>{e.preventDefault();await send('rule',{original:editing,keyword:$('#book-rule-keyword').value,group:$('#book-rule-group').value});});
 $('#book-rules-export').onclick=()=>{const backup={...exportRuleBackup({rules:book.rules}),scope:'bookmarks'},url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pickmark-bookmark-rules.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#book-rules-import').onclick=()=>$('#book-rules-file').click();
 $('#book-rules-file').onchange=safe(async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>1048576)throw Error(L('文件不能超过 1 MB','File exceeds 1 MB'));const backup=parseRuleBackup(JSON.parse(await file.text())),preview=mergeRuleBackup(book.rules,backup);ui.bookDialog(L('导入书签规则','Import bookmark rules'),`<p>${L('新增','Add')} ${preview.added} · ${L('跳过重复','Skip duplicates')} ${preview.skipped}</p><p class="help">${L('保留现有规则顺序，仅追加新关键词。不导入 AI 偏好。','Keep existing order and append new keywords. AI preferences are not imported.')}</p><div class="preview-list">${backup.rules.map(r=>`<div>${E(r.keyword)} → ${E(r.group)}</div>`).join('')}</div>`,()=>send('importRules',{backup}));});
}
