import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors,updateActors,beginActorTrip,finishActorTrip } from '../src/original-people.js';
import { nativeJourneyStressEnabled } from '../src/original-journeys.js';
import { housekeepingCanStart, housekeepingTarget, housekeepingArrival, housekeepingCleaningTick, hotelHousekeepingPose } from '../src/original-housekeeping.js';
const dirty = (id, floor, x, fields = {}) => ({ id, floor, x, key: 'single', width: 4, hotelState: 40, ...fields });
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
test('idle housekeeping observes the native1500 deadline and fire/bomb work suppression', () => {
  assert.equal(housekeepingCanStart({ tick: 1499 }), true);
  assert.equal(housekeepingCanStart({ tick: 1500 }), false);
  assert.equal(housekeepingCanStart({ tick: 100, eventFlags: 1 }), false);
  assert.equal(housekeepingCanStart({ tick: 100, eventFlags: 8 }), false);
  assert.equal(housekeepingCanStart({ tick: 100, eventFlags: 16 }), true);
  assert.equal(housekeepingCanStart({ tick: 100, emergency: { kind: 'bomb', stage: 'searching' } }), false);
});
test('native housekeeping policy skips history commits even for completed and failed trips', () => {
  assert.equal(nativeJourneyStressEnabled('housekeeping'),false);
  for(const key of ['office','condo','single','fastfood','security'])assert.equal(nativeJourneyStressEnabled(key),true);
  const actor={id:1,delay:42,trips:2,trip:99,state:69,parking:null};
  const room={id:2,key:'housekeeping',floor:1};
  const tower={state:{tick:100,actors:[actor]},releaseParking(){},failVIP(){}};
  finishActorTrip(tower,actor,room,{to:1,tripDelay:200},true,'clean-return');
  assert.equal(actor.delay,42);assert.equal(actor.trips,2);
  finishActorTrip(tower,actor,room,{tripDelay:300},false,'clean-return');
  assert.equal(actor.delay,42);assert.equal(actor.trips,2);
});
test('Tower service elevator cleaning and return preserve housekeeping packed history', () => {
  const tower=new Tower(data,{sandbox:true});
  tower.build('lobby',0,40,250);tower.build('floor',1,40,250);tower.build('floor',2,40,250);
  assert.equal(tower.build('housekeeping',1,40).ok,true);assert.equal(tower.build('single',2,60).ok,true);
  assert.equal(tower.build('service',0,200,200,2).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const home=tower.state.rooms.find(room=>room.key==='housekeeping'),hotel=tower.state.rooms.find(room=>room.key==='single');
  const actor=tower.state.actors.find(actor=>actor.room===home.id&&actor.index===0);
  tower.state.tick=200;hotel.hotelState=40;hotel.accepting=false;hotel.dirt=100;
  actor.job=hotel.id;actor.delay=42;actor.trips=2;
  assert.equal(beginActorTrip(tower,actor,home,home.floor,hotel.floor,'clean-arrival'),true);
  assert.equal(tower.state.people.find(person=>person.actor===actor.id)?.tripDelay,0);
  tower.step(200);
  assert.equal(hotel.dirt,0);assert.equal(hotel.housekeepingOverlay,false);
  assert.equal(actor.delay,42);assert.equal(actor.trips,2);
});
test('stranded housekeeping keeps returning in state4 after1500 and resumes when service transport is restored', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);tower.build('floor',2,40,180);
  tower.build('housekeeping',1,40);tower.finishConstruction();syncActors(tower);
  const actor=tower.state.actors[0];Object.assign(actor,{floor:2,state:0,delay:42,trips:2});
  tower.state.tick=1488;updateActors(tower);assert.equal(actor.state,4);assert.equal(actor.trip,null);
  tower.state.tick=1600;updateActors(tower);assert.equal(actor.state,4);assert.equal(actor.floor,2);
  assert.equal(tower.build('service',0,100,100,2).ok,true);
  updateActors(tower);assert.notEqual(actor.trip,null);tower.step(160);
  assert.equal(actor.state,0);assert.equal(actor.floor,1);assert.equal(actor.trip,null);
  assert.equal(actor.delay,42);assert.equal(actor.trips,2);
});
test('housekeeping scans assigned floors above before below and scans rooms left to right', () => {
  const actor = { index: 5, floor: 2 }, rooms = [dirty(1, -5, 20), dirty(2, 7, 20), dirty(3, 1, 20), dirty(4, 7, 10), dirty(5, 8, 0)];
  assert.equal(housekeepingTarget(rooms, actor, 400).id, 4);
  assert.equal(housekeepingTarget(rooms.filter(r => r.floor < 2), actor, 400).id, 3);
  assert.equal(housekeepingTarget([dirty(1, 7, 0, { hotelState: 56 })], actor, 400), null);
  assert.equal(housekeepingTarget([dirty(1, 7, 0, { constructionRemaining: 1 })], actor, 400), null);
});
test('arrival cleans immediately and the cleaning overlay persists through four cohort updates', () => {
  const room = dirty(1, 1, 0), arrival = housekeepingArrival(room, 400);
  assert.deepEqual(arrival.hotel, { hotelState: 24, dirt: 0, housekeepingOverlay: true });
  const actor = { id: 2, floor: 1, job: 1, ...arrival.worker };
  for (const remaining of [2, 1, 0]) {
    const update = housekeepingCleaningTick(actor); Object.assign(actor, update.worker);
    assert.equal(actor.cleanTicks, remaining); assert.equal(update.finished, false); assert.equal(actor.state, 2);
  }
  const finish = housekeepingCleaningTick(actor); Object.assign(actor, finish.worker);
  assert.equal(finish.finished, true); assert.equal(actor.state, 0); assert.equal(actor.floor, 1); assert.equal(actor.job, null);
  assert.deepEqual(finish.hotel, { housekeepingOverlay: false });
  assert.equal(housekeepingArrival(room, 1500).hotel, null);
  assert.equal(housekeepingArrival(room, 1500).worker.state, 0);
});
test('cleaning silhouette uses the original reserved hotel child poses and interior width', () => {
  const room = dirty(1, 1, 0, { housekeepingOverlay: true });
  const limits = [];
  assert.deepEqual(hotelHousekeepingPose(room, max => { limits.push(max); return max - 1; }), { cell: 2, pose: 98 });
  assert.deepEqual(limits, [3, 3]); assert.equal(hotelHousekeepingPose({ ...room, housekeepingOverlay: false }, () => 0), null);
});
