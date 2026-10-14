import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {price} from '../src/catalog.js';
import {newNativeShaftSlotTypes,loadedNativeShaftSlotTypes,nativeShaftCollisionRect,nativeShaftTransportCollision} from '../src/original-shaft-placement.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building(high=6,options={}) {
  const t=new Tower(data,{sandbox:true,...options});t.build('lobby',0,0,199);
  for(let floor=1;floor<=high;floor++)t.build('floor',floor,0,199);
  for(let floor=-1;floor>=-3;floor--)t.build('floor',floor,0,199);
  return t;
}
test('15988 uses half-open cell/floor rectangles and distinguishes padded shaft checks from unpadded link checks',()=>{
  assert.deepEqual(nativeShaftCollisionRect({x:60,low:0,high:3},1,8),{left:52,top:-2,right:72,bottom:4});
  assert.deepEqual(nativeShaftCollisionRect({x:60,low:0,high:3},0),{left:60,top:-2,right:66,bottom:4});
  const state={shafts:[{id:1,key:'elevator',nativeTransportSlot:3,x:60,low:0,high:3,visible:false,stops:[0]}],links:[]};
  assert.equal(nativeShaftTransportCollision(state,{x:72,low:0,high:3,type:0,slot:0}),null);
  assert.deepEqual(nativeShaftTransportCollision(state,{x:71,low:0,high:3,type:0,slot:0}),{kind:'shaft',id:1,slot:3});
  assert.equal(nativeShaftTransportCollision(state,{x:60,low:0,high:40,type:1,slot:3}),null,'the active edited slot excludes itself');
});
test('new physical slots use their zero type before the chosen tool is written, including asymmetric left/right spacing',()=>{
  for(const key of ['elevator','service','express']) {
    const t=building();t.build('elevator',0,60,60,3);
    const before=t.save();
    assert.match(t.build(key,0,47,47,3).error,/transportation/);assert.equal(t.save(),before);
    assert.match(t.build(key,0,71,71,3).error,/transportation/);assert.equal(t.save(),before);
    assert.equal(t.plan(key,0,46,46,3).error,undefined,'fresh width6 +8 cells ends exactly at existing left60');
    assert.equal(t.plan(key,0,72,72,3).error,undefined,'left padding8 exactly touches existing right64');
    assert.equal(t.build(key,0,46,46,3).ok,true);
    assert.equal(t.state.nativeShaftSlotTypes[1],key==='express'?0:key==='service'?2:1);
  }
});
test('shaft bodies that do not touch still collide through end machinery; edge touching and inactive stops remain native',()=>{
  const t=building(10);t.build('elevator',0,60);
  const before=t.save();for(const floor of [-2,2]){assert.match(t.build('service',floor,60).error,/transportation/);assert.equal(t.save(),before);}
  assert.equal(t.plan('service',-3,60).error,undefined);assert.equal(t.build('service',3,60,60,6).ok,true);
  const top=t.state.shafts[1];top.visible=false;top.stops=[6];
  const hidden=t.save();assert.match(t.resizeShaft(t.state.shafts[0].id,0,1).error,/transportation/);assert.equal(t.save(),hidden);
  assert.equal(t.resizeShaft(t.state.shafts[0].id,0,0).ok,true);
});
test('15988 protects both stair landing floors with shaft machinery but adds no horizontal queue gap against links',()=>{
  for(const key of ['stairs','escalator']) {
    const t=building();t.build(key,3,60);const before=t.save();
    for(const floor of [1,2,3,4]){assert.match(t.build('elevator',floor,60).error,/transportation/);assert.equal(t.save(),before);}
    for(const floor of [0,5])assert.equal(t.plan('elevator',floor,60).error,undefined);
    assert.equal(t.plan('elevator',2,54).error,undefined,'fresh slot width6 only touches link left60');
    assert.match(t.plan('elevator',2,55).error,/transportation/);
    assert.equal(t.plan('elevator',2,68).error,undefined,'no extra padding after link right68');
    assert.equal(t.save(),before);
  }
});
test('standard/service tombstone types survive deletion, save/load and New while express replacements use the previous width',()=>{
  for(const key of ['elevator','service']) {
    const t=building();t.build(key,0,20,20,3);t.build('elevator',0,60,60,3);
    assert.equal(t.demolish(1,20).ok,true);const oldType=key==='service'?2:1;
    assert.equal(t.state.nativeShaftSlotTypes[0],oldType);
    const restored=new Tower(data);restored.load(t.save());assert.equal(restored.state.nativeShaftSlotTypes[0],oldType);
    const before=restored.save();assert.equal(restored.plan('express',0,48,48,3).error,undefined);assert.equal(restored.save(),before);
    assert.equal(restored.build('express',0,48,48,3).ok,true);
    assert.equal(restored.state.shafts.at(-1).nativeTransportSlot,0);assert.equal(restored.state.shafts.at(-1).width,6);
    assert.equal(restored.state.nativeShaftSlotTypes[0],0);
    const fresh=building(6,{shaftSlotTypes:t.state.nativeShaftSlotTypes});
    assert.equal(fresh.state.nativeShaftSlotTypes[0],oldType);assert.notEqual(fresh.state.nativeShaftSlotTypes,t.state.nativeShaftSlotTypes);
    fresh.build('elevator',0,60,60,3);assert.equal(fresh.plan('express',0,48,48,3).error,undefined);
  }
});
test('legacy slot-type migration infers active slots and leaves unknown inactive slots zero',()=>{
  const t=building();t.build('service',0,20,20,3);t.build('elevator',0,60,60,3);t.demolish(1,20);
  const legacy=JSON.parse(t.save());delete legacy.nativeShaftSlotTypes;
  const restored=new Tower(data);restored.load(JSON.stringify(legacy));
  assert.equal(restored.state.nativeShaftSlotTypes[0],0);assert.equal(restored.state.nativeShaftSlotTypes[1],1);
  assert.match(restored.plan('express',0,48,48,3).error,/transportation/,'old browser saves cannot recover deleted slot types');
  const types=loadedNativeShaftSlotTypes({shafts:[{key:'service',nativeTransportSlot:7},{key:'express',nativeTransportSlot:2}]});
  assert.equal(types[7],2);assert.equal(types[2],0);assert.equal(types.length,24);
});
test('invalid slot headers and active-type mismatches reject loading without mutating the current tower',()=>{
  const t=building();t.build('elevator',0,60,60,3);const before=t.save();
  for(const types of [[],Array(23).fill(0),Array(24).fill(3),Array(24).fill(.5),Array(24).fill('0'),Array(24).fill(0)]) {
    const bad=JSON.parse(before);bad.nativeShaftSlotTypes=types;
    assert.throws(()=>t.load(JSON.stringify(bad)),/slot type/);assert.equal(t.save(),before);
  }
  assert.throws(()=>newNativeShaftSlotTypes(Array(25).fill(0)),/slot types/);
  assert.throws(()=>newNativeShaftSlotTypes(Array(24)),/slot types/);
});
test('15141 checks the raw requested extension for collisions before the 30-floor cap',()=>{
  const t=building(40);t.build('elevator',0,60,60,1);t.build('service',32,60,60,35);
  const shaft=t.state.shafts[0],before=t.save();
  assert.equal(t.resizeShaft(shaft.id,0,29,false).error,undefined,'the capped end alone would fit');
  assert.match(t.resizeShaft(shaft.id,0,40,false).error,/transportation/);assert.equal(t.save(),before);
  assert.match(t.resizeShaft(shaft.id,0,40).error,/transportation/);assert.equal(t.save(),before);
});
test('2CB62 preflights uncapped structural cost, then successful extension charges only capped structure',()=>{
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,40,100);t.build('elevator',0,60);
  const shaft=t.state.shafts[0],rawCost=40*4*price(data,'floor'),cappedCost=29*4*price(data,'floor');
  t.state.sandbox=false;t.state.cash=cappedCost;let before=t.save();
  assert.match(t.resizeShaft(shaft.id,0,40).error,/Not enough money/);assert.equal(t.save(),before);
  t.state.cash=rawCost;before=t.save();const p=t.resizeShaft(shaft.id,0,40,false);
  assert.equal(p.capped,true);assert.equal(p.high,29);assert.equal(p.cost,cappedCost);assert.equal(t.save(),before);
  assert.equal(t.resizeShaft(shaft.id,0,40).ok,true);assert.equal(shaft.high,29);assert.equal(t.state.cash,rawCost-cappedCost);
  assert.equal(t.bounds(30),undefined);assert.equal(t.bounds(29).width,4);
});
test('15920 adds a car only for exactly aligned left columns; offset clicks do not bypass spacing',()=>{
  const t=building();t.build('elevator',0,60,60,3);const shaft=t.state.shafts[0],before=t.save();
  for(const x of [59,61,62,63]){assert.match(t.build('elevator',1,x).error,/transportation/);assert.equal(t.save(),before);}
  assert.equal(t.build('elevator',1,60).cost,80000);assert.equal(shaft.cars.length,2);assert.equal(shaft.cars[1].parkingFloor,1);
});
