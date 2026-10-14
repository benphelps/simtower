import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {initializeDispatch,selectHallCar,assignHallCall,dispatchTarget,recomputeDispatch,callKey,canDepart,boardingDelay} from '../src/original-elevators.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function shaft(){const sh={key:'elevator',low:0,high:20,cars:[{id:1,floor:5,target:12,parkingFloor:0,doors:0,people:[99]},{id:2,floor:0,target:0,parkingFloor:0,doors:0,people:[]}]};initializeDispatch(sh);sh.cars[0].turnFloor=12;return sh;}
const rider=[{id:99,path:[{to:12}]}];
function building(){const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,99);for(let f=1;f<=4;f++)t.build('floor',f,10,99);t.build('office',4,10);t.build('elevator',0,40,40,4);return t;}
function queued(t,from,to){const p=t.spawn(t.state.rooms[0],from,to);p.x=42;p.stage='queue';return p;}
test('response uses strict travel-distance advantage and preserves car order on ties',()=>{
  const sh=shaft();sh.cars[1].floor=10;sh.cars[1].parkingFloor=10;
  // Busy up car is four floors away; idle car is one away.
  assert.equal(selectHallCar(sh,9,1,rider,3).car.id,2);
  assert.equal(selectHallCar(sh,9,1,rider,4).car.id,1);
  sh.cars[0].floor=8;sh.cars[0].people=[];sh.cars[0].parkingFloor=8;
  assert.equal(selectHallCar(sh,9,1,[],5).car.id,1);
});
test('opposite-direction calls account for travel to the turn floor before returning',()=>{
  const sh=shaft();
  // Up car at five must reach twelve and return to three: distance 16.
  assert.equal(selectHallCar(sh,3,0,rider,13).car.id,2);
  assert.equal(selectHallCar(sh,3,0,rider,14).car.id,1);
  assignHallCall(sh,3,0,rider,14);assert.equal(sh.calls[callKey(3,0)],1);
  assignHallCall(sh,3,0,rider,1);assert.equal(sh.calls[callKey(3,0)],1);
});
test('car already serving a floor leaves its hall call unassigned',()=>{
  const sh=shaft();assignHallCall(sh,5,1,rider,5);assert.deepEqual(sh.calls,{});
  sh.cars[0].motionCooldown=1;assignHallCall(sh,5,1,rider,5);assert.equal(sh.calls[callKey(5,1)],1);
});
test('up/down sweeps serve destinations and same-direction calls before reversing',()=>{
  const sh=shaft(),c=sh.cars[0];sh.calls={'8:1':1,'15:0':1,'3:0':1,'1:1':1};
  assert.equal(dispatchTarget(sh,c,rider),8);
  delete sh.calls['8:1'];assert.equal(dispatchTarget(sh,c,[]),15);
  delete sh.calls['15:0'];assert.equal(dispatchTarget(sh,c,[]),3);
  delete sh.calls['3:0'];assert.equal(dispatchTarget(sh,c,[]),1);
  c.direction=0;sh.calls={'3:0':1,'1:1':1,'8:1':1,'15:0':1};
  assert.equal(dispatchTarget(sh,c,rider),3);
  delete sh.calls['3:0'];assert.equal(dispatchTarget(sh,c,rider),1);
});
test('full cars ignore assigned hall calls while retaining passenger destinations',()=>{
  const sh=shaft(),c=sh.cars[0];c.people=Array.from({length:21},(_,i)=>99+i);sh.calls={'8:1':1};
  assert.equal(dispatchTarget(sh,c,rider),12);
});
test('turn floor is farthest outstanding request in the car direction',()=>{
  const sh=shaft(),c=sh.cars[0];sh.calls={'15:0':1,'3:1':1};recomputeDispatch(sh,c,rider);assert.equal(c.turnFloor,15);
  c.floor=17;c.direction=0;recomputeDispatch(sh,c,rider);assert.equal(c.turnFloor,3);
});
test('express departure programs sweep to the endpoint then reverse',()=>{
  const sh=shaft(),c=sh.cars[0];c.expressMode=1;sh.calls={'3:0':1,'15:1':1};assert.equal(dispatchTarget(sh,c,rider),20);
  c.floor=20;c.direction=1;assert.equal(dispatchTarget(sh,c,rider),15);
  c.direction=0;c.floor=5;assert.equal(dispatchTarget(sh,c,rider),3);
  c.floor=0;assert.equal(dispatchTarget(sh,c,rider),20);
  c.expressMode=2;c.floor=5;c.direction=0;assert.equal(dispatchTarget(sh,c,rider),0);
  c.floor=0;assert.equal(dispatchTarget(sh,c,[]),3);
});
test('program wait uses strict native clock distance and full cars bypass it',()=>{
  const c={floor:0,parkingFloor:0,visitTick:100,people:[]},program={wait:2};
  assert.equal(canDepart(c,21,program,160,true),false);assert.equal(canDepart(c,21,program,161,true),true);
  c.people=Array(21);assert.equal(canDepart(c,21,program,100,true),true);
  c.people=[];c.floor=3;assert.equal(canDepart(c,21,program,100,false),true);
  c.floor=0;c.visitTick=2598;assert.equal(canDepart(c,21,program,0,true),true);
});
test('door cycle boards FIFO on ticks five, three and one, and unloads only at opening',()=>{
  const t=building(),sh=t.state.shafts[0],c=sh.cars[0];for(let i=0;i<10;i++)queued(t,0,4);
  const boarded=[];for(let i=0;i<5;i++){t.updateElevators();boarded.push(c.people.length);}
  assert.deepEqual(boarded,[1,1,2,2,10]);
  for(let i=0;i<100;i++){t.updateElevators();if(c.floor===4&&c.doors===5)break;}
  assert.equal(c.floor,4);assert.equal(c.people.length,0);assert.equal(t.state.people.filter(p=>p.stage==='walk'&&p.floor===4).length,10);
  assert.equal(t.state.audioEvents.filter(e=>e.id===6002).length,1);
  assert.equal(t.state.audioEvents.filter(e=>e.id===6001).length,1);
});
test('local cars keep opposite queues separate; express departure mode accepts both',()=>{
  for(const departure of [0,1]) {
    const t=building(),sh=t.state.shafts[0],c=sh.cars[0];c.floor=2;c.target=2;c.parkingFloor=2;c.doors=5;c.expressMode=departure;
    const up=queued(t,2,4),down=queued(t,2,0);t.updateElevators();t.updateElevators();
    assert.equal(up.stage,'car');assert.equal(down.stage,departure?'car':'queue');
  }
});
test('directional rings keep forty waiters and preserve full-ring applicants for retry',()=>{
  const t=building();for(let i=0;i<42;i++){const p=t.spawn(t.state.rooms[0],0,4);p.x=42;}
  t.updatePeople(.5);assert.equal(t.state.people.filter(p=>p.stage==='queue').length,40);
  assert.equal(t.state.people.filter(p=>p.stage==='retry').length,2);
  t.updatePeople(100);assert.equal(t.state.people.length,42);
  assert.ok(t.state.people.filter(p=>p.stage==='queue').every(p=>p.wait===100));
});
test('full rings preserve the trip and retry choice on its next cohort, selecting an available lift',()=>{
  const t=building(),sh=t.state.shafts[0],r=t.state.rooms[0];
  for(let i=0;i<40;i++)queued(t,0,4);
  const p=t.spawn(r,0,4);p.x=42;t.updatePeople(.5);
  assert.equal(p.stage,'retry');assert.equal(p.tripDelay,5);
  assert.equal(t.build('elevator',0,52,52,4).ok,true);const alternate=t.state.shafts[1];
  t.state.tick=p.id%16;if(t.state.tick===p.retryTick)t.state.tick+=16;
  t.updatePeople(.5);assert.equal(p.path[0].id,alternate.id);assert.equal(p.stage,'walk');
  p.x=p.path[0].x;t.updatePeople(.5);assert.equal(p.stage,'queue');assert.equal(p.tripDelay,5);
  assert.notEqual(p.path[0].id,sh.id);
});
test('retry survives browser saves and a lost route terminates with native no-route stress',()=>{
  const t=building(),r=t.state.rooms[0];for(let i=0;i<40;i++)queued(t,0,4);
  const p=t.spawn(r,0,4);p.x=42;t.updatePeople(.5);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  t.state.shafts=[];t.state.tick=p.id%16;if(t.state.tick===p.retryTick)t.state.tick+=16;
  t.updatePeople(.5);assert.equal(p.tripDelay,300);assert.equal(t.state.people.includes(p),false);
});
test('native queue delay caps at 300 and larger ground lobbies reduce accumulated delay',()=>{
  assert.equal(boardingDelay(20,40,0,2),35);assert.equal(boardingDelay(20,20,0,3),0);
  assert.equal(boardingDelay(20,40,1,3),60);assert.equal(boardingDelay(290,40,0,1),300);
});
test('hall assignments and car cycle survive save/load and invalid owners fail atomically',()=>{
  const t=building();queued(t,3,0);t.updateElevators();const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  const saved=copy.save(),bad=JSON.parse(saved);bad.shafts[0].calls['3:0']=99999;assert.throws(()=>copy.load(JSON.stringify(bad)));assert.equal(copy.save(),saved);
});
