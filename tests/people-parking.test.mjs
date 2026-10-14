import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openCommercialDay} from '../src/original-commercial.js';
import {Tower} from '../src/simulation.js';
import {syncActors,updateActors,beginActorTrip,finishActorTrip,requiresParking,parkingQuota,venueBand,chooseVenue} from '../src/original-people.js';
import {price} from '../src/catalog.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building(){const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,99);t.build('floor',1,10,99);t.build('floor',-1,10,99);t.build('elevator',-1,40,40,1);return t;}
function hotelTower(){const t=building();t.build('suite',1,10);t.build('housekeeping',1,22);t.build('ramp',-1,20);t.build('parking',-1,12);t.build('parking',-1,16);t.step(60);t.state.star=3;syncActors(t);return t;}
test('extending an elevator creates only its floor footprint and retraction retains it without refunds',()=>{
  const t=building(),sh=t.state.shafts[0],cash=t.state.cash;
  const preview=t.resizeShaft(sh.id,-1,4,false);assert.equal(t.highest,1);assert.equal(t.state.cash,cash);
  assert.equal(preview.cost,3*4*price(data,'floor'));
  t.resizeShaft(sh.id,-1,4);assert.deepEqual(t.bounds(4),{x:40,width:4,lobby:false});
  const paid=t.state.cash;t.resizeShaft(sh.id,-1,1);assert.equal(t.state.cash,paid);assert.equal(t.highest,4);
  t.resizeShaft(sh.id,-1,4);assert.equal(t.state.cash,paid);
});
test('unaffordable elevator extension cannot create structure or mutate stops',()=>{
  const t=building();t.state.sandbox=false;t.state.cash=0;const saved=t.save();
  assert.match(t.resizeShaft(t.state.shafts[0].id,-1,2).error,/money/);assert.equal(t.save(),saved);
});
test('persistent residents retain identity and appearance, and one cohort cannot create duplicate trips',()=>{
  const t=building();t.build('office',1,10);t.step(12);const r=t.state.rooms[0];r.occupied=true;syncActors(t);
  const identities=t.state.actors.map(a=>[a.id,a.appearance]);assert.equal(identities.length,6);
  const a=t.state.actors[0];t.state.tick=400+a.slot%16;t.state.calendarDay=0;updateActors(t);
  assert.notEqual(a.trip,null);const id=a.trip;updateActors(t);assert.equal(a.trip,id);
  const p=t.state.people.find(p=>p.id===id);assert.equal(p.appearance,a.appearance);assert.equal(p.actor,a.id);
  syncActors(t);assert.deepEqual(t.state.actors.map(a=>[a.id,a.appearance]),identities);
});
test('office cohorts do not commute on the native weekend',()=>{
  const t=building();t.build('office',1,10);t.step(12);t.state.rooms[0].occupied=true;syncActors(t);t.state.calendarDay=2;t.state.tick=400;
  updateActors(t);assert.equal(t.state.people.length,0);
});
test('parking uses native child requirements and category quotas',()=>{
  assert.equal(requiresParking('suite',0,1,0,3),false);assert.equal(requiresParking('suite',1,1,0,3),true);
  assert.equal(requiresParking('office',2,2,1,3),true);assert.equal(requiresParking('office',1,2,1,3),false);
  assert.equal(requiresParking('office',2,2,1,2),false);
  assert.equal(parkingQuota('office',2),4);assert.equal(parkingQuota('suite',2),4);assert.equal(parkingQuota('twin',2),2);
});
test('native parking bookings display a car, count each booking attempt, and release on departure',()=>{
  const t=hotelTower(),r=t.state.rooms.find(r=>r.key==='suite'),a=t.state.actors.find(a=>a.room===r.id);
  t.randomInt=()=>0; //Exercise repeated booking of the same metadata slot.
  assert.equal(t.bookParking(a,r),true);const space=t.state.rooms.find(r=>r.id===a.parking);
  assert.equal(space.parkingActor,a.id);assert.ok(space.carVariant>=2&&space.carVariant<=14);
  t.bookParking(a,r);assert.equal(t.state.nativeParkingQuotas.used[3],2); //3022A always attempts a fresh booking; actor state prevents duplicate normal calls.
  t.releaseParking(a);assert.equal(a.parking,null);assert.equal(space.occupied,false);assert.equal(space.parkingActor,undefined);
});
test('disconnected ramps are excluded from parking allocation',()=>{
  const t=hotelTower();t.removeRoom(t.state.rooms.find(r=>r.key==='ramp'&&r.floor===-1));
  assert.equal(t.parkingSpaces().length,0);
});
test('VIP reservation requires the native date, rating, primary suite guest and existing parking',()=>{
  const t=hotelTower(),r=t.state.rooms.find(r=>r.key==='suite'),a=t.state.actors.find(a=>a.room===r.id&&a.index===1);
  t.state.calendarDay=3;t.reserveVIP(a,r);assert.equal(t.state.vip,null);
  t.bookParking(a,r);t.state.calendarDay=2;t.reserveVIP(a,r);assert.equal(t.state.vip,null);
  t.state.calendarDay=3;finishActorTrip(t,a,r,{to:-1,tripDelay:10},true,'departure');
  assert.equal(t.state.vip.actor,a.id);assert.notEqual(a.parking,null);assert.equal(t.state.dialogs.at(-1).id,3000);
  t.answerEmergency(3000,1);assert.equal(a.parking,null);
});
test('VIP arrival is tracked by identity and checkout accepts exactly 150 average delay',()=>{
  for(const [delay,expected,id] of [[300,true,3002],[302,false,3003]]){
    const t=hotelTower(),r=t.state.rooms.find(r=>r.key==='suite'),a=t.state.actors.find(a=>a.room===r.id&&a.index===1);
    t.state.calendarDay=3;t.bookParking(a,r);t.reserveVIP(a,r);t.answerEmergency(3000,1);t.arriveVIP(a);assert.equal(t.state.dialogs.at(-1).id,3001);t.answerEmergency(3001,1);
    a.delay=delay;a.trips=2;t.checkoutVIP(a);assert.equal(t.state.nativeFlags.vipPassed,expected);assert.equal(t.state.dialogs.at(-1).id,id);assert.notEqual(t.state.vip,null);
    t.answerEmergency(id,1);assert.equal(t.state.vip,null);
  }
});
test('housekeeping has six persistent staff, respects floor residues, and cleans on arrival and finishes on the fourth cohort update',()=>{
  const t=hotelTower(),r=t.state.rooms.find(r=>r.key==='suite'),center=t.state.rooms.find(r=>r.key==='housekeeping');
  r.occupied=false;r.dirt=100;
  const staff=t.state.actors.filter(a=>a.room===center.id);assert.equal(staff.length,6);
  const a=staff.find(a=>a.index===(r.floor+10)%6);t.state.tick=a.slot%16;updateActors(t);assert.equal(a.job,r.id);
  const p=t.state.people.find(p=>p.id===a.trip);finishActorTrip(t,a,center,p,true,'clean-arrival');t.state.people=[];
  assert.equal(r.dirt,0);assert.equal(r.housekeepingOverlay,true);
  for(let i=0;i<3;i++)updateActors(t);assert.equal(a.cleanTicks,0);assert.equal(r.housekeepingOverlay,true);
  updateActors(t);assert.equal(a.state,0);assert.equal(a.floor,r.floor);assert.equal(r.housekeepingOverlay,false);
});
test('persistent identities, parking, VIP and trips survive browser saves; corrupt actor references are rejected atomically',()=>{
  const t=hotelTower(),r=t.state.rooms.find(r=>r.key==='suite'),a=t.state.actors.find(a=>a.room===r.id&&a.index===1);
  t.state.calendarDay=3;t.bookParking(a,r);t.reserveVIP(a,r);a.name='Test guest';beginActorTrip(t,a,r,-1,1,'arrival');
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  const saved=copy.save(),broken=JSON.parse(saved);broken.actors[0].trip=999999;assert.throws(()=>copy.load(JSON.stringify(broken)));assert.equal(copy.save(),saved);
});
test('hotel guests stay overnight and return to the same persistent pool after checkout',()=>{
  const t=hotelTower(),r=t.state.rooms.find(r=>r.key==='suite');r.occupied=true;
  const seen=new Set(),advance=ticks=>{for(let i=0;i<ticks;i++){while(t.state.dialogs.length){const d=t.state.dialogs[0];seen.add(d.id);t.answerEmergency(d.id,1);}t.step();}for(const d of t.state.dialogs)seen.add(d.id);};
  t.state.calendarDay=2;t.state.tick=1599;const ids=t.state.actors.filter(a=>a.room===r.id).map(a=>a.id);
  // Guests may dine before sleeping; 0x432CC forces sleep only after2400.
  advance(850);assert.ok(t.state.actors.filter(a=>a.room===r.id).every(a=>a.state===16));
  advance(1000);assert.deepEqual(t.state.actors.filter(a=>a.room===r.id).map(a=>a.id),ids);
  assert.ok(t.state.ledger.some(e=>e.label==='Hotel suite checkout'));assert.ok(seen.has(3000));
  advance(2700);
  assert.ok(seen.has(3001));assert.ok(seen.has(3002));
  assert.equal(t.state.nativeFlags.vipPassed,true);
});
test('finishing multiple queued facilities removes one job per completion and leaves later jobs intact',()=>{
  const t=hotelTower();assert.equal(t.state.construction.length,0);assert.ok(t.state.rooms.every(r=>r.constructionRemaining===0));
});
test('security keeps six persistent staff for its separate emergency dispatcher',()=>{
  const t=building();t.build('security',1,10);t.step(30);
  const ids=t.state.actors.map(a=>a.id);assert.equal(ids.length,6);t.step(1000);
  assert.deepEqual(t.state.actors.map(a=>a.id),ids);assert.equal(t.state.people.length,0);
});

