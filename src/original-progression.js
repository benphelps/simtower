import { calendar, clockTime } from './original-clock.js';

// 0x2A080 initializes these flags. 0x2A1E7 latches security / suites on
// construction, even if the facility is subsequently demolished.
export function initializeProgression(state) {
  state.nativeFlags ??= {};
  const flags = state.nativeFlags;
  flags.securityBuilt ??= state.rooms.some(room => room.key === 'security');
  flags.suitesBuilt ??= state.rooms.some(room => room.key === 'suite');
  flags.progressionWarned ??= false;
  flags.medicalReady ??= false;
  return flags;
}

export function noteProgressionConstruction(state, key) {
  const flags = initializeProgression(state);
  if (key === 'security') flags.securityBuilt = true;
  if (key === 'suite') flags.suitesBuilt = true;
  // 0x2A1E7 clears 5ABAD after every successful construction.
  flags.progressionWarned = false;
}

// 0x2C3BF resets 5ABB1 at the start of the simulation day. It represents
// unmet clinic availability, not a required clinic count or patient stress.
export function resetMedicalDemand(state) {
  if (state.star >= 3) initializeProgression(state).medicalReady = true;
}

// 0x2C8BC: missing clinic selection, or a selected clinic removed before
// admission, displays native info string 1010/6 and clears the daily latch.
export function reportMissingClinic(state) {
  initializeProgression(state).medicalReady = false;
  return 6;
}

// 0x2C531: a full clinic retries admission. It does not invalidate 5ABB1.
export function medicalAdmission(clinic, actors) {
  if (!clinic || clinic.key !== 'medical') return 'missing';
  const patients = clinic.medicalInside===undefined?actors.filter(actor => actor.job === clinic.id && actor.state === 35).length:clinic.medicalInside<<24>>24;
  return patients >= 40 ? 'waiting' : 'admitted';
}

// 0x2C6B4 checks the native clock difference against 16, without a modulo
// correction; a removed clinic permits an immediate return.
export function medicalTreatmentComplete(tick, visitTick, clinicPresent = true) {
  return !clinicPresent || tick - visitTick >= 16;
}

export function medicalSprite(state, room) {
  // 0xA63A: native clinic inside-byte selects active1832. Empty clinics
  // use1833duringdaylight and1834atnight, independent of room.occupied.
  const inside=room.medicalInside===undefined?(state.actors || []).some(actor=>actor.job===room.id&&actor.state===35):room.medicalInside!==0;
  return {sheet:inside?1832:clockTime(state.tick).daylight?1833:1834,
    x:room.x*8,y:-(room.floor+1)*36+12,width:208,height:24,sx:0,sy:0};
}

// 0x29F8D compares the population counter with four PART thresholds, then
// 15000. 0x2A0FE explicitly rejects promotion from five stars.
export function populationRating(population, thresholds) {
  for (let index = 0; index < 4; index++) if (population < thresholds[index]) return index + 1;
  return population < 15000 ? 5 : 6;
}

// 0x29B9D / 0x2A0FE. Returns a native info-string index only when that
// particular gate displays one; garbage, VIP, metro and time gates are silent.
export function promotionDecision(state, population, thresholds) {
  const flags = initializeProgression(state);
  if (state.sandbox || state.star >= 5 || populationRating(population, thresholds) <= state.star) {
    return { eligible: false, info: 0 };
  }
  let info = 0;
  if (state.star === 2 && !flags.securityBuilt) info = 1;
  if (state.star === 3 && !flags.suitesBuilt) info = 2;
  if (info) return { eligible: false, info: flags.progressionWarned ? 0 : info };
  if (state.star >= 3) {
    if (!state.garbage.working || state.star === 3 && !flags.vipPassed ||
        state.star === 4 && !state.rooms.some(room => room.key === 'metro') ||
        clockTime(state.tick).phase < 4 || calendar(state.calendarDay).weekend) {
      return { eligible: false, info: 0 };
    }
    if (!flags.medicalReady) return { eligible: false, info: flags.progressionWarned ? 0 : 6 };
  }
  return { eligible: true, info: 0 };
}

export function acknowledgeProgressionWarning(state) {
  initializeProgression(state).progressionWarned = true;
}

// 0x2A0BD resets the successful VIP visit and the shared warning latch.
export function resetAfterPromotion(state) {
  const flags = initializeProgression(state);
  flags.vipPassed = false;
  flags.progressionWarned = false;
}
