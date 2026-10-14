import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interiorUpdateDue, nativeInteriorFrame, nativeInteriorPose, sampleRoomInteriors, roomInteriorSprites,nativeVisibleInteriorRooms,nativeBuilderPose,constructionInteriorSprites,nativeInteriorRecord,markInteriorDirty,markAllInteriorsDirty,validateNativeInteriors } from '../src/original-interiors.js';
import {Renderer} from '../src/renderer.js';
import {Tower} from '../src/simulation.js';
import {syncActors,updateActors} from '../src/original-people.js';
import {finishCommercialActorTrip,admitCommercialVisit,leaveCommercialVisit} from '../src/original-commercial.js';
import {nativePersonKind} from '../src/original-person-info.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
const actor = (index, fields = {}) => ({ id: index + 1, index, room: 1, state: 4, trip: null, ...fields });
const room = { id: 1, key: 'office', width: 9, x: 10, floor: 2, variant: 0 }, state = { tick: 400, calendarDay: 0 };
test('native repeated vacancy and hotel checkout calls retain explicit dirty writes',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);tower.build('floor',1,40,160);tower.build('office',1,40);tower.build('single',1,60);
  while(tower.state.construction.length)tower.finishConstruction();
  const office=tower.state.rooms.find(r=>r.key==='office'),hotel=tower.state.rooms.find(r=>r.key==='single');
  tower.vacateRoom(office);const vacancy=office.tenantState;nativeInteriorRecord(office).dirty=0;
  tower.vacateRoom(office);assert.equal(office.tenantState,vacancy);assert.equal(nativeInteriorRecord(office).dirty,1,'2D7A9 redraws even an unchanged vacancy byte');
  tower.checkOut(hotel,true);const dirtyHotel=hotel.hotelState;nativeInteriorRecord(hotel).dirty=0;
  tower.checkOut(hotel,true);assert.equal(hotel.hotelState,dirtyHotel);assert.equal(nativeInteriorRecord(hotel).dirty,1,'2D914 redraws even an unchanged condition byte');
});
test('native dawn dirties unchanged offices but does not invent condo or hotel phase writes',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,180);tower.build('floor',1,40,180);
  for(const [key,x] of [['office',40],['condo',55],['single',75],['medical',90]])assert.equal(tower.build(key,1,x).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();
  const rooms=Object.fromEntries(tower.state.rooms.map(r=>[r.key,r]));rooms.office.tenantState=0;rooms.condo.tenantState=24;rooms.single.hotelState=24;
  for(const room of Object.values(rooms))nativeInteriorRecord(room).dirty=0;
  tower.state.tick=2599;tower.step();
  assert.equal(nativeInteriorRecord(rooms.office).dirty,1);assert.equal(nativeInteriorRecord(rooms.medical).dirty,1);
  assert.equal(nativeInteriorRecord(rooms.condo).dirty,0);assert.equal(nativeInteriorRecord(rooms.single).dirty,0);
  assert.equal(rooms.office.tenantState,0);assert.equal(rooms.condo.tenantState,24);assert.equal(rooms.single.hotelState,24);
});
test('interior sampling consumes shared RNG only for visible rooms in native top-to-bottom/left-to-right order',()=>{
  const rooms=[{...room,id:1,floor:1,x:5},{...room,id:2,floor:2,x:15},{...room,id:3,floor:2,x:5},
    {...room,id:4,x:30},{...room,id:5,floor:5}];
  const viewport={left:0,right:200,top:-120,bottom:0};
  assert.deepEqual(nativeVisibleInteriorRooms(rooms,viewport).map(r=>r.id),[3,2,1]);
  const sampled=[],tower={state:{...state,rooms,actors:rooms.map(r=>actor(0,{room:r.id}))},randomInt:()=>{sampled.push(sampled.length);return 0;}};
  const renderer={interiorPoses:new Map(),showPeople:true};Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);
  assert.deepEqual([...renderer.interiorPoses.keys()],[3,2,1]);assert.equal(sampled.length,3);
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(sampled.length,3,'same-tick browser paint does not reroll native poses');
  renderer.guiCapture=true;tower.state.tick=416;Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(sampled.length,3,'a modal/menu loop suspends visible room RNG');
  renderer.guiCapture=false;Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.ok(sampled.length>3,'ordinary paused view still permits native cohort repaint');
});
test('native builders use original two-cell poses, per-floor visible ordering and construction dirty cadence even with People off',()=>{
  const pending={...room,id:6,key:'cinema',width:31,height:2,constructionRemaining:12};
  const viewport={left:0,right:400,top:-120,bottom:0},calls=[];
  const tower={state:{...state,rooms:[{...room,id:1},pending],actors:[actor(0)]},randomInt:max=>{calls.push(max);return 0;}};
  const renderer={interiorPoses:new Map(),showPeople:false};
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);
  assert.deepEqual(calls,[2,23,6,23,6]);
  assert.deepEqual([...renderer.interiorPoses.keys()],[1,'6:0','6:1']);
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls.length,5);
  tower.state.tick++;Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls.length,5,'clock alone does not mark construction dirty');
  pending.constructionRemaining--;
  Renderer.prototype.sampleInteriors.call(renderer,tower,{...viewport,top:-70});assert.deepEqual(calls.slice(5),[23,6],'only visible lower record consumes builder RNG');
  const poses=[{...nativeBuilderPose(pending,()=>0),level:0},{cell:22,pose:62,level:1}];
  assert.deepEqual(constructionInteriorSprites(pending,poses).map(s=>[s.sheet,s.sx,s.x,s.y]),[[1512,456,80,-96],[1512,464,88,-96],[1513,16,256,-60],[1513,24,264,-60]]);
});
test('pending facade copies native24px construction art beneath original12px tiled ceiling without stretching',()=>{
  const calls=[],renderer={sprite:(...args)=>calls.push(args)},pending={...room,key:'cinema',width:31,height:2,constructionRemaining:12};
  Renderer.prototype.room.call(renderer,pending,{state:state},false);
  assert.deepEqual(calls,[[5000,80,-108,128,12,0,0,128,12],[5000,208,-108,120,12,0,0,120,12],[3625,80,-96,248,24,0,0,248,24],
    [5000,80,-72,128,12,0,0,128,12],[5000,208,-72,120,12,0,0,120,12],[3625,80,-60,248,24,0,0,248,24]]);
});
test('per-record construction dirty replay renders completed cinema floor and only samples visible pending builder',()=>{
  const pending={...room,key:'cinema',width:31,height:2,constructionRemaining:7,nativeConstructionParts:[
    {level:0,floor:room.floor,type:18,remaining:0,completed:true,dirty:0},
    {level:1,floor:room.floor-1,type:19,remaining:7,completed:false,dirty:1}]};
  let calls=0;const tower={state:{...state,rooms:[pending],actors:[]},randomInt:()=>{calls++;return 0;}},renderer={interiorPoses:new Map(),showPeople:false};
  Renderer.prototype.sampleInteriors.call(renderer,tower,{left:0,right:400,top:-70,bottom:0});
  assert.equal(calls,2);assert.equal(pending.nativeConstructionParts[1].dirty,0);assert.equal(pending.nativeInteriors[0].floor,room.floor-1);
  pending.nativeConstructionParts[1].dirty=1;
  Renderer.prototype.sampleInteriors.call(renderer,tower,{left:0,right:400,top:-120,bottom:-72});
  assert.equal(calls,2);assert.equal(pending.nativeConstructionParts[1].dirty,1,'offscreen construction keeps its source dirty byte');
  const drawCalls=[],draw={sprite:(...args)=>drawCalls.push(args),room:Renderer.prototype.room};
  Renderer.prototype.room.call(draw,pending,tower,false);
  assert.equal(drawCalls.filter(c=>c[0]===3625).length,1);assert.equal(drawCalls.find(c=>c[0]===3625)[2],-60);
  assert.ok(drawCalls.some(c=>c[0]===3176||c[0]===2152),'completed top floor uses actual native show art');
});
test('GUI capture freezes palette work without treating ordinary pause as an effects disable',()=>{
  let calls=0;const renderer={guiCapture:true,effectsClock:{advance:()=>{calls++;return null;}}};
  Renderer.prototype.updateEffects.call(renderer,240);assert.equal(calls,0);
  renderer.guiCapture=false;Renderer.prototype.updateEffects.call(renderer,480);assert.equal(calls,1);
});
test('remote actor travel changes do not reroll interiors off cohort; native facade changes bypass People',()=>{
  const home={...room,tenantState:1},person=actor(0),calls=[];
  const tower={state:{...state,rooms:[home],actors:[person]},randomInt:max=>{calls.push(max);return 0;}},renderer={interiorPoses:new Map(),showPeople:false};
  const viewport={left:0,right:200,top:-120,bottom:0};
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls.length,1);
  person.state=65;person.trip=1;tower.state.tick++;
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls.length,1);
  person.state=4;person.trip=null;home.tenantState=2;
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls.length,2);
});
test('native explicit dirty writes survive offscreen and GUI capture, coalesce, and can resample twice in one tick',()=>{
  const home={...room,tenantState:1},tower={state:{...state,rooms:[home],actors:[actor(0)]},randomInt:()=>{calls++;return 0;}},renderer={interiorPoses:new Map(),showPeople:false};let calls=0;
  const viewport={left:0,right:200,top:-120,bottom:0};
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,1);
  markInteriorDirty(home);markInteriorDirty(home);
  Renderer.prototype.sampleInteriors.call(renderer,tower,{...viewport,left:200,right:400});assert.equal(calls,1);assert.equal(home.nativeInteriors[0].dirty,1);
  renderer.guiCapture=true;Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,1);assert.equal(home.nativeInteriors[0].dirty,1);
  renderer.guiCapture=false;Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,2);assert.equal(home.nativeInteriors[0].dirty,0);
  markInteriorDirty(home);Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,3,'a new+13write bypasses same-tick deduplication');
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,3);
  markAllInteriorsDirty(tower.state);assert.equal(home.nativeInteriors[0].dirty,1);
});
test('native tick-number rollover does not suppress a fresh visible cohort after a full offscreen clock cycle',()=>{
  const home={...room},tower={state:{...state,elapsedTicks:0,rooms:[home],actors:[actor(0)]},randomInt:()=>{calls++;return 0;}},renderer={interiorPoses:new Map(),showPeople:true};let calls=0;
  const viewport={left:0,right:200,top:-120,bottom:0};
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,1);
  tower.state.elapsedTicks=2600;tower.state.calendarDay=1;
  Renderer.prototype.sampleInteriors.call(renderer,tower,{...viewport,left:200,right:400});assert.equal(calls,1);
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,2);
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);assert.equal(calls,2);
});
test('persisted native poses restore without consuming fresh RNG and malformed records fail strict validation',()=>{
  const tower={state:{...state,rooms:[{...room}],actors:[actor(0)]},randomInt:()=>0},renderer={interiorPoses:new Map(),showPeople:true},viewport={left:0,right:200,top:-120,bottom:0};
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);
  const restored=JSON.parse(JSON.stringify(tower.state));assert.equal(validateNativeInteriors(restored),true);
  const nextRenderer={interiorPoses:new Map(),showPeople:true};
  Renderer.prototype.sampleInteriors.call(nextRenderer,{state:restored,randomInt:()=>assert.fail('loading sampled poses must not reroll source RNG')},viewport);
  assert.deepEqual(nextRenderer.interiorPoses.get(room.id).poses,renderer.interiorPoses.get(room.id).poses);
  for(const mutate of [r=>r.dirty=2,r=>r.floor=99,r=>r.lastTick=2600,r=>r.poses[0].pose=99,r=>r.poses[0].actor=999,r=>r.sampled=false]){
    const candidate=JSON.parse(JSON.stringify(restored));mutate(candidate.rooms[0].nativeInteriors[0]);assert.throws(()=>validateNativeInteriors(candidate),/Invalid/);
  }
});
test('Tower save/load restores sampled poses and rejects malformed interior bytes atomically',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);tower.build('floor',1,40,160);tower.build('office',1,40);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const office=tower.state.rooms[0];tower.admitTenant(office);const worker=tower.state.actors.find(a=>a.room===office.id);Object.assign(worker,{state:4,trip:null});office.tenantState=1;
  const renderer={interiorPoses:new Map(),showPeople:true},viewport={left:0,right:1600,top:-200,bottom:100};
  Renderer.prototype.sampleInteriors.call(renderer,tower,viewport);
  const save=tower.save(),loaded=new Tower(data,{sandbox:true});loaded.load(save);const seed=loaded.state.seed;
  Renderer.prototype.sampleInteriors.call({interiorPoses:new Map(),showPeople:true},loaded,viewport);
  assert.equal(loaded.state.seed,seed);assert.deepEqual(loaded.state.rooms[0].nativeInteriors,office.nativeInteriors);
  const before=loaded.save();for(const mutation of [record=>record.dirty=7,record=>record.poses[0].actor=999999,record=>record.lastEpoch=1]){
    const candidate=JSON.parse(save);mutation(candidate.rooms[0].nativeInteriors[0]);assert.throws(()=>loaded.load(JSON.stringify(candidate)),/Invalid native interior/);assert.equal(loaded.save(),before);
  }
});
test('native room overlays refresh on native tenant phases and room changes instead of every render', () => {
  assert.equal(interiorUpdateDue(100, 12), true); assert.equal(interiorUpdateDue(100, 11), false);
  assert.equal(interiorUpdateDue(100, 11, true, false), true); assert.equal(interiorUpdateDue(100, 12, false, false), false);
});
test('office styles choose fixed original desks and child roles, while away/sleeping actors are hidden', () => {
  const poses = sampleRoomInteriors(state, room, [actor(0), actor(1), actor(2), actor(3, { state: 16 }), actor(4, { state: 65 })], () => 0);
  assert.deepEqual(poses.map(p => [p.cell, p.pose]), [[1, 14], [2, 16], [3, 12]]);
  assert.deepEqual(nativeInteriorPose({ ...room, variant: 2 }, actor(0), state, () => 1), { cell: 7, pose: 11 });
  assert.deepEqual(nativeInteriorPose({ ...room, variant: 2 }, actor(1), state, () => 3), { cell: 4, pose: 9 });
  assert.equal(nativeInteriorPose(room, actor(0, { trip: 99 }), state, () => 0), null);
});
test('condo and hotel room occupants use their original daytime/nighttime interior activities', () => {
  const condo = { ...room, key: 'condo', width: 16 }, hotel = { ...room, key: 'twin', width: 6 };
  assert.equal(nativeInteriorPose(condo, actor(0), state, () => 0).pose, 30);
  assert.equal(nativeInteriorPose(condo, actor(0), { ...state, tick: 1700 }, () => 1).pose, 33);
  assert.equal(nativeInteriorPose(condo, actor(0), { ...state, calendarDay: 2 }, () => 0).pose, 34);
  assert.equal(nativeInteriorPose(condo, actor(1), state, () => 8).cell, 1);
  assert.equal(nativeInteriorPose(hotel, actor(1), { ...state, tick: 1700 }, () => 8).pose, 90);
  assert.equal(nativeInteriorPose(hotel, actor(2), { ...state, tick: 1700, controlHeld: true }, () => 0).pose, 95);
});
test('Control modifier selects original special interior poses independently of Effects option',()=>{
  const condo={...room,key:'condo',width:16},hotel={...room,key:'twin',width:6};
  for(const effects of [false,true]) {
    assert.equal(nativeInteriorPose(condo,actor(2),{...state,interiorEffects:effects},()=>0).pose,50);
    assert.equal(nativeInteriorPose(condo,actor(2),{...state,controlHeld:true,interiorEffects:effects},()=>2).pose,56);
    assert.equal(nativeInteriorPose(hotel,actor(2),{...state,tick:1700,interiorEffects:effects},()=>0).pose,91);
    assert.equal(nativeInteriorPose(hotel,actor(2),{...state,tick:1700,controlHeld:true,interiorEffects:effects},()=>0).pose,95);
  }
});
test('hotel cleaning uses reserved child0 poses and copies both original cells at floor interior height', () => {
  const hotel = { ...room, key: 'single', width: 4, housekeepingOverlay: true };
  const poses = sampleRoomInteriors(state, hotel, [actor(1, { state: 32 })], () => 0);
  assert.deepEqual(poses, [{ cell: 0, pose: 96, actor: null, index: 0 }]);
  assert.deepEqual(roomInteriorSprites(hotel, poses).map(p => [p.sheet, p.sx, p.x, p.y]), [[1513, 288, 80, -96], [1513, 296, 88, -96]]);
  assert.equal(roomInteriorSprites(hotel, [{ cell: 3, pose: 96 }]).length, 1);
  assert.deepEqual([nativeInteriorFrame(59), nativeInteriorFrame(59, 1)].map(f => [f.sheet, f.sx]), [[1512, 472], [1513, 0]]);
});
test('all recovered resident, cleaner and food interior poses address original art within bitmap bounds', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
  for (let pose = 0; pose <= 98; pose++) for (let half = 0; half < 2; half++) {
    const frame = nativeInteriorFrame(pose, half), bitmap = manifest.resources.find(r => r.type === 2 && r.id === frame.sheet);
    assert.ok(bitmap && frame.sx + frame.width <= bitmap.width && frame.height <= bitmap.height);
  }
});
test('food interiors sample the first two actual patron records after admission, not reserved waiters',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);tower.build('floor',1,40,160);
  tower.build('fastfood',1,40);while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const food=tower.state.rooms.find(r=>r.key==='fastfood'),patrons=tower.state.actors.filter(a=>a.room===food.id);
  assert.equal(patrons.length,48);assert.ok(patrons.every(a=>a.state===32));
  const calls=[],random=max=>{calls.push(max);return 0;};
  assert.deepEqual(sampleRoomInteriors(tower.state,food,patrons,random),[]);assert.deepEqual(calls,[]);
  food.commercial.state=0;
  for(const patron of patrons.slice(0,3))finishCommercialActorTrip(tower,patron,food,true,'commercial-arrival');
  assert.ok(patrons.slice(0,3).every(a=>a.state===5));
  const poses=sampleRoomInteriors(tower.state,food,patrons,random);
  assert.deepEqual(poses.map(p=>[p.actor,p.index,p.cell,p.pose]),[[patrons[0].id,0,0,63],[patrons[1].id,1,0,65]]);
  assert.deepEqual(calls,[3,2,3,2]);
});
test('native actor initialization does not consume RNG for invented walking appearances, including partial cinema pools',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);tower.build('floor',1,40,160);tower.build('floor',2,40,160);
  tower.build('office',1,40);tower.build('cinema',2,65);
  const seedBefore=tower.state.seed;
  tower.finishConstruction();assert.equal(tower.state.seed,seedBefore,'office completion and six actor initializations have no native RNG');
  syncActors(tower);assert.equal(tower.state.seed,seedBefore);
  tower.finishConstruction();const cinema=tower.state.rooms.find(r=>r.key==='cinema'),seedAfterNativeTitle=tower.state.seed;
  assert.equal(cinema.movie.pendingTitle,false);
  syncActors(tower);assert.equal(tower.state.actors.filter(a=>a.room===cinema.id).length,56);assert.equal(tower.state.seed,seedAfterNativeTitle,'56 initialized movie patrons add no appearance RNG beyond actual title selection');
  for(const actor of tower.state.actors){const home=tower.state.rooms.find(r=>r.id===actor.room);assert.equal(actor.appearance,nativePersonKind(actor,home)%5);}
});
test('actual condo and twin actor sleep dirty the room only when the native whole-facade sleep condition holds',()=>{
  for(const key of ['condo','twin']){
    const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);tower.build('floor',1,40,160);tower.build(key,1,40);
    while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
    const home=tower.state.rooms[0],actors=tower.state.actors.filter(a=>a.room===home.id);home.occupied=true;home.accepting=true;
    if(key==='condo')home.tenantState=3;else home.hotelState=2;
    for(const actor of actors)Object.assign(actor,{state:4,trip:null});
    const record=home.nativeInteriors[0];record.dirty=0;
    for(const [index,actor] of actors.entries()){
      tower.state.tick=2416+actor.slot%16;updateActors(tower);assert.equal(actor.state,16);
      assert.equal(record.dirty,index===actors.length-1?1:0);
    }
    assert.equal(key==='condo'?home.tenantState:home.hotelState,16);
  }
});
test('food threshold dirty writes survive repeated facade bytes while ordinary occupancy changes do not dirty',()=>{
  const food={...room,key:'fastfood',width:16},record={state:1,inside:0,visitors:0};
  let result=admitCommercialVisit(record,true,food);assert.equal(result.record.state,1);assert.equal(food.nativeInteriors[0].dirty,1);
  food.nativeInteriors[0].dirty=0;result=admitCommercialVisit(result.record,true,food);assert.equal(result.record.inside,2);assert.equal(food.nativeInteriors[0].dirty,0);
  leaveCommercialVisit({...result.record,inside:10},food);assert.equal(food.nativeInteriors[0].dirty,1);
  food.nativeInteriors[0].dirty=0;leaveCommercialVisit({...result.record,inside:9},food);assert.equal(food.nativeInteriors[0].dirty,0);
});