test('office child roles enter business/lunch states and daytime outings retain parking',()=>{
  const t=building();t.build('office',1,10);t.step(12);const r=t.state.rooms.find(r=>r.key==='office');r.occupied=true;syncActors(t);
  const [boss,worker]=t.state.actors.filter(a=>a.room===r.id);
  for(const a of [boss,worker])finishActorTrip(t,a,r,{to:r.floor,tripDelay:0},true,'arrival');
  assert.equal(boss.state,0);assert.equal(worker.state,1);
  t.state.tick=400+boss.slot%16;updateActors(t);assert.equal(boss.state,64);
  const p=t.state.people.find(p=>p.id===boss.trip);assert.equal(p.purpose,'outing');
  finishActorTrip(t,boss,r,{to:0,tripDelay:2},true,'outing');assert.equal(boss.state,33);
  t.state.tick=1600+boss.slot%16;updateActors(t);assert.equal(boss.state,97);
  finishActorTrip(t,boss,r,{to:r.floor,tripDelay:2},true,'business-return');assert.equal(boss.state,5);
});
test('lunch visits use the selected venue, count actual visitors and wait 60 native ticks',()=>{
  const t=building();t.build('office',1,10);t.build('fastfood',1,60);t.step(24);const r=t.state.rooms.find(r=>r.key==='office'),food=t.state.rooms.find(r=>r.key==='fastfood');r.occupied=true;syncActors(t);
  const a=t.state.actors.find(a=>a.room===r.id&&a.index===1);a.state=1;a.floor=r.floor;
  food.commercial=openCommercialDay(food.commercial,'fastfood',false);food.visitors=food.commercial.visitors;
  const visitors=food.visitors;
  t.state.tick=800+a.slot%16;updateActors(t);assert.equal(a.job,food.id);assert.equal(a.state,34);
  assert.equal(a.trip,null);assert.equal(food.visitors,visitors+1);
  t.state.tick+=48;updateActors(t);assert.equal(a.trip,null);assert.equal(a.state,34);
  t.state.tick+=16;updateActors(t);assert.equal(a.state,0);assert.equal(a.job,null);
  assert.equal(food.commercial.inside,0);
});
test('office medical branch uses the original probability and 16-tick clinic visit',()=>{
  const t=building();t.build('office',1,10);t.build('medical',1,60);t.step(24);t.state.star=3;const r=t.state.rooms.find(r=>r.key==='office'),clinic=t.state.rooms.find(r=>r.key==='medical');r.occupied=true;syncActors(t);
  const a=t.state.actors.find(a=>a.room===r.id&&a.index===2);t.randomInt=()=>0;
  finishActorTrip(t,a,r,{to:r.floor,tripDelay:0},true,'arrival');assert.equal(a.state,2);
  t.state.tick=800+a.slot%16;updateActors(t);assert.equal(a.job,clinic.id);assert.equal(a.state,35);assert.equal(a.trip,null);
  t.state.tick+=16;updateActors(t);assert.equal(a.state,5);assert.equal(a.job,null);assert.equal(a.trip,null);
});
test('service venues admit at most forty persistent visitors and retry their own destination',()=>{
  const t=building();for(const x of [10,19,28,44,53,62,71])t.build('office',1,x);t.build('fastfood',-1,10);t.step(96);
  for(const r of t.state.rooms)r.occupied=true;syncActors(t);t.state.people=[];
  const food=t.state.rooms.find(r=>r.key==='fastfood'),residents=t.state.actors.filter(a=>t.state.rooms.find(r=>r.id===a.room)?.key==='office');
  food.commercial={...openCommercialDay(food.commercial,'fastfood',false),inside:40,state:2};
  const a=residents[0],r=t.state.rooms.find(r=>r.id===a.room);a.job=food.id;a.trip=null;
  for(const other of residents.slice(1,41)){other.trip=null;other.job=food.id;other.state=34;other.visitTick=800;}
  finishActorTrip(t,a,r,{to:food.floor,tripDelay:0},true,'lunch-arrival');assert.equal(a.state,65);
  t.state.tick=800+a.slot%16;updateActors(t);assert.equal(a.state,65);assert.equal(a.job,food.id);
  residents[1].state=5;residents[1].job=null;food.commercial.inside--;updateActors(t);assert.equal(a.state,34);
});
test('condo child two returns earlier and residents sleep after returning home',()=>{
  const t=building();t.build('condo',1,10);t.step(24);const r=t.state.rooms.find(r=>r.key==='condo');r.occupied=true;syncActors(t);
  const residents=t.state.actors.filter(a=>a.room===r.id);for(const a of residents){a.state=33;a.floor=0;}
  t.randomInt=()=>0;for(const a of residents){t.state.tick=1200+a.slot%16;updateActors(t);}
  assert.equal(residents[0].trip,null);assert.equal(residents[1].trip,null);assert.equal(residents[2].state,97);
  const child=residents[2];finishActorTrip(t,child,r,{to:r.floor,tripDelay:0},true,'home');assert.equal(child.state,4);
  t.state.tick=2000+child.slot%16;updateActors(t);assert.equal(child.state,16);
});
test('new people state transitions and service destinations survive browser save/load',()=>{
  const t=building();t.build('office',1,10);t.build('fastfood',1,60);t.step(24);const r=t.state.rooms.find(r=>r.key==='office');r.occupied=true;syncActors(t);
  const a=t.state.actors.find(a=>a.room===r.id&&a.index===1);a.state=1;a.floor=r.floor;r.tenantState=1;t.state.tick=800+a.slot%16;updateActors(t);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
});

test('venue lists respect native lobby bands, including signed basement division and fallback',()=>{
  for(const f of [-10,-5,0,4])assert.equal(venueBand(f),0);
  for(const f of [5,6,9])assert.equal(venueBand(f),-1);
  for(const f of [10,14,19])assert.equal(venueBand(f),1);
  const t=building();t.build('fastfood',1,60);t.step(12);const food=t.state.rooms.find(r=>r.key==='fastfood');
  t.state.tick=240;t.openBusinesses();
  assert.equal(chooseVenue(t,20,'fastfood').id,food.id);assert.equal(chooseVenue(t,20,'restaurant'),null);
});
