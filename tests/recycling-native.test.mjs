import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { recyclingPlacementAllowed, processRecycling, collectRecycling, finishRecyclingCollection,
  recyclingSprites, validateRecyclingRoom } from '../src/original-recycling.js';
function scene() {return {star:3,garbage:{working:false,stage:0},rooms:[{id:1,key:'recycling',floor:-2,x:30,width:25,garbageStage:0,garbageLowerStage:0}]};}
test('recycling centers form native adjacent cluster, including two-level vertical neighbors',()=>{
  assert.equal(recyclingPlacementAllowed([],-5,50),true);
  const {rooms}=scene();
  for(const [floor,x,allowed] of [[-2,55,true],[-2,56,false],[-4,30,true],[-5,30,false],[-4,55,true],[-1,5,true],[-1,4,false]])assert.equal(recyclingPlacementAllowed(rooms,floor,x),allowed);
});
test('processing completion depends only on population per center;2500overflows and frozenstate5 survives reset',()=>{
  const state=scene();processRecycling(state,2499,5);assert.equal(state.garbage.working,true);assert.equal(state.rooms[0].garbageStage,5);
  const notices=[];processRecycling(state,2500,5,{notice:n=>notices.push(n)});assert.equal(state.garbage.working,false);assert.deepEqual(notices,[4]);
  processRecycling(state,2500,0);assert.equal(state.rooms[0].garbageStage,5);assert.equal(state.rooms[0].garbageLowerStage,5);
  processRecycling(state,499,1);assert.equal(state.garbage.working,true);assert.equal(state.rooms[0].garbageStage,1);
});
test('missing center sends native notice3 and cannot satisfy recycling promotion flag',()=>{
  const state=scene();state.rooms=[];const notices=[];
  processRecycling(state,1,2,{notice:n=>notices.push(n)});assert.equal(state.garbage.working,false);assert.deepEqual(notices,[3]);
});
test('native dawn collection clears upper stage, empties lowerstage6 until tick32 and plays original truck sample',()=>{
  const state=scene(),sounds=[];processRecycling(state,1500,4);
  assert.equal(collectRecycling(state,{sound:(...args)=>sounds.push(args)}),true);
  assert.equal(state.rooms[0].garbageStage,0);assert.equal(state.rooms[0].garbageLowerStage,6);assert.deepEqual(sounds,[[2280,'Background']]);
  assert.deepEqual(recyclingSprites(state.rooms[0]).map(s=>[s.sheet,s.height]),[[2280,24],[2350,36]]);
  finishRecyclingCollection(state);assert.equal(state.rooms[0].garbageLowerStage,0);assert.equal(collectRecycling(state),false);
});
test('overflowing center is not collected and keeps original piled-refuse artwork',()=>{
  const state=scene();processRecycling(state,2500,5);assert.equal(collectRecycling(state),false);
  assert.deepEqual(recyclingSprites(state.rooms[0]).map(s=>s.sheet),[2285,2349]);
});
test('malformed recycling saves reject nonexistent upperstate6 but allow loweremptying6',()=>{
  const room=scene().rooms[0];room.garbageLowerStage=6;validateRecyclingRoom(room);
  room.garbageStage=6;assert.throws(()=>validateRecyclingRoom(room),/Invalid recycling/);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function recyclingTower() {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  for(let floor=-1;floor>=-5;floor--)tower.build('floor',floor,10,109);
  assert.equal(tower.build('recycling',-2,20).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();tower.state.star=3;
  while(tower.state.dialogs.length)tower.answerEmergency(tower.state.dialogs[0].id,1);
  return {tower,room:tower.state.rooms.find(r=>r.key==='recycling')};
}
test('Tower recycling adjacency rejects disconnected placement atomically and has no elevator processing gate',()=>{
  const {tower,room}=recyclingTower(),saved=tower.save();assert.match(tower.build('recycling',-2,80).error,/adjacent/);assert.equal(tower.save(),saved);
  assert.equal(tower.build('recycling',-4,20).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();Object.defineProperty(tower,'population',{get:()=>3000});tower.updateGarbage(4);
  assert.equal(tower.state.shafts.length,0);assert.equal(tower.state.garbage.working,true);assert.equal(room.garbageStage,4);
});
test('Tower dawn collection preserves loweremptying for32ticks and validates stage saves atomically',()=>{
  const {tower,room}=recyclingTower();Object.defineProperty(tower,'population',{get:()=>1500});tower.updateGarbage(4);
  tower.state.tick=2599;tower.step();assert.equal(room.garbageStage,0);assert.equal(room.garbageLowerStage,6);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  tower.step(31);assert.equal(room.garbageLowerStage,6);tower.step();assert.equal(room.garbageLowerStage,0);
  const bad=JSON.parse(saved);bad.rooms.find(r=>r.id===room.id).garbageStage=6;
  assert.throws(()=>copy.load(JSON.stringify(bad)),/Invalid recycling/);assert.equal(copy.save(),saved);
});
