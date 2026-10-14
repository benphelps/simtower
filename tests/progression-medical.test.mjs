import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors, beginActorTrip, finishActorTrip } from '../src/original-people.js';
import { initializeProgression, noteProgressionConstruction, resetMedicalDemand,
  reportMissingClinic, medicalAdmission, medicalTreatmentComplete, medicalSprite,
  populationRating, promotionDecision, acknowledgeProgressionWarning,
  resetAfterPromotion } from '../src/original-progression.js';

const thresholds = [300, 1000, 5000, 10000];
function state(star = 3) {
  return { star, tick: 1600, calendarDay: 0, sandbox: false, rooms: [],
    garbage: { working: true }, nativeFlags: { vipPassed: true, medicalReady: true } };
}

test('native population boundaries and promotion caps', () => {
  for (const [population, rating] of [[299,1],[300,2],[999,2],[1000,3],[4999,3],
    [5000,4],[9999,4],[10000,5],[14999,5],[15000,6]]) {
    assert.equal(populationRating(population, thresholds), rating);
  }
  assert.equal(promotionDecision(state(1),299,thresholds).eligible,false);
  assert.equal(promotionDecision(state(1),300,thresholds).eligible,true);
  assert.equal(promotionDecision(state(5),20000,thresholds).eligible,false);
});

test('security and suite requirements latch on construction and survive removal', () => {
  const s=state(2);
  assert.deepEqual(promotionDecision(s,1000,thresholds),{eligible:false,info:1});
  acknowledgeProgressionWarning(s);
  assert.equal(promotionDecision(s,1000,thresholds).info,0);
  noteProgressionConstruction(s,'security');
  assert.equal(s.nativeFlags.progressionWarned,false);
  assert.equal(promotionDecision(s,1000,thresholds).eligible,true);
  s.star=3;
  assert.equal(promotionDecision(s,5000,thresholds).info,2);
  noteProgressionConstruction(s,'suite');
  assert.equal(s.rooms.length,0);
  assert.equal(promotionDecision(s,5000,thresholds).eligible,true);
});

test('three/four star promotion requires evening, weekday, recycling and daily clinic availability', () => {
  const s=state();noteProgressionConstruction(s,'suite');
  for(const [tick,day,eligible] of [[1599,0,false],[1600,0,true],[2000,1,true],[2000,2,false]]) {
    s.tick=tick;s.calendarDay=day;assert.equal(promotionDecision(s,5000,thresholds).eligible,eligible);
  }
  s.tick=1600;s.calendarDay=0;s.garbage.working=false;
  assert.deepEqual(promotionDecision(s,5000,thresholds),{eligible:false,info:0});
  s.garbage.working=true;s.nativeFlags.vipPassed=false;
  assert.equal(promotionDecision(s,5000,thresholds).eligible,false);
  s.nativeFlags.vipPassed=true;reportMissingClinic(s);
  assert.deepEqual(promotionDecision(s,5000,thresholds),{eligible:false,info:6});
  resetMedicalDemand(s);assert.equal(promotionDecision(s,5000,thresholds).eligible,true);
  s.star=4;s.nativeFlags.vipPassed=false;
  assert.equal(promotionDecision(s,10000,thresholds).eligible,false);
  s.rooms.push({key:'metro'});
  assert.equal(promotionDecision(s,10000,thresholds).eligible,true);
});

test('clinic readiness tracks missing service, not clinic existence or fullness', () => {
  const s=state();s.nativeFlags.medicalReady=false;resetMedicalDemand(s);
  assert.equal(s.nativeFlags.medicalReady,true);assert.equal(s.rooms.length,0);
  const clinic={id:10,key:'medical'};
  const actors=Array.from({length:40},()=>({job:10,state:35}));
  assert.equal(medicalAdmission(clinic,actors),'waiting');
  assert.equal(s.nativeFlags.medicalReady,true);
  actors[0].state=66;assert.equal(medicalAdmission(clinic,actors),'admitted');
  actors.push({job:11,state:35});assert.equal(medicalAdmission(clinic,actors),'admitted');
  assert.equal(medicalAdmission(null,actors),'missing');
  assert.equal(reportMissingClinic(s),6);assert.equal(s.nativeFlags.medicalReady,false);
});

test('clinic treatment uses the native sixteen-tick difference and removal fallback', () => {
  assert.equal(medicalTreatmentComplete(415,400),false);
  assert.equal(medicalTreatmentComplete(416,400),true);
  assert.equal(medicalTreatmentComplete(1,2590),false);
  assert.equal(medicalTreatmentComplete(401,400,false),true);
});

