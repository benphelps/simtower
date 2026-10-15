import { CATALOG, HOTELS } from './catalog.js';
import { COMMERCIAL_TYPES, commercialName } from './original-commercial.js';
import { nativeHotelState } from './original-hotels.js';
import { acceptanceEvaluation, residentStress,nativeLeaseOccupied } from './original-tenancy.js';
import { venueBand } from './original-people.js';
import { noisyNeighbor } from './original-systems.js';
import { personFrame, nativeQueuePosition, nativeQueueBounds, nativeQueueVisibleSpan } from './people-sprites.js';
import {signedWord} from './original-actor-stats.js';

export function nativeFacilityTitle(data, room) {
  // 0x24D9B,0x21E65: original type/style names or the user-assigned name.
  return room.name || (COMMERCIAL_TYPES.has(room.key) ? commercialName(data, room) : data.strings[710][CATALOG[room.key].id]);
}
export function nativeFacilityStateLabel(data, room, tick) {
  // 0x216BD: occupied/for-rent/for-sale, and clean/dirty hotel vacancies.
  const text = data.strings[712];
  if (HOTELS.has(room.key)) {
    const state = nativeHotelState(room, tick);
    return text[state < 24 ? 2 : state < 40 ? 5 : 6];
  }
  if (room.key === 'condo') return text[nativeLeaseOccupied(room,tick) ? 2 : 4];
  if (room.key === 'office') return text[nativeLeaseOccupied(room,tick) ? 2 : 3];
  if (room.key === 'shop') return text[room.commercial?.state === -1 ? 3 : 2];
  return '';
}
export function nativePriceEnabled(room) {
  // 0x204E8 disables the occupied condo's combo13; other contracts remain
  // editable. Construction and unrelated facilities have no price combo.
  const occupied=Number.isInteger(room.tenantState)?nativeLeaseOccupied(room):room.occupied||room.sold;
  return !(room.key === 'condo' && occupied);
}
export function nativeFacilityGraph(data, state, room) {
  // 0x21C10/0x21C94: resident stress decreases quality; commercial sales
  // increase quality. Sales graphs show actual visitors, not the prospective
  // remaining+visitors used by the quarterly shop evaluation.
  if (COMMERCIAL_TYPES.has(room.key)) {
    const value = signedWord(room.commercial?.visitors ?? room.visitors ?? 0); //21C94 JGE / %d.
    const shift = room.price === 0 ? 5 : room.price === 2 ? -5 : room.price === 3 ? -12 : 0;
    const bad = room.key === 'shop' ? 20 + shift : 25, good = room.key === 'shop' ? 25 + shift : 35;
    return { value, maximum: room.key === 'shop' ? 30 : 50, band: value < bad ? 2 : value < good ? 1 : 0, good, bad, increasing: true };
  }
  if (!['office', 'condo', ...HOTELS].includes(room.key)) return null;
  if (HOTELS.has(room.key) && nativeHotelState(room, state.tick) >= 56) return null;
  const value = residentStress(room, state.rooms), evaluation = acceptanceEvaluation(data, room, value, state.star);
  if (evaluation < 0) return null;
  const tier = state.star < 3 ? 0 : state.star === 3 ? 1 : 2;
  return { value, maximum: 300, band: 2 - evaluation, good: data.tenantStress.good[tier], bad: data.tenantStress.bad[tier], increasing: false };
}
export function nativeTransportDiagnostic(data, room, path, shafts) {
  // 0x24FD6 scores travel towards the ground lobby from the facility's LEFT
  // edge. Express access does not report horizontal-distance complaints.
  const text = data.strings[711];
  if (path === null) return text[0];
  const first = path?.[0]; if (!first) return null;
  if (first.kind === 'elevator' && shafts.find(s => s.id === first.id)?.key === 'express') return null;
  const distance = Math.abs((first.accessX ?? first.x) - room.x);
  if (distance < 80) return null;
  const very = Number(distance >= 125);
  return text[(first.kind === 'elevator' ? 11 : first.type === 'escalator' ? 13 : 15) + very];
}
export function nativeFacilityDiagnostics(data, state, room, path) {
  // Each native diagnostic renderer checks the same three-line limit.
  const text = data.strings[711], result = [];
  const transport = nativeTransportDiagnostic(data, room, path, state.shafts || []);
  if (transport) result.push(transport);
  if (COMMERCIAL_TYPES.has(room.key)) {
    const record = room.commercial, visitors = signedWord(record?.visitors ?? room.visitors ?? 0);
    if (room.key === 'shop' && record?.state === -1) result.push(text[32]);
    else {
      const graph = nativeFacilityGraph(data, state, room);
      result.push(text[room.key !== 'shop' && visitors >= 50 ? 7 : graph.band === 0 ? 8 : graph.band === 1 ? 9 : 10]);
    }
    if (venueBand(room.floor) < 0) result.push(text[20]); // 0x2544E.
    if ((room.key === 'restaurant' ? state.tick > 1600 && state.tick < 2200 : state.tick > 240 && state.tick < 2000)
      && [-1, 3].includes(record?.state)) result.push(text[23]); // 0x25511.
    else if (state.commercialSpecialDay) result.push(text[22]); // 0x254D2, rainy-day latch.
    else if (state.calendarDay % 3 === 2) result.push(text[21]); // 0x25493 weekend hint.
  }
  if (HOTELS.has(room.key) && nativeHotelState(room, state.tick) >= 56) result.push(text[25]); // 0x255C6.
  if (['office', 'condo', ...HOTELS].includes(room.key)) {
    const neighbor = noisyNeighbor(room, state.rooms);
    if (neighbor) result.push(`${data.strings[710][CATALOG[neighbor.key].id]}${text[34]}${text[35]}`); // 0x25877.
  }
  return result.slice(0, 3);
}

