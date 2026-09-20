// Presentation-only aggregation: never removes or rewrites stored observations.
export function siteRuns(visits) {
 const runs=[];
 for(const v of visits){
  const last=runs.at(-1);
  if(last&&last.domain===v.domain&&last.chain===v.chain&&last.end===v.start){last.end=v.end;last.total+=v.end-v.start;last.items.push(v);}
  else runs.push({domain:v.domain,chain:v.chain,start:v.start,end:v.end,total:v.end-v.start,items:[v]});
 }
 return runs;
}
export function visitPages(items){
 const pages=[];
 for(const v of items){
  const last=pages.at(-1);
  if(last&&last.visit===v.visit&&last.url===v.url&&last.end===v.start&&last.chain===v.chain){last.end=v.end;last.video||=v.mode==='video';}
  else pages.push({...v,video:v.mode==='video'});
 }
 return pages;
}
