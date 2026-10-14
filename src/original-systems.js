import {nativeRoomMean} from './original-actor-stats.js';
import {nativeRoomPartCompleted} from './original-construction-ring.js';
// Pure translations of directly inspected native routines; callers that still
// reconstruct actor travel are documented separately in FEATURE_AUDIT.md.
export function nextRandom(seed) {
  // Borland RTL _rand, 0x324D; _srand (0x3236) starts with a 16-bit seed.
  const next = (Math.imul(seed, 0x015a4e35) + 1) >>> 0;
  return { seed: next, value: (next >>> 16) & 0x7fff };
}
export function tenantEvaluation(data, stress, rating) {
  // 0x29D19 / 0x28F04. -1 means no accessible tenancy, not a bad score.
  if (stress < 0) return -1;
  const tier = rating < 3 ? 0 : rating === 3 ? 1 : 2;
  return stress < data.tenantStress.good[tier] ? 2 : stress < data.tenantStress.bad[tier] ? 1 : 0;
}
export function meanTenantStress(stats) {
  // 0x28B7B / 0x28C0F: average each resident's truncated mean, then truncate
  // the mean across residents. Pooling all trips would weight commuters wrong.
  return nativeRoomMean(stats);
}
export function hotelStress(stress, tier, noisy) {
  // 0x28E4B: high +30, low -30, very low zero; nearby noise adds 60.
  const adjusted = tier === 3 ? 0 : stress + (tier === 0 ? 30 : tier === 2 ? -30 : 0);
  return Math.max(0, adjusted + (noisy ? 60 : 0));
}
export function noisyNeighbor(room, rooms) {
  // 0x298C0, 0x29965, 0x299E8, 0x29A78, 0x29B29: same-floor scans
  // within 10/20/30 cells for office/hotel/condo, not adjacent-floor radii.
  if(room.constructionRemaining || !['office','condo','single','twin','suite'].includes(room.key))return;
  const distance = room.key === 'office' ? 10 : room.key === 'condo' ? 30 : 20;
  const noise = other => nativeRoomPartCompleted(other,other.floor-room.floor) && (['restaurant','shop','fastfood','cinema','partyhall'].includes(other.key) || (other.key === 'office' && room.key !== 'office') || (room.key === 'condo' && ['single','twin','suite'].includes(other.key)));
  // 0x29965/299E8 compare quiet interval boundaries BEFORE examining the
  // next record. A noise source touching the limit therefore still counts.
  return rooms.find(other => other.id !== room.id && room.floor <= other.floor && room.floor > other.floor - (other.height || 1) && noise(other) && other.x <= room.x + room.width + distance && other.x + other.width >= room.x - distance);
}
export function recyclingStage(population, centers) {
  // 0xF780: a center supports fewer than 2,500 residents before overflowing.
  if (!centers) return 6;
  return Math.min(6, Math.trunc(Math.trunc(population / centers) / 500) + 1);
}
export function movieAudience(data, movie, days) {
  // 0x2E95E: attendance per half, four quality stages of three days each.
  if (movie < 0) return 50; // 0x2E3CF: party hall's fixed daily allowance.
  return (movie < 7 ? data.movie.classicAudience : data.movie.newAudience)[Math.min(3,Math.trunc(days / 3))];
}
export function movieReceipt(data, visitors) {
  // 0x2E9ED: ascending 40/80/100 thresholds, per-show receipts.
  const tier = visitors < data.movie.thresholds[0] ? 0 : visitors < data.movie.thresholds[1] ? 1 : visitors < data.movie.thresholds[2] ? 2 : 3;
  return data.movie.receipts[tier] * data.moneyScale;
}
export function newElevatorPrograms() {
  // 0x39904 fills fourteen slots: two day types x seven clock phases.
  return Array.from({length:2},()=>Array.from({length:7},()=>({ mode:1, response:5, departure:0, wait:0 })));
}
export function tenureLabel(data, tenure) {
  // 0x22127: quarter numbering is one-based; omit zero years.
  const text=data.strings[713];
  return tenure>=120 ? text[4] : `${tenure>=4?Math.trunc(tenure/4)+text[0]:''}${tenure%4+1}${text[3]}`;
}
export function elevatorProgram(shaft, tick, weekend) {
  return shaft.programs[weekend ? 1 : 0][Math.trunc(tick / 400)];
}
export function carMotion(key, remaining, travelled) {
  // 0x11A3F / 0x10A84: one floor per update, delayed near endpoints;
  // an express car in the middle of a long run advances three floors.
  if(remaining<=1 || travelled<=1)return {floors:1,delay:5};
  if(key==='express')return remaining<=4 || travelled<=4 ? {floors:1,delay:0} : {floors:3,delay:0};
  return remaining<=3 || travelled<=3 ? {floors:1,delay:2} : {floors:1,delay:0};
}
