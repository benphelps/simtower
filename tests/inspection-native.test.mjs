import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nativeFacilityTitle, nativeFacilityStateLabel, nativePriceEnabled, nativeFacilityGraph, nativeTransportDiagnostic, nativeFacilityDiagnostics, nativeQueuePersonAt, nativePersonLocation, nativeFacilityOccupants } from '../src/original-inspection.js';
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
test('facility titles and lease/status labels use the original strings and establishment styles', () => {
  assert.equal(nativeFacilityTitle(data, { key: 'fastfood', variant: 2 }), 'Hamburger Stand');
  assert.equal(nativeFacilityTitle(data, { key: 'shop', variant: 10 }), 'Sports Gear');
  assert.equal(nativeFacilityTitle(data, { key: 'office', name: 'Named' }), 'Named');
  assert.equal(nativeFacilityStateLabel(data, { key: 'condo', occupied: false }, 100), 'For Sale');
  assert.equal(nativeFacilityStateLabel(data, { key: 'single', hotelState: 24 }, 100), 'Clean');
  assert.equal(nativeFacilityStateLabel(data, { key: 'single', hotelState: 40 }, 100), 'Dirty');
  assert.equal(nativePriceEnabled({ key: 'condo', sold: true }), false);
});
test('native inspection labels and condo price lock follow facade byte even when accepted ownership differs',()=>{
  const sleepingVacancy={key:'condo',occupied:false,sold:false,tenantState:16};
  assert.equal(nativeFacilityStateLabel(data,sleepingVacancy,2200),'Occupied');assert.equal(nativePriceEnabled(sleepingVacancy),false);
  const staleOwnership={key:'condo',occupied:true,sold:true,tenantState:24};
  assert.equal(nativeFacilityStateLabel(data,staleOwnership,300),'For Sale');assert.equal(nativePriceEnabled(staleOwnership),true);
  assert.equal(nativeFacilityStateLabel(data,{key:'office',occupied:false,tenantState:1},300),'Occupied');
  assert.equal(nativeFacilityStateLabel(data,{key:'office',occupied:true,tenantState:25},2200),'For Rent');
});
test('facility evaluation graphs distinguish resident stress from actual commercial sales', () => {
  const office = { key: 'office', occupied: true, price: 1, floor: 1, x: 0, width: 9, trips: [{ delay: 80, trips: 1 }] };
  const state = { tick: 400, star: 1, rooms: [office] };
  assert.deepEqual(nativeFacilityGraph(data, state, office), { value: 80, maximum: 300, band: 1, good: 80, bad: 150, increasing: false });
  assert.equal(nativeFacilityGraph(data, state, { ...office, occupied: false, accepting: true }), null);
  const shop = { key: 'shop', price: 2, commercial: { remaining: 20, visitors: 16 } };
  assert.deepEqual(nativeFacilityGraph(data, state, shop), { value: 16, maximum: 30, band: 1, good: 20, bad: 15, increasing: true });
  for(const visitors of [32768,65535]){const graph=nativeFacilityGraph(data,state,{...shop,commercial:{visitors}});assert.equal(graph.value,visitors-65536);assert.equal(graph.band,2);}
});
test('transport inspector reports original distance boundaries while express access omits horizontal complaints', () => {
  const room = { x: 10 }, make = (distance, fields = {}) => [{ kind: 'elevator', id: 1, accessX: 10 + distance, ...fields }];
  assert.equal(nativeTransportDiagnostic(data, room, make(79), []), null);
  assert.equal(nativeTransportDiagnostic(data, room, make(80), []), 'Elevator is far away');
  assert.equal(nativeTransportDiagnostic(data, room, make(125), []), 'Elevator is very far away');
  assert.equal(nativeTransportDiagnostic(data, room, make(125), [{ id: 1, key: 'express' }]), null);
  assert.equal(nativeTransportDiagnostic(data, room, make(80, { kind: 'stairs', type: 'escalator' }), []), 'Escalator is far away');
});
test('native diagnostic lists include rain-day demand and preserve the three-line limit', () => {
  const room = { id: 1, key: 'fastfood', floor: 8, x: 10, commercial: { state: 0, visitors: 5 } };
  const state = { tick: 400, star: 3, calendarDay: 4, rooms: [room], shafts: [], commercialSpecialDay: true };
  assert.deepEqual(nativeFacilityDiagnostics(data, state, room, []), ['Very few customers', 'Too far from Lobby or Skylobby', 'Rain might cause fewer customers']);
  assert.equal(nativeFacilityDiagnostics(data, state, room, null).length, 3);
});
test('queue inspection selects a person on the native correct side and respects two-cell portraits', () => {
  const state = { tick: 100, star: 3, vip: null,
    shafts: [{ id: 1, x: 40, width: 4 }], rooms: [{ id: 2, key: 'office' }, { id: 3, key: 'shop' }],
    actors: [{ id: 4, index: 0, room: 2 }, { id: 5, index: 5, room: 3 }, { id: 6, index: 2, room: 2 }],
    people: [{ id: 7, actor: 4, queueOrder: 0, stage: 'queue', floor: 1, path: [{ id: 1, to: 3 }] },
      { id: 8, actor: 5, queueOrder: 1, stage: 'queue', floor: 1, path: [{ id: 1, to: 3 }] },
      { id: 9, actor: 6, queueOrder: 2, stage: 'queue', floor: 1, path: [{ id: 1, to: 0 }] }] };
  assert.equal(nativeQueuePersonAt(data, state, 1, 37.5).id, 7);
  assert.equal(nativeQueuePersonAt(data, state, 1, 35.5).id, 8);
  assert.equal(nativeQueuePersonAt(data, state, 1, 36.5).id, 8);
  assert.equal(nativeQueuePersonAt(data, state, 1, 46.5).id, 9);
  assert.equal(nativeQueuePersonAt(data, state, 1, 40), null);
});
test('Find Tenant follows the current elevator car and reports outside people without moving the viewport', () => {
  const actor = { id: 2, room: 1, trip: 3, state: 96, floor: 0 }, state = {
    rooms: [{ id: 1, key: 'office', x: 10, width: 9 }],
    people: [{ id: 3, stage: 'car', floor: 0, x: 42 }],
    shafts: [{ x: 40, width: 4, cars: [{ floor: 14, people: [3] }] }] };
  assert.deepEqual(nativePersonLocation(state, actor), { outside: false, x: 42, floor: 14 });
  assert.deepEqual(nativePersonLocation(state, { ...actor, trip: null, state: 32 }), { outside: true });
});
test('commercial occupant inspection includes admitted external visitors but excludes its forty-eight waiting applicants', () => {
  const room = { id: 1, key: 'fastfood' }, state = { actors: [
    { id: 2, room: 1, trip: null, state: 32 },
    { id: 3, room: 1, trip: null, state: 5, commercialInside: true },
    { id: 4, room: 9, job: 1, trip: null, state: 34, commercialInside: true },
    { id: 5, room: 9, job: 1, trip: 6, state: 65 } ] };
  assert.deepEqual(nativeFacilityOccupants(state, room).map(a => a.id), [3, 4]);
});
test('resident and housekeeping grids apply native state and home-floor visibility', () => {
  const actors = [
    { id: 1, room: 10, index: 0, state: 16, floor: 2 },
    { id: 2, room: 10, index: 1, state: 17, floor: 2 },
    { id: 3, room: 10, index: 2, state: 5, floor: 3 },
    { id: 4, room: 10, index: 3, state: 0, floor: 2 },
    { id: 5, room: 10, index: 4, state: 1, floor: 3 },
  ], state = { actors }, room = { id: 10, floor: 2 };
  assert.deepEqual(nativeFacilityOccupants(state, { ...room, key: 'office' }).map(a => a.id), [1, 3, 4, 5]);
  assert.deepEqual(nativeFacilityOccupants(state, { ...room, key: 'condo' }).map(a => a.id), [1, 3, 4, 5]);
  assert.deepEqual(nativeFacilityOccupants(state, { ...room, key: 'twin' }).map(a => a.id), [3, 4, 5]);
  assert.deepEqual(nativeFacilityOccupants(state, { ...room, key: 'housekeeping' }).map(a => a.id), [4]);
  assert.deepEqual(nativeFacilityOccupants(state, { ...room, key: 'security' }).map(a => a.id), [1, 2, 3, 4, 5]);
});
