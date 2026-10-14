import {transportComponentsFor,retainPreviewTransportComponents} from '../src/original-transport-components.js';
import {nativeBoardingDestination} from '../src/original-transport-choice.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElevatorPreview,restoreElevatorPreview,ELEVATOR_PREVIEW_TILE,nativePreviewQueueStress } from '../src/original-elevator-preview.js';
import { newElevatorPrograms } from '../src/original-systems.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
test('preview blanks facility bodies with the original fourth bitmap1000 column',()=>{
  assert.deepEqual(ELEVATOR_PREVIEW_TILE,{sheet:1000,sx:24,sy:0,width:8,height:36});
});
function state(tick=2500){return {
  star:1,tick,calendarDay:2,cash:2000000,seed:17,lobbyHeight:1,
  floors:{0:{x:0,width:80,lobby:true},1:{x:0,width:80},2:{x:0,width:80}},
  rooms:[{id:3,key:'office',floor:2,x:10,width:9,occupied:true}],links:[],actors:[{id:11,slot:37,room:3,delay:10,trips:1}],
  people:[{id:10,actor:11,room:3,stage:'queue',floor:2,x:29,wait:0,tripDelay:0,queueTick:tick,queueOrder:0,path:[{id:1,kind:'elevator',from:2,to:0}]}],
  shafts:[{id:1,key:'elevator',x:30,width:4,low:0,high:2,stops:[0,1,2],visible:true,programs:newElevatorPrograms(),calls:{},cars:[{id:2,floor:0,target:0,parkingFloor:0,doors:0,people:[]}]},
    {id:8,key:'elevator',x:40,width:4,low:0,high:2,stops:[0,1,2],visible:true,programs:newElevatorPrograms(),calls:{},cars:[{id:9,floor:2,target:0,parkingFloor:0,doors:0,people:[]}]}],
};}
test('Simulate predicts selected existing queues while preserving clock, economics, actors and all original shaft state',()=>{
  const s=state(),before=structuredClone(s),preview=createElevatorPreview(data,s,1);
  assert.deepEqual(s,before);assert.equal(preview.horizon,300);
  assert.deepEqual(preview.displayState.shafts,[before.shafts[0]]);
  assert.equal(preview.displayState.tick,2500);assert.equal(preview.displayState.calendarDay,2);
  assert.equal(preview.displayState.people[0].stage,'queue');assert.equal(preview.displayState.people[0].floor,2);
  assert.ok(preview.stressByPerson[10]>0&&preview.stressByPerson[10]<150);
  assert.equal(preview.displayState.people[0].tripDelay,preview.stressByPerson[10]);
  assert.equal(preview.displayState.people[0].queueTick,2500);
});
test('unserved Simulate entries retain the global actor index low WORD rather than horizon saturation',()=>{
  const s=state();s.shafts[0].cars=[];s.actors[0].slot=32769;
  const before=structuredClone(s),preview=createElevatorPreview(data,s,1);
  assert.equal(preview.stressByPerson[10],-32767);assert.deepEqual(s,before);
});
test('Simulate popped queue stress forgives elapsed separately, has no300 cap and accepts timestamp zero',()=>{
  assert.equal(nativePreviewQueueStress({floor:0,queueTick:0,tripDelay:200},null,{tick:30,lobbyHeight:3,floors:{}}),200);
  assert.equal(nativePreviewQueueStress({floor:2,queueTick:0,tripDelay:250},null,{tick:100,lobbyHeight:1,floors:{}}),350);
  assert.equal(nativePreviewQueueStress({floor:2,queueTick:2500,tripDelay:512},null,{tick:0,lobbyHeight:1,floors:{}}),-1988);
});
test('preview uses rating-specific horizon and frozen current phase even when warm-up passes the day boundary',()=>{
  const s=state(2599);s.star=4;s.shafts[0].programs[1][6].wait=3;
  const preview=createElevatorPreview(data,s,1);
  assert.equal(preview.horizon,400);assert.equal(preview.displayState.tick,2599);
  assert.equal(preview.displayState.shafts[0].programs[1][6].wait,3);
  assert.equal(createElevatorPreview(data,s,99),null);
});
test('Resume restores original dispatch but retains program and Show edits made during preview',()=>{
  const s=state(),before=structuredClone(s),preview=createElevatorPreview(data,s,1),edited=preview.displayState.shafts[0];
  edited.programs[0][2]={response:70,wait:2,departure:1};edited.visible=false;
  edited.cars[0].floor=2;edited.cars[0].people=[10];edited.stops=[0];edited.calls={'2:0':2};
  const restored=restoreElevatorPreview(s,preview);
  assert.deepEqual(restored.cars,before.shafts[0].cars);assert.deepEqual(restored.calls,before.shafts[0].calls);
  assert.deepEqual(restored.stops,[0,1,2]);assert.equal(restored.visible,false);
  assert.deepEqual(restored.programs[0][2],{response:70,wait:2,departure:1});
  assert.deepEqual(s.people,before.people);assert.deepEqual(s.actors,before.actors);
  assert.deepEqual(s.shafts[1],before.shafts[1]);assert.equal(s.cash,before.cash);
});

test('isolated Simulate preserves original C2 transfer reach after other shaft active bytes are disabled',()=>{
  const s=state();s.rooms[0].floor=20;s.floors[14]={x:0,width:80,lobby:true};s.floors[20]={x:0,width:80};
  Object.assign(s.shafts[0],{high:14,stops:[0,2,14]});Object.assign(s.shafts[0].cars[0],{floor:2,target:2,parkingFloor:2});
  Object.assign(s.shafts[1],{low:14,high:20,stops:[14,20]});Object.assign(s.shafts[1].cars[0],{floor:14,target:14,parkingFloor:14});
  const p=s.people[0];p.to=20;p.path=[{id:1,kind:'elevator',from:2,to:14},{id:8,kind:'elevator',from:14,to:20}];
  const before=structuredClone(s),preview=createElevatorPreview(data,s,1);
  assert.deepEqual(s,before);assert.equal(preview.displayState.shafts.length,1);assert.ok(preview.stressByPerson[p.id]<100,'valid original lobby transfer must board, not retry until forecast saturation');
  const isolated=structuredClone(s);const components=retainPreviewTransportComponents(isolated);isolated.shafts=[isolated.shafts[0]];
  assert.equal(transportComponentsFor(isolated),components);assert.equal(nativeBoardingDestination(isolated,isolated.shafts[0],2,20,1),14);
  const unpinned=structuredClone(isolated);assert.equal(nativeBoardingDestination(unpinned,unpinned.shafts[0],2,20,1),null);
});
