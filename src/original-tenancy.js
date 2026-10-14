import { CATALOG } from './catalog.js';
import { rentAmount } from './original-economy.js';
import { tenantEvaluation, meanTenantStress, hotelStress, noisyNeighbor } from './original-systems.js';
import { commercialEvaluation } from './original-commercial.js';
import { tenantSlotForRoom } from './original-tenant-slots.js';

export const QUARTER_TENANCIES = new Set(['office', 'condo', 'shop']);
export function nativeTenantSlot(rooms, room) {
  // +12 is a per-floor actor-pool slot (0x484E0), not the room's ordered
  // horizontal record index. Legacy browser saves use construction id order.
  return tenantSlotForRoom(rooms, room);
}

export function nativeTenantRoomState(room, tick) {
  if (Number.isInteger(room.tenantState)) return room.tenantState;
  // Legacy browser saves do not have the native +0B room-state byte.
  return room.occupied ? tick < 1600 ? 0 : 8 : (room.key === 'office' ? 16 : 24) + (tick < 1600 ? 0 : 8);
}
export function nativeLeaseOccupied(room,tick) {
  //28C0F/29200/293AD compare signed BYTE facade, independent ofD497's
  //accepted-population LONG. Legacy browser records fall back to ownership.
  const threshold=room.key==='office'?16:room.key==='condo'||['single','twin','suite'].includes(room.key)?24:null;
  const raw=room.key==='office'||room.key==='condo'?room.tenantState:room.hotelState;
  if(threshold!==null&&Number.isInteger(raw))return ((raw&255)<<24>>24)<threshold;
  if(room.key==='shop'&&room.commercial)return room.commercial.state>=0;
  return Boolean(room.occupied);
}
export function tenantRoomSprite(room, tick) {
  // 0xA406 /0xA461 flatten the room-state byte and style into an atlas.
  // Office has six styles with two frames each, then two shared vacancies.
  // Four 72px frames fit in each first bitmap; vacancy bitmap1451 has two.
  const state = nativeTenantRoomState(room, tick), style = room.variant || 0;
  if (room.key === 'office') {
    const frame = state < 16 ? Math.trunc(state / 8) + style % 6 * 2 : Math.trunc((state - 16) / 8) + 12;
    return { sheet: 1448 + Math.trunc(frame / 4), x: frame % 4 * 72, y: 0, width: 72, height: 24 };
  }
  return { sheet: 1576 + style % 3 * 5 + Math.trunc(state / 8), x: 0, y: 0, width: 128, height: 24 };
}
export function tenantRoomAdmitted(room, tick) {
  // 0x2D71E offices reset to0 even after1600; 0x2DA58 condos choose0/8.
  return room.key === 'office' ? 0 : tick < 1600 ? 0 : 8;
}
export function tenantRoomEntry(room, tick) {
  const state = nativeTenantRoomState(room, tick);
  // 0x470A3: first worker entering an empty night office relights it.
  // 0x474C4: a returned condo resident can wake the sleep facade.
  if (room.key === 'office' && state === 8) return 1;
  if (room.key === 'condo' && state === 16) return tick < 1600 ? 1 : 9;
  return (state + 1)&255;
}
export function tenantRoomExit(room, tick) {
  // 0x4716A offices extinguish the lights only when the final worker leaves
  // in phase4 or later. 0x476C8 condo departures simply decrement the byte.
  const state = (nativeTenantRoomState(room, tick) - 1)&255;
  return room.key === 'office' && state === 0 && tick >= 1600 ? 8 : state;
}
export function tenantRoomSleep(room, actor, actors, tick) {
  // 0x475CA sets sleeping16 if the current resident is the sole person
  // inside, or the other two allocated condo identities are asleep16.
  const state = nativeTenantRoomState(room, tick);
  return (state & 7) === 1 || actors.filter(a => a.room === room.id && a.id !== actor.id).every(a => a.state === 16) ? 16 : state;
}
export function tenantRoomWake(room, tick) {
  // 0x4417B wakes all three allocated residents' home counter at once.
  const state = nativeTenantRoomState(room, tick);
  return state === 16 ? 3 : state;
}
export function tenantRoomClock(room, tick, weekend = false) {
  const state = nativeTenantRoomState(room, tick);
  if (tick === 0) {
    // 0x480AE: occupied offices reset daily, and remain dark on weekends.
    if (room.key === 'office') return state === 24 ? 16 : weekend ? 8 : 0;
    return state === 32 ? 24 : state;
  }
  if (tick === 1600) {
    // 0x4829F changes vacancies and empty offices, but leaves an occupied
    // office illuminated while even one worker remains inside.
    if (room.key === 'office') return state === 16 ? 24 : state === 0 ? 8 : state;
    return state === 24 ? 32 : state < 8 ? state + 8 : state;
  }
  return state;
}
export function synchronizeTenantRoomState(room, actors, tick) {
  // Migrate browser saves/demo fixtures that previously changed ownership
  // without the native state byte. Native home actor states are0..16; travel
  // and outside states are excluded. Preserve legitimate clock/sleep modes.
  const state = nativeTenantRoomState(room, tick);
  if (!room.occupied) return (room.key === 'office' ? 16 : 24) + (tick < 1600 ? 0 : 8);
  const inside = actors.filter(a => a.room === room.id && a.state <= 16 && a.trip === null);
  const count = inside.length;
  if (room.key === 'office') {
    if (count) return count;
    return state === 0 || state === 8 ? state : tick < 1600 ? 0 : 8;
  }
  if (state === 16 && inside.length && inside.every(a => a.state === 16)) return 16;
  if (state <= 11 && (state & 7) === count) return state;
  return count + (state <= 11 ? state & 8 : tick < 1600 ? 0 : 8);
}
export function validateTenantRoomState(room) {
  if (room.tenantState !== undefined && !(Number.isInteger(room.tenantState) && (room.key === 'office'
    ? room.tenantState >= 0 && room.tenantState <= 6 || room.tenantState===8 || room.tenantState>=16&&room.tenantState<=30
    : room.tenantState >= 0 && room.tenantState <= 5 || room.tenantState >= 8 && room.tenantState <= 13 || room.tenantState===16 || room.tenantState>=21&&room.tenantState<=35))) throw new Error('Invalid native tenant room state.');
  return true;
}

