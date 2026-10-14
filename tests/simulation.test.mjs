import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower, demoTower } from '../src/simulation.js';
import { price, elevatorCapacity } from '../src/catalog.js';

const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
const tower = () => new Tower(data, { sandbox: true });
function floors(t, high = 3) {
  assert.equal(t.build('lobby', 0, 40, 139).ok, true);
  for (let f = 1; f <= high; f++) assert.equal(t.build('floor', f, 40, 139).ok, true);
}

test('recovered economic values and population thresholds match executable resources', () => {
  assert.equal(price(data, 'office'), 40000);
  assert.equal(price(data, 'condo'), 80000);
  assert.equal(price(data, 'elevator'), 200000);
  assert.equal(price(data, 'lobby'), 5000);
  assert.deepEqual(data.rent[3], [30, 20, 15, 5]);
  assert.deepEqual(data.populationThresholds, [300, 1000, 5000, 10000]);
});
test('construction is atomic when unsupported, overlapping, locked, or unaffordable', () => {
  const t = new Tower(data);
  const initial = t.save();
  assert.match(t.build('office', 1, 40).error, /lobby/);
  assert.equal(t.save(), initial);
  assert.equal(t.build('lobby', 0, 40, 139).cost, 500000);
  assert.match(t.build('floor', 2, 40, 139).error, /below/);
  assert.match(t.build('suite', 1, 40).error, /unlocks/);
  assert.equal(t.build('floor', 1, 40, 139).cost, 50000);
  assert.equal(t.build('office', 1, 40).cost, 40000);
  const before = t.save();
  assert.match(t.build('office', 1, 44).error, /other items/);
  assert.equal(t.save(), before);
  t.state.cash = 1;
  const broke = t.save();
  assert.match(t.build('office', 1, 50).error, /money/);
  assert.equal(t.save(), broke);
});
test('floor extensions charge only for newly added structure', () => {
  const t = tower(); floors(t);
  assert.equal(t.build('floor', 1, 40, 139).cost, 0);
  assert.equal(t.build('lobby', 0, 140, 149).cost, 50000);
  assert.equal(t.build('floor', 1, 140, 149).cost, 5000);
  assert.equal(t.bounds(1).width, 110);
});
test('sky lobby, basement, metro, and cathedral placement restrictions', () => {
  const t = tower(); floors(t);
  assert.match(t.build('lobby', 2, 40, 70).error, /15 floors/);
  assert.match(t.build('office', 0, 40).error, /First floor/);
  assert.equal(t.build('floor', -1, 40, 139).ok, true);
  assert.match(t.build('condo', -1, 40).error, /underground/);
  assert.match(t.build('parking', 1, 40).error, /above ground/);
  assert.match(t.build('cathedral', 3, 40).error, /100th/);
  assert.equal(t.build('metro', -1, 40).ok, true);
  assert.match(t.build('floor', -4, 40, 139).error, /under Metro/);
});
test('elevators charge for a shaft and one car, enforce limits, and extend', () => {
  const t = tower(); floors(t, 35);
  assert.match(t.build('elevator', 0, 100, 100, 30).error, /30 floors/);
  assert.equal(t.build('elevator', 0, 100, 100, 4).cost, 280000);
  const sh = t.state.shafts[0];
  assert.match(t.build('elevator',5,100,100,9).error,/transportation/);
  assert.equal(t.resizeShaft(sh.id,0,9).cost,0);
  assert.equal(sh.high, 9);
  assert.deepEqual(sh.stops, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(t.build('office', 2, 100).ok, true); //Native floor records may sit behind a shaft.
  assert.equal(t.state.shafts[0], sh);
  for (let i = 1; i < 8; i++) assert.equal(t.addCar(sh.id).ok, true);
  assert.match(t.addCar(sh.id).error, /No more cars/);
});
test('routing uses stairs and elevator transfers and excludes service elevators for tenants', () => {
  const t = tower(); floors(t, 16);
  assert.equal(t.route(0, 16), null);
  t.build('lobby',14,40,139);
  assert.equal(t.build('elevator', 0, 100, 100, 14).ok, true);
  assert.equal(t.build('elevator', 14, 112, 112, 16).ok, true);
  const path = t.route(0, 16);
  assert.equal(path.length, 2);
  assert.deepEqual(path.map(e => [e.from, e.to]), [[0, 14], [14, 16]]);
  t.state.shafts = [];
  t.build('service', 0, 100, 100, 4);
  assert.equal(t.route(0, 4), null);
  assert.equal(t.route(0, 4, true).length, 1);
  t.build('stairs', 1, 44); t.build('stairs', 2, 54);
  assert.equal(t.route(0, 2).length, 2);
});
test('rooms wait for construction and connectivity before occupancy', () => {
  const t = tower(); floors(t); t.build('office', 2, 40);
  t.advance(150);
  assert.equal(t.population, 0);
  assert.equal(t.status(t.state.rooms[0]), 'No transportation connected');
  t.randomInt=()=>0; //Admission gate, independently of the applicant's random cohort chance.
  t.build('elevator', 0, 100, 100, 3); t.advance(50);
  assert.equal(t.population, 6);
});
test('clean hotels accept an initial evening stay, then housekeeping cleans checkout dirt', () => {
  const t = tower(); floors(t); t.build('elevator', 0, 100, 100, 3); t.build('single', 2, 40); t.advance(180);
  assert.equal(t.state.rooms[0].occupied, false);
  assert.equal(t.status(t.state.rooms[0]), 'Housekeeping needed');
  t.state.tick=1599;t.randomInt=()=>0;t.advance(400);
  assert.equal(t.state.rooms[0].occupied, true);
  const r=t.state.rooms[0];t.checkOut(r);t.state.people=[];for(const sh of t.state.shafts)for(const c of sh.cars)c.people=[];
  for(const a of t.state.actors){a.trip=null;a.state=32;}
  assert.equal(r.accepting,false);assert.equal(r.dirt,100);
  t.build('housekeeping', 1, 44);assert.equal(t.build('service',0,112,112,3).ok,true);t.advance(20);assert.equal(r.dirt,100);t.state.tick=0;t.advance(500);
  assert.ok(r.dirt<20);assert.equal(r.occupied,false);
});
test('passengers board, arrive, and leave the simulation instead of waiting forever', () => {
  const t = tower(); floors(t, 1); t.build('office', 1, 40); t.build('elevator', 0, 100, 100, 1);
  const room = t.state.rooms[0];
  t.spawn(room, 0, 1);
  for (let i = 0; i < 1000; i++) { t.updatePeople(.25); t.updateElevators(.25); }
  assert.equal(t.state.people.length, 0);
  assert.equal(t.state.shafts[0].cars[0].people.length, 0);
});
test('hotel income posts on checkout and is absent from quarterly rent', () => {
  const t = tower(); floors(t, 1); t.build('single', 1, 40);
  const room = t.state.rooms[0]; room.occupied = true; room.price = 1; t.advance(12);
  const cash = t.state.cash; t.settleQuarter();
  assert.equal(t.state.cash, cash);
  t.checkOut(room);
  assert.equal(t.state.cash - cash, 2000);
  assert.equal(t.state.ledger[0].label, 'Single hotel room checkout');
});
test('save/load preserves deterministic simulation including elevators and passengers', () => {
  const t = demoTower(data); t.advance(40);
  const copy = new Tower(data); copy.load(t.save());
  assert.equal(copy.save(), t.save());
  t.advance(120); copy.advance(120);
  assert.equal(copy.save(), t.save());
});
test('malformed save is rejected without changing the current tower', () => {
  const t = demoTower(data), initial = t.save();
  for (const change of [s => s.version = 99, s => s.cash = '100', s => s.rooms[0].key = 'invalid', s => s.floors[1].width = -10, s => s.shafts[0].cars = null, s => s.people[0].path = 'invalid']) {
    const s = JSON.parse(initial); change(s);
    assert.throws(() => t.load(JSON.stringify(s))); assert.equal(t.save(), initial);
  }
});
test('long simulation keeps finite state and bounded queues', () => {
  const t = demoTower(data); t.advance(1440 * 5);
  assert.ok(Number.isFinite(t.state.cash)); assert.ok(t.state.people.length <= 600);
  for (const room of t.state.rooms) assert.ok(Number.isFinite(room.satisfaction) && room.satisfaction >= 0 && room.satisfaction <= 100);
  for (const shaft of t.state.shafts) for (const car of shaft.cars) assert.ok(car.floor >= shaft.low && car.floor <= shaft.high && car.people.length <= elevatorCapacity(shaft.key));
});
