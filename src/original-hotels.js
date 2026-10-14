import { HOTELS } from './catalog.js';
import { tenantEvaluation } from './original-systems.js';

export function hotelStyleCount(key) { return key === 'twin' ? 4 : 2; }
export function hotelSprite(room, tick) {
  // 0xA3C2: (roomState>>3) + style*9, packed by 0x38C0A as a one-frame
  // first resource followed by eight frames in the next bitmap.
  const base = room.key === 'single' ? 1192 : room.key === 'twin' ? 1256 : 1320;
  const width = room.key === 'single' ? 32 : room.key === 'twin' ? 48 : 80;
  const style = (room.variant || 0) % hotelStyleCount(room.key), mode = Math.trunc(nativeHotelState(room, tick) / 8);
  return { sheet: base + style * 2 + Number(mode > 0), x: mode > 0 ? (mode - 1) * width : 0,
    y: 0, width, height: 24 };
}

export function validateHotelState(room) {
  // 289E2 overwrites even an occupied room with condition56/64 without
  // stopping its guests. Their later47236/47457 INC/DEC can offset a
  // condition byte by the guest capacity; these are real reachable states.
  const capacity = room.key === 'single' ? 1 : 2;
  const wakingCapacity=capacity*2-1; //4369A resets fullcapacity while another98 guest may still be away.
  if (room.hotelState !== undefined && !(Number.isInteger(room.hotelState) &&
    (room.hotelState >= 0 && room.hotelState <= wakingCapacity || room.hotelState >= 8 && room.hotelState <= 8 + capacity ||
      room.hotelState === 16 || [24,32,40,48,56,64].some(mode => Math.abs(room.hotelState-mode)<=capacity)))) throw new Error('Invalid hotel room state.');
  if (room.hotelDays !== undefined && !(Number.isInteger(room.hotelDays) && room.hotelDays >= 0 && room.hotelDays <= 255)) throw new Error('Invalid hotel neglect counter.');
  return true;
}

