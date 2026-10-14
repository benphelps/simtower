import test from 'node:test';import assert from 'node:assert/strict';
import {nativeToolbarPopupRect,nativeDeparturePopupRect,nativeDeparturePopupChoice} from '../src/original-held-popups.js';
test('held toolbar choices overlay the selected icon and clamp the native32px column to the desktop',()=>{
  assert.deepEqual(nativeToolbarPopupRect({left:135,top:200},2,4,720),{left:135,top:136,width:32,height:128});
  assert.equal(nativeToolbarPopupRect({left:135,top:20},2,4,720).top,0);
  assert.equal(nativeToolbarPopupRect({left:135,top:690},0,4,720).top,592);
});
test('departure popup aligns existing row and uses native67px bitmap fractional hit bands',()=>{
  assert.deepEqual(nativeDeparturePopupRect({left:50,top:150},2),{left:50,top:106,width:82,height:67});
  for(const [y,expected] of [[0,0],[22,0],[23,1],[45,1],[46,2],[67,2]])assert.equal(nativeDeparturePopupChoice({x:82,y},1),expected);
  for(const point of [{x:-1,y:30},{x:83,y:30},{x:40,y:-1},{x:40,y:68}])assert.equal(nativeDeparturePopupChoice(point,2),2);
});
