import { nativeActorMean } from './original-actor-stats.js';
import { hasParkingReservation } from './original-parking-state.js';

export function reserveVIPGuest(state, actor, room, hooks = {}) {
  // 0x48E00: called after checkout, before30399 releases the guest's car.
  if (state.calendarDay % 9 !== 3 || state.star !== 3 || state.nativeFlags.vipPassed
    || state.vip || room.key !== 'suite' || actor.index !== 1 || !hasParkingReservation(actor)) return false;
  state.vip = { actor: actor.id, room: room.id, day: state.calendarDay, arrived: false };
  hooks.dialog?.(3000, room.floor + 1);
  if(hooks.deferDialogs)state.vipContinuation={id:3000,action:'reserve',actor:actor.id};
  return true;
}
export function admitVIPGuest(state, actor, data, hooks = {}) {
  // 0x48EB6 announces first, then2F3EC applies the ordinary20name limit.
  if (state.vip?.actor !== actor.id) return false;
  state.vip.arrived = true; hooks.dialog?.(3001);
  if(hooks.deferDialogs){state.vipContinuation={id:3001,action:'name',actor:actor.id};return true;}
  nameVIPGuest(state,actor,data,hooks);
  return true;
}
function nameVIPGuest(state,actor,data,hooks) {
  if (actor.name || state.actors.filter(actor => actor.name).length < 20) actor.name = data.strings[700][1];
  else hooks.notice?.(data.strings[1005][5]);
}
export function checkoutVIPGuest(state, actor, hooks = {}) {
  // 0x48F15 only checks active identity, then28B7B's signed WORD/BYTE
  // mean. Room price/noise/dirt, present treatment clock and car stress
  // are not separate VIP penalties. Native zero journeys gives mean0.
  if (state.vip?.actor !== actor.id) return null;
  const passed = nativeActorMean(actor) <= 150;
  state.nativeFlags.vipPassed = passed; hooks.dialog?.(passed ? 3002 : 3003);
  if(hooks.deferDialogs){state.vipContinuation={id:passed?3002:3003,action:'clear',actor:actor.id};return passed;}
  state.vip = null; return passed;
}
export function failVIPGuest(state, actor, hooks = {}) {
  // 0x48F7D is used by lost parking, abandoned journey and facility removal.
  if (state.vip?.actor !== actor.id) return false;
  state.nativeFlags.vipPassed = false; hooks.dialog?.(3003);
  if(hooks.deferDialogs)state.vipContinuation={id:3003,action:'clear',actor:actor.id};
  else state.vip = null;
  return true;
}
export function acknowledgeVIPDialog(state,data,id,hooks={}) {
  const pending=state.vipContinuation;if(!pending||pending.id!==id)return false;
  delete state.vipContinuation;
  if(pending.action==='name') {const actor=state.actors.find(a=>a.id===pending.actor);if(actor)nameVIPGuest(state,actor,data,hooks);}
  else if(pending.action==='clear')state.vip=null;
  return true;
}
export function validateVIPContinuation(state) {
  const pending=state.vipContinuation;if(pending===undefined)return;
  if(!pending||!Number.isInteger(pending.actor)||![3000,3001,3002,3003].includes(pending.id)||pending.action!==({3000:'reserve',3001:'name',3002:'clear',3003:'clear'})[pending.id]||state.vip?.actor!==pending.actor||!state.dialogs.some(d=>d.id===pending.id))throw new Error('Invalid VIP continuation.');
}
export function expireVIPReservation(state) {
  // 0x48FC3 at1600 clears stale ACTIVE reservation only. Passed survives.
  if (state.calendarDay % 9 !== 3) state.vip = null;
}
