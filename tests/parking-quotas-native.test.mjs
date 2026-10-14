import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors } from '../src/original-people.js';
import { nativeBoardingWord,nativeTravelWord } from '../src/original-packed-travel.js';
import { parkingReachable } from '../src/original-construction.js';
import {parkingSprite} from '../src/original-parking-state.js';
import { newParkingQuotas,recomputeParkingQuotas,claimParkingQuota,releaseParkingQuota,validateParkingQuotas } from '../src/original-parking-quotas.js';
test('parking category allowances share physical displays but keep independent used LONGs', () => {
  let quotas=recomputeParkingQuotas(newParkingQuotas(),1);
  assert.deepEqual(quotas.limits,[2,1,1,2,1,1,1,1,1,0]);
  quotas=claimParkingQuota(quotas,7).quotas;quotas=claimParkingQuota(quotas,7).quotas;
  assert.equal(claimParkingQuota(quotas,7).claimed,false);
  assert.equal(claimParkingQuota(quotas,5).claimed,true);assert.equal(quotas.usedTotal,2);
});
test('dawn and ramp/display changes recompute limits without resetting or inferring claims', () => {
  let quotas=recomputeParkingQuotas(newParkingQuotas(),2);
  quotas=claimParkingQuota(quotas,5).quotas;
  quotas=recomputeParkingQuotas(quotas,0);
  assert.equal(quotas.used[3],1);assert.equal(quotas.usedTotal,1);assert.equal(quotas.limitTotal,0);
  quotas=recomputeParkingQuotas(quotas,1);assert.equal(quotas.used[3],1);
  quotas=releaseParkingQuota(quotas,5);assert.equal(quotas.used[3],0);
});
test('packed floor corruption can produce negative counters and does not clamp releases', () => {
  let quotas=releaseParkingQuota(newParkingQuotas(),7);
  assert.equal(quotas.used[0],-1);assert.equal(quotas.usedTotal,-1);
  validateParkingQuotas(quotas);
  quotas=recomputeParkingQuotas(quotas,1);assert.equal(quotas.used[0],-1);
  assert.throws(()=>validateParkingQuotas({...quotas,usedTotal:0}));
});
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building() {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,0,99);tower.build('floor',1,0,99);tower.build('floor',-1,0,99);
  tower.state.star=3;return tower;
}
test('Tower lost packed floor leaves its original quota claim and visible pointer through dawn and save', () => {
  const tower=building();tower.build('ramp',-1,20);tower.build('parking',-1,16);
  for(const x of [10,40,60])tower.build('suite',1,x);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);tower.randomInt=()=>0;
  const suites=tower.state.rooms.filter(room=>room.key==='suite'),[a,b,c]=suites.map(room=>tower.state.actors.find(actor=>actor.room===room.id&&actor.index===1));
  tower.bookParking(a,suites[0]);
  const space=tower.state.rooms.find(room=>room.id===a.parking);
  const packed=nativeBoardingWord(nativeTravelWord(0,-1),100,200,-1);
  assert.equal(packed.parkingFloor,0);a.parkingFloor=packed.parkingFloor;a.nativeParkingBorrow=true;
  tower.releaseParking(a);
  assert.equal(space.parkingActor,a.id);assert.equal(a.parking,space.id);
  assert.equal(tower.state.nativeParkingQuotas.used[3],1);
  tower.refreshParking();assert.equal(tower.state.nativeParkingQuotas.used[3],1);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.save(),tower.save());
  tower.bookParking(b,suites[1]);assert.equal(tower.bookParking(c,suites[2]),false);
  assert.equal(tower.state.nativeParkingQuotas.used[3],2);
});
test('Tower releasing a borrowed parking depth on an unparked actor retains signed negative quota', () => {
  const tower=building();tower.build('office',1,40);tower.finishConstruction();syncActors(tower);
  const actor=tower.state.actors[0],packed=nativeBoardingWord(nativeTravelWord(),0,100,1);
  assert.equal(packed.parkingFloor,-63);actor.parkingFloor=packed.parkingFloor;actor.nativeParkingBorrow=true;
  tower.releaseParking(actor);assert.equal(tower.state.nativeParkingQuotas.used[0],-1);
  assert.equal(tower.state.nativeParkingQuotas.usedTotal,-1);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.save(),tower.save());
  tower.refreshParking();assert.equal(tower.state.nativeParkingQuotas.usedTotal,-1);
});
test('ordinary bridge construction keeps cached parking status until a parking topology event', () => {
  const tower=building();tower.build('ramp',-1,40);tower.build('parking',-1,12);
  const space=tower.state.rooms.find(room=>room.key==='parking');assert.equal(space.parkingAccessible,false);
  assert.equal(tower.build('restaurant',-1,16).ok,true);
  assert.equal(parkingReachable(tower.state,space),true);assert.equal(tower.parkingSpaces().length,0);
  tower.refreshParking();assert.equal(tower.parkingSpaces().length,0); // dawn does not recompute the+0B inaccessible byte
  tower.build('parking',-1,8);assert.equal(tower.parkingSpaces().length,2);
  const first=tower.parkingSpaces()[0];assert.equal(first.nativeParkingSlot,0);
  tower.removeRoom(first);tower.build('parking',-1,12);
  assert.equal(tower.parkingSpaces()[0].id,tower.state.rooms.at(-1).id); //first free metadata index reused
});
test('Tower rejects inconsistent persisted quota totals and changed selectable index order atomically', () => {
  const tower=building();tower.build('ramp',-1,20);tower.build('parking',-1,12);tower.build('parking',-1,16);
  const saved=tower.save();
  for(const mutate of [state=>state.nativeParkingQuotas.usedTotal=1,state=>state.nativeParkingAvailable.reverse(),state=>state.rooms.find(room=>room.key==='parking').nativeParkingSlot=999]) {
    const malformed=JSON.parse(saved);mutate(malformed);assert.throws(()=>tower.load(JSON.stringify(malformed)));assert.equal(tower.save(),saved);
  }
});
test('lost parking owner pointers survive home demolition and alias a later native actor slot',()=>{
  const tower=building();tower.build('ramp',-1,20);tower.build('parking',-1,16);tower.build('suite',1,10);tower.finishConstruction();syncActors(tower);tower.randomInt=()=>0;
  const home=tower.state.rooms.find(room=>room.key==='suite'),actor=tower.state.actors.find(actor=>actor.room===home.id&&actor.index===1);tower.bookParking(actor,home);
  const space=tower.state.rooms.find(room=>room.id===actor.parking),oldSlot=actor.slot;assert.equal(space.parkingActorSlot,oldSlot);
  actor.parkingFloor=0;tower.removeRoom(home);assert.equal(space.parkingActor,actor.id);assert.equal(space.parkingActorSlot,oldSlot);assert.equal(space.occupied,true);
  const loaded=new Tower(data);loaded.load(tower.save());assert.equal(loaded.state.rooms.find(room=>room.id===space.id).parkingActorSlot,oldSlot);
  tower.build('suite',1,10);tower.finishConstruction();syncActors(tower);const replacement=tower.state.rooms.find(room=>room.key==='suite'),next=tower.state.actors.find(actor=>actor.room===replacement.id&&actor.index===1);
  assert.notEqual(next.id,actor.id);assert.equal(next.slot,oldSlot);
  next.parkingFloor=-63;tower.releaseParking(next);assert.equal(space.occupied,false);assert.equal(space.parkingActorSlot,undefined);assert.equal(space.parkingActor,undefined);assert.equal(tower.state.nativeParkingQuotas.used[3],0);
});
test('native parking pointers validate against allocated capacity and may reference an inactive freed slot',()=>{
  const tower=building();tower.build('ramp',-1,20);tower.build('parking',-1,16);const space=tower.state.rooms.find(room=>room.key==='parking');space.parkingActorSlot=300;space.carVariant=2;
  const saved=tower.save(),loaded=new Tower(data);loaded.load(saved);assert.equal(loaded.save(),saved);
  const invalid=JSON.parse(saved);invalid.rooms.find(room=>room.key==='parking').parkingActorSlot=512;assert.throws(()=>tower.load(JSON.stringify(invalid)),/parking actor pointer/);assert.equal(tower.save(),saved);
});
test('parking reconnection clears redX to empty original art without restoring a retained owner car',()=>{
  const tower=building();tower.build('ramp',-1,20);tower.build('parking',-1,16);tower.build('suite',1,10);tower.finishConstruction();syncActors(tower);tower.randomInt=()=>0;
  const home=tower.state.rooms.find(room=>room.key==='suite'),actor=tower.state.actors.find(actor=>actor.room===home.id&&actor.index===1);tower.bookParking(actor,home);
  const space=tower.state.rooms.find(room=>room.id===actor.parking);assert.equal(space.nativeParkingFrame,2);
  tower.removeRoom(tower.state.rooms.find(room=>room.key==='ramp'));assert.equal(space.nativeParkingFrame,1);assert.equal(parkingSprite(space).sheet,1705);assert.equal(space.parkingActorSlot,actor.slot);
  tower.build('ramp',-1,20);assert.equal(space.nativeParkingFrame,0);assert.equal(parkingSprite(space).sheet,1704);assert.equal(space.parkingActorSlot,actor.slot);assert.equal(actor.parkingFloor,-1);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.state.rooms.find(room=>room.id===space.id).nativeParkingFrame,0);
  tower.releaseParking(actor);assert.equal(space.parkingActorSlot,undefined);assert.equal(space.nativeParkingFrame,0);
});
test('releasing a car from inaccessible parking preserves the native redX frame',()=>{
  const tower=building();tower.build('ramp',-1,20);tower.build('parking',-1,16);tower.build('suite',1,10);tower.finishConstruction();syncActors(tower);tower.randomInt=()=>0;
  const home=tower.state.rooms.find(room=>room.key==='suite'),actor=tower.state.actors.find(actor=>actor.room===home.id&&actor.index===1);tower.bookParking(actor,home);const space=tower.state.rooms.find(room=>room.id===actor.parking);
  tower.removeRoom(tower.state.rooms.find(room=>room.key==='ramp'));tower.releaseParking(actor);
  assert.equal(space.parkingActorSlot,undefined);assert.equal(space.nativeParkingFrame,1);assert.equal(space.parkingAccessible,false);assert.equal(parkingSprite(space).sx,0);assert.equal(tower.parkingSpaces().length,0);
});
