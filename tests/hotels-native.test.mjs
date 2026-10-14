import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hotelCheckIn, hotelCheckOut, hotelCleaned, hotelEveningPlan, hotelArrivalDue, hotelSprite, validateHotelState, hotelPostArrivalState, hotelRoomEntry, hotelRoomExit, hotelRoomWake, hotelRoomSleep, hotelRoomClock, hotelActorAction } from '../src/original-hotels.js';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors, beginActorTrip, finishActorTrip } from '../src/original-people.js';
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
const hotel = (id, x, fields = {}) => ({ id, key: 'single', floor: 1, x, width: 4, occupied: false, accepting: true, dirt: 0, hotelDays: 0, hotelState: 24, ...fields });
test('failed suite arrival after its partner checks in restores the guest at home and retains VIP parking', () => {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);tower.build('floor',-1,40,180);
  tower.build('ramp',-1,100);tower.build('parking',-1,96);tower.build('suite',1,40);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const room=tower.state.rooms.find(room=>room.key==='suite'),guests=tower.state.actors.filter(actor=>actor.room===room.id),guest=guests[0];
  tower.state.tick=1800;tower.state.star=3;tower.state.calendarDay=3;
  tower.checkInHotel(room);room.hotelState=hotelRoomEntry(room,1800);guests[1].state=4;guests[1].floor=room.floor;
  assert.equal(tower.bookParking(guest,room),true);assert.equal(tower.reserveVIP(guest,room),true);tower.arriveVIP(guest);
  const parking=guest.parking,cash=tower.state.cash;
  assert.equal(beginActorTrip(tower,guest,room,-1,1,'arrival'),false);
  assert.equal(guest.state,4);assert.equal(room.hotelState,10);assert.equal(tower.population,2);
  assert.equal(guest.parking,parking);assert.equal(tower.state.vip.actor,guest.id);assert.equal(tower.state.cash,cash);
  assert.equal(guest.trips,1);assert.equal(room.trips[guest.resident].trips,1);
});
test('hotel guests plan evening dinner by native tenant slot and sleep only after returning home', () => {
  const room = hotel(1, 0, { hotelState: 9 });
  assert.equal(hotelPostArrivalState(0), 1); assert.equal(hotelPostArrivalState(1), 4);
  assert.equal(hotelActorAction({ state: 1 }, room, 1800, () => 0), 'dinner');
  assert.equal(hotelActorAction({ state: 1 }, room, 2000, () => 1), 'home');
  assert.equal(hotelActorAction({ state: 34, visitTick: 1750 }, room, 1809, () => 0), null);
  assert.equal(hotelActorAction({ state: 34, visitTick: 1750 }, room, 1810, () => 0), 'dinner-return');
  assert.equal(hotelActorAction({ state: 4 }, room, 2000, () => 0), 'sleep');
  assert.equal(hotelActorAction({ state: 4 }, room, 2401, () => 1), 'sleep');
  assert.equal(hotelActorAction({ state: 16 }, room, 400, () => 1), 'wake');
  assert.equal(hotelActorAction({ state: 5 }, room, 2000, () => 1), 'departure');
  assert.equal(hotelActorAction({ state: 5 }, room, 2400, () => 0), null);
});
test('hotel facade guest counters track dinner, partner sleep and wake independently of the occupied lease', () => {
  const room = hotel(1, 0, { key: 'twin', hotelState: 10, occupied: true }), actor = { id: 2, room: 1 };
  assert.equal(hotelRoomExit(room, 1800), 9); assert.equal(hotelRoomEntry({ ...room, hotelState: 9 }, 1800), 10);
  assert.equal(hotelRoomSleep(room, actor, [{ id: 3, room: 1, state: 4 }], 2200), 10);
  assert.equal(hotelRoomSleep(room, actor, [{ id: 3, room: 1, state: 16 }], 2200), 16);
  assert.equal(hotelRoomSleep({ ...room, hotelState: 9 }, actor, [], 2200), 16);
  assert.equal(hotelRoomWake({ ...room, hotelState: 16 }, 100), 2);
  assert.equal(hotelRoomEntry({ ...room, hotelState: 16 }, 1800), 9);
});
test('hotel condition clock pairs change at dawn/evening while occupied and sleeping counters stay untouched', () => {
  for(const [day,night] of [[24,32],[40,48],[56,64]]) {
    assert.equal(hotelRoomClock(hotel(1,0,{hotelState:day}),1600),night);
    assert.equal(hotelRoomClock(hotel(1,0,{hotelState:night}),0),day);
  }
  for(const hotelState of [1,9,16]) {
    assert.equal(hotelRoomClock(hotel(1,0,{hotelState}),1600),hotelState);
    assert.equal(hotelRoomClock(hotel(1,0,{hotelState}),0),hotelState);
  }
});
test('hotel checkin adds occupancy without receipts and checkout clears acceptance into dirty native state', () => {
  assert.deepEqual(hotelCheckIn(hotel(1, 0), 1700), { occupied: true, hotelState: 8, hotelDays: 0 });
  assert.deepEqual(hotelCheckOut(100), { occupied: false, hotelState: 40, accepting: false, hotelDays: 0, dirt: 100 });
  assert.deepEqual(hotelCleaned(hotel(1, 0, { hotelState: 40 }), 1700), { hotelState: 32, dirt: 0 });
  assert.equal(hotelCleaned(hotel(1, 0, { hotelState: 56 }), 1700), null);
});
test('evening hotel evaluation consumes one same-type donor and blocks other bad rooms from accepting', () => {
  const rooms = [hotel(1, 0), hotel(2, 4), hotel(3, 8)];
  const plan = hotelEveningPlan(data, rooms, 1, r => r.id === 3 ? 0 : 300);
  assert.deepEqual(plan.map(r => [r.evaluation, r.accepting, r.referral]), [[1, true, 3], [0, false, null], [1, true, null]]);
  assert.ok(plan[0].resetStress); assert.equal(plan[1].resetStress, false);
});
test('dirty hotel neglect reaches the unusable state on its third evening without housekeeping', () => {
  let room = hotel(1, 0, { ...hotelCheckOut(200), hotelState: 40 });
  for (let day = 1; day <= 3; day++) {
    Object.assign(room, hotelEveningPlan(data, [room], 1, () => 0)[0]);
    assert.equal(room.hotelDays, day); assert.equal(room.hotelState, day === 3 ? 64 : 40);
    assert.equal(room.accepting, false);
  }
});
test('an accepting dirty hotel first clears acceptance and its neglect counter', () => {
  const plan = hotelEveningPlan(data, [hotel(1, 0, { hotelState: 40, hotelDays: 2 })], 1, () => 0);
  assert.equal(plan[0].hotelDays, 0); assert.equal(plan[0].evaluation, 0); assert.equal(plan[0].accepting, false);
});
test('neglected hotel states spread through touching hotel rooms but stop at a gap or nonhotel', () => {
  const rooms = [hotel(1, 0, { hotelState: 56, accepting: false }), hotel(2, 4), hotel(3, 8),
    { id: 4, key: 'office', floor: 1, x: 12, width: 4 }, hotel(5, 16), hotel(6, 30)];
  const plan = hotelEveningPlan(data, rooms, 1, () => 0);
  assert.equal(plan.find(r => r.roomId === 2).hotelState, 64); assert.equal(plan.find(r => r.roomId === 3).hotelState, 24);
  assert.equal(plan.find(r => r.roomId === 5).hotelState, 24); assert.equal(plan.find(r => r.roomId === 6).hotelState, 24);
  for (const r of rooms) { const decision = plan.find(d => d.roomId === r.id); if (decision) Object.assign(r, decision); }
  const next = hotelEveningPlan(data, rooms, 1, () => 0);
  assert.equal(next.find(r => r.roomId === 3).hotelState, 64);
});
test('evening arrival timing respects acceptance and native dirty state gates', () => {
  assert.equal(hotelArrivalDue(hotel(1, 0), 1600, n => n === 12 ? 0 : 1), true);
  assert.equal(hotelArrivalDue(hotel(1, 0), 2000, () => 1), true);
  assert.equal(hotelArrivalDue(hotel(1, 0), 2300, () => 0), false);
  assert.equal(hotelArrivalDue(hotel(1, 0, { accepting: false }), 2000, () => 0), false);
  assert.equal(hotelArrivalDue(hotel(1, 0, { hotelState: 40 }), 2000, () => 0), true); //43443 checks acceptance only.
  assert.equal(hotelArrivalDue(hotel(1, 0, { hotelState: 40, accepting:false }), 2000, () => 0), false);
});
test('hotel states select all nine original clean, occupied, dirty and neglected facade modes', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
  for (const key of ['single', 'twin', 'suite']) for (let variant = 0; variant < (key === 'twin' ? 4 : 2); variant++) {
    for (let mode = 0; mode < 9; mode++) {
      const f = hotelSprite({ key, variant, hotelState: mode * 8 }, 1600);
      const original = manifest.resources.find(r => r.id === f.sheet && r.type === 2);
      assert.ok(original); assert.ok(f.x + f.width <= original.width);
    }
  }
});
test('browser hotel records validate native states and byte neglect counters', () => {
  assert.equal(validateHotelState({ hotelState: 64, hotelDays: 255 }), true);
  assert.throws(() => validateHotelState({ hotelState: 17 }), /hotel room/);
  assert.throws(() => validateHotelState({ key: 'single', hotelState: 2 }), /hotel room/);
  assert.throws(() => validateHotelState({ key: 'twin', hotelState: 11 }), /hotel room/);
  assert.throws(() => validateHotelState({ key: 'suite', hotelState: 4 }), /hotel room/);
  assert.equal(validateHotelState({ key:'suite',hotelState:3 }),true);
  assert.equal(validateHotelState({ key: 'twin', hotelState: 10 }), true);
  assert.throws(() => validateHotelState({ hotelState: 40, hotelDays: 256 }), /neglect counter/);
  const r = hotel(1, 0, { hotelState: 56, accepting: false, hotelDays: 255 });
  assert.equal(hotelEveningPlan(data, [r], 1, () => 0)[0].hotelDays, 0);
});
function guestTower() {
  const t = new Tower(data, { sandbox: true }); t.build('lobby', 0, 10, 99); t.build('floor', 1, 10, 99);
  assert.equal(t.build('single', 1, 10).ok, true); assert.equal(t.build('elevator', 0, 60, 60, 1).ok, true);
  t.step(12); syncActors(t); t.randomInt = () => 0; return t;
}
test('Tower newly built clean hotels accept the first stay without housekeeping, and earn only on checkout', () => {
  const t = guestTower(), r = t.state.rooms[0], cash = t.state.cash;
  assert.equal(t.state.rooms.some(r => r.key === 'housekeeping'), false); assert.equal(r.occupied, false);
  for (let tick = 1600; tick < 1616; tick++) { t.state.tick = tick; updateActors(t); }
  assert.equal(r.occupied, true); assert.equal(t.population, 1); assert.equal(t.state.cash, cash);
  assert.equal(t.state.people.length, 1); assert.equal(t.state.people[0].purpose, 'arrival');
  t.checkOut(r); assert.equal(t.state.cash, cash + 2000); assert.equal(r.occupied, false); assert.equal(r.accepting, false);
  assert.equal(r.hotelState, 48); assert.equal(t.population, 0);
});
test('Tower hotel housekeeping recovery reopens acceptance only at the next evening evaluation', () => {
  const t = guestTower(), r = t.state.rooms[0]; t.checkInHotel(r); t.checkOut(r);
  for (let day = 1; day <= 2; day++) { t.state.tick = 1600; t.evaluateHotels(); assert.equal(r.hotelDays, day); }
  Object.assign(r, hotelCleaned(r, t.state.tick)); assert.equal(r.accepting, false); assert.equal(r.dirt, 0);
  t.evaluateHotels(); assert.equal(r.accepting, true); assert.equal(r.hotelState, 32);
  t.checkInHotel(r); t.checkOut(r);
  for (let day = 1; day <= 3; day++) { t.state.tick = 1600; t.evaluateHotels(); }
  assert.equal(r.hotelState, 64); assert.equal(hotelCleaned(r, t.state.tick), null);
});
test('Tower hotel guests dine, return home, sleep and collect checkout money when departure starts', () => {
  const t = guestTower(), r = t.state.rooms[0]; r.nativeTenantIndex = 0;
  t.build('restaurant', 1, 20); t.step(12);
  const food = t.state.rooms.find(room => room.key === 'restaurant');
  food.commercial = { ...food.commercial, state: 0, inside: 0 };
  const a = t.state.actors.find(actor => actor.room === r.id);
  t.state.tick = 1700; assert.equal(beginActorTrip(t, a, r, 0, 1, 'arrival'), true);
  const arrival = t.state.people.find(p => p.id === a.trip); finishActorTrip(t, a, r, arrival, true, 'arrival'); t.state.people=[];
  assert.equal(a.state, 1); assert.equal(r.hotelState, 9);
  t.state.tick = 1808 + a.slot % 16; updateActors(t);
  assert.equal(a.state, 34); assert.equal(a.job, food.id); assert.equal(r.hotelState, 8); assert.equal(a.trip, null);
  assert.equal(a.state, 34); assert.equal(food.commercial.inside, 1);
  t.state.tick += 64; updateActors(t);
  assert.equal(a.state, 4); assert.equal(food.commercial.inside, 0); assert.equal(a.trip, null);
  assert.equal(a.state, 4); assert.equal(r.hotelState, 9);
  t.state.tick = 2000 + a.slot % 16; updateActors(t); assert.equal(a.state, 16); assert.equal(r.hotelState, 16);
  t.state.tick = a.slot % 16; updateActors(t); assert.equal(a.state, 5); assert.equal(r.hotelState, 1);
  const cash = t.state.cash; t.state.tick += 16; updateActors(t);
  assert.equal(a.state, 69); assert.equal(r.occupied, false); assert.equal(r.hotelState, 40);
  assert.equal(t.state.cash, cash + 2000); assert.notEqual(a.trip, null);
});
test('Tower hotel failed initial transport remains a retrying applicant instead of a sleeping guest', () => {
  const t = guestTower(), r = t.state.rooms[0], a = t.state.actors.find(actor => actor.room === r.id);
  t.state.shafts=[]; t.state.tick=1700;
  assert.equal(beginActorTrip(t, a, r, 0, 1, 'arrival'), false);
  assert.equal(a.state, 32); assert.equal(r.occupied, false); assert.equal(a.trip, null);
});
test('Tower twin guests preserve the first inside counter and pay only when the second begins checkout', () => {
  const t = new Tower(data, { sandbox: true }); t.build('lobby', 0, 10, 99); t.build('floor', 1, 10, 99);
  t.build('twin', 1, 10); t.build('elevator', 0, 60, 60, 1); t.step(12); syncActors(t);
  const r = t.state.rooms[0], guests = t.state.actors.filter(a => a.room === r.id); t.state.tick=1700;
  for (const [index, a] of guests.entries()) {
    assert.equal(beginActorTrip(t,a,r,0,1,'arrival'),true);
    assert.equal(r.hotelState,index===0?8:9);
    const p=t.state.people.find(person=>person.id===a.trip); finishActorTrip(t,a,r,p,true,'arrival'); t.state.people=[];
    assert.equal(r.hotelState,9+index);
  }
  const cash=t.state.cash; r.hotelState=2; t.state.tick=100; guests.forEach(a=>a.state=5);
  beginActorTrip(t,guests[0],r,1,0,'departure'); assert.equal(r.hotelState,1); assert.equal(t.state.cash,cash); assert.equal(r.occupied,true);
  beginActorTrip(t,guests[1],r,1,0,'departure'); assert.equal(r.hotelState,40); assert.equal(r.occupied,false);
  assert.equal(t.state.cash,cash+rentForTwin());
});
function rentForTwin() { return data.rent[4][1]*data.moneyScale; }
test('Tower occupied hotel infestation preserves a dinner return, sleep and checkout through native condition offsets',()=>{
  const t=guestTower(),r=t.state.rooms.find(room=>room.key==='single'),a=t.state.actors.find(actor=>actor.room===r.id);
  t.build('single',1,r.x+r.width);while(t.state.construction.length)t.finishConstruction();
  const source=t.state.rooms.find(room=>room.key==='single'&&room.id!==r.id);
  t.state.tick=1600;t.checkInHotel(r);r.hotelState=8;a.state=34;a.floor=r.floor;source.hotelState=64;source.accepting=false;
  t.evaluateHotels();assert.equal(r.hotelState,64);assert.equal(r.occupied,true);assert.equal(t.population,1);
  finishActorTrip(t,a,r,{to:r.floor,tripDelay:0},true,'lunch-return');
  assert.equal(a.state,4);assert.equal(r.hotelState,65);assert.equal(validateHotelState(r),true);
  const saved=new Tower(data,{sandbox:true});saved.load(t.save());assert.equal(saved.state.rooms.find(room=>room.id===r.id).hotelState,65);
  t.state.tick=2416+a.slot%16;updateActors(t);assert.equal(a.state,16);assert.equal(r.hotelState,16);
  t.state.tick=a.slot%16;updateActors(t);assert.equal(a.state,5);assert.equal(r.hotelState,1);
  const cash=t.state.cash;beginActorTrip(t,a,r,r.floor,0,'departure');
  assert.equal(r.hotelState,40);assert.equal(t.population,0);assert.equal(t.state.cash,cash+2000);
});
test('Tower hotel applicants recheck the native facade on late arrival after infestation',()=>{
  const t=guestTower(),r=t.state.rooms[0],a=t.state.actors.find(actor=>actor.room===r.id);t.state.tick=1700;
  assert.equal(beginActorTrip(t,a,r,0,1,'arrival'),true);assert.equal(t.population,1);
  const p=t.state.people.find(person=>person.id===a.trip);r.hotelState=64;r.accepting=false;
  finishActorTrip(t,a,r,p,true,'arrival');t.state.people=[];
  assert.equal(r.hotelState,9);assert.equal(t.population,2);assert.equal(r.accepting,false);
  const saved=new Tower(data,{sandbox:true});saved.load(t.save());assert.equal(saved.population,2);
});
test('Tower infested twin guests can leave condition62 without an invented checkout receipt',()=>{
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,99);t.build('floor',1,10,99);t.build('twin',1,10);t.build('elevator',0,60,60,1);t.step(12);syncActors(t);
  const r=t.state.rooms[0],guests=t.state.actors.filter(actor=>actor.room===r.id);t.state.tick=1700;t.checkInHotel(r);r.hotelState=64;r.accepting=false;
  const cash=t.state.cash;for(const a of guests){a.state=5;a.floor=r.floor;beginActorTrip(t,a,r,r.floor,0,'departure');}
  assert.equal(r.hotelState,62);assert.equal(t.state.cash,cash);assert.equal(t.population,2);
  const saved=new Tower(data,{sandbox:true});saved.load(t.save());assert.equal(saved.state.rooms[0].hotelState,62);
});
test('native hotel counters use BYTE arithmetic while validation rejects unrelated atlas states',()=>{
  assert.equal(hotelRoomExit(hotel(1,0,{hotelState:0}),100),255);
  assert.equal(hotelRoomEntry(hotel(1,0,{hotelState:255}),100),0);
  assert.equal(validateHotelState(hotel(1,0,{hotelState:65})),true);
  assert.throws(()=>validateHotelState(hotel(1,0,{hotelState:66})),/hotel room/);
  assert.equal(validateHotelState(hotel(1,0,{key:'twin',hotelState:66})),true);
  assert.throws(()=>validateHotelState(hotel(1,0,{hotelState:255})),/hotel room/);
});
test('a twin hotel waking its sole sleeper counts full capacity before the other queued guest returns',()=>{
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,99);t.build('floor',1,10,99);t.build('twin',1,10);t.build('elevator',0,60,60,1);t.finishAllConstruction();
  const r=t.state.rooms[0],[sleeper,late]=t.state.actors.filter(a=>a.room===r.id);t.state.tick=1800;t.checkInHotel(r);r.hotelState=9;sleeper.state=4;sleeper.floor=1;late.state=34;late.floor=0;
  assert.equal(beginActorTrip(t,late,r,0,1,'lunch-return'),true);const p=t.state.people.find(p=>p.id===late.trip);assert.equal(p.stage,'queue');
  t.state.tick=2416+sleeper.slot%16;updateActors(t);assert.equal(r.hotelState,16);
  t.state.tick=sleeper.slot%16;updateActors(t);assert.equal(r.hotelState,2);
  finishActorTrip(t,late,r,p,true,'lunch-return');t.state.people=[];assert.equal(r.hotelState,3);assert.equal(t.population,2);assert.equal(validateHotelState(r),true);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.state.rooms[0].hotelState,3);assert.equal(copy.population,2);
});
