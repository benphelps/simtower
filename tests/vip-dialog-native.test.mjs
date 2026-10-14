import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors,beginActorTrip} from '../src/original-people.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function scene(){
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);
  for(const floor of [-1,1])tower.build('floor',floor,40,180);
  tower.build('ramp',-1,100);tower.build('parking',-1,96);tower.build('parking',-1,92);tower.build('suite',1,40);tower.build('elevator',-1,120,120,1);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);tower.state.star=3;tower.state.calendarDay=3;tower.randomInt=()=>0;
  const room=tower.state.rooms.find(r=>r.key==='suite'),actor=tower.state.actors.find(a=>a.room===room.id&&a.index===1);
  return {tower,room,actor};
}
test('VIP arrival DialogBox precedes naming and routing and retains history across ordinary hotel stays',()=>{
  const {tower,room,actor}=scene();tower.bookParking(actor,room);tower.reserveVIP(actor,room);tower.answerEmergency(3000,1);tower.releaseParking(actor);
  actor.delay=220;actor.trips=3;actor.state=32;tower.state.tick=1696+actor.slot%16-1;
  const cars=[];tower.updateElevators=()=>cars.push(tower.state.tick);tower.step();
  assert.equal(tower.state.dialogs[0].id,3001);assert.equal(actor.name,undefined);assert.equal(actor.trip,null);assert.equal(tower.state.tickContinuation,'actors');assert.deepEqual(cars,[]);
  assert.equal(actor.delay,220);assert.equal(actor.trips,3);assert.equal(room.occupied,false);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.state.vipActorContinuation.action,'arrival');copy.answerEmergency(3001,1);
  const next=copy.state.actors.find(a=>a.id===actor.id);assert.equal(next.name,data.strings[700][1]);assert.notEqual(next.trip,null);assert.equal(next.delay,220);assert.equal(next.trips,3);
  tower.answerEmergency(3001,1);assert.equal(actor.name,data.strings[700][1]);assert.notEqual(actor.trip,null);assert.equal(room.occupied,true);assert.deepEqual(cars,[tower.state.tick]);assert.equal(tower.state.tickContinuation,undefined);
});
test('VIP checkout holds identity and parking inside car unloading until acknowledgment without moving cars twice',()=>{
  const {tower,room,actor}=scene();tower.bookParking(actor,room);tower.reserveVIP(actor,room);tower.answerEmergency(3000,1);tower.arriveVIP(actor);tower.answerEmergency(3001,1);
  tower.checkInHotel(room);room.hotelState=9;actor.state=5;actor.floor=1;tower.state.tick=1800;
  assert.equal(beginActorTrip(tower,actor,room,1,-1,'departure'),true);
  const shaft=tower.state.shafts[0],car=shaft.cars[0],p=tower.state.people.find(p=>p.id===actor.trip);
  p.stage='car';car.people=[p.id];car.floor=-1;car.target=-1;car.doors=0;car.motionCooldown=0;
  tower.addCar(shaft.id,0);const other=shaft.cars[1];other.floor=0;other.target=1;other.departureFloor=0;other.doors=0;other.motionCooldown=0;
  tower.step();assert.equal(tower.state.dialogs[0].id,3002);assert.equal(tower.state.nativeFlags.vipPassed,true);assert.equal(tower.state.vip.actor,actor.id);assert.notEqual(actor.parking,null);
  assert.equal(tower.state.tickContinuation,'elevators');assert.deepEqual(tower.state.elevatorTickResume,{shaft:shaft.id,car:car.id});assert.equal(other.floor,1);
  const cooldown=other.motionCooldown,copy=new Tower(data);copy.load(tower.save());copy.answerEmergency(3002,1);assert.equal(copy.state.actors.find(a=>a.id===actor.id).parking,null);
  tower.answerEmergency(3002,1);assert.equal(actor.parking,null);assert.equal(tower.state.vip,null);assert.equal(other.floor,1);assert.equal(other.motionCooldown,cooldown);assert.equal(tower.state.elevatorTickResume,undefined);assert.equal(tower.state.tickContinuation,undefined);
});
test('VIP continuation save validation rejects a wrong actor or missing prompt atomically',()=>{
  const {tower,room,actor}=scene();tower.bookParking(actor,room);tower.reserveVIP(actor,room);
  const saved=tower.save(),bad=JSON.parse(saved);bad.vipContinuation.actor=99999;assert.throws(()=>tower.load(JSON.stringify(bad)),/VIP continuation/);assert.equal(tower.save(),saved);
  bad.vipContinuation.actor=actor.id;bad.dialogs=[];assert.throws(()=>tower.load(JSON.stringify(bad)),/VIP continuation/);assert.equal(tower.save(),saved);
});
function checkedInVIP(){
  const entry=scene(),{tower,room,actor}=entry;
  for(const guest of tower.state.actors.filter(a=>a.room===room.id)){tower.bookParking(guest,room);guest.state=4;guest.floor=room.floor;}
  tower.reserveVIP(actor,room);tower.answerEmergency(3000,1);tower.arriveVIP(actor);tower.answerEmergency(3001,1);tower.checkInHotel(room);room.hotelState=10;
  return entry;
}
test('VIP demolition cancels primary travel and parking before its prompt, then frees the pool and population afterward',()=>{
  for(const kind of ['remove','damage']){
    const {tower,room,actor}=checkedInVIP(),partner=tower.state.actors.find(a=>a.room===room.id&&a!==actor);
    tower.state.tick=1800;beginActorTrip(tower,actor,room,1,0,'lunch-arrival');const trip=actor.trip,owner=room.nativeActorBlocks[0].owner;
    if(kind==='remove')tower.removeRoom(room);else tower.damageFacilityAt(1,room.x);
    assert.equal(tower.state.dialogs[0].id,3003);assert.equal(tower.state.vip.actor,actor.id);assert.equal(actor.trip,null);assert.equal(actor.parking,null);assert.notEqual(partner.parking,null);
    assert.ok(tower.state.rooms.includes(room));assert.ok(!tower.state.people.some(p=>p.id===trip));assert.equal(tower.population,2);assert.ok(tower.state.nativeActorPool.blocks.some(b=>b.owner===owner));
    const copy=new Tower(data);copy.load(tower.save());copy.answerEmergency(3003,1);assert.equal(copy.population,0);assert.equal(copy.state.vip,null);assert.ok(!copy.state.rooms.some(r=>r.id===room.id));assert.ok(!copy.state.nativeActorPool.blocks.some(b=>b.owner===owner));
    tower.answerEmergency(3003,1);assert.equal(tower.population,0);assert.equal(tower.state.facilityContinuation,undefined);assert.equal(tower.state.rooms.some(r=>r.id===room.id),false);assert.equal(tower.state.rubble.length,kind==='damage'?1:0);
  }
});
test('fire spread resumes after a VIP demolition prompt before damaging the next frontier',()=>{
  const {tower,room}=checkedInVIP();tower.build('office',1,52);tower.finishConstruction();const office=tower.state.rooms.find(r=>r.key==='office');tower.admitTenant(office);
  tower.state.tick=300;tower.state.emergency={kind:'fire',stage:'burning',floor:1,x:40,startTick:240,spreadDelay:0,frontiers:{1:{left:40,right:40}},helicopter:null,rescueAsked:true,staff:[],searchRanges:{}};
  const cars=[];tower.updateElevators=()=>cars.push(tower.state.tick);tower.step();
  assert.equal(tower.state.dialogs[0].id,3003);assert.ok(tower.state.rooms.includes(office));assert.equal(tower.population,8);assert.deepEqual(cars,[]);assert.equal(tower.state.emergencyWorkContinuation.side,'left-after');
  const copy=new Tower(data);copy.load(tower.save());copy.answerEmergency(3003,1);assert.equal(copy.state.rooms.some(r=>r.id===office.id),false);
  tower.answerEmergency(3003,1);assert.equal(tower.population,0);assert.equal(tower.state.rooms.some(r=>r.id===room.id||r.id===office.id),false);assert.deepEqual(cars,[301]);assert.equal(tower.state.emergencyWorkContinuation,undefined);
});
test('bomb blast suspends at a VIP home before later cells, staff reset and result timer initialization',()=>{
  const {tower,room}=checkedInVIP();tower.build('office',1,52);tower.finishConstruction();const office=tower.state.rooms.find(r=>r.key==='office');tower.admitTenant(office);
  tower.state.tick=1199;tower.state.emergency={kind:'bomb',stage:'searching',floor:1,x:60,deadline:1200,demand:300000,secom:false,staff:[],searchRanges:{}};
  const cars=[];tower.updateElevators=()=>cars.push(tower.state.tick);tower.step();
  assert.equal(tower.state.dialogs[0].id,3003);assert.equal(tower.state.emergency.stage,'exploding');assert.equal(tower.state.emergency.resultTick,undefined);assert.equal(tower.population,8);assert.ok(tower.state.rooms.includes(office));assert.deepEqual(cars,[]);
  const copy=new Tower(data);copy.load(tower.save());copy.answerEmergency(3003,1);assert.equal(copy.state.emergency.stage,'result');assert.equal(copy.state.emergency.resultTick,1202);
  tower.answerEmergency(3003,1);assert.equal(tower.population,0);assert.ok(!tower.state.rooms.some(r=>r.id===room.id||r.id===office.id));assert.equal(tower.state.emergency.resultTick,1202);assert.deepEqual(cars,[1200]);
  tower.step(2);assert.equal(tower.state.dialogs[0].id,3024);assert.equal(tower.state.tick,1202);tower.answerEmergency(3024,1);assert.equal(tower.state.tick,1500);
});
