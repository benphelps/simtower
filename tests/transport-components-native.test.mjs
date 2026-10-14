import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeStairComponents,nativeTransportComponents,nativeTransferFloor} from '../src/original-transport-components.js';
const shaft=(id,key,x,stops)=>({id,key,x,width:key==='express'?6:4,stops});
test('native lobby masks use inclusive overlap, distinct service memberships and first transfer direction',()=>{
  const state={floors:{0:{x:0,width:10,lobby:true},14:{x:0,width:10,lobby:true}},links:[],shafts:[shaft(1,'elevator',0,[0,1,14]),shaft(2,'elevator',10,[14,20]),shaft(3,'service',5,[14,20])]};
  const c=nativeTransportComponents(state);assert.equal(c.groups[1].mask,0xe0000000);assert.equal(c.maps.get(0).floors.get(20),0x40000000);assert.equal(c.maps.get(2).floors.get(1),0);assert.equal(nativeTransferFloor(c,0,1,20),14);
});
test('native per-floor maps encode a one-based lobby sentinel only at served group floors',()=>{
  const c=nativeTransportComponents({floors:{0:{x:0,width:20,lobby:true},14:{x:0,width:20,lobby:true}},links:[],shafts:[shaft(1,'elevator',0,[0,14]),shaft(2,'elevator',5,[14,20])]});
  assert.equal(c.maps.get(0).floors.get(0),1);assert.equal(c.maps.get(0).floors.get(14),2);assert.equal(c.maps.get(0).floors.get(20),0x40000000);assert.equal(c.maps.get(1).floors.get(0),0x80000000);
});
test('native eight anchor components include tall links and stop at missing or ordinary-only boundaries',()=>{
  const state={links:[{floor:2,span:2,key:'stairs'},{floor:3,key:'stairs'},{floor:4,key:'stairs'},...Array.from({length:6},(_,i)=>({floor:15+i,key:'escalator'}))]};
  assert.deepEqual(nativeStairComponents(state).map(c=>[c.low,c.high]),[[0,3],[14,20]]);state.links[5].key='stairs';assert.deepEqual(nativeStairComponents(state).map(c=>[c.low,c.high]),[[0,3],[14,17]]);
});
