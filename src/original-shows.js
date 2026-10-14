import { movieAudience, movieReceipt } from './original-systems.js';
import { businessReceipt } from './original-economy.js';
import { leaveCommercialVisit } from './original-commercial.js';
import {commercialActorVenue,admitSelectedCommercialVisit,retryCommercialAdmission} from './original-commercial-registry.js';
import {markInteriorDirty} from './original-interiors.js';

const markShowDirty=room=>{markInteriorDirty(room,room.floor);markInteriorDirty(room,room.floor-1);};

export const SHOW_TYPES = new Set(['cinema', 'partyhall']);
export const SHOW_MEALS = ['fastfood', 'restaurant', 'shop']; // 0x334BB's three destination lists.
export function newCinemaMovie() {return {index:0,pendingTitle:true,days:0,attendance:0,active:false,receipts:0,halfVisitors:[0,0]};}
export function completeCinemaMovie(room,randomInt) {
  // 0x47843 booth34/35 →2DFCD/2E0A2→2DE93 chooses title once on
  // completion. Construction itself has no movie metadata or title RNG.
  if(room.key!=='cinema'||!room.movie?.pendingTitle)return false;
  room.movie.index=randomInt(14);room.movie.pendingTitle=false;return true;
}
export function showHalfSize(key) { return key === 'cinema' ? 56 : 40; } // 0x47F0B
export function showActorCount(key) { return showHalfSize(key) * 2; }
export function showActorHalf(room, actor) { return Math.trunc(actor.resident / showHalfSize(room.key)); }
export function showEntrance(room) { return room.floor - Number(room.key === 'partyhall'); } // 0x2EBB8
export function showExit(room) { return room.floor - 1; } // 0x2EBEE
export function newShowState() { return { stage: 0, remaining: [0, 0], inside: 0, visitors: 0 }; }
export function prepareShowDay(room, data) {
  // 0x2E3CF/2E95E: population is the allowance, not completed admissions.
  const perHalf = room.movie ? movieAudience(data, room.movie.index, room.movie.days) : 50;
  room.show ??= newShowState();
  Object.assign(room.show, { remaining: room.movie ? [perHalf, perHalf] : [0, perHalf], inside: 0, visitors: 0 });
  room.dailyPopulation = room.show.remaining[0] + room.show.remaining[1];
  room.visitors = 0;
  if (room.movie) Object.assign(room.movie, { attendance: room.dailyPopulation,
    days: Math.min(127, room.movie.days + 1), halfVisitors: [0, 0], receipts: 0 });
  return room.show;
}
export function openShowBatch(room, actors, half) {
  // 0x2E4C8 writes state32 to just one floor's existing actor pool.
  room.show ??= newShowState();
  if (room.show.stage === 0) room.show.stage = 1;
  for (const actor of actors) if (actor.room === room.id && showActorHalf(room, actor) === half) actor.state = 32;
  if (room.movie) room.movie.active = room.show.stage === 3;
  room.occupied = room.show.inside > 0;
  //2E4C8 dirties both floors, even though actor reset selects one half.
  markShowDirty(room);
}
export function projectShow(room) {
  // 0x2E646 only starts projection once someone has entered (stage2).
  if (room.show?.stage >= 2) {room.show.stage = 3;markShowDirty(room);}
  if (room.movie) room.movie.active = room.show?.stage === 3;
}
export function closeShowBatch(room, actors, half, state, data) {
  // 0x2E72A counts only people present in state3. Late trips continue.
  let receipts = null;
  if (half === 1) {
    room.show.stage = 0;
    receipts = state.calendarDay % 60 === 59 || state.calendarDay % 84 === 83 ? 0
      : room.movie ? movieReceipt(data, room.show.visitors) : businessReceipt(data, 29, room.show.visitors, state.calendarDay);
    if (room.movie) room.movie.receipts = receipts;
  }
  for (const actor of actors) if (actor.room === room.id && showActorHalf(room, actor) === half && actor.state === 3) {
    actor.state = room.movie && state.tick < 1600 ? 1 : 5;
    room.show.inside--;
  }
  if (half === 0) room.show.stage = room.show.inside > 0 ? 2 : 1;
  room.occupied = room.show.inside > 0;
  if (room.movie) room.movie.active = room.show.stage === 3;
  markShowDirty(room); //2E72A updates every linked floor record.
  return receipts;
}
function admitShow(room, actor) {
  if (room.show.stage === 1) {room.show.stage = 2;markShowDirty(room);} //2EA4B first admission changes both facades.
  room.show.inside++; room.show.visitors++; room.visitors = room.show.visitors;
  if (room.movie) room.movie.halfVisitors[showActorHalf(room, actor)]++;
  room.occupied = true; actor.state = 3; actor.floor = showEntrance(room); actor.showBooked = false;
}
function admitMeal(tower, actor) {
  if(admitSelectedCommercialVisit(tower,actor)==='waiting'){actor.state=65;return;}
  actor.state = 34; actor.visitTick = tower.state.tick;
}
export function updateShowActor(tower, actor, room, beginTrip, chooseVenue) {
  // 0x45A11/45B8D: dispatched by the existing sixteen actor cohorts.
  if (!room.show || actor.trip !== null) return;
  const tick = tower.state.tick;
  if (actor.state === 32) {
    if (tick >= 1600) { actor.state = 39; return; }
    if (tick <= 240 || tower.randomInt(6) !== 0) return;
    const half = showActorHalf(room, actor);
    if (!room.show.remaining[half]) return;
    room.show.remaining[half]--; actor.showBooked = true;
    beginTrip(tower, actor, room, 0, showEntrance(room), 'show-arrival');
  } else if (actor.state === 96) admitShow(room, actor);
  else if (actor.state === 5) beginTrip(tower, actor, room, showExit(room), 0, 'show-departure');
  else if (actor.state === 1) {
    const selected = chooseVenue(tower, showExit(room), SHOW_MEALS[tower.randomInt(3)]);
    const venue = selected?.commercial && [-1, 3].includes(selected.commercial.state) ? null : selected;
    actor.job = venue?.id ?? null;
    if(!venue)actor.commercialSlot=-1;else if(venue.commercialSlot!==undefined)actor.commercialSlot=venue.commercialSlot;else delete actor.commercialSlot;
    beginTrip(tower, actor, room, showExit(room), venue?.floor ?? 0, 'show-meal-arrival');
  } else if (actor.state === 65) retryCommercialAdmission(tower,actor,room,beginTrip,'show-meal-arrival',()=>admitMeal(tower,actor));
  else if (actor.state === 34) {
    const selected=commercialActorVenue(tower.state,actor),venue=selected.room;
    if(selected.index!==undefined)actor.floor=selected.floor;
    // 0x32E4E: missing/closed venue completes immediately; offsite floor0.
    const live = venue?.commercial && ![-1, 3].includes(venue.commercial.state);
    if (live && tick - actor.visitTick < (tower.data.visits[venue.key] || 60)) return;
    if (live) venue.commercial = leaveCommercialVisit(venue.commercial,venue);
    actor.commercialInside = false;
    beginTrip(tower, actor, room, actor.floor, 0, 'show-meal-departure');
  }
}
export function finishShowActorTrip(tower, actor, room, success, purpose, person = null) {
  actor.trip = null;
  if (!success) {
    if (purpose === 'show-arrival' && !person) {
      // 0x45C90: only an initial routing failure refunds the booking.
      if (actor.showBooked) room.show.remaining[showActorHalf(room, actor)]++;
      actor.showBooked = false; actor.state = 32; actor.floor = 0; actor.delay = 0; actor.trips = 0;
    } else if (purpose === 'show-meal-arrival' && (!person||person.initialRouteFailure)) {
      // 0x460D7: initial food-route failure becomes an offsite visit.
      actor.state = 65; actor.job = null; actor.commercialSlot=-1;actor.floor = showExit(room);
    } else { actor.state = 39; actor.showBooked = false; actor.commercialInside = false; }
    return;
  }
  actor.floor = person?.to ?? actor.floor;
  if (purpose === 'show-arrival') admitShow(room, actor);
  else if (purpose === 'show-meal-arrival') admitMeal(tower, actor);
  else { actor.state = 39; actor.floor = 0; actor.job = null; actor.commercialInside = false; }
}
export function validateShowState(room) {
  const show = room.show, count = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
  if (!show || !count(show.stage, 3) || !Array.isArray(show.remaining) || show.remaining.length !== 2
    || !show.remaining.every(value => count(value, 60)) || !count(show.inside, 120) || !count(show.visitors, 127)
    || room.key === 'partyhall' && show.remaining[0] !== 0) throw new Error('Invalid show patron data.');
  if(room.key==='cinema'&&room.movie?.pendingTitle!==undefined&&(typeof room.movie.pendingTitle!=='boolean'||room.movie.pendingTitle&&(!room.constructionRemaining||room.nativeConstructionParts?.some(part=>part.completed))))throw new Error('Invalid cinema construction title.');
  return true;
}
export function validateShowActor(actor) {
  if (actor.showBooked !== undefined && typeof actor.showBooked !== 'boolean') throw new Error('Invalid show actor data.');
  return true;
}

