import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeWindowGesture,nativeWindowGestureKey} from '../src/native-window-gesture.js';
const rect={x:204,y:53,width:436,height:427},minimum={width:124,height:214};
test('native Move tracks eight-pixel steps without mutating the committed rectangle',()=>{
  const gesture=nativeWindowGesture(rect);
  nativeWindowGestureKey(gesture,'ArrowRight',minimum);nativeWindowGestureKey(gesture,'ArrowDown',minimum);
  assert.deepEqual(gesture.rect,{...rect,x:212,y:61});assert.deepEqual(gesture.initial,rect);
  assert.equal(rect.x,204);assert.equal(nativeWindowGestureKey(gesture,'Escape',minimum),false);
});
test('Size selects edges and corners before changing dimensions, retaining opposite edges',()=>{
  const gesture=nativeWindowGesture(rect,'size');
  nativeWindowGestureKey(gesture,'ArrowLeft',minimum);assert.equal(gesture.edge,'w');assert.deepEqual(gesture.rect,rect);
  nativeWindowGestureKey(gesture,'ArrowLeft',minimum);assert.deepEqual(gesture.rect,{...rect,x:196,width:444});
  nativeWindowGestureKey(gesture,'ArrowUp',minimum);assert.equal(gesture.edge,'wn');assert.equal(gesture.rect.y,53);
  nativeWindowGestureKey(gesture,'ArrowUp',minimum);assert.deepEqual(gesture.rect,{x:196,y:45,width:444,height:435});
  nativeWindowGestureKey(gesture,'ArrowRight',minimum);assert.deepEqual(gesture.rect,{x:204,y:45,width:436,height:435});
});
test('keyboard sizing honors the native minimum and user-requested unlimited maximum',()=>{
  const gesture=nativeWindowGesture({...rect,width:124,height:214},'size','se');
  nativeWindowGestureKey(gesture,'ArrowLeft',minimum);nativeWindowGestureKey(gesture,'ArrowUp',minimum);
  assert.equal(gesture.rect.width,124);assert.equal(gesture.rect.height,214);
  nativeWindowGestureKey(gesture,'ArrowRight',minimum,1000);assert.equal(gesture.rect.width,1124);
});
