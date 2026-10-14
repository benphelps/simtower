import { CATALOG } from './catalog.js';
import { nativePopulationCategory } from './original-population.js';
import { hasParkingReservation } from './original-parking-state.js';

export const PARKING_QUOTA_MULTIPLIERS = [2,1,1,2,1,1,1,1,1,0]; // 0x2FFE9; condo limit remains unchanged.
export function newParkingQuotas() {
  return { used: Array(10).fill(0), limits: Array(10).fill(0), usedTotal: 0, limitTotal: 0 };
}
export function validateParkingQuotas(quotas) {
  const long = value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
  if (!quotas || !Array.isArray(quotas.used) || quotas.used.length !== 10 || !quotas.used.every(long) ||
    !Array.isArray(quotas.limits) || quotas.limits.length !== 10 || !quotas.limits.every(value=>Number.isInteger(value)&&value>=0&&value<=1024) ||
    !long(quotas.usedTotal) || (quotas.used.reduce((sum,value)=>sum+value,0)|0) !== quotas.usedTotal ||
    !long(quotas.limitTotal) || quotas.limits.reduce((sum,value)=>sum+value,0) !== quotas.limitTotal) throw new Error('Invalid native parking quota counters.');
  return true;
}
export function recomputeParkingQuotas(quotas, spaces) {
  validateParkingQuotas(quotas);
  if (!Number.isInteger(spaces) || spaces < 0 || spaces > 512) throw new Error('Invalid native parking index count.');
  const limits = PARKING_QUOTA_MULTIPLIERS.map((multiplier,index)=>index===9?quotas.limits[index]:spaces*multiplier);
  // 0x300BB/30684 resets the selectable index list, not the used counters.
  return { ...quotas, limits, limitTotal: limits.reduce((sum,value)=>sum+value,0) };
}
export function claimParkingQuota(quotas, type) {
  validateParkingQuotas(quotas);
  const category = nativePopulationCategory(type);
  if (category < 0 || quotas.used[category] >= quotas.limits[category]) return { quotas, claimed: false };
  const used = [...quotas.used];used[category]=(used[category]+1)|0;
  return { quotas: { ...quotas, used, usedTotal: (quotas.usedTotal+1)|0 }, claimed: true };
}
export function releaseParkingQuota(quotas, type) {
  validateParkingQuotas(quotas);
  const category = nativePopulationCategory(type);
  if (category < 0) return quotas;
  const used = [...quotas.used];used[category]=(used[category]-1)|0;
  // 0x2FFB9 does not clamp: a packed-floor borrow can release an actor who
  // never claimed parking, or a lost packed floor can leave a claim behind.
  return { ...quotas, used, usedTotal: (quotas.usedTotal-1)|0 };
}
export function inferParkingQuotas(state, spaces) {
  let quotas=recomputeParkingQuotas(newParkingQuotas(),spaces);
  for (const actor of state.actors || []) {
    if(!hasParkingReservation(actor))continue;
    const room=state.rooms.find(room=>room.id===actor.room),category=nativePopulationCategory(CATALOG[room?.key]?.id);
    if(category<0)continue;
    quotas.used[category]++;quotas.usedTotal++;
  }
  return quotas; // Legacy actor snapshots cannot recover already-lost claims.
}
export function parkingCatalogPlan(state, reachable, { topology = false } = {}) {
  const rooms=(state.rooms||[]).filter(room=>room.key==='parking'),used=new Set();
  for(const room of rooms)if(room.nativeParkingSlot!==undefined){if(!Number.isInteger(room.nativeParkingSlot)||room.nativeParkingSlot<0||room.nativeParkingSlot>=512||used.has(room.nativeParkingSlot))throw new Error('Invalid native parking metadata slot.');used.add(room.nativeParkingSlot);}
  const patches=[];
  for(const room of [...rooms].sort((a,b)=>a.id-b.id)) {
    let slot=room.nativeParkingSlot;
    if(slot===undefined){slot=0;while(used.has(slot))slot++;if(slot>=512)throw new Error('Native parking metadata exhausted.');used.add(slot);}
    const accessible=topology||room.parkingAccessible===undefined?Boolean(reachable(state,room)):room.parkingAccessible;
    if(typeof accessible!=='boolean')throw new Error('Invalid native parking accessibility.');
    const previous=room.nativeParkingFrame??(room.parkingAccessible===false?1:room.parkingActor!==undefined||room.parkingActorSlot!==undefined?room.carVariant||2:0);
    //18052 writes frame0 even to inaccessible parking during emergencies.
    //Cached accessibility and the surviving owner pointer are independent.
    if(!Number.isInteger(previous)||previous<0||previous>14||!topology&&room.parkingAccessible!==undefined&&(accessible?previous===1:previous!==0&&previous!==1))throw new Error('Invalid native parking frame.');
    //308AD overwrites cars with redX ondisconnection, then1→0 onreconnection.
    // The metadata owner pointer survives; it cannot restore the oldcarframe.
    const frame=topology||room.parkingAccessible===undefined?accessible?(previous===1?0:previous):1:previous;
    patches.push({roomId:room.id,nativeParkingSlot:slot,parkingAccessible:accessible,nativeParkingFrame:frame});
  }
  const available=patches.filter(patch=>patch.parkingAccessible).sort((a,b)=>a.nativeParkingSlot-b.nativeParkingSlot).map(patch=>patch.roomId);
  return { rooms: patches, available };
}
