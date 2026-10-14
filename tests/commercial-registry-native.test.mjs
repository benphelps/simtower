import test from 'node:test';
import assert from 'node:assert/strict';
import {newCommercialState} from '../src/original-commercial.js';
import {initializeCommercialRegistry,registerCommercialRoom,removeCommercialRoom,prepareCommercialLists,chooseCommercialDestination,resolveCommercialSlot,commercialRegistryCount,validateCommercialRegistry,nativeCommercialActorSlot} from '../src/original-commercial-registry.js';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors,updateActors,chooseVenue,beginActorTrip} from '../src/original-people.js';
import {admitCommercialVisit,leaveCommercialVisit} from '../src/original-commercial.js';

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building(){const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);for(let floor=1;floor<=3;floor++)tower.build('floor',floor,40,160);tower.build('elevator',0,120,120,3);tower.build('office',1,40);tower.build('fastfood',2,60);while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);return tower;}

const room=(id,key='fastfood',floor=0,state=0)=>({id,key,floor,constructionRemaining:0,commercial:{...newCommercialState(key),state}});
const state=rooms=>({rooms,actors:[]});

test('closed sampled venue consumes one draw and does not retry an open candidate',()=>{
  const s=state([room(1,'fastfood',0,3),room(2)]);initializeCommercialRegistry(s);
  let draws=0;
  assert.equal(chooseCommercialDestination(s,0,'fastfood',length=>{draws++;assert.equal(length,2);return 0;}),null);
  assert.equal(draws,1);assert.equal(chooseCommercialDestination(s,0,'fastfood',()=>1).room.id,2);
});
test('open demolished venue remains in lists and retains destination floor until dawn',()=>{
  const food=room(1,'fastfood',15),s=state([food]);initializeCommercialRegistry(s);
  removeCommercialRoom(s,food);s.rooms=[];
  const choice=chooseCommercialDestination(s,15,'fastfood',()=>0);
  assert.equal(choice.index,0);assert.equal(choice.floor,15);assert.equal(choice.room,null);assert.equal(choice.missing,true);
  assert.equal(commercialRegistryCount(s),1);assert.equal(validateCommercialRegistry(s),true);
  prepareCommercialLists(s);
  assert.equal(chooseCommercialDestination(s,15,'fastfood',()=>assert.fail('empty list consumes no RNG')),null);
  assert.equal(resolveCommercialSlot(s,{commercialSlot:0}).floor,-11);assert.equal(commercialRegistryCount(s),0);
});
test('queued commercial metadata slot retargets when firstfree storage is reused',()=>{
  const food=room(1),s=state([food]);initializeCommercialRegistry(s);
  const actor={commercialSlot:chooseCommercialDestination(s,0,'fastfood',()=>0).index};
  removeCommercialRoom(s,food);s.rooms=[];prepareCommercialLists(s);
  const restaurant=room(2,'restaurant',30);s.rooms.push(restaurant);
  assert.equal(registerCommercialRoom(s,restaurant),0);
  const selected=resolveCommercialSlot(s,actor);
  assert.equal(selected.floor,30);assert.equal(selected.room,restaurant);assert.equal(actor.job,2);assert.equal(actor.missingVenue,undefined);
});
test('dawn clears restaurant lists and evening appends after construction membership',()=>{
  const restaurant=room(1,'restaurant',0,3),food=room(2),s=state([restaurant,food]);initializeCommercialRegistry(s);
  assert.deepEqual(s.commercialLists.restaurant[0],[0]);prepareCommercialLists(s);
  assert.deepEqual(s.commercialLists.restaurant[0],[]);assert.deepEqual(s.commercialLists.fastfood[0],[1]);
  const second=room(3,'restaurant',0,3);s.rooms.push(second);registerCommercialRoom(s,second);
  prepareCommercialLists(s,true);
  assert.deepEqual(s.commercialLists.restaurant[0],[2,0,2]);
  assert.equal(validateCommercialRegistry(s),true);
});
test('local closed candidate prevents fallback while absent local list falls back to ground',()=>{
  const ground=room(1),local=room(2,'fastfood',15,3),s=state([ground,local]);initializeCommercialRegistry(s);
  assert.equal(chooseCommercialDestination(s,15,'fastfood',()=>0),null);
  assert.equal(chooseCommercialDestination(s,30,'fastfood',()=>0).room,ground);
  const gap=room(3,'fastfood',10);s.rooms.push(gap);registerCommercialRoom(s,gap);
  assert.deepEqual(s.commercialLists.fastfood[0],[0]);
});
test('WORD list entries become signed actor BYTE destinations, including negative and alias slots',()=>{
  const rooms=Array.from({length:257},(_,index)=>room(index+1,'fastfood',index===0?15:0));
  const s=state(rooms);initializeCommercialRegistry(s);
  assert.equal(nativeCommercialActorSlot(128),-128);assert.equal(nativeCommercialActorSlot(256),0);
  const negative=chooseCommercialDestination(s,0,'fastfood',()=>127); // ground entries begin at metadata1
  assert.equal(negative.selectedIndex,128);assert.equal(negative.index,-128);assert.equal(negative.floor,0);assert.equal(negative.missing,false);
  const aliased=chooseCommercialDestination(s,0,'fastfood',()=>255);
  assert.equal(aliased.selectedIndex,256);assert.equal(aliased.index,0);assert.equal(aliased.floor,15);assert.equal(aliased.room,rooms[0]);
});
test('registry validation rejects forged live ownership and stale list slots, preserves duplicate native membership',()=>{
  const s=state([room(1)]);initializeCommercialRegistry(s);assert.equal(validateCommercialRegistry(s),true);
  s.commercialLists.fastfood[0].push(0);assert.equal(validateCommercialRegistry(s),true);
  const forged=structuredClone(s);forged.rooms[0].commercialSlot=1;assert.throws(()=>validateCommercialRegistry(forged),/commercial registry/);
  const bad=structuredClone(s);bad.commercialLists.fastfood[0].push(99);assert.throws(()=>validateCommercialRegistry(bad),/commercial registry/);
});
test('native commercial byte decrement preserves underflow and changes facades only at exact boundary values',()=>{
  const empty={...newCommercialState('fastfood'),state:0,inside:0,visitors:65535};
  const lost=leaveCommercialVisit(empty);assert.equal(lost.inside,255);assert.equal(lost.state,0);
  const wrapped=admitCommercialVisit(lost);assert.equal(wrapped.status,'admitted');assert.equal(wrapped.record.inside,0);assert.equal(wrapped.record.state,0);
  const admitted=admitCommercialVisit(empty);assert.equal(admitted.record.inside,1);assert.equal(admitted.record.visitors,0);assert.equal(admitted.record.state,1);
  assert.equal(leaveCommercialVisit({...empty,state:0,inside:12}).state,0);
});
test('Tower rejects one closed selection, preserves demolished destination through saves, and retargets reused metadata',()=>{
  const tower=building(),food=tower.state.rooms.find(room=>room.key==='fastfood'),office=tower.state.rooms.find(room=>room.key==='office');
  tower.randomInt=()=>0;assert.equal(chooseVenue(tower,1,'fastfood'),null);
  tower.state.tick=240;tower.openBusinesses();const choice=chooseVenue(tower,1,'fastfood');assert.equal(choice.id,food.id);
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===1);tower.admitTenant(office);
  Object.assign(actor,{commercialSlot:choice.commercialSlot,job:food.id,state:65,floor:2,admissionTick:512});
  tower.removeRoom(food);assert.equal(resolveCommercialSlot(tower.state,actor).floor,2);
  const loaded=new Tower(data);loaded.load(tower.save());assert.equal(resolveCommercialSlot(loaded.state,loaded.state.actors.find(a=>a.id===actor.id)).floor,2);
  tower.state.tick=512+actor.slot%16;updateActors(tower);assert.equal(actor.state,34);assert.equal(actor.floor,2);assert.equal(actor.job,null);
  tower.state.tick=240;tower.openBusinesses();assert.equal(resolveCommercialSlot(tower.state,actor).floor,-11);
  tower.build('restaurant',3,60);while(tower.state.construction.length)tower.finishConstruction();
  const restaurant=tower.state.rooms.find(room=>room.key==='restaurant');assert.equal(restaurant.commercialSlot,choice.commercialSlot);
  tower.state.tick=1600;tower.openBusinesses(true);Object.assign(actor,{state:65,admissionTick:1600});tower.state.tick+=actor.slot%16;updateActors(tower);
  assert.notEqual(actor.trip,null);assert.equal(actor.floor,2);
  for(let i=0;i<600&&actor.trip!==null;i++)tower.step(1);
  assert.equal(actor.trip,null);
  assert.equal(actor.job,restaurant.id);assert.equal(actor.floor,3);assert.equal(restaurant.commercial.inside,1);
});
test('Tower reopened visit decrements reset byte without requiring an admission flag, survives save and resets at next opening',()=>{
  const tower=building(),food=tower.state.rooms.find(room=>room.key==='fastfood'),office=tower.state.rooms.find(room=>room.key==='office');
  tower.state.tick=240;tower.openBusinesses();tower.admitTenant(office);
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===1);
  Object.assign(actor,{state:34,floor:2,commercialSlot:food.commercialSlot,job:food.id,commercialInside:false});
  beginActorTrip(tower,actor,office,2,1,'lunch-return');assert.equal(food.commercial.inside,255);assert.equal(food.commercial.state,0);
  const loaded=new Tower(data);loaded.load(tower.save());assert.equal(loaded.state.rooms.find(room=>room.id===food.id).commercial.inside,255);
  tower.state.tick=240;tower.openBusinesses();assert.equal(food.commercial.inside,0);
});
test('Tower commercial save rejects forged ownership and out-of-byte person selectors atomically',()=>{
  const tower=building(),before=tower.save(),bad=JSON.parse(before),food=bad.rooms.find(room=>room.key==='fastfood');
  bad.commercialRegistry[food.commercialSlot].floor=3;assert.throws(()=>tower.load(JSON.stringify(bad)),/commercial registry/);assert.equal(tower.save(),before);
  const invalid=JSON.parse(before);invalid.actors[0].commercialSlot=128;assert.throws(()=>tower.load(JSON.stringify(invalid)),/commercial registry/);assert.equal(tower.save(),before);
});
test('Tower signed negative food selector is offsite and commits no missing-facility record',()=>{
  const tower=building(),office=tower.state.rooms.find(room=>room.key==='office'),food=tower.state.rooms.find(room=>room.key==='fastfood');tower.admitTenant(office);
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===1);
  Object.assign(actor,{state:65,floor:0,commercialSlot:-128,job:food.id,admissionTick:512,delay:0,trips:0});
  tower.state.tick=512+actor.slot%16;updateActors(tower);
  assert.equal(actor.state,34);assert.equal(actor.job,null);assert.equal(actor.floor,0);assert.equal(actor.trips,1); // only same-floor retry contributes, no missing record.
  const loaded=new Tower(data);loaded.load(tower.save());assert.equal(loaded.state.actors.find(a=>a.id===actor.id).commercialSlot,-128);
});
test('demolishing or damaging a visitors home removes its actor but preserves the external food byte until opening',()=>{
  for(const damage of [false,true]) {
    const tower=building(),office=tower.state.rooms.find(room=>room.key==='office'),food=tower.state.rooms.find(room=>room.key==='fastfood');tower.admitTenant(office);tower.state.tick=240;tower.openBusinesses();
    food.commercial=admitCommercialVisit(food.commercial,true).record;
    const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===1);
    Object.assign(actor,{state:34,floor:food.floor,commercialSlot:food.commercialSlot,job:food.id,commercialInside:true});
    if(damage)assert.equal(tower.damageFacilityAt(office.floor,office.x),true);else tower.removeRoom(office);
    assert.equal(tower.state.actors.some(a=>a.id===actor.id),false);assert.equal(food.commercial.inside,1);assert.equal(food.commercial.state,1);
    const loaded=new Tower(data);loaded.load(tower.save());assert.equal(loaded.state.rooms.find(room=>room.id===food.id).commercial.inside,1);
    tower.openBusinesses();assert.equal(food.commercial.inside,0);
  }
});
