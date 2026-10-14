import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors, finishActorTrip } from '../src/original-people.js';
import { CATHEDRAL_VISITORS, cathedralEntrance, resetCathedralDay,
  cathedralActorAction, towerMilestoneReady, finishCathedralTrip,
  closeCathedralWorship, cathedralSprites, validateCathedral,
  advanceCathedralCeremony, cathedralCeremonySprites,OriginalCathedralRenderClock } from '../src/original-cathedral.js';
const thresholds=[300,1000,5000,10000];
function scene() {
  const room={id:1,key:'cathedral',floor:103,height:5,x:40,width:28};
  const state={star:5,tick:250,calendarDay:2,rooms:[room],nativeFlags:{vipPassed:true},
    actors:Array.from({length:CATHEDRAL_VISITORS},(_,index)=>({id:10+index,room:1,state:32,trip:null,floor:0}))};
  return {state,room};
}
test('native cathedral has forty visitors entering its bottom100F level',()=>{
  const {state,room}=scene();assert.equal(state.actors.length,40);assert.equal(cathedralEntrance(room),99);
});
test('weekend congregation arrives after native morning bounds and rejects missed morning',()=>{
  const {state}=scene(),actor=state.actors[0];
  for(const tick of [0,80]){state.tick=tick;assert.equal(cathedralActorAction(state,actor,()=>0),null);}
  state.tick=81;assert.equal(cathedralActorAction(state,actor,()=>0),'worship-arrival');
  assert.equal(cathedralActorAction(state,actor,()=>1),null);
  state.tick=240;assert.equal(cathedralActorAction(state,actor,()=>1),null);
  state.tick=241;assert.equal(cathedralActorAction(state,actor,()=>1),'worship-arrival');
  state.calendarDay=0;assert.equal(cathedralActorAction(state,actor,()=>0),null);
  state.calendarDay=2;state.tick=400;assert.equal(cathedralActorAction(state,actor,()=>0),null);assert.equal(actor.state,39);
});
test('Tower milestone requires exactly forty present,15000population and arrival before tick800',()=>{
  const {state}=scene();for(const actor of state.actors)actor.state=3;
  assert.equal(towerMilestoneReady(state,14999,thresholds),false);
  assert.equal(towerMilestoneReady(state,15000,thresholds),true);
  state.actors[0].state=96;assert.equal(towerMilestoneReady(state,15000,thresholds),false);
  state.actors[0].state=3;state.actors.push({room:1,state:3});assert.equal(towerMilestoneReady(state,15000,thresholds),false);
  state.actors.pop();state.tick=800;assert.equal(towerMilestoneReady(state,15000,thresholds),false);
});
test('fortieth actual arrival promotes Tower and starts original ceremony/dialog/angel sound once',()=>{
  const {state,room}=scene(),log=[];
  const hooks={dialog:id=>log.push(['dialog',id]),sound:id=>log.push(['sound',id]),focus:(...args)=>log.push(['focus',...args])};
  for(const actor of state.actors.slice(0,39))assert.equal(finishCathedralTrip(state,actor,room,'worship-arrival',true,15000,thresholds,hooks),false);
  assert.equal(room.worshipState,3);assert.equal(state.star,5);
  assert.equal(finishCathedralTrip(state,state.actors[39],room,'worship-arrival',true,15000,thresholds,hooks),true);
  assert.equal(state.star,6);assert.equal(state.nativeFlags.vipPassed,false);assert.equal(state.cathedralCeremony,true);assert.equal(room.worshipState,2);
  assert.deepEqual(log,[['dialog',3034],['sound',10008],['focus',101,54]]);
  assert.equal(finishCathedralTrip(state,state.actors[39],room,'worship-arrival',true,15000,thresholds,hooks),false);
  assert.equal(log.length,3);
});
test('native noon close starts departures and dawn resets the congregation',()=>{
  const {state,room}=scene();for(const actor of state.actors)actor.state=3;
  room.worshipState=2;state.cathedralCeremony=true;closeCathedralWorship(state);
  assert.equal(room.worshipState,0);assert.equal(state.cathedralCeremony,false);
  assert.equal(cathedralActorAction(state,state.actors[0],()=>0),'worship-return');
  finishCathedralTrip(state,state.actors[0],room,'worship-return',true,15000,thresholds);
  assert.equal(state.actors[0].state,39);assert.equal(state.actors[0].floor,0);
  const cancelled=[];resetCathedralDay(state,{cancelTrip:actor=>cancelled.push(actor.id)});
  assert.equal(cancelled.length,40);assert.ok(state.actors.every(actor=>actor.state===32&&actor.trip===null));
});
test('cathedral rendering changes base artwork for worship and all five layers for wedding',()=>{
  const {room}=scene();assert.equal(cathedralSprites(room,true)[0].sx,224);
  room.worshipState=3;assert.deepEqual(cathedralSprites(room).map(sprite=>sprite.sheet),[3304,3368,3432,3496,3562]);
  room.worshipState=2;assert.deepEqual(cathedralSprites(room).map(sprite=>sprite.sheet),[3305,3369,3433,3497,3561]);
  assert.equal(cathedralSprites(room).at(-1).y,-3600);
});
test('malformed cathedral save states are rejected',()=>{
  const {state,room}=scene();validateCathedral(state);room.worshipState=4;
  assert.throws(()=>validateCathedral(state),/Invalid cathedral state/);
});

