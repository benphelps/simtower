import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {initializeNativeEmergency} from '../src/original-emergency-entry.js';
import {startScheduledEvent} from '../src/original-events.js';
import {newParkingQuotas} from '../src/original-parking-quotas.js';
import {newElevatorPrograms} from '../src/original-systems.js';
import {beginActorTrip} from '../src/original-people.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));

test('17FE0 evacuation resets source facades/actors/transport without inventing receipts or erasing residential history',()=>{
  const room=(id,key,fields={})=>({id,key,floor:id,x:10,width:30,height:1,...fields});
  const rooms=[room(1,'office',{tenantState:3}),room(2,'condo',{tenantState:10,sold:true}),room(3,'suite',{hotelState:16,housekeepingOverlay:true}),
    room(4,'fastfood',{commercial:{state:2,inside:12,visitors:21,remaining:9}}),room(5,'cinema',{height:2,show:{stage:3,inside:8,visitors:17,remaining:[4,6]},movie:{active:true}}),
    room(6,'parking',{parkingAccessible:false,nativeParkingFrame:1,parkingActor:3,parkingActorSlot:20}),room(7,'medical',{medicalInside:4}),
    room(8,'housekeeping'),room(9,'security'),room(10,'office',{tenantState:24}),room(11,'shop',{commercial:{state:-1,inside:2}})];
  const actors=rooms.filter(r=>!['parking','medical'].includes(r.key)).map(r=>({id:r.id,room:r.id,index:0,state:65,floor:7,job:7,trip:99,delay:77,trips:3,parking:6,parkingFloor:-2,currentStress:18,admissionTick:120}));
  const programs=newElevatorPrograms();programs[0][0].departure=2;
  const car={id:20,nativeCarSlot:3,floor:7,target:8,parkingFloor:2,people:[99],doors:4,motionCooldown:5};
  const state={rooms,actors,people:[{id:99}],shafts:[{key:'express',low:0,high:10,cars:[car],calls:{'7:1':20},programs}],links:[],tick:240,calendarDay:0,seed:123,
    cash:456,nativePopulation:{marker:77},nativeParkingQuotas:{...newParkingQuotas(),used:Array(10).fill(1),usedTotal:10,limits:Array(10).fill(2),limitTotal:20},
    nativeParkingAvailable:[6],commercialLists:{fastfood:[[1]],restaurant:[[2]],shop:[[3]]},medicalRegistry:[{room:7,inside:4}]};
  initializeNativeEmergency(state);
  assert.equal(rooms[0].tenantState,0);assert.equal(rooms[1].tenantState,0);assert.equal(rooms[1].sold,true);assert.equal(rooms[2].hotelState,40);assert.equal(rooms[2].housekeepingOverlay,false);
  assert.deepEqual(rooms[3].commercial,{state:3,inside:0,visitors:21,remaining:9});assert.deepEqual(rooms[4].show,{stage:0,inside:0,visitors:17,remaining:[0,0]});
  assert.equal(rooms[5].nativeParkingFrame,0);assert.equal(rooms[5].parkingActorSlot,20);assert.equal(rooms[5].parkingAccessible,false);
  assert.equal(rooms[6].medicalInside,4);assert.equal(state.medicalRegistry[0].inside,4);assert.equal(rooms[9].tenantState,24);assert.deepEqual(rooms[10].commercial,{state:-1,inside:2});
  assert.deepEqual(actors.slice(0,5).map(a=>[a.state,a.delay,a.trips,a.floor,a.job]),[[39,77,3,7,7],[33,77,3,7,7],[38,77,3,7,7],[39,0,0,7,7],[39,0,0,7,7]]);
  assert.ok(actors.slice(0,5).every(a=>a.trip===null&&a.parkingFloor===0&&a.parking===null));
  assert.equal(actors.find(a=>a.room===8).state,0);assert.equal(actors.find(a=>a.room===8).job,null);assert.equal(actors.find(a=>a.room===9).state,65,'security is reset separately by1EBFD');
  assert.deepEqual(state.nativeParkingQuotas,newParkingQuotas());assert.deepEqual(state.nativeParkingAvailable,[6]);assert.ok(Object.values(state.commercialLists).every(groups=>groups.length===7&&groups.every(group=>group.length===0)));
  assert.deepEqual(state.people,[]);assert.deepEqual(state.shafts[0].calls,{});assert.deepEqual([car.floor,car.target,car.direction,car.motionCooldown,car.expressMode,car.nativeCarSlot],[2,2,1,0,2,3]);
  assert.equal(state.cash,456);assert.equal(state.seed,123);assert.deepEqual(state.nativePopulation,{marker:77});
});

