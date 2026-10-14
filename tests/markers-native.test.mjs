import test from 'node:test';
import assert from 'node:assert/strict';
import { findPersonTarget, createFindMarker, findMarkerExpired, findMarkerSprite } from '../src/original-markers.js';
function scene() {
  const room={id:1,key:'office',floor:8,x:40,width:9};
  const actor={id:2,room:1,index:2,state:34,job:3,trip:null};
  const venue={id:3,key:'fastfood',floor:2,x:70,width:16};
  return {actor,state:{rooms:[room,venue],people:[],actors:[actor],shafts:[]}};
}
test('Find points at actual clinic/commercial destination instead of home room and reports outside visits',()=>{
  const {actor,state}=scene();assert.deepEqual(findPersonTarget(state,actor),{outside:false,x:78,floor:2});
  actor.state=35;assert.equal(findPersonTarget(state,actor).floor,2);
  actor.job=null;assert.deepEqual(findPersonTarget(state,actor),{outside:true});
  actor.state=32;assert.deepEqual(findPersonTarget(state,actor),{outside:true});
  actor.state=0;assert.deepEqual(findPersonTarget(state,actor),{outside:false,x:44,floor:8});
});
test('Find follows actual car passenger slot and native shaft location',()=>{
  const {actor,state}=scene();actor.trip=4;state.people=[{id:4,actor:2,stage:'car',floor:1,x:55}];
  state.shafts=[{x:50,width:4,cars:[{floor:3.5,people:[4]}]}];
  assert.deepEqual(findPersonTarget(state,actor),{outside:false,x:52,floor:3.5});
});
test('native red arrow uses original16pixel bitmap and expires strictly after300quantized wallclockunits',()=>{
  const marker=createFindMarker({outside:false,x:50,floor:2},32,2);
  assert.deepEqual(findMarkerSprite(marker),{sheet:21256,x:392,y:-108,width:16,height:16,sx:0,sy:0});
  assert.equal(findMarkerExpired(marker,4832),false);assert.equal(findMarkerExpired(marker,4847),false);assert.equal(findMarkerExpired(marker,4848),true);
  assert.equal(createFindMarker({outside:true},0),null);
});
