export const retentionDays=config=>[7,14,30].includes(config.retentionDays)?config.retentionDays:30;
export function retentionCutoff(config,now=Date.now()){
 const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-(retentionDays(config)-1));return cutoff;
}
