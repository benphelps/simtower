import { businessReceipt } from './original-economy.js';
import { nativeActorMean,signedWord,signedByte } from './original-actor-stats.js';
import { nativeAdmissionRetryStats } from './original-person-info.js';
import {COMMERCIAL_LIMITS,commercialDemandKind,commercialOpeningBudget,commercialFeedbackBudget} from './original-demand.js';
import {markInteriorDirty} from './original-interiors.js';
export {COMMERCIAL_LIMITS} from './original-demand.js';

export const COMMERCIAL_TYPES = new Set(['fastfood', 'restaurant', 'shop']);
export const COMMERCIAL_ACTORS = 48; // 0x47F0B, separate from inside capacity.
export const COMMERCIAL_CAPACITY = 40;
// PART 0x1e/0x20/0x22, 0x2c/0x2e/0x30 and 0x38/0x3a/0x3c.
export function commercialStyleCount(key) { return key === 'shop' ? 11 : 5; }
export function commercialName(data, room) {
  // 0x24D9B reads the native establishment name matching the style counter.
  const resource = room.key === 'shop' ? 716 : room.key === 'restaurant' ? 714 : 715;
  return data.strings[resource][(room.variant || 0) % commercialStyleCount(room.key)];
}
export function commercialSprite(room) {
  // 0xA49C / 0xA52C: shop state-1/3 has dedicated empty/closed resources;
  // occupied shop styles have three states. Food styles have four states,
  // distributed over two adjacent two-frame original bitmap resources.
  const state = room.commercial?.state ?? (room.occupied ? 2 : 3);
  const style = (room.variant || 0) % commercialStyleCount(room.key);
  const width = room.key === 'restaurant' ? 192 : room.key === 'fastfood' ? 128 : 96;
  if (room.key === 'shop') return { sheet: state === -1 ? 1651 : state === 3 ? 1652 : 1640 + style,
    x: state < 0 || state === 3 ? 0 : state * width, y: 0, width, height: 24 };
  return { sheet: (room.key === 'restaurant' ? 1384 : 1768) + style * 2 + Math.trunc(Math.max(0, state) / 2),
    x: Math.max(0, state) % 2 * width, y: 0, width, height: 24 };
}
export function validateCommercialState(record) {
  const count = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
  if (!record || ![-1, 0, 1, 2, 3].includes(record.state)
    || !Array.isArray(record.recommendations) || record.recommendations.length !== 3 || !record.recommendations.every(value => count(value, 50))
    || !count(record.remaining, 50) || !count(record.generated, 127) || !count(record.population, 127)
    || !count(record.inside, 255) || !count(record.visitors, 65535)
    || !Number.isInteger(record.nextPatron) || record.nextPatron < -51 || record.nextPatron > 32767
    || !Number.isFinite(record.lastProfit)) throw new Error('Invalid commercial patron data.');
  return true;
}
export function validateCommercialActor(actor) {
  for (const key of ['commercialBooked', 'commercialInside']) if (actor[key] !== undefined && typeof actor[key] !== 'boolean') throw new Error('Invalid commercial actor data.');
  return true;
}
export function commercialDayKind(weekend, special = false) {
  // 0x33710: the rainy-day latch has priority over weekday/weekend.0x63CD
  // sets it at dawn on date%8==4 below5stars;640D clears only the sky later.
  return commercialDemandKind(weekend,special);
}
export function newCommercialState(key, tick = 0) {
  // 0x32673 / 0x33737. New restaurants start closed. Fast food/shops
  // installed after opening but before phase1 start with ten live patrons.
  const open = key !== 'restaurant' && tick > 240 && tick < 400;
  return { state: key === 'shop' ? -1 : open ? 0 : 3,
    recommendations: [10, 10, 10], remaining: open ? 10 : 0,
    generated: open ? 0 : 10, population: open ? 10 : 0,
    nextPatron: open ? -11 : -1, inside: 0, visitors: 0, lastProfit: 0 };
}
export function openCommercialDay(record, key, weekend, special = false,room=null) {
  // 0x32192: weekend uses the larger weekday/weekend recommendation list.
  // The selected reputation bucket is consumed, while the other two survive.
  const {kind,remaining}=commercialOpeningBudget(record.recommendations,key,weekend,special),recommendations=[...record.recommendations];
  recommendations[kind] = 0;
  if(room)markInteriorDirty(room);
  return { ...record, state: record.state === -1 ? -1 : 0, recommendations,
    remaining, nextPatron: -(remaining + 1), population: record.generated,
    generated: 0, inside: 0, visitors: 0 };
}
export function recommendCommercial(record, key, meanStress, data, star, weekend, special = false) {
  // 0x330BC: bad patrons make no recommendation; there is no invented
  // subtraction. No recommendations means the next opening falls back to ten.
  if (meanStress < 0) return record;
  const recommendations=commercialFeedbackBudget(record.recommendations,key,meanStress,data,star,weekend,special);
  return { ...record, recommendations };
}
export function bookCommercialPatron(record, childIndex) {
  // 0x32FF0: consume one of this facility's own scheduled applicants.
  if (!record.remaining || record.nextPatron < 0 && childIndex > -record.nextPatron + 1) return { record, booked: false };
  return { record: { ...record, remaining: record.remaining - 1, generated: record.generated + 1, visitors: (record.visitors + 1)&65535 }, booked: true };
}
export function cancelCommercialPatron(record) {
  // 0x3307E: failed initial route restores the exact reservation counters.
  return { ...record, remaining: record.remaining + 1, generated: record.generated - 1, visitors: (record.visitors - 1)&65535 };
}
export function admitCommercialVisit(record, external = true,room=null) {
  // 0x32C32: closed/unleased destinations fail; full destinations wait.
  if (!record || [-1, 3].includes(record.state)) return { record, status: 'missing' };
  // 0x32D18 compares the BYTE with signed JGE. Dawn can clear the
  // counter before an old visitor leaves, so 255 is native -1, not full.
  const signedInside=record.inside>=128?record.inside-256:record.inside;
  if (signedInside >= COMMERCIAL_CAPACITY) return { record, status: 'waiting' };
  const inside = (record.inside + 1)&255;
  if(room&&(inside===1||inside===10))markInteriorDirty(room); //32B45 entry thresholds, even if frame byte repeats.
  return { record: { ...record, inside, state: inside===1?1:inside===10?2:record.state,
    visitors: (record.visitors + Number(external))&65535 }, status: 'admitted' };
}
export function leaveCommercialVisit(record,room=null) {
  // 0x32E4E / 0x32B45: state changes when the population drops to 9 or 0.
  const inside = (record.inside - 1)&255;
  if(room&&(inside===0||inside===9))markInteriorDirty(room);
  return { ...record, inside, state: inside === 0 ? 0 : inside ===9 ? 1 : record.state };
}
export function commercialEvaluation(data, room) {
  // 0x28F04 / 0x28EB9: shop sales include the remaining daily patron pool;
  // rent changes the sales thresholds rather than resident travel stress.
  const record = room.commercial;
  if (!record) return -1;
  if (room.key === 'shop') {
    const shift = room.price === 0 ? 5 : room.price === 2 ? -5 : room.price === 3 ? -12 : 0;
    const customers = signedWord(signedByte(record.remaining)+record.visitors);
    return customers < 20 + shift ? 0 : customers < 25 + shift ? 1 : 2;
  }
  const thresholds = data.businessReceipts[room.key === 'fastfood' ? 12 : 6].thresholds;
  const visits=signedWord(record.visitors);
  return visits < thresholds[2] ? 0 : visits < thresholds[1] ? 1 : visits < thresholds[0] ? 2 : 3;
}
export function closeCommercialDay(record, key, data, dayCounter,room=null) {
  // 0x32552 shops receive quarter rent instead of closing receipts.
  if(room)markInteriorDirty(room);
  return { ...record, state: record.state === -1 ? -1 : 3,
    lastProfit: key === 'shop' ? 0 : businessReceipt(data, key === 'fastfood' ? 12 : 6, record.visitors, dayCounter) };
}
export function commercialArrivalDue(key, tick, randomInt) {
  // 0x446B9 / 0x44E4D update one actor cohort, then sample these attempts.
  const phase = Math.trunc(tick / 400);
  if (key === 'restaurant') return phase === 4 ? randomInt(12) === 0 : phase > 4 && tick < 2200;
  if (phase < 4) return tick > 240 && randomInt(36) === 0;
  return phase === 4 && randomInt(6) === 0;
}

