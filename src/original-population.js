import { CATALOG } from './catalog.js';
import { signedWord } from './original-actor-stats.js';

// 0xD55E: population shares the income category mapping, not all actor pools.
export const POPULATION_CATEGORY_TYPES = [7,3,4,5,10,12,6,29,18,9];
export function nativePopulationCategory(type) {
  if (type === 30) type = 29;
  if ([19,34,35].includes(type)) type = 18;
  return POPULATION_CATEGORY_TYPES.indexOf(type);
}
export function newPopulationCounters() { return { categories: Array(10).fill(0), total: 0 }; }
export function validatePopulationCounters(counters) {
  const long = value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
  if (!counters || !Array.isArray(counters.categories) || counters.categories.length !== 10 || !counters.categories.every(long) || !long(counters.total) || (counters.categories.reduce((sum,value)=>sum+value,0)|0) !== counters.total) throw new Error('Invalid native population counters.');
  return true;
}
export function changeNativePopulation(counters, type, delta) {
  validatePopulationCounters(counters);
  const category = nativePopulationCategory(type);
  if (category < 0) return counters;
  const categories = [...counters.categories], amount = signedWord(delta);
  categories[category] = (categories[category]+amount)|0;
  return { categories, total: (counters.total+amount)|0 }; // 0xD497 MOVSX WORD delta → LONG.
}
export function clearNativePopulationCategory(counters, type) {
  validatePopulationCounters(counters);
  const category = nativePopulationCategory(type);
  if (category < 0) return counters;
  const categories = [...counters.categories], amount = categories[category];
  categories[category] = 0;
  return { categories, total: (counters.total-amount)|0 }; // 0xD453.
}
export function nativePopulationEvent(room, event) {
  const type = CATALOG[room.key]?.id;
  let delta = 0;
  if (event === 'admit') delta = type === 7 ? 6 : type === 9 ? 3 : type === 10 ? 10 : type === 3 ? 1 : [4,5].includes(type) ? 2 : 0;
  else if (event === 'vacate') delta = type === 7 ? -6 : type === 9 ? -3 : 0;
  else if (event === 'checkout') delta = type === 3 ? -1 : [4,5].includes(type) ? -2 : 0;
  else if (event === 'remove' && !room.constructionRemaining) {
    // 0x3C074: occupied byte range gates just office/condo/hotel removal.
    // Commercial/show daily population remains until its CATEGORY reset.
    const state = type === 7 || type === 9 ? room.tenantState : room.hotelState;
    const occupied = Number.isInteger(state) ? ((state&255)<<24>>24) < (type === 7 ? 16 : 24) : room.occupied;
    if (occupied) delta = type === 7 ? -6 : type === 9 ? -3 : type === 3 ? -1 : [4,5].includes(type) ? -2 : 0;
  }
  return { type, delta };
}
export function populationResetTypes(tick) {
  return tick === 240 ? [12,10,18,29] : tick === 1600 ? [6] : [];
}
export function inferPopulationCounters(rooms) {
  // Old browser saves lack deleted-business allowances and the shop's extra
  // first-admission ten. This migration preserves their old visible total;
  // it cannot recover the missing original counter history.
  let counters = newPopulationCounters();
  for (const room of rooms) {
    if (room.constructionRemaining) continue;
    const type = CATALOG[room.key]?.id;
    const count = [6,10,12].includes(type) ? room.commercial?.population || 0
      : [18,29].includes(type) ? room.dailyPopulation || 0
      : room.occupied ? nativePopulationEvent(room,'admit').delta : 0;
    counters = changeNativePopulation(counters,type,count);
  }
  return counters;
}