export function nativeQueuePersonAt(data, state, floor, x) {
  // 0x16BBE searches the up ring on the shaft's left and down ring on its
  // right; each identity occupies the one/two-cell width from0x17B41.
  const groups = new Map();
  const people = state.people.filter(p => p.stage === 'queue' && p.floor === floor)
    .sort((a, b) => (a.queueOrder ?? a.id) - (b.queueOrder ?? b.id));
  for (const person of people) {
    const shaft = state.shafts.find(s => s.id === person.path?.[0]?.id);
    const actor = state.actors.find(a => a.id === person.actor), room = state.rooms.find(r => r.id === actor?.room);
    if (!shaft || !actor || !room) continue;
    const frame = personFrame(person, actor, room, state, data);
    const group = `${shaft.id}:${Number(person.path[0].to > floor)}`;
    const earlier = groups.get(group) || [], left = nativeQueuePosition(shaft, person, earlier, frame);
    earlier.push(frame); groups.set(group, earlier);
    const bounds=nativeQueueBounds(state,shaft,floor);
    const span=nativeQueueVisibleSpan(bounds,left,frame.width/8,person.path[0].to>floor);
    if (span&&x>=bounds.left&&x<bounds.right&&x >= span.x && x < span.x + span.width) return person;
  }
  return null;
}
export function nativePersonLocation(state, actor) {
  // Find Tenant locates the actual transport ring/car identity. A passenger
  // in a car follows its current floor, rather than its old boarding floor.
  const person = state.people.find(p => p.id === actor.trip), room = state.rooms.find(r => r.id === actor.room);
  if (!room) return null;
  if (!person && [32, 33, 37, 38, 39].includes(actor.state)) return { outside: true };
  if (person?.stage === 'car') {
    for (const shaft of state.shafts) {
      const car = shaft.cars.find(c => c.people.includes(person.id));
      if (car) return { outside: false, x: shaft.x + shaft.width / 2, floor: car.floor };
    }
  }
  return { outside: false, x: person?.x ?? room.x + room.width / 2, floor: person?.floor ?? actor.floor };
}
export function nativeFacilityOccupants(state, room) {
  // 0x22923 / 0x40592 enumerate the commercial facility's actual admitted
  // visitors, including residents whose home belongs to another room. The
  // 48 allocated own patron identities are not an always-visible occupant grid.
  if (COMMERCIAL_TYPES.has(room.key)) return state.actors.filter(actor => actor.trip === null &&
    (actor.room === room.id && actor.state === 5 && actor.commercialInside
      || actor.job === room.id && actor.state === 34 && actor.commercialInside));
  // 0x22561 draws residents only while their state is <=16. The hotel's
  // reserved slot0 never appears. Staff use their own visibility predicates.
  return state.actors.filter(actor => {
    if (actor.room !== room.id) return false;
    if (room.key === 'office' || room.key === 'condo') return actor.state <= 16;
    if (HOTELS.has(room.key)) return actor.index > 0 && actor.state <= 16;
    if (room.key === 'housekeeping') return (actor.state === 0 || actor.state === 1) && actor.floor === room.floor;
    return true; // Security's six allocated identities are always shown.
  });
}
export function nativeCarOccupants(state, car) {
  // 0x217B6's passenger grid follows the car's actual passenger slots.
  return car.people.map(id => {
    const person = state.people.find(p => p.id === id);
    return { person, actor: state.actors.find(a => a.id === person?.actor) || null };
  }).filter(entry => entry.person);
}
