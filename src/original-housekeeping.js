import { HOTELS } from './catalog.js';
import { hotelCleaned, nativeHotelState } from './original-hotels.js';

export function housekeepingCanStart(state) {
  // 0x46719 state0 only: before1500 and native fire/bomb bits1/8 clear.
  const emergency = state.emergency;
  return state.tick < 1500 && !(state.eventFlags & 9) &&
    !(emergency && (emergency.kind === 'fire' || emergency.stage !== 'demand'));
}
export function housekeepingTarget(rooms, actor, tick) {
  // 0x2A410 scans from current floor upward first, then floors below it
  // downward. Every floor scans its native room table left-to-right.
  // It does not reserve a room during the journey; clean state at arrival
  // resolves competing staff from different housekeeping centers.
  const candidates = rooms.filter(room => HOTELS.has(room.key) && !room.constructionRemaining &&
    [40, 48].includes(nativeHotelState(room, tick)) && (room.floor + 10) % 6 === actor.index);
  candidates.sort((a, b) => Number(a.floor < actor.floor) - Number(b.floor < actor.floor) ||
    (a.floor >= actor.floor ? a.floor - b.floor : b.floor - a.floor) || a.x - b.x);
  return candidates[0] || null;
}
export function housekeepingArrival(room, tick) {
  // 0x4680B's same-floor arrival calls2A6F2 immediately, marks reserved
  // hotel child0 as cleaning3, and starts the worker's three-update counter.
  // An arrival at/after1500 abandons the job without cleaning.
  if (tick >= 1500) return { worker: { state: 0, job: null, cleanTicks: 0 }, hotel: null };
  const clean = room && hotelCleaned(room, tick);
  return { worker: { state: 2, cleanTicks: 3 }, hotel: clean ? { ...clean, housekeepingOverlay: true } : null };
}
export function housekeepingCleaningTick(actor) {
  // 0x46B52 checks zero BEFORE decrementing:3,2,1,0 then finish on the
  // fourth cohort update. 0x2A8F2 clears reserved child0 to36; staff state0
  // seeks its next room from this floor instead of returning home each job.
  const remaining = actor.cleanTicks || 0;
  return remaining ? { worker: { cleanTicks: remaining - 1 }, finished: false, hotel: null }
    : { worker: { state: 0, cleanTicks: 0, job: null }, finished: true, hotel: { housekeepingOverlay: false } };
}
export function hotelHousekeepingPose(room, randomInt) {
  // 0x78EF reserved child0 state3: original type8 strip poses96..98.
  // Interior position is sampled over the room width excluding its last cell.
  if (!room.housekeepingOverlay) return null;
  return { cell: randomInt(room.width - 1), pose: 96 + randomInt(3) };
}