export function canSeekTenant(room) {
  return !room.constructionRemaining && room.accepting !== false;
}

export function initialTenantActor(room) {
  // 0x47843 / 0x412BC / 0x41378: completed vacant units begin with their
  // applicants outside (state 32); an existing condominium begins asleep.
  return room.key === 'condo' && room.occupied ? { state: 16, floor: room.floor } : { state: 32, floor: 0 };
}

export function residentStress(room, rooms, stats = room.trips || []) {
  // 0x28CE9 and 0x28E2E both jump into 0x28D93, which divides and then
  // calls 0x28E4B. Its price/noise adjustment includes offices and condos,
  // as well as hotels; the route graph is not an input to this calculation.
  return hotelStress(meanTenantStress(stats), room.price, Boolean(noisyNeighbor(room, rooms)));
}

export function acceptanceEvaluation(data, room, stress, star) {
  // 0x28C0F: a vacant office/condo already accepting applicants has no
  // evaluation. A rejected vacancy retains its old actor stress until a
  // referral resets it. Construction starts accepting (0x3A7C4).
  if (['office', 'condo'].includes(room.key) && !nativeLeaseOccupied(room,0) && room.accepting !== false) return -1;
  if (room.key === 'shop' && room.commercial) return commercialEvaluation(data, room);
  return tenantEvaluation(data, stress, star);
}

export function dailyTenancyPlan(data, rooms, star, stressForRoom) {
  // 0x28800 calls evaluation at tick 2533 every day; only its follow-up
  // eviction/referral/rent loops depend on the date being divisible by three.
  const ordered = rooms.filter(r => QUARTER_TENANCIES.has(r.key) && !r.constructionRemaining)
    .sort((a, b) => a.floor - b.floor || a.x - b.x);
  return ordered.map(room => {
    const evaluation = acceptanceEvaluation(data, room, stressForRoom(room), star);
    return { roomId: room.id, key: room.key, floor: room.floor, evaluation,
      accepting: room.accepting !== false || evaluation !== 0,
      occupied: nativeLeaseOccupied(room,0), evict: false, referral: null, resetStress: false };
  });
}

export function quarterTenancyPlan(data, rooms, star, stressForRoom) {
  // 0x28800 evaluates an entire floor before applying 0x29200 in room-table
  // order. 0x3A117 keeps that table ordered by horizontal position. Changes
  // to a donor's grade must be visible to the next vacancy on the same floor.
  const records = dailyTenancyPlan(data, rooms, star, stressForRoom);
  for (const target of records) {
    if (target.evaluation !== 0) continue;
    const room = rooms.find(r => r.id === target.roomId);
    // 0x292B7 deliberately skips a shop with zero quarters of tenancy.
    if (target.key === 'shop' && !(room.tenure > 0)) continue;
    if (target.occupied) {
      target.evict = true; target.occupied = false; target.accepting = false;
    }
    const donor = records.find(r => r.floor === target.floor && r.key === target.key && r.evaluation === 2);
    if (!donor) continue;
    target.evaluation = donor.evaluation = 1;
    target.accepting = true; target.referral = donor.roomId; target.resetStress = true;
  }
  return records;
}

export function quarterContract(data, room) {
  // 0x293AD: increment the one-byte tenure before paying, cap at 120
  // quarters, and reset actor totals even after the rent cap is reached.
  const eligible = QUARTER_TENANCIES.has(room.key) && nativeLeaseOccupied(room,0) && !room.constructionRemaining;
  const tenure = room.tenure || 0;
  return { tenure: eligible ? Math.min(120, tenure + 1) : tenure,
    payment: eligible && room.key !== 'condo' && tenure < 120 ? rentAmount(data, CATALOG[room.key].id, room.price) : 0,
    resetStress: eligible };
}

export function initialTenancyPayment(data, room, continuation=false) {
  // 0x42811 / 0x44050 / 0x448A0 pay once when the first applicant obtains
  // transport (including a same-floor arrival), before the journey ends.
  if (!QUARTER_TENANCIES.has(room.key) || nativeLeaseOccupied(room,0) || room.accepting === false&&!continuation || room.constructionRemaining) return 0;
  return rentAmount(data, CATALOG[room.key].id, room.price);
}
