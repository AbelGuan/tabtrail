// Reading the dashboard also refreshes lastSeen. Ignore that bookkeeping field
// so reacting to storage writes cannot create a get -> write -> get loop.
export function recordsChanged({oldValue=[],newValue=[]}) {
  const relevant=records=>JSON.stringify(records.map(({lastSeen,...record})=>record));
  return relevant(oldValue)!==relevant(newValue);
}
