export async function organizeBookmarksAI({send,prepared,token,shouldContinue=()=>true,onProgress=()=>{}}){
 let cursor={expectedRevision:prepared.revision,signature:prepared.signature},attempted=[],applied=0;
 const base={ids:prepared.ids,settings:prepared.settings,token};
 if(!shouldContinue())return {stopped:true,applied};
 const local=await send({type:'bookAI:rules',...base,...cursor});cursor={expectedRevision:local.revision,signature:local.signature};
 for(;;){
  onProgress({applied,remaining:local.remaining});
  if(!shouldContinue())return {stopped:true,applied};
  const result=await send({type:'bookAI:batch',...base,...cursor,attempted});
  if(result.done)return {applied,remaining:result.remaining};
  applied+=result.applied;attempted.push(...result.attempted);local.remaining=result.remaining;cursor={expectedRevision:result.revision,signature:result.signature};
 }
}