function emergencyTower(kind){
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,150);
  for(const floor of [1,2,3,-1,-2])tower.build('floor',floor,10,150);
  tower.build('office',3,10);tower.build('security',3,100);tower.build('medical',1,10);tower.build('fastfood',2,10);
  tower.build('ramp',-1,10);tower.build('ramp',-2,10);tower.build('parking',-1,26);tower.build('parking',-2,40);tower.build('elevator',-2,120,120,3);
  tower.finishAllConstruction();while(tower.state.dialogs.length)tower.answerEmergency(tower.state.dialogs[0].id,1);
  const office=tower.state.rooms.find(r=>r.key==='office'),worker=tower.state.actors.find(a=>a.room===office.id&&a.index===2);
  tower.state.star=3;tower.admitTenant(office);assert.equal(tower.bookParking(worker,office),true);assert.ok(worker.parking!==null);
  Object.assign(worker,{state:35,job:tower.state.rooms.find(r=>r.key==='medical').id,delay:91,trips:2,admissionTick:120});
  const clinic=tower.state.medicalRegistry.find(Boolean);clinic.inside=1;tower.state.rooms.find(r=>r.id===clinic.room).medicalInside=1;
  tower.state.tick=240;tower.state.calendarDay=kind==='fire'?83:59;tower.randomInt=()=>0;
  return {tower,worker,office};
}
test('actual fire/bomb activation waits for native announcement acknowledgment and its reset state roundtrips',()=>{
  for(const kind of ['fire','bomb']){
    const {tower,worker,office}=emergencyTower(kind),parking=tower.state.rooms.find(r=>r.id===worker.parking),other=tower.state.rooms.find(r=>r.key==='parking'&&r.floor===-2),population=tower.population;
    assert.equal(other.parkingAccessible,false);assert.equal(other.nativeParkingFrame,1);
    assert.equal(startScheduledEvent(tower.state,data,()=>0,tower.eventHooks()),true);
    const pending=new Tower(data);pending.load(tower.save());assert.equal(pending.save(),tower.save());assert.equal(worker.state,35);assert.notEqual(tower.state.nativeParkingQuotas.usedTotal,0);
    if(kind==='fire')tower.answerEmergency(3011,1);else{tower.answerEmergency(3020,1);assert.equal(worker.state,35);tower.answerEmergency(3022,1);}
    assert.equal(worker.state,39);assert.equal(worker.parkingFloor,0);assert.deepEqual([worker.delay,worker.trips],[91,2]);assert.equal(worker.job,tower.state.medicalRegistry.find(Boolean).room);
    assert.equal(parking.parkingActor,worker.id);assert.equal(parking.nativeParkingFrame,0);assert.equal(other.nativeParkingFrame,0);
    assert.deepEqual(tower.state.nativeParkingQuotas,newParkingQuotas());assert.equal(tower.state.medicalRegistry.find(Boolean).inside,1);assert.equal(tower.population,population);assert.equal(office.tenantState,0);
    const save=tower.save(),copy=new Tower(data);copy.load(save);assert.equal(copy.save(),save,'cleared parking limits and inaccessible empty frames are valid native emergency data');
    copy.refreshParking();assert.equal(copy.state.nativeParkingQuotas.limitTotal>0,true);assert.equal(copy.state.rooms.find(r=>r.id===other.id).nativeParkingFrame,0,'dawn list rebuild does not invent a topology redraw');
  }
});
test('Tower emergency entry clears actual active journeys/car passengers/calls without interruption stress or parking release callbacks',()=>{
  const {tower,office}=emergencyTower('fire'),actors=tower.state.actors.filter(a=>a.room===office.id),shaft=tower.state.shafts[0],car=shaft.cars[0];
  office.tenantState=3;
  for(const actor of actors.slice(0,2))Object.assign(actor,{state:4,trip:null,delay:25,trips:2});
  assert.equal(beginActorTrip(tower,actors[0],office,3,0,'departure'),true);
  const riding=tower.state.people.find(p=>p.id===actors[0].trip);assert.equal(riding.path[0].kind,'elevator');riding.stage='car';
  Object.assign(car,{floor:3,target:0,turnFloor:0,departureFloor:3,direction:0,doors:4,people:[riding.id]});
  assert.equal(beginActorTrip(tower,actors[1],office,3,0,'departure'),true);
  const queued=tower.state.people.find(p=>p.id===actors[1].trip);Object.assign(queued,{stage:'queue',queueTick:240,queueOrder:0});shaft.calls['3:0']=car.id;
  assert.equal(tower.state.people.length,2);const seed=tower.state.seed,cash=tower.state.cash;
  tower.activateEmergency(0);
  assert.deepEqual(tower.state.people,[]);assert.deepEqual(car.people,[]);assert.deepEqual(shaft.calls,{});assert.equal(car.floor,car.parkingFloor);
  assert.ok(actors.slice(0,2).every(a=>a.state===39&&a.trip===null&&a.delay===25&&a.trips===2));
  assert.equal(tower.state.seed,seed);assert.equal(tower.state.cash,cash);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
});
