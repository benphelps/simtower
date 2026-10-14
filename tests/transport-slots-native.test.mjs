import {selectHallCar} from '../src/original-elevators.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {nativeTransportSlotAssignments,firstFreeNativeTransportSlot,migrateNativeTransportSlots,nativeCarOrder,nativeCarColumns,nativeCarSlotAssignments} from '../src/original-transport-slots.js';
import {nativeTransportComponents,nativeShaftComponentIndex,transportComponentsFor} from '../src/original-transport-components.js';
import {chooseNativeTransport,nativeTransportRoute} from '../src/original-transport-choice.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function tower(){const t=new Tower(data,{sandbox:true});for(const a of [['lobby',0,0,199],['floor',1,0,199]])assert.equal(t.build(...a).error,undefined);return t;}
test('legacy transport allocation reserves explicit slots and reuses the first hole without renumbering survivors',()=>{
  const items=[{id:1,nativeTransportSlot:3},{id:2},{id:3,nativeTransportSlot:0},{id:4}];
  assert.deepEqual(nativeTransportSlotAssignments(items,24),[3,1,0,2]);assert.equal(firstFreeNativeTransportSlot(items,24),4);
  assert.equal(firstFreeNativeTransportSlot([{nativeTransportSlot:0},{nativeTransportSlot:2}],24),1);
  const state={shafts:items,links:[{id:5},{id:6}]};migrateNativeTransportSlots(state);
  assert.deepEqual(state.shafts.map(s=>s.nativeTransportSlot),[3,1,0,2]);assert.deepEqual(state.links.map(l=>l.nativeTransportSlot),[0,1]);
});
test('slot validation rejects duplicate, fractional, out-of-pool and overflowing saves before mutation',()=>{
  for(const bad of [[{nativeTransportSlot:1},{nativeTransportSlot:1}],[{nativeTransportSlot:24}],[{nativeTransportSlot:-1}],[{nativeTransportSlot:1.5}]])assert.throws(()=>nativeTransportSlotAssignments(bad,24),/slot/);
  assert.throws(()=>nativeTransportSlotAssignments(Array.from({length:25},()=>({})),24),/pool/);
  const state={shafts:[{}],links:[{nativeTransportSlot:64}]};assert.throws(()=>migrateNativeTransportSlots(state));assert.equal(state.shafts[0].nativeTransportSlot,undefined);
});
test('Tower shaft deletion/reconstruction reuses native slot and changes tied choice while preserving survivor masks',()=>{
  const t=tower();for(const x of [20,40,60])assert.equal(t.build('elevator',0,x,x,1).error,undefined);
  const deleted=t.state.shafts[1];assert.equal(t.demolish(1,deleted.x).error,undefined);
  assert.equal(t.build('elevator',0,40,40,1).error,undefined);
  assert.deepEqual(t.state.shafts.map(s=>s.nativeTransportSlot),[0,2,1]);
  const last=t.state.shafts[2];assert.equal(chooseNativeTransport(t.state,0,1,false,50).edge.id,last.id);
  const restored=new Tower(data);restored.load(t.save());assert.deepEqual(restored.state.shafts.map(s=>s.nativeTransportSlot),[0,2,1]);
  const legacy=JSON.parse(t.save());for(const shaft of legacy.shafts)delete shaft.nativeTransportSlot;restored.load(JSON.stringify(legacy));assert.deepEqual(restored.state.shafts.map(s=>s.nativeTransportSlot),[0,1,2]);
});
test('Tower stairs and escalators share a64-entry pool and reuse deleted link holes',()=>{
  const t=tower();for(const [key,x] of [['stairs',100],['escalator',120],['stairs',140]])assert.equal(t.build(key,1,x).error,undefined);
  assert.equal(t.demolish(0,120,{x:120*8+4,y:-8}).error,undefined);
  assert.equal(t.build('escalator',1,160).error,undefined);
  assert.deepEqual(t.state.links.map(l=>l.nativeTransportSlot),[0,2,1]);
});
test('noncontiguous actual shaft slots govern original component mask bits and indirect route lookup',()=>{
  const state={floors:{0:{x:0,width:100,lobby:true},1:{x:0,width:100},14:{x:0,width:100,lobby:true},20:{x:0,width:100}},links:[],people:[],shafts:[
    {id:1,key:'elevator',nativeTransportSlot:8,x:10,width:4,stops:[0,1,14]},
    {id:2,key:'elevator',nativeTransportSlot:2,x:30,width:4,stops:[14,20]}]};
  const c=nativeTransportComponents(state);
  assert.equal(nativeShaftComponentIndex(c,1),8);assert.equal(c.groups[1].mask,0x20800000);assert.equal(c.maps.get(8).floors.get(20),0x20000000);assert.equal(c.maps.has(0),false);
  assert.deepEqual(nativeTransportRoute(state,1,20,false,10).map(e=>e.id),[1,2]);
  const before=transportComponentsFor(state);state.shafts[0].nativeTransportSlot=9;assert.notEqual(transportComponentsFor(state),before);
});

