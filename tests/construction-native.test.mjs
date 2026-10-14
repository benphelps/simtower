import test from 'node:test';
import assert from 'node:assert/strict';
import { linkSprites } from '../src/original-construction.js';
import { shiftReplacementRooms,constructionDragBatch,constructionDragSpan,elevatorScheduleCell,elevatorScheduleRect,shaftNumberSlices } from '../src/original-construction.js';
import { rampPlacementError,parkingPlacementError,immediateConstruction,nativeConstructionPointer,rampConnected,rampSprite,parkingReachable } from '../src/original-construction.js';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { CAR_LIMIT,SHAFT_LIMIT,LINK_LIMIT,ESCALATOR_TYPES,linkPlacementError,linkFootprint,linkAtPoint,elevatorStopAllowed,elevatorStopError,groundLobbyHeight,cappedShaftRange,removedShaftFloors,cappedCarState,stopEvacuationPeople,stopIsolationWarning } from '../src/original-construction.js';

function world(){return {floors:{'-1':{x:0,width:100},0:{x:0,width:100,lobby:true},1:{x:0,width:100},2:{x:0,width:100},3:{x:0,width:100}},rooms:[],shafts:[],links:[]};}
test('held Floor/Lobby construction includes the initial rectangle while fixing its clicked storey',()=>{
  assert.deepEqual(constructionDragSpan('floor',{x:10,floor:1}),{key:'floor',floor:1,x:10,endX:10});
  assert.deepEqual(constructionDragSpan('lobby',{x:10,floor:0},{x:4,floor:8}),{key:'lobby',floor:0,x:4,endX:13});
  assert.deepEqual(constructionDragSpan('lobby',{x:10,floor:0},{x:15,floor:-1}),{key:'lobby',floor:0,x:10,endX:18});
  const tower=new Tower(JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url))));tower.state.sandbox=true;
  for(const targetX of [10,4,15,8]) {
    const p=constructionDragSpan('lobby',{x:10,floor:0},{x:targetX,floor:0});
    assert.equal(tower.build(p.key,p.floor,p.x,p.endX).error,undefined);
  }
  assert.deepEqual([tower.state.floors[0].x,tower.state.floors[0].width],[4,15]);
});
test('normal links assemble distinct native upper/lower resources with synchronized frames',()=>{
  assert.deepEqual(linkSprites({key:'stairs'}),[{id:2408,dy:12,height:24,sx:0},{id:2472,dy:36,height:36,sx:0}]);
  assert.deepEqual(linkSprites({key:'escalator'},2),[{id:2728,dy:0,height:36,sx:128},{id:2792,dy:36,height:36,sx:128}]);
  assert.deepEqual(linkSprites({key:'stairs'},13),[{id:2409,dy:12,height:24,sx:384},{id:2473,dy:36,height:36,sx:384}]);
});
function room(s,key,floor,x=0,width=100){s.rooms.push({key,floor,x,width});}

