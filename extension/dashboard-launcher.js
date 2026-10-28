// A dedicated queue keeps rapid toolbar clicks from creating duplicate tabs.
// It is independent of storage/AI work so a full disk cannot block the UI.
export function dashboardLauncher(api){
 let queue=Promise.resolve();
 const home=api.runtime.getURL('dashboard.html');
 const matches=raw=>{try{const url=new URL(raw),target=new URL(home);return url.origin===target.origin&&url.host===target.host&&url.pathname===target.pathname&&url.searchParams.get('surface')!=='sidepanel';}catch{return false;}};
 return clicked=>{
  const task=queue.then(async()=>{
   const tabs=await api.tabs.query({});
   const candidates=tabs.filter(tab=>matches(tab.url)||matches(tab.pendingUrl));
   const tab=candidates.find(tab=>tab.windowId===clicked?.windowId)||candidates[0];
   if(!tab)return api.tabs.create({url:home,active:true});
   await api.tabs.update(tab.id,{active:true});
   await api.windows.update(tab.windowId,{focused:true});
   return tab;
  });
  queue=task.catch(()=>{});return task;
 };
}
