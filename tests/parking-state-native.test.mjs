import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parkingSprite, parkingBookingPlan, parkingReleasePlan,hasParkingReservation,parkingDemolitionPlan } from '../src/original-parking-state.js';
test('parking exposes original empty, inaccessible red-X and thirteen car frames', () => {
  assert.deepEqual(parkingSprite({},true),{sheet:1704,sx:0,sy:0,width:32,height:24});
  assert.deepEqual(parkingSprite({},false),{sheet:1705,sx:0,sy:0,width:32,height:24});
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
  const original=manifest.resources.find(r=>r.id===1705&&r.type===2);
  for(let carVariant=2;carVariant<=14;carVariant++) {
    const frame=parkingSprite({parkingActor:1,carVariant});assert.equal(frame.sx,(carVariant-1)*32);
    assert.ok(frame.sx+frame.width<=original.width);
  }
});
test('native parking samples already drawn spots and permits category quotas above physical display count', () => {
  const spaces=[{id:1,floor:-1,parkingActor:20},{id:2,floor:-2}],limits=[];
  const plan=parkingBookingPlan(spaces,true,2,4,max=>{limits.push(max);return 0;});
  assert.deepEqual(plan,{status:'booked',spaceId:1,floor:-1,previousVisualOwner:20,carVariant:2});
  assert.deepEqual(limits,[2,13]);
  assert.equal(parkingReleasePlan({...spaces[0],parkingActor:21},20),null);
  assert.deepEqual(parkingReleasePlan({...spaces[0],parkingActor:21},21),{parkingActor:null,occupied:false,carVariant:0});
});
test('native parking consumes space-selection RNG before quota rejection and skips non-car actors', () => {
  const limits=[],random=max=>{limits.push(max);return 0;},spaces=[{id:1,floor:-1}];
  assert.deepEqual(parkingBookingPlan(spaces,true,2,2,random),{status:'quota'});assert.deepEqual(limits,[1]);
  assert.deepEqual(parkingBookingPlan(spaces,false,0,2,()=>{throw new Error('Must not sample');}),{status:'not-required'});
  assert.deepEqual(parkingBookingPlan([],true,0,2,()=>{throw new Error('Must not sample');}),{status:'unavailable'});
});

test('Tower retains overwritten reservations and releases only the current displayed owner',async()=>{
  const {Tower}=await import('../src/simulation.js');
  const {syncActors}=await import('../src/original-people.js');
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
  const t=new Tower(data,{sandbox:true});
  t.build('lobby',0,0,99);t.build('floor',1,0,99);t.build('floor',-1,0,99);
  t.build('ramp',-1,20);t.build('parking',-1,16);
  t.build('suite',1,10);t.build('suite',1,40);t.step(24);t.state.star=3;syncActors(t);
  const suites=t.state.rooms.filter(r=>r.key==='suite'),a=t.state.actors.find(a=>a.room===suites[0].id&&a.index===1),b=t.state.actors.find(a=>a.room===suites[1].id&&a.index===1);
  t.randomInt=()=>0;
  assert.equal(t.bookParking(a,suites[0]),true);assert.equal(t.bookParking(b,suites[1]),true);
  const space=t.parkingSpaces()[0];assert.equal(a.parking,space.id);assert.equal(b.parking,space.id);assert.equal(space.parkingActor,b.id);
  assert.equal(t.parkingFloor(a),-1);assert.equal(t.parkingFloor(b),-1);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  t.releaseParking(a);assert.equal(space.parkingActor,b.id);assert.equal(space.occupied,true);
  t.releaseParking(b);assert.equal(space.parkingActor,undefined);assert.equal(space.occupied,false);
});
test('demolishing a display retains overwritten reservations, category quota and an active VIP',async()=>{
  const {Tower}=await import('../src/simulation.js');
  const {syncActors}=await import('../src/original-people.js');
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
  const t=new Tower(data,{sandbox:true});
  t.build('lobby',0,0,99);t.build('floor',1,0,99);t.build('floor',-1,0,99);
  t.build('ramp',-1,20);t.build('parking',-1,12);t.build('parking',-1,16);
  for(const x of [10,40,60])t.build('suite',1,x);
  while(t.state.construction.length)t.finishConstruction();
  t.state.star=3;t.state.calendarDay=3;syncActors(t);t.randomInt=()=>0;
  const suites=t.state.rooms.filter(room=>room.key==='suite');
  const [a,b,c]=suites.map(room=>t.state.actors.find(actor=>actor.room===room.id&&actor.index===1));
  assert.equal(t.bookParking(a,suites[0]),true);assert.equal(t.bookParking(b,suites[1]),true);
  assert.equal(t.reserveVIP(a,suites[0]),true);
  const space=t.state.rooms.find(room=>room.id===a.parking),vip={...t.state.vip};
  assert.deepEqual(parkingDemolitionPlan(a,space),{parking:null,parkingFloor:-1});
  assert.equal(t.removeRoom(space).ok,true);
  for(const actor of [a,b]){assert.equal(actor.parking,null);assert.equal(actor.parkingFloor,-1);assert.equal(hasParkingReservation(actor),true);}
  assert.deepEqual(t.state.vip,vip);assert.equal(t.parkingFloor(a),-1);
  assert.equal(t.bookParking(c,suites[2]),false); // one physical space: suite quota2, both previous reservations remain
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  t.releaseParking(a);assert.equal(hasParkingReservation(a),false);
  assert.equal(t.bookParking(c,suites[2]),true);
});
test('VIP reservation and actor booking use retained floor after the visible space is gone',async()=>{
  const {reserveVIPGuest}=await import('../src/original-vip.js');
  const actor={id:10,index:1,parking:null,parkingFloor:-2};
  assert.equal(hasParkingReservation(actor),true);
  const state={calendarDay:3,star:3,nativeFlags:{vipPassed:false},vip:null};
  assert.equal(reserveVIPGuest(state,actor,{id:20,key:'suite',floor:3}),true);
  delete actor.parkingFloor;state.vip=null;
  assert.equal(reserveVIPGuest(state,actor,{id:20,key:'suite',floor:3}),false);
});