test('native Shift replacement enumerates whole rooms in scan order and stops at the first protected record',()=>{
  const s=world();s.rooms=[{id:2,key:'office',floor:2,x:8,width:9},{id:1,key:'condo',floor:1,x:0,width:16},{id:3,key:'security',floor:2,x:20,width:16},{id:4,key:'shop',floor:2,x:36,width:12}];
  const selection=shiftReplacementRooms(s,'cinema',2,8,31);
  assert.deepEqual(selection.map(v=>[v.room.id,v.blocked]),[[1,false],[2,false],[3,true]]);
  for(const key of ['floor','lobby','stairs','escalator','elevator','express','service'])assert.deepEqual(shiftReplacementRooms(s,key,2,8,31),[]);
  s.rooms[0].constructionRemaining=1;
  assert.deepEqual(shiftReplacementRooms(s,'office',2,8,9).map(v=>[v.room.id,v.blocked]),[[2,true]]);
});
test('parking drag builds fixed four-cell blocks on the initial floor and never retries attempted frontiers',()=>{
  const origin={floor:-1,x:20};
  const first=constructionDragBatch('parking',origin,{floor:-5,x:29});
  assert.deepEqual(first.placements,[{key:'parking',floor:-1,x:20},{key:'parking',floor:-1,x:24},{key:'parking',floor:-1,x:28}]);
  const back=constructionDragBatch('parking',origin,{floor:-2,x:11},first.progress);
  assert.deepEqual(back.placements.map(v=>v.x),[16,12]);
  assert.deepEqual(constructionDragBatch('parking',origin,{floor:-1,x:24},back.progress).placements,[]);
});
test('ramp drag extends contiguous storeys at original column and skips revisiting attempted storeys',()=>{
  const origin={floor:0,x:20};
  const first=constructionDragBatch('ramp',origin,{floor:-3,x:150});
  assert.deepEqual(first.placements.map(v=>[v.floor,v.x]),[[0,20],[-1,20],[-2,20],[-3,20]]);
  assert.deepEqual(constructionDragBatch('ramp',origin,{floor:-1,x:2},first.progress).placements,[]);
});
test('native elevator schedule selects original direction/full/idle/turn/destination/call glyphs in precedence order',()=>{
  const shaft={key:'elevator',calls:{'3:1':2,'4:0':2}},car={id:2,floor:0,parkingFloor:0,direction:1,turnFloor:4,people:[]};
  assert.deepEqual(elevatorScheduleCell({...shaft,calls:{}},car,0,[]),{sheet:20263,waiting:true});
  assert.equal(elevatorScheduleCell(shaft,car,0,[]).sheet,20256);
  car.direction=0;assert.equal(elevatorScheduleCell(shaft,car,0,[]).sheet,20257);
  car.people=Array.from({length:21},(_,i)=>i);assert.equal(elevatorScheduleCell(shaft,car,0,[]).sheet,20265);
  car.direction=1;assert.equal(elevatorScheduleCell(shaft,car,0,[]).sheet,20264);
  assert.equal(elevatorScheduleCell(shaft,car,4,[{id:0,path:[{to:4}]}]).sheet,20260);
  car.turnFloor=5;assert.equal(elevatorScheduleCell(shaft,car,4,[{id:0,path:[{to:4}]}]).sheet,20262);
  assert.equal(elevatorScheduleCell(shaft,car,3,[]).sheet,20258);assert.equal(elevatorScheduleCell(shaft,car,4,[]).sheet,20259);
  assert.equal(elevatorScheduleCell(shaft,car,2,[]).sheet,null);
  car.direction=0;car.turnFloor=4;assert.equal(elevatorScheduleCell(shaft,car,4,[]).sheet,20261);
});
test('native schedule geometry has fifteen descending rows and twelve-pixel cells on a thirteen-pixel grid',()=>{
  assert.deepEqual(elevatorScheduleRect({x:18,y:195},0,-1),{x:19,y:378,width:12,height:12});
  assert.deepEqual(elevatorScheduleRect({x:18,y:195},14,0),{x:32,y:196,width:12,height:12});
});
test('native shaft numbers use original combined glyph strips and red waiting floors',()=>{
  const shaft={key:'elevator',stops:[-1,0,9,27,99],cars:[{parkingFloor:0}]};
  assert.deepEqual(shaftNumberSlices(shaft,0),[{sheet:2027,sx:32,dx:0,width:32,height:36}]);
  assert.deepEqual(shaftNumberSlices(shaft,27),[{sheet:2026,sx:64,dx:0,width:16,height:36},{sheet:2025,sx:128,dx:16,width:16,height:36}]);
  assert.deepEqual(shaftNumberSlices(shaft,-1),[{sheet:2026,sx:32,dx:0,width:16,height:36},{sheet:2025,sx:16,dx:16,width:16,height:36}]);
  assert.equal(shaftNumberSlices(shaft,99)[0].sx,320);
  assert.equal(shaftNumberSlices(shaft,1)[0].sx,0);
  assert.equal(shaftNumberSlices({...shaft,key:'express'},27)[0].dx,8);
});
test('native ramps start in B1 and retain one column and one ramp per basement floor',()=>{
  const s=world();assert.match(rampPlacementError(s,0,20),/above ground/);
  assert.match(rampPlacementError(s,-2,20),/1st floor/);assert.equal(rampPlacementError(s,-1,20),null);
  s.rooms.push({id:1,key:'ramp',floor:-1,x:20,width:16});
  assert.match(rampPlacementError(s,-2,21),/vertically/);assert.match(rampPlacementError(s,-1,20),/on top/);
  assert.equal(rampPlacementError(s,-3,20),null); // native permits disconnected records.
  assert.equal(parkingPlacementError(s,-1),null);assert.match(parkingPlacementError(s,-2),/this level/);
  assert.equal(immediateConstruction('ramp'),true);assert.equal(immediateConstruction('parking'),true);assert.equal(immediateConstruction('office'),false);
});
test('construction pointer centers each native footprint before cell rounding and respects original floor boundaries',()=>{
  assert.deepEqual(nativeConstructionPointer('office',116,-18),{x:10,floor:0});
  assert.deepEqual(nativeConstructionPointer('ramp',224,18),{x:20,floor:-1});
  assert.deepEqual(nativeConstructionPointer('elevator',96,-36),{x:10,floor:0});
  assert.deepEqual(nativeConstructionPointer('floor',84,0),{x:10,floor:-1});
  // Case18 RECT explicitly overrides general width24 with248px=31cells.
  assert.deepEqual(nativeConstructionPointer('cinema',204,-54),{x:10,floor:1});
  assert.deepEqual(nativeConstructionPointer('cinema',176,-54),{x:6,floor:1});
  assert.deepEqual(nativeConstructionPointer('office',115.5,-37),{x:9,floor:1});
});
test('ramp accessibility and exact variant art follow connected floors rather than construction order',()=>{
  const s=world();s.rooms=[{id:2,key:'ramp',floor:-3,x:20,width:16},{id:1,key:'ramp',floor:-1,x:20,width:16}];
  assert.equal(rampConnected(s,-1),true);assert.equal(rampConnected(s,-3),false);
  assert.equal(rampSprite(s,s.rooms[1]).sheet,3816);
  s.rooms.push({id:3,key:'ramp',floor:-2,x:20,width:16});
  assert.equal(rampConnected(s,-3),true);assert.equal(rampConnected(s,0),false);
  assert.equal(rampSprite(s,s.rooms[1]).sheet,3818);assert.equal(rampSprite(s,s.rooms[2]).sheet,3817);assert.equal(rampSprite(s,s.rooms[0]).sheet,3816);
});
test('native parking access terminates at empty runs four cells wide on either side of the ramp',()=>{
  const s=world(),ramp={id:1,key:'ramp',floor:-1,x:20,width:16},left={id:2,key:'parking',floor:-1,x:13,width:4},right={id:3,key:'parking',floor:-1,x:39,width:4};
  s.rooms=[ramp,left,right];assert.equal(parkingReachable(s,left),true);assert.equal(parkingReachable(s,right),true);
  left.x=12;right.x=40;assert.equal(parkingReachable(s,left),false);assert.equal(parkingReachable(s,right),false);
  s.rooms.push({id:4,key:'shop',floor:-1,x:36,width:4});assert.equal(parkingReachable(s,right),true);
  s.rooms=s.rooms.filter(r=>r!==ramp);assert.equal(parkingReachable(s,right),false);
});

