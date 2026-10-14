import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acceptanceEvaluation, dailyTenancyPlan, quarterTenancyPlan, quarterContract, initialTenancyPayment, canSeekTenant, initialTenantActor, residentStress, tenantRoomSprite, tenantRoomAdmitted, tenantRoomEntry, tenantRoomExit, tenantRoomSleep, tenantRoomWake, tenantRoomClock, validateTenantRoomState, synchronizeTenantRoomState,nativeLeaseOccupied } from '../src/original-tenancy.js';
import { rentAmount } from '../src/original-economy.js';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors,beginActorTrip,finishActorTrip } from '../src/original-people.js';
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
const room = (id, x, fields = {}) => ({ id, x, floor: 2, key: 'office', occupied: true, accepting: true, constructionRemaining: 0, tenure: 1, price: 1, ...fields });
test('new accepted contracts clear both visible room histories and every native allocated resident history', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);
  tower.build('office',1,40);tower.finishConstruction();syncActors(tower);
  const office=tower.state.rooms[0];
  for(const stat of office.trips)Object.assign(stat,{delay:300,trips:3});
  for(const actor of tower.state.actors)Object.assign(actor,{delay:200,trips:2});
  tower.admitTenant(office);
  assert.ok(office.trips.every(stat=>stat.delay===0&&stat.trips===0));
  assert.ok(tower.state.actors.every(actor=>actor.delay===0&&actor.trips===0));
  assert.equal(tower.population,6);
});
test('failed initial vacant condo applicant resets its duplicate room history and retries outside', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);
  tower.build('condo',1,40);tower.finishConstruction();syncActors(tower);
  const condo=tower.state.rooms[0],actor=tower.state.actors[0];
  assert.equal(beginActorTrip(tower,actor,condo,0,1,'arrival'),false);
  assert.equal(actor.state,32);assert.equal(actor.delay,0);assert.equal(actor.trips,0);
  assert.equal(condo.trips[0].delay,0);assert.equal(condo.trips[0].trips,0);
  assert.equal(tower.population,0);
});
test('occupied condo losing transport restores its resident at home instead of putting it outside', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);
  tower.build('condo',1,40);tower.finishConstruction();syncActors(tower);
  const condo=tower.state.rooms[0],actor=tower.state.actors[0];tower.admitTenant(condo);
  Object.assign(actor,{state:0,floor:1});condo.tenantState=1;
  assert.equal(beginActorTrip(tower,actor,condo,1,0,'outing'),false);
  assert.equal(actor.state,4);assert.equal(actor.floor,1);assert.equal(actor.trip,null);
  assert.equal(condo.tenantState,1);assert.equal(tower.population,3);
  assert.equal(actor.trips,1);assert.equal(condo.trips[0].trips,1);
});
test('an occupied office unable to admit its morning worker uses native state37', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);
  tower.build('office',1,40);tower.finishConstruction();syncActors(tower);
  const office=tower.state.rooms[0],actor=tower.state.actors[0];tower.admitTenant(office);
  assert.equal(beginActorTrip(tower,actor,office,0,1,'arrival'),false);
  assert.equal(actor.state,37);assert.equal(actor.trip,null);assert.equal(tower.population,6);
});
test('office facades pack six occupied styles into three sheets and share vacancy artwork', () => {
  assert.deepEqual(tenantRoomSprite(room(1, 0, { variant: 1, tenantState: 3 }), 1800), { sheet: 1448, x: 144, y: 0, width: 72, height: 24 });
  assert.equal(tenantRoomSprite(room(1, 0, { variant: 5, tenantState: 8 }), 1800).sheet, 1450);
  assert.equal(tenantRoomSprite(room(1, 0, { variant: 5, tenantState: 8 }), 1800).x, 216);
  assert.equal(tenantRoomSprite(room(1, 0, { variant: 5, tenantState: 24 }), 1800).sheet, 1451);
  assert.equal(tenantRoomSprite(room(1, 0, { variant: 5, tenantState: 24 }), 1800).x, 72);
  assert.equal(tenantRoomSprite(room(1, 0, { key: 'condo', variant: 2, tenantState: 16 }), 1800).sheet, 1588);
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
  for (const key of ['office', 'condo']) for (let variant = 0; variant < (key === 'office' ? 6 : 3); variant++) {
    for (const tenantState of key === 'office' ? [0, 6, 8, 16, 24] : [0, 3, 8, 11, 16, 24, 32]) {
      const frame = tenantRoomSprite({ key, variant, tenantState }, 2000);
      const bitmap = manifest.resources.find(r => r.type === 2 && r.id === frame.sheet);
      assert.ok(bitmap && frame.x + frame.width <= bitmap.width && frame.height <= bitmap.height);
    }
  }
});
test('native room counters preserve office light until its final worker leaves and track condo sleep', () => {
  const office = room(1, 0, { tenantState: 2 });
  assert.equal(tenantRoomClock(office, 1600), 2);
  assert.equal(tenantRoomExit(office, 1700), 1);
  assert.equal(tenantRoomExit({ ...office, tenantState: 1 }, 1700), 8);
  assert.equal(tenantRoomEntry({ ...office, tenantState: 8 }, 1700), 1);
  assert.equal(tenantRoomClock(office, 0, true), 8);
  assert.equal(tenantRoomClock({ ...office, tenantState: 24 }, 0), 16);
  assert.equal(tenantRoomAdmitted(office, 2000), 0);
  const condo = { ...office, key: 'condo', tenantState: 11 }, actor = { id: 2, room: 1, state: 16 };
  assert.equal(tenantRoomSleep(condo, actor, [actor, { id: 3, room: 1, state: 4 }], 2000), 11);
  assert.equal(tenantRoomSleep(condo, actor, [actor, { id: 3, room: 1, state: 16 }], 2000), 16);
  assert.equal(tenantRoomSleep({ ...condo, tenantState: 9 }, actor, [actor, { id: 3, room: 1, state: 33 }], 2000), 16);
  assert.equal(tenantRoomWake({ ...condo, tenantState: 16 }, 100), 3);
  assert.equal(tenantRoomEntry({ ...condo, tenantState: 16 }, 2000), 9);
  assert.equal(tenantRoomClock({ ...condo, tenantState: 2 }, 1600), 10);
  assert.equal(validateTenantRoomState(condo), true);
  assert.throws(() => validateTenantRoomState({ ...office, tenantState: 7 }));
});
test('legacy ownership changes migrate from vacancy modes to actual home counts without accepting invalid bytes', () => {
  const r = room(1, 0, { tenantState: 16 }), actors = [{ id: 2, room: 1, state: 1, trip: null }, { id: 3, room: 1, state: 96, trip: 4 }];
  assert.equal(synchronizeTenantRoomState(r, actors, 800), 1);
  const condo = { ...r, key: 'condo', tenantState: 32 };
  assert.equal(synchronizeTenantRoomState(condo, actors, 800), 1);
  assert.equal(synchronizeTenantRoomState({ ...condo, tenantState: 16 }, [{ ...actors[0], state: 16 }], 800), 16);
  assert.equal(synchronizeTenantRoomState({ ...condo, tenantState: 9 }, actors, 800), 9);
  assert.throws(() => validateTenantRoomState({ ...r, tenantState: 15 }));
});
test('new applicants begin outside and rejected vacancies stop seeking tenants until a referral', () => {
  assert.deepEqual(initialTenantActor(room(1, 0, { key: 'condo', occupied: false })), { state: 32, floor: 0 });
  assert.deepEqual(initialTenantActor(room(1, 0, { key: 'condo' })), { state: 16, floor: 2 });
  assert.equal(canSeekTenant(room(1, 0, { occupied: false, accepting: false })), false);
  assert.equal(canSeekTenant(room(1, 0, { occupied: false })), true);
  assert.equal(canSeekTenant(room(1,0,{occupied:true,accepting:false})),false);
});
test('native lease classification follows facade byte separately from accepted population ownership',()=>{
  assert.equal(nativeLeaseOccupied({key:'office',occupied:true,tenantState:16},800),false);
  assert.equal(nativeLeaseOccupied({key:'office',occupied:false,tenantState:8},2000),true);
  assert.equal(nativeLeaseOccupied({key:'condo',occupied:false,tenantState:16},2600),true);
  assert.equal(nativeLeaseOccupied({key:'condo',occupied:true,tenantState:33},2600),false);
  assert.equal(nativeLeaseOccupied({key:'suite',occupied:true,hotelState:48},2600),false);
  assert.equal(nativeLeaseOccupied({key:'shop',occupied:false,commercial:{state:3}},2200),true);
  assert.equal(nativeLeaseOccupied({key:'condo',occupied:true},2600),true);
});
test('quarter rent and evaluation use native occupied facades even after accepted ownership was cleared',()=>{
  const office=room(1,0,{occupied:false,accepting:true,tenantState:8});
  assert.equal(acceptanceEvaluation(data,office,300,1),0);
  assert.equal(dailyTenancyPlan(data,[office],1,()=>300)[0].occupied,true);
  assert.equal(quarterContract(data,office).payment,rentAmount(data,7,office.price));
  assert.equal(quarterContract(data,{...office,tenantState:24,occupied:true}).payment,0);
  const tower=applicantTower('office'),home=tower.state.rooms[0];Object.assign(home,{occupied:false,tenantState:8,accepting:false});
  tower.state.tick=2533;tower.settleQuarter();assert.equal(tower.state.nativePopulation.total,0);assert.equal(tower.state.accounts.income[0],rentAmount(data,7,home.price));assert.equal(home.tenure,1);
});
test('late evicted condo family can sleep into an occupied facade and trigger native repeated tier refund and negative population',()=>{
  for(const removal of ['quarter','demolish','damage']) {
    const tower=applicantTower('condo'),home=tower.state.rooms[0],actor=tower.state.actors.find(a=>a.room===home.id&&a.index===2);
    tower.admitTenant(home);Object.assign(actor,{state:33,floor:0});tower.state.tick=2533;beginActorTrip(tower,actor,home,0,1,'home');const person=tower.state.people.find(p=>p.id===actor.trip);
    tower.vacateRoom(home);assert.equal(tower.population,0);assert.equal(home.sold,false);assert.equal(home.salePrice,0);assert.equal(tower.setRoomPrice(home.id,2).ok,true);
    person.path=[];person.stage='walk';tower.updatePeople(0,person.id);assert.equal(home.tenantState,33);tower.state.tick=2544+actor.slot%16;updateActors(tower);assert.equal(actor.state,16);assert.equal(home.tenantState,16);assert.equal(home.occupied,false);
    assert.match(tower.setRoomPrice(home.id,3).error,/occupied/);
    const beforeAdmission=tower.state.cash;home.accepting=true;tower.admitTenant(home);assert.equal(tower.state.cash,beforeAdmission);assert.equal(tower.population,0); //native occupied facade prevents a second sale.
    for(const stat of home.trips)Object.assign(stat,{delay:300,trips:1});
    const cash=tower.state.cash,refund=rentAmount(data,9,2);
    if(removal==='quarter'){
      tower.settleQuarter();const upkeep=tower.state.accounts.maintenance.reduce((a,b)=>a+b,0);assert.equal(tower.state.cash,cash-refund-upkeep);assert.equal(tower.state.accounts.income[9],-refund);
      assert.equal(home.tenantState,32);assert.equal(home.occupied,false);
    }else {
      if(removal==='demolish')tower.removeRoom(home);else assert.equal(tower.damageFacilityAt(1,home.x),true);
      assert.equal(tower.state.cash,cash-refund);
    }
    assert.equal(tower.state.nativePopulation.categories[9],-3);assert.equal(tower.population,-3);
    const loaded=new Tower(data);loaded.load(tower.save());assert.equal(loaded.population,-3);assert.equal(loaded.state.cash,tower.state.cash);
  }
});
test('eviction preserves an existing home-return journey and late entry increments the vacancy facade byte',()=>{
  for(const key of ['office','condo']) {
    const tower=applicantTower(key),home=tower.state.rooms[0],actor=tower.state.actors.find(a=>a.room===home.id&&a.index===0);
    tower.admitTenant(home);Object.assign(actor,{state:33,floor:0});tower.state.tick=2533;
    beginActorTrip(tower,actor,home,0,home.floor,'home');const person=tower.state.people.find(p=>p.id===actor.trip);
    assert.ok(person);tower.vacateRoom(home);assert.equal(actor.state,97);assert.equal(actor.trip,person.id);assert.equal(home.accepting,false);assert.equal(tower.population,0);
    person.path=[];person.stage='walk';tower.updatePeople(0,person.id);
    assert.equal(home.occupied,false);assert.equal(home.tenantState,key==='office'?25:33);assert.equal(actor.floor,home.floor);
    syncActors(tower);assert.equal(home.tenantState,key==='office'?25:33);
    const loaded=new Tower(data);loaded.load(tower.save());assert.equal(loaded.state.rooms[0].tenantState,home.tenantState);
    assert.equal(tenantRoomSprite(home,2533).sheet,key==='office'?1451:1580+(home.variant||0)*5);
  }
});
test('existing applicant arrivals re-admit evicted offices and condos on completion without reopening acceptance',()=>{
  for(const key of ['office','condo']) {
    const tower=applicantTower(key),home=tower.state.rooms[0],actor=tower.state.actors.find(a=>a.room===home.id&&a.index===0);
    tower.state.tick=400;beginActorTrip(tower,actor,home,0,home.floor,'arrival');const person=tower.state.people.find(p=>p.id===actor.trip);
    assert.equal(home.occupied,true);assert.ok(person);tower.state.tick=2533;tower.vacateRoom(home);const cash=tower.state.cash;
    assert.equal(home.accepting,false);assert.equal(tower.population,0);person.path=[];person.stage='walk';tower.updatePeople(0,person.id);
    assert.equal(home.occupied,true);assert.equal(home.accepting,false);assert.equal(home.tenantState,key==='office'?1:9);
    assert.equal(tower.population,key==='office'?6:3);assert.equal(tower.state.cash,cash+rentAmount(data,key==='office'?7:9,home.price));
    assert.equal(home.sold,key==='condo');assert.ok(home.trips.every(stat=>stat.delay===0&&stat.trips===0));
  }
});
test('rejected vacancies still process existing food visitors and keep their budget until source departure',()=>{
  const tower=applicantTower('office'),home=tower.state.rooms[0];tower.build('fastfood',1,30);tower.finishConstruction();syncActors(tower);tower.admitTenant(home);
  const food=tower.state.rooms.find(room=>room.key==='fastfood'),actor=tower.state.actors.find(a=>a.room===home.id&&a.index===1);tower.state.tick=240;tower.openBusinesses();food.commercial.inside=1;food.commercial.state=1;
  Object.assign(actor,{state:34,floor:1,job:food.id,commercialSlot:food.commercialSlot,commercialInside:true,visitTick:800});tower.state.tick=900;tower.vacateRoom(home);
  assert.equal(actor.state,34);assert.equal(actor.job,food.id);assert.equal(food.commercial.inside,1);tower.state.tick=912+actor.slot%16;updateActors(tower);
  assert.equal(food.commercial.inside,0);assert.equal(actor.state,0);assert.equal(home.occupied,false);assert.equal(home.tenantState,17);
});
test('accepting vacancies have no evaluation, rejected vacancies retain the previous tenant stress', () => {
  assert.equal(acceptanceEvaluation(data, room(1, 0, { occupied: false }), 300, 1), -1);
  assert.equal(acceptanceEvaluation(data, room(1, 0, { occupied: false, accepting: false }), 300, 1), 0);
  assert.equal(acceptanceEvaluation(data, room(1, 0, { occupied: false, accepting: false }), 0, 1), 2);
});
test('daily evaluation may reopen acceptance without early eviction, referrals or clearing totals', () => {
  const plan = dailyTenancyPlan(data, [room(1, 0), room(2, 20, { occupied: false, accepting: false })], 1, r => r.id === 1 ? 300 : 0);
  assert.equal(plan[0].evaluation, 0); assert.equal(plan[0].evict, false); assert.equal(plan[0].occupied, true);
  assert.equal(plan[1].evaluation, 2); assert.equal(plan[1].accepting, true); assert.equal(plan[1].occupied, false);
  assert.ok(plan.every(r => r.referral === null && !r.resetStress));
});
test('each good same-type neighbor sponsors only one bad vacancy, in horizontal table order', () => {
  const rooms = [room(3, 30), room(2, 20), room(1, 10)], before = structuredClone(rooms);
  const plan = quarterTenancyPlan(data, rooms, 1, r => r.id === 3 ? 0 : 300);
  assert.deepEqual(plan.map(r => [r.roomId, r.evaluation, r.evict, r.accepting, r.referral]),
    [[1, 1, true, true, 3], [2, 0, true, false, null], [3, 1, false, true, null]]);
  assert.equal(plan[0].resetStress, true); assert.deepEqual(rooms, before);
});
test('referrals do not cross floors or room categories and do not immediately occupy a vacancy', () => {
  const rooms = [room(1, 0), room(2, 20, { key: 'condo' }), room(3, 40, { floor: 3 })];
  const plan = quarterTenancyPlan(data, rooms, 1, r => r.id === 1 ? 300 : 0);
  assert.equal(plan[0].referral, null); assert.equal(plan[0].occupied, false);
});
test('an already rejected vacancy can receive a referral without a second eviction', () => {
  const rooms = [room(1, 0, { occupied: false, accepting: false }), room(2, 20)];
  const plan = quarterTenancyPlan(data, rooms, 1, r => r.id === 1 ? 300 : 0);
  assert.equal(plan[0].evict, false); assert.equal(plan[0].accepting, true);
  assert.equal(plan[0].referral, 2); assert.equal(plan[0].occupied, false);
});
test('native shop evaluation skips quarter-zero eviction and referral processing', () => {
  const plan = quarterTenancyPlan(data, [room(1, 0, { key: 'shop', tenure: 0 }), room(2, 20, { key: 'shop' })], 1, r => r.id === 1 ? 300 : 0);
  assert.equal(plan[0].evict, false); assert.equal(plan[0].referral, null); assert.equal(plan[1].evaluation, 2);
});
test('only completed rooms participate in the quarter pass', () => {
  const plan = quarterTenancyPlan(data, [room(1, 0), room(2, 20, { constructionRemaining: 1 })], 1, () => 300);
  assert.equal(plan.length, 1); assert.equal(plan[0].evict, true);
});
test('native quarter contracts stop charging rent at 120 quarters but still clear stress totals', () => {
  assert.deepEqual(quarterContract(data, room(1, 0, { tenure: 119 })), { tenure: 120, payment: rentAmount(data, 7, 1), resetStress: true });
  assert.deepEqual(quarterContract(data, room(1, 0, { tenure: 120 })), { tenure: 120, payment: 0, resetStress: true });
  assert.equal(quarterContract(data, room(1, 0, { key: 'condo' })).payment, 0);
  assert.deepEqual(quarterContract(data, room(1, 0, { occupied: false })), { tenure: 1, payment: 0, resetStress: false });
});
test('first accepted applicant pays the current tier once, with no payment for rejection or construction', () => {
  const vacancy = room(1, 0, { occupied: false, key: 'condo', price: 2 });
  assert.equal(initialTenancyPayment(data, vacancy), rentAmount(data, 9, 2));
  assert.equal(initialTenancyPayment(data, { ...vacancy, occupied: true }), 0);
  assert.equal(initialTenancyPayment(data, { ...vacancy, accepting: false }), 0);
  assert.equal(initialTenancyPayment(data, { ...vacancy, constructionRemaining: 1 }), 0);
});
test('office, condo and hotel means all flow through the native price and noise adjustment', () => {
  for (const key of ['office', 'condo', 'single', 'twin', 'suite']) {
    const tenant = room(1, 0, { key, width: 8, trips: [{ delay: 100, trips: 2 }, { delay: 40, trips: 1 }] });
    assert.equal(residentStress({ ...tenant, price: 0 }, [tenant]), 75);
    assert.equal(residentStress({ ...tenant, price: 1 }, [tenant]), 45);
    assert.equal(residentStress({ ...tenant, price: 2 }, [tenant]), 15);
    assert.equal(residentStress({ ...tenant, price: 3 }, [tenant]), 0);
    const restaurant = room(2, 8, { key: 'restaurant', width: 8 });
    assert.equal(residentStress({ ...tenant, price: 3 }, [tenant, restaurant]), 60);
  }
});

