import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clockTime, calendar, skyPalette, clockHands } from '../src/original-clock.js';
import { rentAmount, businessReceipt } from '../src/original-economy.js';
import { toolbarSlots } from '../src/original-toolbar.js';
import { Tower } from '../src/simulation.js';
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
function building(high = 4) {
  const t = new Tower(data, { sandbox: true });
  t.build('lobby', 0, 40, 139);
  for (let f = 1; f <= high; f++) t.build('floor', f, 40, 139);
  return t;
}

test('native clock boundaries, noon slowdown and initial dawn match IDA 0x3D2ED', () => {
  for (const [tick, minute] of [[0,420],[399,719],[400,720],[799,749],[800,750],[1199,779],[1200,780],[1600,1020],[2000,1260],[2300,0],[2400,60],[2533,299],[2599,418],[2600,420]]) {
    assert.equal(clockTime(tick).minuteOfDay, minute, `tick ${tick}`);
  }
  assert.equal(clockTime(150).minuteOfDay - clockTime(50).minuteOfDay, 75);
  assert.equal(clockTime(550).minuteOfDay - clockTime(450).minuteOfDay, 8);
  assert.equal(new Tower(data).state.tick, 2533);
});
test('native calendar has two weekdays and a weekend per quarter, four quarters per year', () => {
  assert.deepEqual(calendar(0), { year: 1, quarter: 1, dayOfQuarter: 1, weekend: false });
  assert.equal(calendar(1).weekend, false); assert.equal(calendar(2).weekend, true);
  assert.deepEqual(calendar(3), { year: 1, quarter: 2, dayOfQuarter: 1, weekend: false });
  assert.equal(calendar(11).quarter, 4); assert.equal(calendar(12).year, 2);
  const t = new Tower(data); t.setClock(1439, 11987); t.step(2);
  assert.equal(t.state.calendarDay, 0); assert.equal(t.state.minute, 0);
});
test('analog clock uses native integer hand endpoints on the original face', () => {
  assert.deepEqual(clockHands(400),{minute:[15,0],hour:[15,6]});
  assert.deepEqual(clockHands(1000),{minute:[0,16],hour:[17,7]});
  assert.deepEqual(clockHands(2000),{minute:[15,0],hour:[6,16]});
});
test('clock dispatcher posts quarter charges at tick 2533, not each midnight', () => {
  const t = building(1); t.build('office', 1, 40); t.advance(12);
  const r = t.state.rooms[0]; r.occupied = true;
  t.build('elevator', 0, 100); t.addCar(t.state.shafts[0].id);
  const cash = t.state.cash;
  t.setClock(1439, 1); t.step(2); assert.equal(t.state.cash, cash);
  t.setClock(1439, 2); t.step(2); assert.equal(t.state.calendarDay, 3);
  t.state.tick = 2532; t.step();
  assert.equal(t.state.cash - cash, rentAmount(data,7,1) - data.maintenance[7]*100 - data.maintenance[1]*200);
  assert.equal(t.state.history.length, 1);
});
test('commercial receipts use original thresholds and closing events', () => {
  assert.deepEqual([0,24,25,34,35,49,50].map(n=>businessReceipt(data,12,n,0)), [-3000,-3000,2000,2000,3000,3000,5000]);
  assert.deepEqual([0,25,35,50].map(n=>businessReceipt(data,6,n,0)), [-6000,4000,6000,10000]);
  assert.equal(businessReceipt(data,29,1,0), 20000);
  assert.equal(businessReceipt(data,12,50,59), 0);
  assert.equal(businessReceipt(data,6,50,83), 0);
  const t=building(); t.build('fastfood',1,40); t.build('restaurant',1,60); t.advance(12);
  for (const r of t.state.rooms) { r.occupied=true; r.visitors=50;r.commercial.visitors=50; }
  const cash=t.state.cash;
  t.state.tick=1999; t.step(); assert.equal(t.state.cash-cash,5000);
  t.state.rooms.find(r=>r.key==='restaurant').commercial.visitors=50;
  t.state.tick=2199; t.step(); assert.equal(t.state.cash-cash,15000);
});
test('native rent tiers include condo sale tiers and explicit zero-income tier', () => {
  assert.deepEqual([0,1,2,3,4].map(i=>rentAmount(data,9,i)),[200000,150000,100000,40000,0]);
});
test('construction countdown and full queue finish the oldest job', () => {
  const t=building(2);
  for(let i=0;i<10;i++) t.build('single',1,40+i*4);
  assert.equal(t.state.construction.length,10);
  const first=t.state.rooms[0]; assert.equal(first.constructionRemaining,12);
  t.build('single',2,40); assert.equal(first.constructionRemaining,0);
  assert.equal(t.state.construction.length,10);
  t.step(11); assert.ok(t.state.rooms[1].constructionRemaining>0);
  t.step(); assert.equal(t.state.rooms[1].constructionRemaining,0);
  assert.ok(t.state.construction.length<=10);
});
test('original toolbar grows 5/7/8 and grouped selection is one-based', () => {
  assert.deepEqual([1,2,3,4,5].map(r=>toolbarSlots(data,r).length),[5,7,8,8,8]);
  assert.deepEqual(toolbarSlots(data,1).map(s=>s.type),[24,1,7,9,12]);
  assert.deepEqual(toolbarSlots(data,1)[0].icons,[0,1,2]);
  assert.equal(toolbarSlots(data,2)[1].icons.length,2);
  assert.equal(toolbarSlots(data,3)[1].icons.length,3);
  assert.equal(toolbarSlots(data,1,{0:2})[0].type,22);
  assert.equal(toolbarSlots(data,1,{0:20})[0].type,24);
});
test('elevator clicks add cars; end controls resize and validate atomically', () => {
  const t=building(35); t.build('elevator',0,100);
  const sh=t.state.shafts[0]; assert.equal(sh.low,0); assert.equal(sh.high,0);
  assert.match(t.build('elevator',0,101).error,/transportation/);
  assert.equal(t.build('elevator',0,100).cost,80000); assert.equal(t.state.shafts.length,1); assert.equal(sh.cars.length,2);
  assert.equal(t.resizeShaft(sh.id,0,29).ok,true);
  const saved=t.save(),capped=t.resizeShaft(sh.id,0,30,false);assert.equal(capped.high,29);assert.equal(capped.capped,true);assert.equal(t.save(),saved);
  assert.equal(t.resizeShaft(sh.id,0,3).ok,true);
  t.build('office',5,100);
  const before=t.save(),room=t.state.rooms[0];assert.equal(t.resizeShaft(sh.id,0,6,false).high,6);assert.equal(t.save(),before);
  assert.equal(t.resizeShaft(sh.id,0,6).ok,true);assert.equal(t.state.rooms[0],room);
  const extended=t.save();assert.equal(t.resizeShaft(sh.id,0,4,false).high,4);assert.equal(t.save(),extended);
});
test('express elevator stops follow native lobby boundaries: 1F,15F,30F', () => {
  const t=building(35); t.build('express',0,100);
  const sh=t.state.shafts[0]; t.resizeShaft(sh.id,0,35);
  assert.deepEqual(sh.stops,[0,14,29]);
  assert.match(t.build('express',5,110).error,/Lobby/);
  assert.equal(t.build('lobby',14,40,90).ok,true);
  assert.match(t.build('lobby',15,40,90).error,/15 floors/);
});
test('original world permits 375 cells and B10, without invented early height caps', () => {
  const t=new Tower(data); t.build('lobby',0,250,300);
  assert.equal(t.build('floor',1,250,300).ok,true);
  assert.equal(t.heightLimit(),99);
  const s=building();
  for(let f=-1;f>=-10;f--) assert.equal(s.build('floor',f,40,139).ok,true);
  assert.match(s.build('floor',-11,40,139).error,/Maximum/);
});
test('multi-floor facilities reserve every occupied level and preserve original heights', () => {
  const t=building(4); t.build('cinema',3,40);
  const r=t.state.rooms[0]; assert.equal(r.height,2); assert.equal(t.roomAt(2,40),r);
  assert.match(t.build('office',2,40).error,/other items/);
  assert.equal(t.build('elevator',2,40).ok,true);
  assert.equal(t.state.rooms[0],r);assert.equal(t.roomAt(2,40),r);
  assert.match(t.build('recycling',3,80).error,/above ground/);
  t.build('floor',-1,40,139); t.build('recycling',-1,40);
  assert.equal(t.state.rooms[1].height,2);
  assert.ok(t.bounds(-2));
});
test('native palette transitions use six original CLUT entries', () => {
  assert.deepEqual(skyPalette(data,0),data.skyPalettes[1000]);
  assert.deepEqual(skyPalette(data,1800),data.skyPalettes[1002]);
  assert.deepEqual(skyPalette(data,2566),data.skyPalettes[1001]);
  assert.deepEqual(skyPalette(data,0,true),data.skyPalettes[1000]);
  assert.deepEqual(skyPalette(data,80,true),data.skyPalettes[1003]);
  assert.equal(data.skyBasePalette.length,6);
});
test('legacy saves migrate their clock and preserve existing room footprints', () => {
  const t=building(); t.build('cinema',3,40); t.advance(12);
  const old=JSON.parse(t.save()); old.version=1; old.minute=720; old.day=3;
  for(const k of ['tick','calendarDay','elapsedTicks','construction']) delete old[k];
  for(const r of old.rooms) for(const k of ['height','constructionRemaining','visitors']) delete r[k];
  const copy=new Tower(data); copy.load(JSON.stringify(old));
  assert.equal(copy.state.version,2); assert.equal(copy.state.tick,400); assert.equal(copy.state.calendarDay,2);
  assert.equal(copy.state.rooms[0].height,1);
  const roundtrip=new Tower(data); roundtrip.load(copy.save()); assert.equal(roundtrip.save(),copy.save());
});
test('native car capacities retain excess passengers in the queue', () => {
  for(const [key,capacity] of [['elevator',21],['express',42]]) {
    const t=building(14); t.build('office',14,40); t.build(key,0,100,100,14);
    const sh=t.state.shafts[0],r=t.state.rooms[0];
    for(let i=0;i<50;i++) { t.spawn(r,0,14); const p=t.state.people.at(-1); p.stage='queue'; p.x=102; }
    t.updateElevators(.5);
    assert.equal(sh.cars[0].people.length,1);
    for(let tick=0;tick<4;tick++)t.updateElevators(.5);
    assert.equal(sh.cars[0].people.length,capacity);
    assert.equal(t.state.people.filter(p=>p.stage==='queue').length,50-capacity);
    assert.equal(t.state.people.length,50);
  }
});
test('service facilities do not add residents to the native population counter', () => {
  const t=building(); t.build('security',1,40); t.build('housekeeping',2,40); t.build('medical',3,40); t.build('condo',4,40);
  while(t.state.construction.length)t.finishConstruction();
  for(const r of t.state.rooms)if(r.key!=='condo')r.occupied=true;
  t.admitTenant(t.state.rooms.find(r=>r.key==='condo'));
  assert.equal(t.population,3);
});