export function showSprites(room) {
  // 0xA5A4..A625 / original bitmap bank entries: show state is independent
  // of daylight. Upper artwork is24pixels tall and sits twelve pixels down.
  const stage = room.show?.stage ?? 0, x = room.x * 8, y = -(room.floor + 1) * 36;
  if (room.key === 'partyhall') return [2856, 2920].map((sheet, level) => ({ sheet,
    x, y: y + level * 36 + (level === 0 ? 12 : 0), width: 192,
    height: level === 0 ? 24 : 36, sx: Math.min(2, stage) * 192, sy: 0 }));
  const booth = room.width >= 31 ? 56 : 0;
  const boothFrame = stage === 3 ? 3 + room.movie.index : stage;
  const sprites = booth ? [3176, 3240].map((base, level) => ({ sheet: base + Math.trunc(boothFrame / 10),
    x, y: y + level * 36 + (level === 0 ? 12 : 0), width: 56,
    height: level === 0 ? 24 : 36, sx: boothFrame % 10 * 56, sy: 0 })) : [];
  return sprites.concat([2152, 2216].map((sheet, level) => ({ sheet,
    x: x + booth, y: y + level * 36 + (level === 0 ? 12 : 0), width: 192,
    height: level === 0 ? 24 : 36, sx: stage * 192, sy: 0 })));
}

export function missingVenueRecovery(actor, person = null) {
  // Native 0x3BF6D frees the destroyed facility's own pool only. A foreign
  // visitor's route survives; 0x2C531/32C32 detect the removed destination.
  const purpose = person?.purpose;
  if (actor.state === 35) return { preserveTrip: true, state: 35, immediateReturn: true, medicalNotice: false };
  if (actor.state === 34) return { preserveTrip: true, state: 34, immediateReturn: true, medicalNotice: false };
  if (actor.state === 66 || purpose === 'clinic-arrival') return { preserveTrip: true, state: actor.state, immediateReturn: false, medicalNotice: true };
  if (actor.state === 65 || purpose?.includes('meal-arrival') || purpose === 'lunch-arrival') return { preserveTrip: true, state: actor.state, immediateReturn: false, medicalNotice: false };
  return null;
}
