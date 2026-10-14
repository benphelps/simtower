import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors,updateActors,finishActorTrip} from '../src/original-people.js';
import { initializeMedicalRegistry, registerMedicalRoom, removeMedicalRoom,
  resetMedicalRegistryDay, medicalRegistryCount, chooseMedicalDestination, validateMedicalRegistry } from '../src/original-medical.js';
import {changeMedicalPatients} from '../src/original-medical.js';
import {clinicSprite,clinicAdmission} from '../src/original-clinics.js';
function scene() {return {rooms:[{id:1,key:'medical',floor:2},{id:2,key:'medical',floor:3}]};}
test('native medical lists retain deleted destination until dawn and still route to original saved floor',()=>{
  const state=scene();initializeMedicalRegistry(state);removeMedicalRoom(state,state.rooms[0]);state.rooms.shift();
  const destination=chooseMedicalDestination(state,1,()=>0);
  assert.deepEqual(destination,{index:0,floor:2,room:null,missing:true});assert.equal(medicalRegistryCount(state),2);validateMedicalRegistry(state);
  resetMedicalRegistryDay(state);assert.equal(medicalRegistryCount(state),1);assert.equal(chooseMedicalDestination(state,1,()=>0).room.id,2);
});
test('new medical room appends to native group list even when filling an earlier free slot',()=>{
  const state=scene();initializeMedicalRegistry(state);removeMedicalRoom(state,state.rooms[0]);state.rooms.shift();resetMedicalRegistryDay(state);
  const room={id:3,key:'medical',floor:1};state.rooms.push(room);assert.equal(registerMedicalRoom(state,room),0);
  assert.deepEqual(state.medicalLists[0],[1,0]);assert.equal(chooseMedicalDestination(state,1,()=>0).room.id,2);
  resetMedicalRegistryDay(state);assert.deepEqual(state.medicalLists[0],[0,1]);
});
test('native ten-clinic limit includes removed same-day slots and releases them only at dawn',()=>{
  const state={rooms:Array.from({length:10},(_,i)=>({id:i+1,key:'medical',floor:1}))};initializeMedicalRegistry(state);
  removeMedicalRoom(state,state.rooms[0]);state.rooms.shift();assert.equal(medicalRegistryCount(state),10);
  assert.equal(registerMedicalRoom(state,{id:20,key:'medical',floor:1}),-1);
  resetMedicalRegistryDay(state);assert.equal(medicalRegistryCount(state),9);assert.equal(registerMedicalRoom(state,{id:20,key:'medical',floor:1}),0);
});
test('native medical local group falls back to ground list and excludes five-floor registration gaps',()=>{
  const state=scene();state.rooms.push({id:3,key:'medical',floor:14},{id:4,key:'medical',floor:6});initializeMedicalRegistry(state);
  assert.equal(chooseMedicalDestination(state,16,()=>0).room.id,3);assert.equal(chooseMedicalDestination(state,40,()=>0).room.id,1);
  assert.equal(state.medicalAll.length,4);assert.equal(state.medicalLists.flat().length,3);
});
test('native medical tombstones survive serialization and malformed lists/identities are rejected',()=>{
  const state=scene();initializeMedicalRegistry(state);removeMedicalRoom(state,state.rooms[0]);state.rooms.shift();
  const copy=JSON.parse(JSON.stringify(state));validateMedicalRegistry(copy);
  copy.medicalLists[0].push(0);assert.throws(()=>validateMedicalRegistry(copy),/Invalid medical registry/);
  copy.medicalLists[0].pop();copy.medicalRegistry[0].deleted=false;assert.throws(()=>validateMedicalRegistry(copy),/Invalid medical registry/);
  const badFloor=JSON.parse(JSON.stringify(state));badFloor.medicalRegistry[1].floor=2;assert.throws(()=>validateMedicalRegistry(badFloor),/Invalid medical registry/);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function towerScene(count=2) {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  for(let floor=1;floor<=Math.max(2,count);floor++)tower.build('floor',floor,10,109);
  tower.build('elevator',0,40,40,Math.max(2,count));tower.build('office',1,10);
  for(let i=0;i<count;i++)tower.build('medical',i+1,50);
  while(tower.state.construction.length)tower.finishConstruction();
  const office=tower.state.rooms.find(room=>room.key==='office');office.occupied=true;syncActors(tower);
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===2);
  actor.state=2;actor.floor=1;tower.state.star=3;tower.state.nativeFlags.medicalReady=true;
  tower.state.tick=800+actor.slot%16;tower.randomInt=()=>0;
  return {tower,office,actor,clinics:tower.state.rooms.filter(room=>room.key==='medical')};
}
test('Tower selects deleted clinic from native list despite a live alternative and reports only upon arrival',()=>{
  const {tower,office,actor,clinics}=towerScene();const removed=clinics[1];tower.removeRoom(removed);tower.randomInt=()=>1;
  updateActors(tower);const trip=tower.state.people.find(person=>person.id===actor.trip);
  assert.equal(trip.to,removed.floor);assert.equal(actor.job,null);assert.equal(actor.missingVenue,true);
  assert.equal(tower.state.nativeFlags.medicalReady,true);
  const previousTrips=actor.trips;
  finishActorTrip(tower,actor,office,trip,true,'clinic-arrival');
  assert.equal(tower.state.nativeFlags.medicalReady,false);assert.equal(actor.state,35);
  assert.equal(actor.trips,previousTrips+2);
  assert.equal(tower.state.notices.filter(item=>item.text===data.strings[1010][5]).length,1);
  tower.state.tick=2599;tower.step();assert.deepEqual(tower.state.medicalAll,[0]);
  assert.equal(chooseMedicalDestination(tower.state,1,()=>0).room.id,clinics[0].id);
});
test('Tower clinic capacity reserves pending construction and same-day removed registry until dawn',()=>{
  const {tower,clinics}=towerScene(10);tower.removeRoom(clinics[0]);
  assert.match(tower.plan('medical',1,50).error,/No more service centers/);
  tower.state.tick=2599;tower.step();assert.equal(tower.build('medical',1,50).ok,true);
  assert.equal(medicalRegistryCount(tower.state),10);assert.match(tower.plan('medical',2,80).error,/No more service centers/);
  assert.equal(tower.state.medicalRegistry.filter(Boolean).length,9);
  while(tower.state.construction.length)tower.finishConstruction();assert.equal(tower.state.medicalRegistry.filter(Boolean).length,10);
});
test('Tower clinic tombstones roundtrip and malformed list saves are rejected atomically; older saves rebuild',()=>{
  const {tower,clinics}=towerScene();tower.damageFacilityAt(clinics[0].floor,clinics[0].x);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  const bad=JSON.parse(saved);bad.medicalLists[0].push(0);
  assert.throws(()=>copy.load(JSON.stringify(bad)),/Invalid medical registry/);assert.equal(copy.save(),saved);
  const legacy=JSON.parse(saved);delete legacy.medicalRegistry;delete legacy.medicalLists;delete legacy.medicalAll;
  copy.load(JSON.stringify(legacy));assert.equal(copy.state.medicalAll.length,1);
});
test('Tower in-flight worker preserves clinic slot across dawn reuse while transport still targets the old clinic floor',()=>{
  const {tower,office,actor,clinics}=towerScene();tower.randomInt=()=>1;updateActors(tower);
  const trip=tower.state.people.find(person=>person.id===actor.trip);assert.equal(actor.medicalSlot,1);assert.equal(trip.to,2);
  tower.removeRoom(clinics[1]);resetMedicalRegistryDay(tower.state);
  assert.equal(tower.build('medical',1,80).ok,true);while(tower.state.construction.length)tower.finishConstruction();
  const replacement=tower.state.rooms.find(room=>room.key==='medical'&&room.x===80);
  finishActorTrip(tower,actor,office,trip,true,'clinic-arrival');
  assert.equal(actor.job,replacement.id);assert.equal(actor.floor,1);assert.equal(actor.state,35);
  assert.equal(replacement.medicalInside,1);assert.equal(tower.state.nativeFlags.medicalReady,true);
  assert.equal(clinicSprite(replacement,tower.state.actors,tower.state.tick).sheet,1832);
});
test('native clinic patient byte resets at dawn and decrements with BYTE wrap after a carried-over treatment',()=>{
  const {tower,actor,clinics}=towerScene();actor.medicalSlot=0;actor.job=clinics[0].id;actor.state=35;actor.trip=null;
  changeMedicalPatients(tower.state,actor,1);assert.equal(clinics[0].medicalInside,1);
  resetMedicalRegistryDay(tower.state);assert.equal(clinics[0].medicalInside,0);
  changeMedicalPatients(tower.state,actor,-1);assert.equal(clinics[0].medicalInside,255);
  assert.equal(clinicAdmission(clinics[0],tower.state.actors),'admitted'); // CMP/JGE is signed.
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  const bad=JSON.parse(saved);bad.actors.find(person=>person.id===actor.id).medicalSlot=10;
  assert.throws(()=>copy.load(JSON.stringify(bad)),/Invalid medical person slot/);assert.equal(copy.save(),saved);
});