test('supplied executable uses identical car and shaft caps for every rating, plus a shared link pool',()=>{
  assert.equal(CAR_LIMIT,8);assert.equal(SHAFT_LIMIT,24);assert.equal(LINK_LIMIT,64);
  const s=world();s.links=Array.from({length:64},(_,i)=>({key:i%2?'stairs':'escalator',floor:3,x:200,width:8}));
  assert.match(linkPlacementError(s,'stairs',1,10),/No more/);
});
test('stairs overlay residential and service rooms without destroying them',()=>{
  for(const key of ['office','condo','single','twin','suite','medical','housekeeping']){
    const s=world();room(s,key,1);const before=JSON.stringify(s.rooms);
    assert.equal(linkPlacementError(s,'stairs',1,10),null);assert.equal(JSON.stringify(s.rooms),before);
  }
});
test('native escalator endpoints accept all decoded public/commercial types and empty floor',()=>{
  assert.deepEqual([...ESCALATOR_TYPES],[0,6,10,12,18,19,24,29,30,31]);
  for(const key of ['restaurant','shop','fastfood','cinema','partyhall','metro']){
    const s=world();room(s,key,1);room(s,key,0);assert.equal(linkPlacementError(s,'escalator',1,10),null);
  }
  assert.equal(linkPlacementError(world(),'escalator',1,10),null);
});
test('either private or service endpoint prevents escalator placement',()=>{
  for(const key of ['office','condo','single','twin','suite','medical','security','parking'])for(const floor of [0,1]){
    const s=world();room(s,key,floor);assert.match(linkPlacementError(s,'escalator',1,10),/commercial or public/);
  }
});
test('native endpoint lookup checks upper right and lower left rather than all covered rooms',()=>{
  const s=world();room(s,'office',1,0,15);room(s,'restaurant',1,15,85);
  room(s,'restaurant',0,0,15);room(s,'office',0,15,85);
  assert.equal(linkPlacementError(s,'escalator',1,10),null);
  s.rooms[1].key='condo';assert.match(linkPlacementError(s,'escalator',1,10),/commercial/);
});
test('stacked links share a storey through opposite halves but duplicate placements collide',()=>{
  const s=world();s.links.push({key:'stairs',floor:1,x:10,width:8});
  assert.equal(linkPlacementError(s,'stairs',2,10),null);
  assert.match(linkPlacementError(s,'stairs',1,10),/transportation/);
  assert.match(linkPlacementError(s,'stairs',2,15),/transportation/);
  assert.deepEqual(linkFootprint(s.links[0]),[{floor:0,x:10,width:4},{floor:1,x:14,width:4}]);
});
test('links require both floors and reserve full width against elevator machinery',()=>{
  const s=world();delete s.floors[0];assert.match(linkPlacementError(s,'stairs',1,10),/both/);
  s.floors[0]={x:0,width:100};s.shafts.push({x:10,width:4,low:2,high:3});
  assert.match(linkPlacementError(s,'stairs',1,10),/transportation/);
  assert.equal(linkPlacementError(s,'stairs',1,14),null);
});
test('upper link edge comparison is strict while the lower edge is inclusive',()=>{
  for(const key of ['stairs','escalator']){
    const s=world();s.floors[1].width=18;assert.match(linkPlacementError(s,key,1,10),/beyond/);
    s.floors[1].width=19;s.floors[0].width=18;assert.equal(linkPlacementError(s,key,1,10),null);
  }
});
test('express stop eligibility uses lobby cadence and ordinary shafts exclude tall lobby interiors',()=>{
  const s=world(),express={key:'express',low:-9,high:99,cars:[]};
  for(const floor of [-9,-1,0,14,29,44,59,74,89])assert.equal(elevatorStopAllowed(s,express,floor),true);
  for(const floor of [1,13,15,99])assert.equal(elevatorStopAllowed(s,express,floor),false);
  s.floors[1].lobby=true;s.floors[2].lobby=true;assert.equal(groundLobbyHeight(s),3);
  const ordinary={...express,key:'elevator'};assert.equal(elevatorStopAllowed(s,ordinary,1),false);assert.equal(elevatorStopAllowed(s,ordinary,2),false);assert.equal(elevatorStopAllowed(s,ordinary,3),true);
});
test('stop protection follows the configured waiting floor even while a car is elsewhere',()=>{
  const s=world(),shaft={key:'elevator',low:0,high:3,cars:[{floor:3,parkingFloor:1}]};
  assert.match(elevatorStopError(s,shaft,1),/assigned to wait/);
  s.people=[{path:[{id:10,from:0,to:3}]}];assert.equal(elevatorStopError(s,shaft,2),null);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function tower(){
  const t=new Tower(data,{sandbox:true});
  assert.equal(t.build('lobby',0,0,99).ok,true);
  for(let floor=1;floor<=3;floor++)assert.equal(t.build('floor',floor,0,99).ok,true);
  return t;
}
test('Tower ramp and parking are ready immediately and enforce B1 anchor/single column atomically',()=>{
  const t=tower();for(const f of [-1,-2,-3])assert.equal(t.build('floor',f,0,99).ok,true);
  let before=t.save();assert.match(t.build('ramp',0,20).error,/above ground/);assert.equal(t.save(),before);
  assert.match(t.build('ramp',-2,20).error,/1st floor/);assert.equal(t.save(),before);
  assert.equal(t.build('ramp',-1,20).ok,true);
  const ramp=t.state.rooms.find(r=>r.key==='ramp');assert.equal(ramp.constructionRemaining,0);assert.equal(t.state.construction.includes(ramp.id),false);
  before=t.save();assert.match(t.build('ramp',-2,21).error,/vertically/);assert.equal(t.save(),before);
  assert.match(t.build('ramp',-1,20).error,/on top/);assert.equal(t.save(),before);
  assert.equal(t.build('parking',-1,16).ok,true);const space=t.state.rooms.find(r=>r.key==='parking');
  assert.equal(space.constructionRemaining,0);assert.equal(t.parkingSpaces().includes(space),true);
  assert.equal(t.build('ramp',-3,20).ok,true);assert.equal(t.rampConnected(-3),false);
  assert.equal(t.build('ramp',-2,20).ok,true);assert.equal(t.rampConnected(-3),true);
});
test('Tower parking allocation changes when an exact four-cell gap is filled and transport overlays do not bridge it',()=>{
  const t=tower();t.build('floor',-1,0,99);t.build('ramp',-1,20);
  t.build('parking',-1,40);const space=t.state.rooms.find(r=>r.key==='parking');assert.equal(t.parkingSpaces().includes(space),false);
  assert.equal(t.build('elevator',-1,36,36,0).ok,true);assert.equal(t.parkingSpaces().includes(space),false);
  t.demolish(-1,36);assert.equal(t.build('parking',-1,36).ok,true);assert.equal(t.parkingSpaces().includes(space),true);
});
test('Tower builds stacked staircases over residential rooms and preserves those room records',()=>{
  const t=tower();t.build('condo',1,10);t.build('suite',2,10);
  const before=JSON.stringify(t.state.rooms);
  assert.equal(t.build('stairs',1,10).ok,true);assert.equal(t.build('stairs',2,10).ok,true);
  assert.equal(JSON.stringify(t.state.rooms),before);assert.equal(t.state.links.length,2);
  const after=t.save();assert.match(t.build('stairs',2,10).error,/transportation/);assert.equal(t.save(),after);
});
test('Tower escalator validation rejects residential endpoints atomically',()=>{
  const t=tower();t.build('office',1,10);const before=t.save();
  assert.match(t.build('escalator',1,10).error,/commercial or public/);assert.equal(t.save(),before);
  assert.equal(t.build('escalator',2,40).ok,true);
});
test('Tower permits both link types to connect B1 with the ground lobby',()=>{
  for(const key of ['stairs','escalator']){
    const t=tower();assert.equal(t.build('floor',-1,0,99).ok,true);
    assert.equal(t.build(key,0,10).ok,true);
    assert.deepEqual(t.route(-1,0).map(e=>[e.from,e.to]),[[-1,0]]);
  }
});
test('Tower stop protection permits unrelated journeys and preserves a configured waiting floor',()=>{
  const t=tower();t.build('elevator',0,70,70,3);const sh=t.state.shafts[0];
  sh.cars[0].floor=3;sh.cars[0].parkingFloor=1;
  const before=t.save();assert.match(t.setElevatorStop(sh.id,1).error,/assigned to wait/);assert.equal(t.save(),before);
  t.state.people.push({id:100,room:101,stage:'ride',floor:0,path:[{id:sh.id,kind:'elevator',from:0,to:3}]});
  assert.equal(t.setElevatorStop(sh.id,2,true).ok,true);assert.equal(sh.stops.includes(2),false);
  assert.equal(t.setElevatorStop(sh.id,2).ok,true);assert.equal(sh.stops.includes(2),true);
  assert.equal(t.setElevatorStop(sh.id,3,true).ok,true);
});
test('native normal-link hit testing follows diagonal pixels rather than deleting every room beneath the rectangle',()=>{
  const s=world(),link={id:1,key:'stairs',floor:1,x:10,width:8};s.links.push(link);
  assert.equal(linkAtPoint(s,80,-7),link); // Left half on lower floor: relative y 65.
  assert.equal(linkAtPoint(s,136,-47),link); // Right half on upper floor: relative y 25.
  assert.equal(linkAtPoint(s,80,-47),undefined); // Room interior above the left stairs.
  assert.equal(linkAtPoint(s,136,-7),undefined); // Room interior below the right stairs.
  assert.equal(linkAtPoint(s,144,-47),undefined); // Right boundary excluded.
  assert.equal(linkAtPoint(s,136,-54),link); // Native lower band boundary inclusive.
  assert.equal(linkAtPoint(s,136,-30),undefined); // Native upper band boundary excluded.
});

test('native elevator end drag caps standard/service span while preserving the opposite end',()=>{
  for(const key of ['elevator','service']){
    const shaft={key,low:0,high:5};
    assert.deepEqual(cappedShaftRange(shaft,0,60),{low:0,high:29,capped:true});
    assert.deepEqual(cappedShaftRange(shaft,-50,5),{low:-24,high:5,capped:true});
    assert.deepEqual(cappedShaftRange(shaft,0,29),{low:0,high:29,capped:false});
  }
  assert.deepEqual(cappedShaftRange({key:'express',low:0,high:5},0,99),{low:0,high:99,capped:false});
});
test('native retraction processes top floors downward and basement floors upward',()=>{
  assert.deepEqual(removedShaftFloors({low:-3,high:5},-1,3),[5,4,-3,-2]);
});
test('out-of-range cars snap and reset movement/doors while retained cars keep their active state',()=>{
  const car={floor:8,parkingFloor:7,doors:4,motionCooldown:2,departureFloor:8,visitArmed:true};
  assert.deepEqual(cappedCarState(car,0,5),{parkingFloor:5,floor:5,motionCooldown:0,doors:0,departureFloor:5,visitArmed:false});
  assert.deepEqual(cappedCarState({...car,floor:3},0,5),{parkingFloor:5});
  assert.equal(car.floor,8); // Planning is pure.
});
test('stop evacuation separates on-board target destinations and native FIFO rings from future journey legs',()=>{
  const edge=(id,from,to)=>({id,kind:'elevator',from,to});
  const shaft={id:5,cars:[{people:[1,2]},{people:[3]}]};
  const s={people:[
    {id:1,stage:'car',path:[edge(5,0,4)]},
    {id:2,stage:'car',path:[edge(5,0,3)]},
    {id:3,stage:'car',path:[edge(5,0,4)]},
    {id:4,stage:'queue',floor:4,queueOrder:20,path:[edge(5,4,0)]},
    {id:5,stage:'queue',floor:4,queueOrder:11,path:[edge(5,4,6)]},
    {id:6,stage:'queue',floor:4,queueOrder:10,path:[edge(5,4,6)]},
    {id:7,stage:'walk',floor:4,path:[edge(5,4,0)]},
    {id:8,stage:'queue',floor:0,path:[edge(9,0,2),edge(5,2,4)]},
  ]};
  const result=stopEvacuationPeople(s,shaft,[4]);
  assert.deepEqual(result.riders.map(p=>p.id),[1,3]);assert.deepEqual(result.waiters.map(p=>p.id),[6,5,4]);
});
test('stop isolation distinguishes tenant, housekeeping and inclusive lobby transfer membership',()=>{
  const s=world(),shaft={id:1,key:'elevator',x:10,width:4,stops:[0,1,2]};s.shafts.push(shaft);
  assert.equal(stopIsolationWarning(s,shaft,1),1);assert.equal(stopIsolationWarning(s,shaft,3),0);
  shaft.key='service';assert.equal(stopIsolationWarning(s,shaft,1),2);
  s.links.push({floor:1,x:40,width:8,key:'stairs'});assert.equal(stopIsolationWarning(s,shaft,1),2);
  shaft.key='elevator';assert.equal(stopIsolationWarning(s,shaft,1),0);
  s.links=[];s.shafts.push({id:2,key:'elevator',x:30,width:4,stops:[0,1]});
  assert.equal(stopIsolationWarning(s,shaft,1),0);assert.equal(stopIsolationWarning(s,shaft,0),3);
  s.shafts[1].x=98;assert.equal(stopIsolationWarning(s,shaft,0),3); // Partial overlap is a native member.
  s.shafts[1].x=100;assert.equal(stopIsolationWarning(s,shaft,0),3); // Boundary touch is also included.
  s.shafts[1].x=101;assert.equal(stopIsolationWarning(s,shaft,0),0); // Another direct stop, outside this lobby group.
});

test('queued travellers reselect an alternative without charging the discarded wait',()=>{
  const t=tower();t.build('office',2,10);const r=t.state.rooms[0];r.constructionRemaining=0;r.occupied=true;
  t.build('elevator',0,60,60,3);t.build('elevator',0,72,72,3);const [first,second]=t.state.shafts;
  const p=t.spawn(r,1,2,null,first.x+2);p.stage='queue';p.path=[{kind:'elevator',id:first.id,from:1,to:2,x:first.x+2}];
  p.wait=120;p.queueTick=100;p.hallRegistered=true;p.tripDelay=35;
  assert.equal(t.setElevatorStop(first.id,1,true).ok,true);assert.equal(p.stage,'walk');
  assert.equal(p.path[0].id,second.id);assert.equal(p.tripDelay,35);assert.equal(p.wait,0);assert.equal(p.queueTick,undefined);assert.equal(p.hallRegistered,undefined);
  assert.equal(t.setElevatorStop(first.id,3).ok,true); // Other same-type stop still serves it.
});

test('an isolated stop requires native warning confirmation before mutating shaft or travellers',()=>{
  const t=tower();t.build('elevator',0,60,60,3);const sh=t.state.shafts[0],before=t.save();
  const result=t.setElevatorStop(sh.id,2);assert.equal(result.warningCode,1);assert.equal(result.warning,data.strings[1005][0]);
  assert.equal(t.save(),before);assert.equal(t.setElevatorStop(sh.id,2,true).ok,true);
});

test('removed onboard destinations use the original forced destination-floor write before route completion',()=>{
  const t=tower();t.build('office',3,10);const r=t.state.rooms[0];r.constructionRemaining=0;r.occupied=true;
  t.build('elevator',0,60,60,3);const sh=t.state.shafts[0],car=sh.cars[0];
  const p=t.spawn(r,0,3);p.stage='car';p.tripDelay=45;p.queueTick=100;p.wait=150;car.people.push(p.id);car.floor=1;
  assert.equal(t.setElevatorStop(sh.id,3,true).ok,true);
  assert.equal(p.floor,3);assert.equal(p.stage,'walk');assert.deepEqual(p.path,[]);assert.equal(p.tripDelay,45);assert.deepEqual(car.people,[]);
});

test('occupied end retraction caps cars, retains structure and completes removed destinations rather than rejecting the edit',()=>{
  const t=tower();t.build('office',3,10);const r=t.state.rooms[0];r.constructionRemaining=0;r.occupied=true;
  t.build('elevator',0,60,60,3);const sh=t.state.shafts[0],car=sh.cars[0];
  const p=t.spawn(r,0,3);p.stage='car';car.people.push(p.id);car.floor=3;car.parkingFloor=3;car.doors=4;car.motionCooldown=2;
  const oldBounds=JSON.stringify(t.state.floors),result=t.resizeShaft(sh.id,0,2);
  assert.equal(result.ok,true);assert.equal(car.floor,2);assert.equal(car.parkingFloor,2);assert.equal(car.motionCooldown,0);assert.equal(car.doors,0);
  assert.deepEqual(car.people,[]);assert.equal(p.floor,3);assert.deepEqual(p.path,[]);assert.equal(JSON.stringify(t.state.floors),oldBounds);
});
test('15988 elevator extension crosses existing facilities without deleting their tenants or changing room records',()=>{
  const t=tower();t.build('office',3,60);t.finishConstruction();const room=t.state.rooms[0];t.admitTenant(room);
  t.build('elevator',0,60,60,1);const sh=t.state.shafts[0],before=t.save(),roomState=JSON.stringify(room),actors=t.state.actors.map(a=>[a.id,a.room,a.state]);
  assert.equal(t.resizeShaft(sh.id,0,5,false).high,5);assert.equal(t.save(),before);
  assert.equal(t.resizeShaft(sh.id,0,5).ok,true);assert.equal(sh.high,5);assert.equal(JSON.stringify(room),roomState);
  assert.deepEqual(t.state.actors.map(a=>[a.id,a.room,a.state]),actors);assert.equal(room.occupied,true);
  assert.deepEqual(t.bounds(5),{x:60,width:4,lobby:false});
  const extendedBounds=JSON.stringify(t.state.floors);assert.equal(t.resizeShaft(sh.id,0,1).ok,true);assert.equal(JSON.stringify(t.state.floors),extendedBounds);
  assert.equal(JSON.stringify(room),roomState);
});
test('bulldozer diagonal hit removes an overlay without evicting its condominium residents',()=>{
  const t=tower();t.build('condo',1,10);t.build('stairs',1,10);t.finishConstruction();
  const r=t.state.rooms[0];t.admitTenant(r);const before=t.state.cash;
  assert.equal(t.demolish(1,17,{x:136,y:-47}).ok,true);
  assert.equal(t.state.links.length,0);assert.equal(t.state.rooms[0],r);
  assert.equal(r.sold,true);assert.equal(r.occupied,true);assert.equal(t.state.cash,before);
});
test('bulldozer room hit outside an overlay diagonal selects the underlying room',()=>{
  const t=tower();t.build('condo',1,10);t.build('stairs',1,10);t.finishConstruction();
  const r=t.state.rooms[0];t.admitTenant(r);const before=t.state.cash,sale=r.salePrice;
  assert.equal(t.demolish(1,10,{x:80,y:-47}).ok,true);
  assert.equal(t.state.links.length,1);assert.equal(t.state.rooms.length,0);assert.equal(t.state.cash,before-sale);
});
