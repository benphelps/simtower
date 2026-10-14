// DAD1 rejects an unaffordable negative DialogBox parameter before ending
// command2. Its nested ALRT1004 MessageBox returns before command1 resumes.
export function nativeUnaffordableChoice(state,data,id,control) {
  if(control!==2)return false;
  const event=state.emergency;
  const cost=id===3020&&event?.kind==='bomb'&&event.stage==='demand'?event.demand:
    id===3012&&event?.kind==='fire'&&event.helicopter===null?data.events.fireCrewCost*data.moneyScale:null;
  return cost!==null&&state.cash-cost<0;
}
export function validateAffordabilityContinuation(state) {
  const pending=state.affordabilityContinuation;
  if(pending===undefined){if(state.dialogs.some(d=>d.id===1004))throw new Error('Invalid native affordability continuation.');return;}
  const event=state.emergency;
  if(!pending||![3012,3020].includes(pending.id)||pending.control!==1||state.dialogs[0]?.id!==1004||state.dialogs.filter(d=>d.id===1004).length!==1||!state.dialogs.some(d=>d.id===pending.id)||pending.id===3020&&(event?.kind!=='bomb'||event.stage!=='demand')||pending.id===3012&&(event?.kind!=='fire'||event.helicopter!==null))throw new Error('Invalid native affordability continuation.');
}