test('car-only demolition frees a physical hole, strict hall ties reuse it, and save/retraction preserve surviving slots',()=>{
  const t=tower();assert.equal(t.build('elevator',0,20,20,1).error,undefined);const sh=t.state.shafts[0];
  t.addCar(sh.id,1);t.addCar(sh.id,0);const [first,middle,last]=sh.cars;
  assert.deepEqual(sh.cars.map(c=>c.nativeCarSlot),[0,1,2]);
  assert.equal(t.demolish(1,sh.x,{x:sh.x*8+4,y:-66}).error,undefined);
  assert.equal(t.state.shafts[0],sh);assert.deepEqual(sh.cars.map(c=>c.nativeCarSlot),[0,2]);
  assert.equal(t.addCar(sh.id,1).error,undefined);const replacement=sh.cars[2];assert.equal(replacement.nativeCarSlot,1);
  assert.equal(t.removeCar(sh.id,first.id).error,undefined);last.floor=last.parkingFloor=1;
  assert.deepEqual(nativeCarOrder(sh).map(c=>c.id),[replacement.id,last.id]);
  assert.equal(selectHallCar(sh,0,0,[],100).car.id,replacement.id);
  const columns=nativeCarColumns(sh);assert.deepEqual(columns,[replacement,last]);assert.deepEqual(columns.map(car=>car.nativeCarSlot),[1,2]);
  const restored=new Tower(data);restored.load(t.save());assert.deepEqual(restored.state.shafts[0].cars.map(c=>c.nativeCarSlot),[2,1]);
  assert.equal(restored.resizeShaft(sh.id,0,0).error,undefined);assert.deepEqual(restored.state.shafts[0].cars.map(c=>c.nativeCarSlot),[2,1]);
  const legacy=JSON.parse(t.save());for(const car of legacy.shafts[0].cars)delete car.nativeCarSlot;restored.load(JSON.stringify(legacy));assert.deepEqual(restored.state.shafts[0].cars.map(c=>c.nativeCarSlot),[0,1]);
});
test('native car-slot migration rejects bad pools before assigning transport properties',()=>{
  for(const cars of [[{nativeCarSlot:8}],[{nativeCarSlot:-1}],[{nativeCarSlot:2},{nativeCarSlot:2}],[{nativeCarSlot:.5}]])assert.throws(()=>nativeCarSlotAssignments(cars),/slot/);
  const state={shafts:[{cars:[{nativeCarSlot:8}]}],links:[{}]};assert.throws(()=>migrateNativeTransportSlots(state));assert.equal(state.shafts[0].nativeTransportSlot,undefined);assert.equal(state.links[0].nativeTransportSlot,undefined);
});
test('removing an occupied car writes rider destination and redispatches its hall calls without resetting queued wait',()=>{
  const t=tower();t.build('elevator',0,20,20,1);const sh=t.state.shafts[0];t.addCar(sh.id,0);const [survivor,removed]=sh.cars;survivor.floor=survivor.parkingFloor=1;
  t.build('office',1,50);const room=t.state.rooms[0];
  const edge={kind:'shaft',id:sh.id,from:0,to:1,x:sh.x};
  const rider={id:100,room:room.id,stage:'car',floor:0,x:sh.x,path:[{...edge}],to:1,wait:0,tripDelay:0};
  const queue={id:101,room:room.id,stage:'queue',floor:0,x:sh.x,path:[{...edge}],to:1,wait:42,tripDelay:0,queueTick:3,hallRegistered:true};
  t.state.people.push(rider,queue);removed.people.push(rider.id);sh.calls['0:1']=removed.id;
  assert.equal(t.removeCar(sh.id,removed.id).error,undefined);assert.equal(rider.floor,1);assert.equal(rider.stage,'walk');assert.deepEqual(rider.path,[]);
  assert.equal(queue.wait,42);assert.equal(queue.queueTick,3);assert.equal(queue.stage,'queue');assert.equal(sh.calls['0:1'],survivor.id);
});