test('clinic original art depends on actual inside patient byte and native daylight, not occupied flag',()=>{
  const room={id:1,key:'medical',floor:2,x:20,occupied:false};
  const state={tick:1000,actors:[]};assert.equal(medicalSprite(state,room).sheet,1833);
  state.tick=1600;assert.equal(medicalSprite(state,room).sheet,1834);
  state.actors=[{job:1,state:66}];assert.equal(medicalSprite(state,room).sheet,1834);
  state.actors[0].state=35;assert.equal(medicalSprite(state,room).sheet,1832);
  state.actors[0].state=99;assert.equal(medicalSprite(state,room).sheet,1834);
});

test('old saves seed construction latches; promotion clears VIP and shared warning only', () => {
  const s=state();s.rooms=[{key:'suite'},{key:'security'}];initializeProgression(s);
  assert.equal(s.nativeFlags.suitesBuilt,true);assert.equal(s.nativeFlags.securityBuilt,true);
  acknowledgeProgressionWarning(s);resetAfterPromotion(s);
  assert.equal(s.nativeFlags.vipPassed,false);assert.equal(s.nativeFlags.progressionWarned,false);
  assert.equal(s.nativeFlags.suitesBuilt,true);assert.equal(s.nativeFlags.medicalReady,true);
  s.star=2;s.nativeFlags.medicalReady=false;resetMedicalDemand(s);
  assert.equal(s.nativeFlags.medicalReady,false);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function officeTower(clinic = false) {
  const tower=new Tower(data,{sandbox:true});
  tower.build('lobby',0,10,109);tower.build('floor',1,10,109);tower.build('floor',2,10,109);
  tower.build('elevator',0,40,40,2);tower.build('office',1,10);
  if(clinic)tower.build('medical',2,50);
  while(tower.state.construction.length)tower.finishConstruction();
  const office=tower.state.rooms.find(room=>room.key==='office');office.occupied=true;
  syncActors(tower);tower.state.star=3;resetMedicalDemand(tower.state);
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===2);
  actor.state=2;actor.floor=office.floor;office.tenantState=1;tower.state.tick=800+actor.slot%16;
  return {tower,office,actor,clinic:tower.state.rooms.find(room=>room.key==='medical')};
}

test('damage preserves foreign clinic route and reports missing destination at arrival, including browser save',()=>{
  const {tower,office,actor,clinic}=officeTower(true);updateActors(tower);
  const trip=tower.state.people.find(person=>person.id===actor.trip),path=JSON.stringify(trip.path);
  assert.equal(tower.damageFacilityAt(clinic.floor,clinic.x),true);
  assert.equal(actor.trip,trip.id);assert.equal(actor.state,66);assert.equal(actor.missingVenue,true);
  assert.equal(JSON.stringify(trip.path),path);assert.equal(tower.state.nativeFlags.medicalReady,true);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  finishActorTrip(tower,actor,office,trip,true,'clinic-arrival');assert.equal(actor.state,35);
  assert.equal(tower.state.nativeFlags.medicalReady,false);assert.equal(actor.missingVenue,undefined);
  assert.equal(tower.state.notices.filter(n=>n.text===data.strings[1010][5]).length,1);
});
test('clinic removed during existing treatment leaves readiness set and starts immediate return',()=>{
  const {tower,office,actor,clinic}=officeTower(true);actor.job=clinic.id;actor.state=35;actor.floor=clinic.floor;actor.visitTick=tower.state.tick;
  tower.damageFacilityAt(clinic.floor,clinic.x);assert.equal(tower.state.nativeFlags.medicalReady,true);updateActors(tower);
  const trip=tower.state.people.find(person=>person.id===actor.trip);
  assert.equal(trip.purpose,'clinic-return');assert.equal(trip.to,office.floor);assert.equal(tower.state.nativeFlags.medicalReady,true);
});

test('clinic removed while a full-capacity patient waits without a transport still clears readiness on retry',()=>{
  const {tower,actor,clinic}=officeTower(true);actor.state=66;actor.floor=clinic.floor;actor.job=clinic.id;actor.trip=null;
  tower.damageFacilityAt(clinic.floor,clinic.x);assert.equal(tower.state.nativeFlags.medicalReady,true);
  updateActors(tower);assert.equal(actor.state,35);assert.equal(tower.state.nativeFlags.medicalReady,false);
});
test('native office caller postpones clinic return to800 and abandons after1600 without decrementing patient byte',()=>{
  for(const base of [400,800,1600]) {
    const {tower,actor,clinic}=officeTower(true);actor.job=clinic.id;actor.state=35;actor.floor=clinic.floor;actor.medicalSlot=0;
    const arrival=base+actor.slot%16;actor.visitTick=arrival;tower.state.tick=arrival;
    clinic.medicalInside=1;tower.state.medicalRegistry[0].inside=1;
    updateActors(tower);assert.equal(actor.state,base===1600?39:35);assert.equal(actor.trip,null);
    tower.state.tick=arrival+16;updateActors(tower);
    if(base===400){assert.equal(actor.state,35);assert.equal(clinic.medicalInside,1);}
    else if(base===800){assert.equal(actor.state,99);assert.equal(clinic.medicalInside,0);assert.equal(tower.state.people.find(person=>person.id===actor.trip).purpose,'clinic-return');}
    else {assert.equal(actor.state,39);assert.equal(clinic.medicalInside,1);assert.equal(actor.trip,null);}
  }
});

test('office demand without a clinic clears actual Tower readiness and reports the original message once', () => {
  const {tower,office,actor}=officeTower();
  updateActors(tower);
  assert.equal(tower.state.nativeFlags.medicalReady,false);
  assert.equal(tower.state.notices[0].text,data.strings[1010][5]);
  const trip=tower.state.people.find(person=>person.id===actor.trip);
  assert.equal(trip.purpose,'clinic-arrival');assert.equal(trip.to,0);
  finishActorTrip(tower,actor,office,trip,true);
  assert.equal(actor.state,35);
  assert.equal(tower.state.notices.filter(notice=>notice.text===data.strings[1010][5]).length,1);
  tower.state.tick=2599;tower.step();
  assert.equal(tower.state.nativeFlags.medicalReady,true);
});

test('full native clinic keeps office patients in admission state without invalidating readiness', () => {
  const {tower,actor,clinic}=officeTower(true);
  // Represent distinct patients from other offices; the patient under test
  // remains a normal persistent office actor and runs its real admission path.
  const patients=Array.from({length:40},(_,index)=>({...actor,id:9000+index,slot:100+index,
    resident:100+index,index:100+index,state:35,job:clinic.id}));
  tower.state.actors.push(...patients);actor.state=66;actor.job=clinic.id;
  clinic.medicalInside=40;tower.state.medicalRegistry.find(record=>record?.room===clinic.id).inside=40;
  updateActors(tower);
  assert.equal(actor.state,66);assert.equal(tower.state.nativeFlags.medicalReady,true);
  patients[0].state=5;
  clinic.medicalInside=39;tower.state.medicalRegistry.find(record=>record?.room===clinic.id).inside=39;
  updateActors(tower);
  assert.equal(actor.state,35);assert.equal(tower.state.nativeFlags.medicalReady,true);
});

test('clinic route failure falls back to outside food without marking existing clinic service missing', () => {
  const {tower,office,actor,clinic}=officeTower(true);
  tower.state.shafts=[];actor.job=clinic.id;
  assert.equal(beginActorTrip(tower,actor,office,1,2,'clinic-arrival'),false);
  assert.equal(actor.state,65);assert.equal(actor.job,null);assert.equal(actor.floor,1);
  assert.equal(actor.trip,null);assert.equal(tower.state.nativeFlags.medicalReady,true);
  assert.deepEqual({delay:actor.delay,trips:actor.trips},{delay:300,trips:1});
  assert.deepEqual(office.trips[actor.resident],{delay:300,trips:1});
});

test('a selected clinic removed during the trip clears readiness at admission', () => {
  const {tower,office,actor,clinic}=officeTower(true);
  updateActors(tower);
  assert.equal(actor.job,clinic.id);assert.equal(tower.state.nativeFlags.medicalReady,true);
  const trip=tower.state.people.find(person=>person.id===actor.trip);
  tower.state.rooms=tower.state.rooms.filter(room=>room.id!==clinic.id);
  finishActorTrip(tower,actor,office,trip,true);
  assert.equal(actor.state,35);assert.equal(tower.state.nativeFlags.medicalReady,false);
  assert.equal(tower.state.notices[0].text,data.strings[1010][5]);
});

test('Tower promotion uses evening boundary and native construction latches', () => {
  const {tower}=officeTower();
  tower.build('suite',1,50);
  tower.state.nativeFlags.vipPassed=true;tower.state.garbage.working=true;tower.state.sandbox=false;
  Object.defineProperty(tower,'population',{get:()=>5000});
  tower.state.tick=1599;tower.checkRating();assert.equal(tower.state.star,3);
  tower.state.tick=1600;tower.checkRating();assert.equal(tower.state.star,4);
  assert.equal(tower.state.nativeFlags.vipPassed,false);
  assert.equal(tower.state.dialogs.at(-1).id,3032);
});

test('Tower save migration seeds construction latches and rejects corrupt flags atomically', () => {
  const {tower}=officeTower();tower.build('security',2,50);tower.build('suite',1,50);
  const legacy=JSON.parse(tower.save());
  for(const key of ['securityBuilt','suitesBuilt','progressionWarned'])delete legacy.nativeFlags[key];
  const copy=new Tower(data);copy.load(JSON.stringify(legacy));
  assert.equal(copy.state.nativeFlags.securityBuilt,true);assert.equal(copy.state.nativeFlags.suitesBuilt,true);
  const saved=copy.save(),corrupt=JSON.parse(saved);corrupt.nativeFlags.securityBuilt=1;
  assert.throws(()=>copy.load(JSON.stringify(corrupt)),/Invalid progression data/);
  assert.equal(copy.save(),saved);
});