export function nativeHotelState(room, tick) {
  if (Number.isInteger(room.hotelState)) return room.hotelState;
  const night = tick >= 1600;
  return room.occupied ? night ? 8 : 0 : room.dirt >= 80 ? night ? 48 : 40 : night ? 32 : 24;
}
export function hotelCheckIn(room, tick) {
  // 0x2D862: first routed applicant adds the hotel's guest capacity to
  // population, resets tenure, and collects no money until checkout.
  return { occupied: true, hotelState: tick < 1600 ? 0 : 8, hotelDays: 0 };
}
export function hotelCheckOut(tick) {
  // 0x2D914 collects the current room price, marks the room dirty, and
  // clears acceptance. Hotel room type3 has one paying guest, type4/5 two.
  return { occupied: false, hotelState: tick < 1600 ? 40 : 48, accepting: false, hotelDays: 0, dirt: 100 };
}
export function hotelCleaned(room, tick) {
  // 0x2A6F2 cleans only states40/48; a neglected state56/64 cannot be fixed
  // by routine housekeeping and requires rebuilding the facility.
  const state = nativeHotelState(room, tick);
  return [40, 48].includes(state) ? { hotelState: tick < 1600 ? 24 : 32, dirt: 0 } : null;
}
export function hotelEveningPlan(data, rooms, star, stressForRoom, tick = 1600) {
  // 0x289E2 then 0x28909 at tick1600. Use all actual room footprints so a
  // nonhotel or a gap blocks propagation between adjacent native records.
  const ordered = rooms.filter(r => !r.constructionRemaining).sort((a, b) => a.floor - b.floor || a.x - b.x);
  const records = new Map(ordered.filter(r => HOTELS.has(r.key)).map(room => [room.id,
    { roomId: room.id, key: room.key, floor: room.floor, hotelState: nativeHotelState(room, tick),
      hotelDays: room.hotelDays || 0, accepting: room.accepting !== false, evaluation: room.evaluation ?? -1,
      referral: null, resetStress: false, neglected: false }]));
  // 0x289E2 skips a right neighbor it has just spoiled; that neighbor spreads
  // on the next day. An already spoiled right neighbor remains in the scan.
  for (let i = 0; i < ordered.length; i++) {
    const room = ordered[i], record = records.get(room.id);
    if (!record || record.hotelState < 56) continue;
    let spoiledRight = false;
    for (const neighbor of [ordered[i - 1], ordered[i + 1]]) {
      const target = records.get(neighbor?.id);
      if (!target || neighbor.floor !== room.floor) continue;
      if (neighbor.x + neighbor.width !== room.x && room.x + room.width !== neighbor.x) continue;
      if (neighbor === ordered[i + 1] && target.hotelState >= 56) continue;
      target.hotelState = tick < 1600 ? 56 : 64; target.evaluation = -1; target.accepting = false; target.neglected = true;
      if (neighbor === ordered[i + 1]) spoiledRight = true;
    }
    if (spoiledRight) i++;
  }
  for (const room of ordered) {
    const record = records.get(room.id); if (!record) continue;
    record.evaluation = record.hotelState >= 56 ? -1 : tenantEvaluation(data, stressForRoom(room), star);
    // 0x28F04 permits resetting a cleared hotel acceptance only when clean.
    if (!record.accepting && record.hotelState < 40 && record.evaluation !== 0) record.accepting = true;
    if (record.hotelState >= 40) {
      // 0x29677: the first accepted dirty evaluation clears the counter;
      // subsequent daily passes advance it, and equality3 spoils the room.
      if (record.accepting) { record.evaluation = 0; record.hotelDays = 0; record.accepting = false; }
      else record.hotelDays = (record.hotelDays + 1) & 255;
      if (record.hotelDays === 3) { record.hotelState = tick < 1600 ? 56 : 64; record.neglected = true; }
    }
  }
  // 0x29779 consumes at most one same-type, same-floor gradeA donor per bad
  // clean hotel. Satisfactory clean hotels also reset their guest totals.
  for (const record of records.values()) {
    if (record.hotelState >= 40) continue;
    if (record.evaluation >= 1) { record.accepting = true; record.resetStress = true; continue; }
    if (record.evaluation !== 0) continue;
    const donor = [...records.values()].find(other => other.floor === record.floor && other.key === record.key && other.evaluation === 2);
    if (donor) {
      record.evaluation = donor.evaluation = 1; record.referral = donor.roomId;
      record.accepting = true; record.resetStress = true;
    } else record.accepting = false;
  }
  return [...records.values()];
}
export function hotelArrivalDue(room, tick, randomInt) {
  // 0x432CC state32: accepting, one-in-twelve at phase4, forced phase5
  // before midnight2300. 43443 checks only acceptance+14, not facade+0B:
  // an already admitted applicant can survive a later condition overwrite.
  if (room.accepting === false) return false;
  const phase = Math.trunc(tick / 400);
  return phase === 4 ? randomInt(12) === 0 : phase > 4 && tick < 2300;
}
export function hotelPostArrivalState(tenantIndex) {
  // 0x43C75: even native tenant indices plan dinner1, odd indices stay4.
  // This is the floor's native tenant slot, not the guest child index.
  return tenantIndex % 2 === 0 ? 1 : 4;
}
export function hotelRoomEntry(room, tick) {
  // 0x47236 restores the inside counter after an interrupted trip or return.
  const state = nativeHotelState(room, tick);
  return state === 16 ? tick < 1600 ? 1 : 9 : (state + 1) & 255;
}
export function hotelRoomExit(room, tick) {
  // 0x47457 removes the guest as soon as it starts dinner/departure.
  return (nativeHotelState(room, tick) - 1) & 255;
}
export function hotelRoomWake(room, tick) {
  // 0x4369A: the first waking guest resets sleeping16 to room guest count.
  const state = nativeHotelState(room, tick);
  return state === 16 ? room.key === 'single' ? 1 : 2 : state;
}
export function hotelRoomClock(room, tick) {
  // 0x480AE /0x4829F change only vacancy/condition pairs. Occupied hotel
  // counters are not globally switched: waking16 resets its guest count.
  const state = nativeHotelState(room, tick);
  if (tick === 0 && [32,48,64].includes(state)) return state - 8;
  if (tick === 1600 && [24,40,56].includes(state)) return state + 8;
  return state;
}
export function hotelRoomSleep(room, actor, actors, tick) {
  // 0x4733C: single or sole inside guest sleeps immediately; otherwise the
  // other twin/suite guest must also be asleep before the whole facade sleeps.
  const state = nativeHotelState(room, tick);
  return room.key === 'single' || (state & 7) === 1 || actors.some(a => a.room === room.id && a.id !== actor.id && a.state === 16) ? 16 : state;
}
export function hotelActorAction(actor, room, tick, randomInt, venueExists = true, duration = 60) {
  // 0x432CC ordinary stable guest states. Source actor cohorts invoke these
  // separately from transport/admission completion, preserving sampling order.
  const phase = Math.trunc(tick / 400);
  if (actor.state === 16 && (phase < 5 || tick > 2566 && randomInt(12) === 0)) return 'wake';
  if (actor.state === 5 && (phase === 0 ? randomInt(12) === 0 : phase !== 6)) return 'departure';
  if (actor.state === 1) {
    if (phase === 4 && randomInt(6) === 0) return 'dinner';
    if (phase > 4) return 'home';
  }
  if (actor.state === 34 && phase >= 4 && (!venueExists || tick - actor.visitTick >= duration)) return 'dinner-return';
  if (actor.state === 4 && phase >= 5 && (tick > 2400 || randomInt(12) === 0)) return 'sleep';
  if (actor.state === 32 && hotelArrivalDue(room, tick, randomInt)) return 'arrival';
  return null;
}
