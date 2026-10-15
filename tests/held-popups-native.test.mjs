import test from 'node:test';import assert from 'node:assert/strict';
import {nativeToolbarPopupRect,nativeDeparturePopupRect,nativeDeparturePopupChoice,nativeClippedPopupPoint} from '../src/original-held-popups.js';
import {nativePopupChoice} from '../src/original-window-controls.js';
test('held toolbar choices overlay the selected icon and clamp the native32px column to the desktop',()=>{
  assert.deepEqual(nativeToolbarPopupRect({left:135,top:200},2,4,720),{left:135,top:136,width:32,height:128});
  assert.equal(nativeToolbarPopupRect({left:135,top:20},2,4,720).top,0);
  assert.equal(nativeToolbarPopupRect({left:135,top:690},0,4,720).top,592);
});
test('BF82 held construction pointer confinement chooses edge rows when browser coordinates leave the popup',()=>{
  const choose=point=>nativePopupChoice(nativeClippedPopupPoint(point,32,128),32,32,4);
  assert.equal(choose({x:-400,y:-20}),0);
  assert.equal(choose({x:400,y:500}),3);
  assert.equal(choose({x:-1,y:65}),2,'horizontal escape retains the current vertical selection');
  assert.equal(choose({x:32,y:32}),1);
  assert.deepEqual(nativeClippedPopupPoint({x:32,y:128},32,128),{x:31,y:127},'right and bottom never escape the native exclusive bounds');
  assert.deepEqual(nativeClippedPopupPoint({x:4.9,y:63.9},32,128),{x:4,y:63});
});
test('departure popup aligns existing row and uses native67px bitmap fractional hit bands',()=>{
  assert.deepEqual(nativeDeparturePopupRect({left:50,top:150},2),{left:50,top:106,width:82,height:67});
  for(const [y,expected] of [[0,0],[22,0],[23,1],[45,1],[46,2],[67,2]])assert.equal(nativeDeparturePopupChoice({x:82,y},1),expected);
  for(const point of [{x:-1,y:30},{x:83,y:30},{x:40,y:-1},{x:40,y:68}])assert.equal(nativeDeparturePopupChoice(point,2),2);
});
test('143CB departure confinement retains native fractional row bands while outside browser movement reaches edge choices',()=>{
  const choose=point=>nativeDeparturePopupChoice(nativeClippedPopupPoint(point,82,67),1);
  assert.equal(choose({x:-100,y:-100}),0);
  assert.equal(choose({x:500,y:500}),2);
  assert.equal(choose({x:-100,y:45}),1);
  assert.equal(choose({x:500,y:46}),2);
  assert.deepEqual(nativeClippedPopupPoint({x:82,y:67},82,67),{x:81,y:66});
});