function admitOwnPatron(tower, actor, room) {
  actor.admissionTick = tower.state.tick;
  const result = admitCommercialVisit(room.commercial, false,room);
  room.commercial = result.record;
  if (result.status === 'waiting') { actor.state = 96; return; }
  if (result.status === 'missing') {
    Object.assign(actor,nativeAdmissionRetryStats(actor,tower.state.tick,tower.data.visits.missingPenalty));
    actor.admissionTick=0;
  }
  actor.state = 5; actor.visitTick = tower.state.tick;
  actor.commercialInside = result.status === 'admitted';
}
export function updateCommercialActor(tower, actor, room, beginTrip) {
  // Called once per native actor cohort by original-people's dispatcher.
  // 0x446B9 / 0x44E4D / 0x448A0 / 0x45031: own patrons arrive, remain
  // for the venue's PART visit duration, and return outside before feedback.
  if (!room.commercial || actor.trip !== null) return;
  const tick = tower.state.tick, record = room.commercial;
  if (actor.state === 39) { if (tick > 2300) actor.state = 32; return; }
  if (actor.state === 96) {
    // 0x45031/0x448A0 route another same-floor attempt before retrying
    // admission32C32;3E2EE records that zero-stress completed attempt.
    Object.assign(actor,nativeAdmissionRetryStats(actor,tick));
    admitOwnPatron(tower, actor, room); return;
  }
  if (actor.state === 32) {
    if (record.state === 3) { actor.state = 39; return; }
    if (room.key === 'shop' && record.state === -1 && room.accepting === false) return;
    if (!commercialArrivalDue(room.key, tick, max => tower.randomInt(max))) return;
    const reservation = bookCommercialPatron(record, actor.index);
    if (!reservation.booked) return;
    room.commercial = reservation.record; actor.commercialBooked = true;
    const started = beginTrip(tower, actor, room, 0, room.floor, 'commercial-arrival');
    if (started && room.key === 'shop' && room.commercial.state === -1) {
      tower.admitTenant(room); room.commercial = { ...room.commercial, state: 0 };
    }
    return;
  }
  if (actor.state === 5) {
    if (![-1, 3].includes(record.state) && actor.commercialInside && tick - actor.visitTick < (tower.data.visits[room.key] || 60)) return;
    if (![-1, 3].includes(record.state)) room.commercial = leaveCommercialVisit(record,room);
    actor.commercialInside = false;
    beginTrip(tower, actor, room, actor.floor, 0, 'commercial-departure');
  }
}
export function finishCommercialActorTrip(tower, actor, room, success, purpose) {
  // Caller records the trip's delay/count first, just like 0x36B20. Only
  // commercial home patrons add referrals; visiting office/condo residents do
  // not call 0x330BC from their lunch return routine 0x48844.
  if (purpose === 'commercial-arrival') {
    if (!success) {
      if (actor.commercialBooked) room.commercial = cancelCommercialPatron(room.commercial);
      actor.commercialBooked = false; actor.state = 32; actor.floor = 0;
      actor.delay = 0; actor.trips = 0; return;
    }
    actor.commercialBooked = false; actor.floor = room.floor;
    admitOwnPatron(tower, actor, room); return;
  }
  actor.state = 39; actor.floor = 0; actor.commercialInside = false;
  const mean = nativeActorMean(actor);
  room.commercial = recommendCommercial(room.commercial, room.key, mean,
    tower.data, tower.state.star, tower.calendar.weekend, Boolean(tower.state.commercialSpecialDay));
}