function applicantTower(key, connected = true) {
  const tower = new Tower(data, { sandbox: true });
  assert.equal(tower.build('lobby', 0, 10, 99).ok, true);
  assert.equal(tower.build('floor', 1, 10, 99).ok, true);
  assert.equal(tower.build(key, 1, 10).ok, true);
  if (connected) assert.equal(tower.build('elevator', 0, 60, 60, 1).ok, true);
  tower.step(12); syncActors(tower);
  return tower;
}
function runApplicantCohorts(tower) {
  for (let tick = 400; tick < 416; tick++) { tower.state.tick = tick; updateActors(tower); }
}
test('office and condo occupancy is admitted by applicant transport, posting payment before arrival only once', () => {
  for (const key of ['office', 'condo']) {
    const t = applicantTower(key), r = t.state.rooms[0], cash = t.state.cash;
    assert.equal(r.occupied, false); assert.equal(r.accepting, true);
    assert.ok(t.state.actors.every(a => a.state === 32 && a.floor === 0));
    runApplicantCohorts(t);
    assert.equal(r.occupied, true); assert.equal(t.population, CATALOG_CAPACITY(key));
    assert.equal(t.state.cash, cash + rentAmount(data, key === 'office' ? 7 : 9, r.price));
    assert.ok(t.state.people.length > 0); assert.ok(t.state.people.every(p => p.floor === 0));
    if (key === 'condo') { assert.equal(r.sold, true); assert.equal(r.salePrice, rentAmount(data, 9, r.price)); }
    runApplicantCohorts(t); assert.equal(t.state.cash, cash + rentAmount(data, key === 'office' ? 7 : 9, r.price));
  }
});
function CATALOG_CAPACITY(key) { return key === 'office' ? 6 : 3; }
test('a condo waking its sole sleeper counts all three before its two queued residents return',()=>{
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,99);t.build('floor',1,10,99);t.build('condo',1,10);t.build('elevator',0,60,60,1);t.finishAllConstruction();
  const r=t.state.rooms[0],[sleeper,...late]=t.state.actors.filter(a=>a.room===r.id);t.state.tick=1800;t.admitTenant(r);r.tenantState=9;sleeper.state=4;sleeper.floor=1;
  for(const a of late){a.state=34;a.floor=0;assert.equal(beginActorTrip(t,a,r,0,1,'lunch-return'),true);assert.equal(t.state.people.find(p=>p.id===a.trip).stage,'queue');}
  t.state.tick=2416+sleeper.slot%16;updateActors(t);assert.equal(r.tenantState,16);
  t.state.tick=sleeper.slot%16;updateActors(t);assert.equal(r.tenantState,3);
  for(const a of late)finishActorTrip(t,a,r,t.state.people.find(p=>p.id===a.trip),true,'lunch-return');t.state.people=[];
  assert.equal(r.tenantState,5);assert.equal(t.population,3);assert.equal(validateTenantRoomState(r),true);
  r.tenantState=tenantRoomClock(r,1600);assert.equal(r.tenantState,13);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.state.rooms[0].tenantState,13);assert.equal(copy.population,3);
});
test('unreachable applicants remain outside and can enter after transport is added', () => {
  const t = applicantTower('condo', false), r = t.state.rooms[0], cash = t.state.cash;
  runApplicantCohorts(t); assert.equal(r.occupied, false); assert.equal(t.state.cash, cash);
  assert.ok(t.state.actors.every(a => a.state === 32 && a.trip === null && a.delay === 0 && a.trips === 0));
  assert.equal(t.build('elevator', 0, 60, 60, 1).ok, true);
  runApplicantCohorts(t); assert.equal(r.occupied, true);
});
test('quarter eviction consumes a good same-floor donor and retains stress in vacancies without a donor', () => {
  const t = applicantTower('office'), target = t.state.rooms[0];
  assert.equal(t.build('office', 1, 22).ok, true); assert.equal(t.build('office', 1, 34).ok, true);
  for (const r of t.state.rooms) { r.constructionRemaining = 0; t.admitTenant(r); }
  syncActors(t);
  const [first, second, donor] = t.state.rooms;
  for (const r of [first, second]) for (const stat of r.trips) { stat.delay = 300; stat.trips = 1; }
  t.settleQuarter();
  assert.equal(first.occupied, false); assert.equal(first.accepting, true); assert.equal(first.evaluation, 1);
  assert.ok(first.trips.every(s => s.delay === 0 && s.trips === 0));
  assert.equal(second.occupied, false); assert.equal(second.accepting, false); assert.equal(second.evaluation, 0);
  assert.ok(second.trips.every(s => s.delay === 300 && s.trips === 1));
  assert.equal(donor.evaluation, 1); assert.equal(donor.tenure, 1);
  runApplicantCohorts(t); assert.equal(target.occupied, true); assert.equal(second.occupied, false);
});
test('tower tenant means apply price and noise even when the route graph is unavailable', () => {
  const t = applicantTower('office', false), r = t.state.rooms[0];
  r.price = 0; for (const stat of r.trips) { stat.delay = 40; stat.trips = 1; }
  assert.equal(t.tenantStress(r), 70);
  t.state.rooms.push({ id: 999, key: 'restaurant', floor: r.floor, x: r.x + r.width, width: 8 });
  assert.equal(t.tenantStress(r), 130);
});
test('tick 2533 evaluates daily with acceptance latched, but eviction waits until a quarter date', () => {
  const t = applicantTower('office'), r = t.state.rooms[0]; t.admitTenant(r);
  for (const stat of r.trips) { stat.delay = 300; stat.trips = 1; }
  const cash = t.state.cash;
  t.state.tick = 2532; t.state.calendarDay = 1; t.step(1);
  assert.equal(r.evaluation, 0); assert.equal(r.accepting, true); assert.equal(r.occupied, true);
  assert.equal(t.state.cash, cash); assert.ok(r.trips.every(s => s.delay === 300 && s.trips === 1));
  t.state.tick = 2532; t.state.calendarDay = 3; t.step(1);
  assert.equal(r.occupied, false); assert.equal(r.accepting, false);
  assert.ok(r.trips.every(s => s.delay === 300 && s.trips === 1));
});
test('a rejected vacancy with recovered means becomes accepting at the daily boundary before applicants move in', () => {
  const t = applicantTower('condo'), r = t.state.rooms[0]; r.accepting = false;
  t.state.tick = 2532; t.state.calendarDay = 1; t.step(1);
  assert.equal(r.evaluation, 2); assert.equal(r.accepting, true); assert.equal(r.occupied, false);
});
