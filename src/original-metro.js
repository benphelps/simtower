import { leaveCommercialVisit } from './original-commercial.js';
import {commercialActorVenue,admitSelectedCommercialVisit,retryCommercialAdmission} from './original-commercial-registry.js';

export const METRO_ACTORS = 240; // 0x47F0B case33, initialized by4151D.
export function metroEntrance(room) { return room.floor; } // bottom record+2 = upper floor.
export function metroArrivalDue(tick, randomInt) { return tick > 240 && tick < 1600 && randomInt(36) === 0; }
function admitMetroVisitor(tower, actor) {
  if(admitSelectedCommercialVisit(tower,actor)==='waiting'){actor.state=65;return;}
  actor.state = 34; actor.visitTick = tower.state.tick;
}
export function updateMetroActor(tower, actor, room, beginTrip, chooseVenue) {
  // 0x4553B/45680: repeated daytime commercial visits, no train-state gate.
  if (actor.trip !== null) return;
  const tick = tower.state.tick;
  if (actor.state === 39) { if (tick > 2300) actor.state = 1; return; }
  if (actor.state === 1) {
    if (!metroArrivalDue(tick, max => tower.randomInt(max))) return;
    // 0x33397/33201 uses the entire ground-lobby list. A selected closed
    // venue is rejected once; it does not retry a different establishment.
    const venue = chooseVenue(tower, 0, ['fastfood', 'restaurant', 'shop'][tower.randomInt(3)]);
    if (!venue || venue.commercialSlot<0 || venue.commercial && [-1, 3].includes(venue.commercial.state)) { actor.state = 39; return; }
    actor.job = venue.id;
    if(venue.commercialSlot!==undefined)actor.commercialSlot=venue.commercialSlot;else delete actor.commercialSlot;
    beginTrip(tower, actor, room, metroEntrance(room), venue.floor, 'metro-arrival');
  } else if (actor.state === 65) {if(actor.commercialSlot<0)actor.state=39;else retryCommercialAdmission(tower,actor,room,beginTrip,'metro-arrival',()=>admitMetroVisitor(tower,actor));}
  else if (actor.state === 34) {
    const selected=commercialActorVenue(tower.state,actor),venue=selected.room;
    if(selected.index!==undefined)actor.floor=selected.floor;
    const live = venue?.commercial && ![-1, 3].includes(venue.commercial.state);
    if (live && tick - actor.visitTick < (tower.data.visits[venue.key] || 60)) return;
    if (live) venue.commercial = leaveCommercialVisit(venue.commercial,venue);
    actor.commercialInside = false;
    beginTrip(tower, actor, room, actor.floor, metroEntrance(room), 'metro-return');
  }
}
export function finishMetroActorTrip(tower, actor, room, success, purpose, person = null) {
  actor.trip = null;
  if (!success) { actor.state = 39; actor.commercialInside = false; actor.job = null; return; }
  actor.floor = person?.to ?? actor.floor;
  if (purpose === 'metro-arrival') admitMetroVisitor(tower, actor);
  else { actor.state = 1; actor.floor = metroEntrance(room); actor.job = null; actor.commercialInside = false; }
}
export function metroTrainTick(state, randomInt, hooks = {}) {
  // 0x3CEF6 calls384F3 only between240 and1600;384F3 mask9 suppresses
  // trains during an active bomb/fire, but a demand dialog has no mask yet.
  const stations = state.rooms.filter(room => room.key === 'metro' && !room.constructionRemaining);
  if (!stations.length || state.tick <= 240 || state.tick >= 1600
    || state.emergency && state.emergency.stage !== 'demand' || randomInt(100) !== 0) return false;
  let arrived = false;
  for (const station of stations) { station.metroTrain = !station.metroTrain; arrived ||= station.metroTrain; }
  if (arrived) hooks.sound?.(10010, 'Background');
  return true;
}
export function metroSprites(room) {
  return [2984, 3048, 3112].map((base, level) => ({ sheet: base + Number(Boolean(room.metroTrain)),
    x: room.x * 8, y: -(room.floor + 1) * 36 + level * 36 + (level === 0 ? 12 : 0),
    width: room.width * 8, height: level === 0 ? 24 : 36,
    sx: 0, sy: 0 }));
}
