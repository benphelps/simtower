import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newCommercialState, openCommercialDay, recommendCommercial, bookCommercialPatron,
  cancelCommercialPatron, admitCommercialVisit, leaveCommercialVisit, commercialEvaluation,
  closeCommercialDay, commercialArrivalDue, updateCommercialActor, finishCommercialActorTrip,
  validateCommercialState, validateCommercialActor, commercialSprite } from '../src/original-commercial.js';
import { acceptanceEvaluation } from '../src/original-tenancy.js';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors, finishActorTrip } from '../src/original-people.js';
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
test('office food visits abandoned at phase4 retain venue capacity until the next opening', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);
  tower.build('office',1,40);tower.build('fastfood',1,60);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const office=tower.state.rooms.find(room=>room.key==='office'),food=tower.state.rooms.find(room=>room.key==='fastfood');
  tower.admitTenant(office);food.commercial=openCommercialDay(food.commercial,'fastfood',false);
  for(let i=0;i<40;i++)food.commercial=admitCommercialVisit(food.commercial,true).record;
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===1);
  Object.assign(actor,{state:34,job:food.id,floor:food.floor,visitTick:1500,commercialInside:true});
  tower.state.tick=1600+actor.slot%16;updateActors(tower);
  assert.equal(actor.state,39);assert.equal(actor.trip,null);assert.equal(actor.job,food.id);
  assert.equal(actor.commercialInside,false);assert.equal(food.commercial.inside,40);
  assert.equal(admitCommercialVisit(food.commercial,true).status,'waiting');
  tower.state.tick=240;tower.openBusinesses();assert.equal(food.commercial.inside,0);
});
test('new commercial patrons use three reputation buckets and native opening windows', () => {
  assert.deepEqual(newCommercialState('fastfood', 300).recommendations, [10, 10, 10]);
  assert.equal(newCommercialState('fastfood', 240).state, 3);
  assert.equal(newCommercialState('fastfood', 241).state, 0);
  assert.equal(newCommercialState('fastfood', 400).state, 3);
  assert.equal(newCommercialState('restaurant', 300).state, 3);
  assert.equal(newCommercialState('shop', 300).state, -1);
});
test('weekend patron budgets reuse larger weekday demand while rainy days consume their independent bucket', () => {
  const record = { ...newCommercialState('shop'), recommendations: [26, 12, 99], generated: 17 };
  const weekend = openCommercialDay(record, 'shop', true);
  assert.equal(weekend.remaining, 26); assert.equal(weekend.population, 17);
  assert.deepEqual(weekend.recommendations, [26, 0, 99]);
  const special = openCommercialDay(record, 'shop', true, true);
  assert.equal(special.remaining, 18); assert.deepEqual(special.recommendations, [26, 12, 0]);
  assert.equal(openCommercialDay({ ...record, recommendations: [0, 0, 0] }, 'shop', false).remaining, 10);
});
test('completed satisfied patrons add two referrals, intermediate one, and boycotting patrons none', () => {
  let record = openCommercialDay(newCommercialState('shop'), 'shop', false);
  for (const mean of [79, 80, 149, 150]) record = recommendCommercial(record, 'shop', mean, data, 1, false);
  assert.deepEqual(record.recommendations, [4, 10, 10]);
  for (let i = 0; i < 30; i++) record = recommendCommercial(record, 'shop', 0, data, 1, false);
  assert.equal(record.recommendations[0], 25);
  assert.equal(recommendCommercial(record, 'shop', -1, data, 1, false), record);
});
test('failed own patron routes restore all counters, while external patrons count only on admission', () => {
  const start = openCommercialDay(newCommercialState('fastfood'), 'fastfood', false);
  const booked = bookCommercialPatron(start, 0); assert.equal(booked.booked, true);
  assert.equal(booked.record.remaining, 9); assert.equal(booked.record.generated, 1); assert.equal(booked.record.visitors, 1);
  assert.deepEqual(cancelCommercialPatron(booked.record), start);
  assert.equal(admitCommercialVisit(booked.record, false).record.visitors, 1);
  assert.equal(admitCommercialVisit(start, true).record.visitors, 1);
});
test('commercial capacity waits at forty and preserves occupancy state thresholds', () => {
  let record = openCommercialDay(newCommercialState('fastfood'), 'fastfood', false);
  for (let i = 0; i < 40; i++) record = admitCommercialVisit(record).record;
  assert.equal(record.state, 2); assert.equal(admitCommercialVisit(record).status, 'waiting');
  for (let i = 0; i < 31; i++) record = leaveCommercialVisit(record);
  assert.equal(record.inside, 9); assert.equal(record.state, 1);
  for (let i = 0; i < 9; i++) record = leaveCommercialVisit(record);
  assert.equal(record.state, 0);
  assert.equal(admitCommercialVisit(newCommercialState('shop')).status, 'missing');
});
test('commercial dawn reset and late departure preserve signed BYTE admission and occupancy wrap', () => {
  const old={...newCommercialState('fastfood'),state:2,inside:1,visitors:65535};
  const opened=openCommercialDay(old,'fastfood',false);
  const departed=leaveCommercialVisit(opened);
  assert.equal(departed.inside,255);
  const admitted=admitCommercialVisit({...departed,visitors:65535},true);
  assert.equal(admitted.status,'admitted');assert.equal(admitted.record.inside,0);
  assert.equal(admitted.record.visitors,0);assert.equal(admitted.record.state,departed.state);
  assert.equal(admitCommercialVisit({...departed,inside:127}).status,'waiting');
  assert.equal(admitCommercialVisit({...departed,inside:128}).status,'admitted');
});
test('shop evaluations use prospective plus actual customers and price-shifted thresholds', () => {
  const room = { key: 'shop', price: 1, commercial: { remaining: 10, visitors: 10 } };
  assert.equal(commercialEvaluation(data, room), 1);
  assert.equal(commercialEvaluation(data, { ...room, price: 0 }), 0);
  assert.equal(commercialEvaluation(data, { ...room, price: 2 }), 2);
  assert.equal(commercialEvaluation(data, { ...room, price: 3 }), 2);
  assert.equal(commercialEvaluation(data, { ...room, commercial: { remaining: 10, visitors: 15 } }), 2);
});
test('commercial evaluation and receipts sign-extend visitor WORDs and shop prospective sales wrap before comparison',()=>{
  for(const key of ['fastfood','restaurant']) {
    const room={key,price:1,commercial:{remaining:10,visitors:32767}};
    assert.equal(commercialEvaluation(data,room),3);
    for(const visitors of [32768,65535]) {
      assert.equal(commercialEvaluation(data,{...room,commercial:{...room.commercial,visitors}}),0);
      assert.equal(closeCommercialDay({...newCommercialState(key),visitors},key,data,0).lastProfit,data.businessReceipts[key==='fastfood'?12:6].amounts[3]*data.moneyScale);
    }
  }
  assert.equal(commercialEvaluation(data,{key:'shop',price:1,commercial:{remaining:10,visitors:32767}}),0);
  assert.equal(commercialEvaluation(data,{key:'shop',price:1,commercial:{remaining:25,visitors:65535}}),1); //25+(-1)=24.
});
test('food closes with original receipts including losses and special-date zeroes; shop does not earn daily rent', () => {
  const record = { ...newCommercialState('restaurant'), state: 0, visitors: 24 };
  assert.equal(closeCommercialDay(record, 'restaurant', data, 0).lastProfit, -6000);
  assert.equal(closeCommercialDay(record, 'restaurant', data, 59).lastProfit, 0);
  assert.equal(closeCommercialDay(record, 'shop', data, 0).lastProfit, 0);
  assert.equal(closeCommercialDay(record, 'restaurant', data, 0).state, 3);
});
test('native commercial cohorts sample daytime versus evening demand and force late restaurant arrivals', () => {
  assert.equal(commercialArrivalDue('fastfood', 240, () => 0), false);
  assert.equal(commercialArrivalDue('fastfood', 241, max => max === 36 ? 0 : 1), true);
  assert.equal(commercialArrivalDue('shop', 1600, max => max === 6 ? 0 : 1), true);
  assert.equal(commercialArrivalDue('restaurant', 1600, max => max === 12 ? 0 : 1), true);
  assert.equal(commercialArrivalDue('restaurant', 2000, () => 1), true);
  assert.equal(commercialArrivalDue('restaurant', 2200, () => 0), false);
});
test('shop quarter decisions use patron sales rather than generic resident stress', () => {
  const room = { key: 'shop', occupied: true, accepting: true, price: 1, commercial: { remaining: 10, visitors: 15 } };
  assert.equal(acceptanceEvaluation(data, room, 300, 1), 2);
  assert.equal(acceptanceEvaluation(data, { ...room, commercial: { remaining: 10, visitors: 0 } }, 0, 1), 0);
});
test('commercial browser records reject malformed pool counters and nonboolean booking flags', () => {
  const good = openCommercialDay(newCommercialState('shop'), 'shop', false);
  assert.equal(validateCommercialState(good), true);
  for (const fields of [{ inside: 256 }, { remaining: -1 }, { recommendations: [10, 10] }, { visitors: NaN }, { state: 4 }]) {
    assert.throws(() => validateCommercialState({ ...good, ...fields }), /commercial patron/);
  }
  assert.equal(validateCommercialActor({ commercialInside: false }), true);
  assert.throws(() => validateCommercialActor({ commercialBooked: 1 }), /commercial actor/);
});
function mockPatron() {
  const tower = { state: { tick: 300, star: 1 }, calendar: { weekend: false }, data, randomInt: () => 0, admitTenant: r => { r.occupied = true; } };
  const room = { key: 'fastfood', floor: 2, commercial: openCommercialDay(newCommercialState('fastfood'), 'fastfood', false) };
  const actor = { index: 0, state: 32, floor: 0, trip: null, delay: 0, trips: 0 };
  return { tower, room, actor };
}
test('own commercial actors book once, occupy for sixty ticks, then add recommendations after returning outside', () => {
  const { tower, room, actor } = mockPatron(), journeys = [];
  const begin = (t, a, r, from, to, purpose) => { journeys.push({ from, to, purpose }); a.trip = journeys.length; a.state = purpose === 'commercial-arrival' ? 96 : 69; return true; };
  updateCommercialActor(tower, actor, room, begin);
  assert.equal(room.commercial.generated, 1); assert.equal(room.commercial.visitors, 1);
  actor.trip = null; actor.trips = 1;
  finishCommercialActorTrip(tower, actor, room, true, 'commercial-arrival');
  assert.equal(actor.state, 5); assert.equal(room.commercial.inside, 1); assert.equal(room.commercial.visitors, 1);
  tower.state.tick = 359; updateCommercialActor(tower, actor, room, begin); assert.equal(journeys.length, 1);
  tower.state.tick = 360; updateCommercialActor(tower, actor, room, begin); assert.equal(journeys.length, 2); assert.equal(room.commercial.inside, 0);
  actor.trip = null; actor.trips = 2;
  finishCommercialActorTrip(tower, actor, room, true, 'commercial-departure');
  assert.equal(actor.state, 39); assert.equal(room.commercial.recommendations[0], 2);
});
test('initial commercial routing failure restores patron budgets and keeps the applicant outside', () => {
  const { tower, room, actor } = mockPatron(), before = structuredClone(room.commercial);
  updateCommercialActor(tower, actor, room, (t, a, r, from, to, purpose) => { a.delay = 300; a.trips = 1; finishCommercialActorTrip(t, a, r, false, purpose); return false; });
  assert.deepEqual(room.commercial, before); assert.equal(actor.state, 32); assert.equal(actor.delay, 0); assert.equal(actor.trips, 0);
});
test('commercial actors wait for venue capacity without reserving or counting the same arrival again', () => {
  const { tower, room, actor } = mockPatron(); room.commercial.inside = 40; room.commercial.visitors = 41;
  actor.state = 96; actor.floor = room.floor; actor.trips = 1;
  finishCommercialActorTrip(tower, actor, room, true, 'commercial-arrival'); assert.equal(actor.state, 96);
  room.commercial = leaveCommercialVisit(room.commercial);
  updateCommercialActor(tower, actor, room, () => { throw new Error('Must not reroute a waiting admission.'); });
  assert.equal(actor.state, 5); assert.equal(room.commercial.inside, 40); assert.equal(room.commercial.visitors, 41);
});
test('own patrons record repeated full-capacity same-floor retries with native byte history and latest clock', () => {
  const {tower,room,actor}=mockPatron();room.commercial.inside=40;actor.state=96;actor.floor=room.floor;actor.delay=1280;actor.trips=127;
  updateCommercialActor(tower,actor,room,()=>{throw new Error('No new transport');});
  assert.equal(actor.state,96);assert.equal(actor.trips,128);assert.equal(actor.delay,1280);assert.equal(actor.admissionTick,tower.state.tick);
  tower.state.tick+=16;updateCommercialActor(tower,actor,room,()=>{throw new Error('No new transport');});
  assert.equal(actor.trips,129);assert.equal(actor.admissionTick,tower.state.tick);
});
test('commercial feedback preserves the native signed-history negative-mean exclusion', () => {
  const {tower,room,actor}=mockPatron();actor.delay=1280;actor.trips=128;
  const before=[...room.commercial.recommendations];finishCommercialActorTrip(tower,actor,room,true,'commercial-departure');
  assert.deepEqual(room.commercial.recommendations,before);
});
function commercialTower(key) {
  const tower = new Tower(data, { sandbox: true });
  tower.build('lobby', 0, 10, 99); tower.build('floor', 1, 10, 99);
  assert.equal(tower.build(key, 1, 10).ok, true); assert.equal(tower.build('elevator', 0, 60, 60, 1).ok, true);
  tower.step(12); syncActors(tower); tower.state.tick = 300; tower.randomInt = () => 0;
  tower.openBusinesses(false); return tower;
}
test('Tower commercial dispatch owns forty-eight stable identities and generates the ten initial patrons', () => {
  const t = commercialTower('fastfood'), r = t.state.rooms[0];
  assert.equal(t.state.actors.filter(a => a.room === r.id).length, 48);
  for (let tick = 300; tick < 316; tick++) { t.state.tick = tick; updateActors(t); }
  assert.equal(r.commercial.remaining, 0); assert.equal(r.commercial.generated, 10); assert.equal(r.visitors, 10);
  assert.equal(t.state.people.filter(p => p.purpose === 'commercial-arrival').length, 10);
  for (const p of [...t.state.people]) { const a = t.state.actors.find(a => a.id === p.actor); finishActorTrip(t, a, r, p, true); }
  t.state.people = []; assert.equal(r.commercial.inside, 10);
  for (let tick = 375; tick < 391; tick++) { t.state.tick = tick; updateActors(t); }
  assert.equal(t.state.people.filter(p => p.purpose === 'commercial-departure').length, 10);
  for (const p of [...t.state.people]) { const a = t.state.actors.find(a => a.id === p.actor); finishActorTrip(t, a, r, p, true); }
  assert.equal(r.commercial.recommendations[0], 20); assert.equal(r.commercial.inside, 0);
});
test('Tower shop move-in payment is tied to the first routed native patron and paid once', () => {
  const t = commercialTower('shop'), r = t.state.rooms[0], cash = t.state.cash;
  assert.equal(r.occupied, false); assert.equal(r.commercial.state, -1);
  for (let tick = 300; tick < 316; tick++) { t.state.tick = tick; updateActors(t); }
  assert.equal(r.occupied, true); assert.equal(t.state.cash, cash + 15000); assert.equal(r.commercial.state, 0);
  assert.equal(r.commercial.generated, 10);
});
test('original commercial facade sheets select all native occupancy states and styles', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
  for (const key of ['fastfood', 'restaurant', 'shop']) for (let variant = 0; variant < (key === 'shop' ? 11 : 5); variant++) {
    for (const state of key === 'shop' ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]) {
      const f = commercialSprite({ key, variant, commercial: { state } });
      const original = manifest.resources.find(r => r.id === f.sheet && r.type === 2);
      assert.ok(original); assert.ok(f.x + f.width <= original.width);
      if (key === 'shop' && state === -1) assert.equal(f.sheet, 1651);
      if (key === 'shop' && state === 3) assert.equal(f.sheet, 1652);
    }
  }
  assert.notDeepEqual(commercialSprite({ key: 'fastfood', variant: 0, commercial: { state: 2 } }), commercialSprite({ key: 'fastfood', variant: 0, commercial: { state: 3 } }));
});
test('commercial population starts at construction completion rather than placement during the opening phase', () => {
  const t = new Tower(data, { sandbox: true }); t.build('lobby', 0, 10, 99); t.build('floor', 1, 10, 99);
  t.state.tick = 300; t.build('fastfood', 1, 10);
  assert.equal(t.population, 0);
  t.step(12); assert.equal(t.population, 10);
});
