import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors, finishActorTrip } from '../src/original-people.js';
import { METRO_ACTORS, metroEntrance, metroArrivalDue, updateMetroActor, finishMetroActorTrip,
  metroTrainTick, metroSprites } from '../src/original-metro.js';
function scene() {
  const room={id:1,key:'metro',floor:-3,x:20,width:30};
  const actor={room:1,state:1,trip:null,floor:room.floor};
  const venue={id:2,key:'fastfood',floor:2,commercial:{state:0,inside:0,visitors:0}};
  const state={rooms:[room,venue],tick:256};
  return {room,actor,venue,state,tower:{state,data:{visits:{fastfood:60}},randomInt:()=>0}};
}
test('metro has240persistent shoppers and arrivals obey native1/36daytime bound',()=>{
  assert.equal(METRO_ACTORS,240);
  for(const tick of [0,240,1600,2000])assert.equal(metroArrivalDue(tick,()=>0),false);
  assert.equal(metroArrivalDue(241,()=>0),true);assert.equal(metroArrivalDue(241,()=>1),false);
});
test('metro rejects a negative signed food selector before registering an offsite trip',()=>{
  const {tower,actor,room,venue}=scene();venue.commercialSlot=-128;
  updateMetroActor(tower,actor,room,()=>assert.fail('457BD skips routing a negative selector'),()=>venue);
  assert.equal(actor.state,39);assert.equal(actor.trip,null);
});
test('metro selects ground list commercial venue and enters from upper station floor',()=>{
  const {room,actor,venue,tower}=scene(),calls=[];
  updateMetroActor(tower,actor,room,(...args)=>calls.push(args.slice(3)),(t,floor,key)=>{assert.equal(floor,0);assert.equal(key,'fastfood');return venue;});
  assert.equal(metroEntrance(room),-3);assert.deepEqual(calls,[[-3,2,'metro-arrival']]);assert.equal(actor.job,2);
});
test('full metro destination waits, completed visit returns to station and permits another visit',()=>{
  const {room,actor,venue,tower,state}=scene();actor.job=2;venue.commercial.inside=40;
  finishMetroActorTrip(tower,actor,room,true,'metro-arrival',{to:2});assert.equal(actor.state,65);
  venue.commercial.inside=39;updateMetroActor(tower,actor,room,()=>assert.fail(),()=>null);assert.equal(actor.state,34);
  const calls=[];state.tick+=59;updateMetroActor(tower,actor,room,()=>assert.fail(),()=>null);
  state.tick++;updateMetroActor(tower,actor,room,(...args)=>calls.push(args.slice(3)),()=>null);
  assert.deepEqual(calls,[[2,-3,'metro-return']]);assert.equal(venue.commercial.inside,39);
  finishMetroActorTrip(tower,actor,room,true,'metro-return',{to:-3});assert.equal(actor.state,1);
});
test('missing/closed selection or failed initial metro route waits until native late-night reset',()=>{
  const {room,actor,venue,tower,state}=scene();venue.commercial.state=3;
  updateMetroActor(tower,actor,room,()=>assert.fail(),()=>venue);assert.equal(actor.state,39);
  state.tick=2300;updateMetroActor(tower,actor,room,()=>assert.fail(),()=>venue);assert.equal(actor.state,39);
  state.tick=2301;updateMetroActor(tower,actor,room,()=>assert.fail(),()=>venue);assert.equal(actor.state,1);
  finishMetroActorTrip(tower,actor,room,false,'metro-arrival');assert.equal(actor.state,39);
});
test('original train toggles only daytime outside emergencies and uses frame2second assetbank',()=>{
  const {state,room}=scene(),sounds=[];
  assert.equal(metroTrainTick(state,()=>0,{sound:(...args)=>sounds.push(args)}),true);assert.equal(room.metroTrain,true);
  assert.deepEqual(sounds,[[10010,'Background']]);assert.deepEqual(metroSprites(room).map(s=>[s.sheet,s.sx,s.height]),[[2985,0,24],[3049,0,36],[3113,0,36]]);
  state.emergency={kind:'fire',stage:'burning'};assert.equal(metroTrainTick(state,()=>0),false);assert.equal(room.metroTrain,true);
  state.emergency=null;metroTrainTick(state,()=>0);assert.equal(room.metroTrain,false);assert.equal(metroSprites(room)[0].sheet,2984);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function metroTower() {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  for(let floor=-1;floor>=-5;floor--)tower.build('floor',floor,10,109);
  for(let floor=1;floor<=2;floor++)tower.build('floor',floor,10,109);
  assert.equal(tower.build('elevator',-3,40,40,2).ok,true);assert.equal(tower.build('metro',-3,50).ok,true);
  assert.equal(tower.build('fastfood',2,50).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);tower.openBusinesses(false);
  while(tower.state.dialogs.length)tower.answerEmergency(tower.state.dialogs[0].id,1);
  return {tower,room:tower.state.rooms.find(r=>r.key==='metro'),venue:tower.state.rooms.find(r=>r.key==='fastfood')};
}
test('Tower metro240identities route from upper station floor and return for a repeat visit',()=>{
  const {tower,room,venue}=metroTower(),actors=tower.state.actors.filter(a=>a.room===room.id);assert.equal(actors.length,240);
  const actor=actors[0];tower.randomInt=()=>0;tower.state.tick=256+actor.slot%16;updateActors(tower);
  const trip=tower.state.people.find(p=>p.id===actor.trip);assert.equal(actor.state,65);assert.equal(trip.floor,room.floor);assert.equal(trip.to,venue.floor);assert.equal(trip.destX,venue.x+venue.width/2);
  trip.stage='done';finishActorTrip(tower,actor,room,trip,true,'metro-arrival');assert.equal(actor.state,34);assert.equal(venue.commercial.inside,1);
  tower.state.tick+=64;updateActors(tower);const back=tower.state.people.find(p=>p.id===actor.trip);
  assert.equal(back.purpose,'metro-return');assert.equal(back.to,room.floor);assert.equal(back.destX,room.x+room.width/2);
  back.stage='done';finishActorTrip(tower,actor,room,back,true,'metro-return');assert.equal(actor.state,1);assert.equal(venue.commercial.inside,0);
});
test('Tower metro train uses original secondbank art and invalid pool identities reject save atomically',()=>{
  const {tower,room}=metroTower();tower.randomInt=()=>0;tower.state.tick=255;tower.step();assert.equal(room.metroTrain,true);
  assert.equal(metroSprites(room)[0].sheet,2985);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  const bad=JSON.parse(saved);bad.actors.find(a=>a.room===room.id).resident=240;
  assert.throws(()=>copy.load(JSON.stringify(bad)),/Invalid metro actor/);assert.equal(copy.save(),saved);
});
