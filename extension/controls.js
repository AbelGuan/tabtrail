import {t,workspaceLabel} from './i18n.js';
const NS='http://www.w3.org/2000/svg';
const paths={edit:['m14 4 6 6','M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L5 15l-1 5Z'],trash:['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'],grip:['M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01']};
export function iconButton(icon,label,cls='') {
  const button=document.createElement('button');button.type='button';button.className=`mini-icon ${cls}`;button.title=label;button.setAttribute('aria-label',label);
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width',icon==='grip'?'3':'1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
  for(const d of paths[icon]){const path=document.createElementNS(NS,'path');path.setAttribute('d',d);svg.append(path);}button.append(svg);return button;
}
export function fillWorkspaceSelect(select,input,names,current='') {
  const values=[...new Set([...names,...(current?[current]:[])])];
  select.replaceChildren(...values.map(name=>new Option(workspaceLabel(name),name)),new Option(t('＋新建工作区…'),''));
  select.value=current || values[0] || '';
  input.value='';
  const toggle=()=>{input.hidden=select.value!=='';input.required=!input.hidden;if(!input.hidden)input.focus();};
  select.onchange=toggle;
  input.hidden=select.value!=='';input.required=!input.hidden;
}
export function selectedWorkspace(select,input) {
  const value=(select.value || input.value).trim();
  if(!value || value.length>40)throw new Error(t('工作区名称须为 1–40 字。'));
  return value;
}
// Pointer events work for mouse, touch and pen; keyboard arrows provide the same action.
export function sortableHandle({handle,item,container,selector,onMove,onBusy}) {
  handle.title+=t('；拖动调整顺序，方向键移动，Esc 取消');
  let finish;
  handle.onkeydown=event=>{
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();const items=[...container.querySelectorAll(selector)],index=items.indexOf(item);
    const target=items[index+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)];
    if(target)onMove(item.dataset.sortKey,target.dataset.sortKey);
  };
  handle.onpointerdown=event=>{
    if(event.button!==0 || finish)return;
    event.preventDefault();handle.focus();handle.setPointerCapture(event.pointerId);onBusy(true);
    const origin={x:event.clientX,y:event.clientY},rect=item.getBoundingClientRect();
    let x=origin.x,y=origin.y,target=null,ghost=null,frame;
    const scroller=container.closest('dialog');
    const clearTarget=()=>{target?.classList.remove('sort-target');target=null;};
    const tick=()=>{
      if(ghost){
        ghost.style.left=`${x-(origin.x-rect.left)}px`;ghost.style.top=`${y-(origin.y-rect.top)}px`;
        const bounds=scroller?.getBoundingClientRect()||{top:0,bottom:innerHeight};
        const delta=y<bounds.top+45?-10:y>bounds.bottom-45?10:0;
        if(delta){if(scroller)scroller.scrollTop+=delta;else window.scrollBy(0,delta);}
        const hit=document.elementsFromPoint(x,y).map(e=>e.closest(selector)).find(e=>e&&e!==item&&container.contains(e));
        clearTarget();if(hit){target=hit;target.classList.add('sort-target');}
      }
      frame=requestAnimationFrame(tick);
    };
    handle.onpointermove=e=>{
      x=e.clientX;y=e.clientY;
      if(!ghost&&Math.hypot(x-origin.x,y-origin.y)>5){
        ghost=item.cloneNode(true);ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
        ghost.classList.add('sort-ghost');ghost.setAttribute('aria-hidden','true');ghost.style.width=`${rect.width}px`;ghost.style.height=`${rect.height}px`;
        (scroller||document.body).append(ghost);item.classList.add('sorting');
      }
    };
    const cancel=e=>{if(e.key==='Escape'){e.preventDefault();finish(false);}};
    finish=commit=>{
      const destination=target?.dataset.sortKey;cancelAnimationFrame(frame);clearTarget();ghost?.remove();item.classList.remove('sorting');
      document.removeEventListener('keydown',cancel,true);
      handle.onpointermove=handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=null;
      if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
      finish=null;onBusy(false);
      if(commit&&destination)onMove(item.dataset.sortKey,destination);
    };
    handle.onpointerup=()=>finish?.(true);handle.onpointercancel=()=>finish?.(false);handle.onlostpointercapture=()=>finish?.(false);
    document.addEventListener('keydown',cancel,true);frame=requestAnimationFrame(tick);
  };
}
