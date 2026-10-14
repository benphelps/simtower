import { CELL, skyLobbyFloor } from './catalog.js';

// Native reach validators 0x34B12 / 0x34A52 count transitions, not the
// number of floor levels. The manual prose lists four/seven sets.
export const STAIR_SPAN=3, ESCALATOR_SPAN=6;
export function transferLobby(state,floor) {
  // 0x33C1F builds transfer components from actual type-24 lobby records;
  // native floors 11/12 (upper parts of a tall ground lobby) are excluded.
  return Boolean(state.floors[floor]?.lobby && (floor===0 || skyLobbyFloor(floor)));
}
export function accessCost(type,distanceCells,queueCount=0,transfer=false) {
  // 0x3507B / 0x35128 / 0x34E0E. Direct express requests use the queue
  // count; local lifts use walking distance plus a full-ring penalty.
  if(type==='express')return queueCount;
  const base=type==='escalator'?0:transfer?(queueCount>=40?6000:3000):queueCount>=40?1000:640;
  return Math.abs(distanceCells)*CELL+base;
}
export function lateralStress(distanceCells) {
  // 0x3E2A0: initial access walk of >=80 / >=125 native cells adds 30/60.
  return Math.abs(distanceCells)<80?0:Math.abs(distanceCells)<125?30:60;
}
// Public route interface shares the production native candidate selector.
// Returned future edges are diagnostic; actors reselect each actual leg.
export {nativeTransportRoute as findRoute} from './original-transport-choice.js';