test('original wedding poses approach the altar then advance through the native2088frames',()=>{
  const {state,room}=scene();state.cathedralCeremony=true;state.cathedralCeremonyStep=0;
  let sprites=cathedralCeremonySprites(state,room);
  assert.deepEqual(sprites.map(sprite=>[sprite.x,sprite.sx]),[[320,0],[536,16]]);
  state.tick=16;advanceCathedralCeremony(state);assert.equal(state.cathedralCeremonyStep,1);
  state.tick=17;advanceCathedralCeremony(state);assert.equal(state.cathedralCeremonyStep,1);
  state.tick=32;advanceCathedralCeremony(state,0,false);assert.equal(state.cathedralCeremonyStep,1);
  state.tick=33;advanceCathedralCeremony(state,0,false,true);assert.equal(state.cathedralCeremonyStep,2);
  state.cathedralCeremonyStep=15;sprites=cathedralCeremonySprites(state,room);
  assert.deepEqual(sprites.map(sprite=>[sprite.x,sprite.sx]),[[424,32],[424,32]]);
  state.cathedralCeremonyStep=20;assert.equal(cathedralCeremonySprites(state,room)[0].sx,112);
  closeCathedralWorship(state);assert.equal(cathedralCeremonySprites(state,room).length,0);
});
test('cathedral renderer clock requires visible base40 and preserves paused poses with same-tick repaint dedupe',()=>{
  const {state,room}=scene();state.cathedralCeremony=true;state.cathedralCeremonyStep=0;room.worshipState=2;
  room.nativeTenantSlots=[{type:40,index:5}];const clock=new OriginalCathedralRenderClock();
  const visible={left:0,right:1000,top:-3600,bottom:-3550},roof={...visible,top:-3750,bottom:-3700};
  state.tick=11;assert.equal(clock.update(state,room,roof),false);assert.equal(state.cathedralCeremonyStep,0);
  assert.equal(clock.update(state,room,visible),true);assert.equal(state.cathedralCeremonyStep,1);
  assert.equal(clock.update(state,room,visible),false);assert.equal(clock.update(state,room,visible,{dirty:true}),true);
  assert.equal(state.cathedralCeremonyStep,2,'new native dirty write can repaint within the same tick');
  state.tick=12;assert.equal(clock.update(state,room,visible),false);assert.equal(state.cathedralCeremonyStep,2);
  state.tick=27;assert.equal(clock.update(state,room,roof),false);assert.equal(clock.update(state,room,visible),true);assert.equal(state.cathedralCeremonyStep,3);
  state.elapsedTicks=2600;assert.equal(clock.update(state,room,visible),true);assert.equal(state.cathedralCeremonyStep,4,'same native tick number in a later clock cycle is a fresh cohort');
});
test('native dirty cathedral refresh bypasses People but clean ceremony follows People and cohort gate independently of Effects',()=>{
  const {state,room}=scene();state.cathedralCeremony=true;state.cathedralCeremonyStep=0;room.worshipState=2;
  const viewport={left:0,right:1000,top:-3600,bottom:-3550},clock=new OriginalCathedralRenderClock();state.tick=16;
  assert.equal(clock.update(state,room,viewport,{peopleAnimations:false}),true);assert.equal(state.cathedralCeremonyStep,1);
  state.tick=32;assert.equal(clock.update(state,room,viewport,{peopleAnimations:false}),false);
  assert.equal(clock.update(state,room,viewport,{peopleAnimations:false,dirty:true}),true);assert.equal(state.cathedralCeremonyStep,2);
  state.tick=48;state.effectsEnabled=false;assert.equal(clock.update(state,room,viewport,{peopleAnimations:true}),true);
  state.cathedralCeremony=false;assert.equal(clock.update(state,room,viewport),false);assert.equal(state.cathedralCeremonyStep,3);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function cathedralTower() {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  for(let floor=1;floor<=99;floor++)tower.build('floor',floor,10,109);
  tower.build('lobby',89,10,109);
  assert.equal(tower.build('express',0,40,40,89).ok,true);
  assert.equal(tower.build('elevator',89,54,54,99).ok,true);
  assert.equal(tower.build('cathedral',103,60).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();
  tower.state.star=5;tower.state.calendarDay=2;syncActors(tower);
  return {tower,room:tower.state.rooms.find(room=>room.key==='cathedral')};
}

test('Tower cathedral creates forty identities and routes weekend worship through express/local transfer',()=>{
  const {tower,room}=cathedralTower(),actors=tower.state.actors.filter(actor=>actor.room===room.id);
  assert.equal(actors.length,40);assert.ok(actors.every(actor=>actor.state===32));
  const actor=actors[0];tower.state.tick=256+actor.slot%16;updateActors(tower);
  const trip=tower.state.people.find(person=>person.id===actor.trip);
  assert.equal(trip.purpose,'worship-arrival');assert.equal(trip.to,99);
  assert.equal(trip.destX,room.x+14);
  assert.equal(trip.path.filter(edge=>edge.kind==='elevator').length,2);
});
test('Tower simulation clock no longer advances cathedral wedding poses without a visible native render',()=>{
  const {tower,room}=cathedralTower();tower.state.cathedralCeremony=true;tower.state.cathedralCeremonyStep=0;room.worshipState=2;tower.state.tick=990;
  tower.step(32);assert.equal(tower.state.cathedralCeremonyStep,0);
  const render=new OriginalCathedralRenderClock();render.update(tower.state,room,{left:0,right:1000,top:-3600,bottom:-3550});
  assert.equal(tower.state.cathedralCeremonyStep,1);
});

test('Tower actual fortieth worship arrival sets rating6 and survives deterministic browser save',()=>{
  const {tower,room}=cathedralTower();tower.state.tick=700;
  Object.defineProperty(tower,'population',{get:()=>15000});
  const actors=tower.state.actors.filter(actor=>actor.room===room.id);
  for(const actor of actors)finishActorTrip(tower,actor,room,{to:99,tripDelay:0},true,'worship-arrival');
  assert.equal(tower.state.star,6);assert.equal(tower.state.dialogs.at(-1).id,3034);
  assert.equal(tower.state.cathedralCeremony,true);assert.equal(room.worshipState,2);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  tower.answerEmergency(3034,1);
  tower.state.tick=1199;tower.step();assert.equal(room.worshipState,0);assert.equal(tower.state.cathedralCeremony,false);
  assert.ok(actors.some(actor=>actor.state===5||actor.state===69));
});
