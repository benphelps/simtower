import test from 'node:test';import assert from 'node:assert/strict';
import {chooseNativeTransport,nativeTransportRoute} from '../src/original-transport-choice.js';
const world=(height=30)=>({floors:Object.fromEntries(Array.from({length:height+1},(_,i)=>[i,{x:0,width:200,lobby:i===0}])),shafts:[],links:[],people:[]});
const lift=(s,id,low,high,x,key='elevator')=>{const sh={id,key,low,high,x,width:4,stops:Array.from({length:high-low+1},(_,i)=>low+i)};s.shafts.push(sh);return sh;};
test('native first chooser picks nearby escalator before even a direct express queue of zero',()=>{
 const s=world();s.links.push({id:1,key:'escalator',floor:1,x:20,width:8});lift(s,2,0,1,100,'express');
 assert.equal(chooseNativeTransport(s,0,1,false,20).edge.id,1);
 s.links[0].x=100;assert.equal(chooseNativeTransport(s,0,1,false,20).edge.id,2);
});
test('native service chooser permits ordinary stairs but rejects escalators and passenger lifts',()=>{
 const s=world();s.links.push({id:1,key:'stairs',floor:1,x:20,width:8});lift(s,2,0,1,20,'elevator');
 assert.equal(chooseNativeTransport(s,0,1,true,20).edge.id,1);
 s.links[0].key='escalator';assert.equal(chooseNativeTransport(s,0,1,true,20),null);
 lift(s,3,0,1,80,'service');assert.equal(chooseNativeTransport(s,0,1,true,20).edge.id,3);
});
test('native ordinary and lift ties use strict first-slot comparison, not complete path score',()=>{
 const s=world();s.links.push({id:1,key:'stairs',floor:1,x:20,width:8});lift(s,2,0,1,20);
 assert.equal(chooseNativeTransport(s,0,1,false,20).edge.id,1);
 s.links=[];lift(s,3,0,1,20);s.shafts[0].nativeTransportSlot=8;s.shafts[1].nativeTransportSlot=2;
 assert.equal(chooseNativeTransport(s,0,1,false,20).edge.id,3);
});
test('native indirect stair component guides a nearby escalator to its transfer lobby',()=>{
 const s=world();s.links.push({id:1,key:'escalator',floor:14,x:20,width:8});s.floors[14].lobby=true;
 lift(s,2,14,29,80);const path=nativeTransportRoute(s,13,29,false,20);
 assert.deepEqual(path.map(e=>[e.kind,e.from,e.to]),[['stairs',13,14],['elevator',14,29]]);
});
test('a current transfer lobby suppresses departing in a local component when all final alternatives are already available there',()=>{
 const s=world();s.floors[14].lobby=true;lift(s,1,0,14,10);lift(s,2,0,20,100);
 const choice=chooseNativeTransport(s,0,20,false,10);assert.equal(choice.edge.id,2);
});

test('native boarding reselects a matching transfer in ring direction while direct destinations can reverse it',async()=>{
 const {nativeBoardingDestination,nativeQueuedTarget}=await import('../src/original-transport-choice.js');
 const s=world(45);s.floors[14].lobby=true;s.floors[29].lobby=true;
 const local=lift(s,1,0,29,10);lift(s,2,14,44,20);
 assert.equal(nativeBoardingDestination(s,local,20,44,1),29);
 assert.equal(nativeBoardingDestination(s,local,20,44,0),14);
 assert.equal(nativeBoardingDestination(s,local,20,0,1),0);
 s.medicalRegistry=[{floor:29}];
 assert.equal(nativeQueuedTarget(s,{medicalSlot:0},{purpose:'clinic-arrival',to:14},{key:'office'}),29);
 assert.equal(nativeQueuedTarget(s,{parkingFloor:0,parking:999},{purpose:'departure',to:-3},{key:'suite'}),0);
});
