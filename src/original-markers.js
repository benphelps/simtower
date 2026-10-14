import { personFrame, nativeQueuePosition } from './people-sprites.js';

export const FIND_ARROW_RESOURCE = 21256; // RT_BITMAP0x5308, native1D00E.
export function findPersonTarget(state, actor, data) {
  // 0x1CB72 selects the actual destination for inside-food/medical states.
  const room = state.rooms.find(room => room.id === actor.room);
  if (!room) return null;
  const person = state.people.find(person => person.id === actor.trip && person.stage !== 'done');
  if (!person && [32, 33, 36, 37, 38, 39].includes(actor.state)) return { outside: true };
  if (person?.stage === 'queue') {
    const shaft = state.shafts.find(shaft => shaft.id === person.path?.[0]?.id);
    if (shaft) {
      const up = person.path[0].to > person.floor;
      const earlier = state.people.filter(other => other.stage === 'queue' && other.floor === person.floor
        && other.path?.[0]?.id === shaft.id && (other.path[0].to > other.floor) === up
        && (other.queueOrder ?? other.id) < (person.queueOrder ?? person.id))
        .sort((a, b) => (a.queueOrder ?? a.id) - (b.queueOrder ?? b.id));
      const frame = personFrame(person, actor, room, state, data);
      const frames = earlier.map(other => {
        const owner = state.actors.find(actor => actor.id === other.actor);
        return personFrame(other, owner, state.rooms.find(room => room.id === owner?.room), state, data);
      });
      const x = nativeQueuePosition(shaft, person, frames, frame);
      // 0x176A2/1777D points at the shaft-facing cell of the actual identity.
      return { outside: false, x: x + (up ? frame.width / 8 - 1 : 0), floor: person.floor };
    }
  }
  if (person?.stage === 'car') {
    for (const shaft of state.shafts) {
      const car = shaft.cars.find(car => car.people.includes(person.id));
      if (car) return { outside: false, x: shaft.x + shaft.width / 2, floor: car.floor };
    }
  }
  if (!person && [34, 35].includes(actor.state)) {
    const venue = state.rooms.find(room => room.id === actor.job);
    return venue ? { outside: false, x: venue.x + Math.trunc(venue.width / 2), floor: venue.floor } : { outside: true };
  }
  return { outside: false, x: person?.x ?? room.x + Math.trunc(room.width / 2), floor: person?.floor ?? room.floor };
}
export function createFindMarker(target, now, actor = null) {
  if (!target || target.outside) return null;
  return { x: target.x, floor: target.floor, actor, started: Math.floor(now / 16) };
}
export function findMarkerExpired(marker, now) {
  // 0x1CFD0 /3DABA: strict300 GetTickCount>>4 units, approximately4.8s.
  return !marker || Math.abs(Math.floor(now / 16) - marker.started) > 300;
}
export function findMarkerSprite(marker) {
  if (!marker) return null;
  return { sheet: FIND_ARROW_RESOURCE, x: marker.x * 8 - 8,
    y: -(marker.floor + 1) * 36, width: 16, height: 16, sx: 0, sy: 0 };
}
