import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeToolbarPointerAction} from '../src/original-toolbar-pointer.js';
import {nativeMenuPointerRelease} from '../src/original-menus.js';
const running={running:true};
test('B8D0 selects ungrouped tools and modes on both mouse-down and mouse-up at the current pointer target',()=>{
  let selected;
  const act=(target,phase)=>{const action=nativeToolbarPointerAction(target,phase,0,running);if(action?.kind==='build')selected=action.key;return action;};
  assert.deepEqual(act({kind:'build',key:'office'},'down'),{kind:'build',key:'office'});
  assert.equal(selected,'office');
  assert.deepEqual(act({kind:'build',key:'condo'},'up'),{kind:'build',key:'condo'});
  assert.equal(selected,'condo','release over another tool follows the release target');
  for(const phase of ['down','up'])assert.deepEqual(nativeToolbarPointerAction({kind:'mode',mode:'finger'},phase,0,running),{kind:'mode',mode:'finger'});
});
test('C818 opens grouped choices only while held; ordinary release selects that group without opening another popup',()=>{
  const target={kind:'build',key:'elevator',group:2};
  assert.deepEqual(nativeToolbarPointerAction(target,'down',0,running),{kind:'popup',key:'elevator'});
  assert.deepEqual(nativeToolbarPointerAction(target,'up',0,running),{kind:'build',key:'elevator'});
  assert.equal(nativeToolbarPointerAction(target,'move',0,running),null);
  assert.equal(nativeToolbarPointerAction(target,'down',2,running),null);
});
test('time presses paint EFFE only; release invokes C674 even if the original press was on another toolbar item',()=>{
  assert.deepEqual(nativeToolbarPointerAction({kind:'time'},'down',0,running),{kind:'press-time'});
  assert.deepEqual(nativeToolbarPointerAction({kind:'time'},'up',0,running),{kind:'toggle-time'});
  assert.deepEqual(nativeToolbarPointerAction({kind:'time'},'up',0,{running:false}),{kind:'toggle-time'});
  for(const target of [{kind:'mode',mode:'inspect'},{kind:'build',key:'office'}])assert.equal(nativeToolbarPointerAction(target,'up',0,{running:false}),null);
  for(const gate of ['preview','scheduleOpen'])assert.equal(nativeToolbarPointerAction({kind:'time'},'up',0,{...running,[gate]:true}),null);
});
test('USER held menu release chooses enabled leaves, keeps disabled/submenus and cancels outside without dispatching a command',()=>{
  assert.equal(nativeMenuPointerRelease({button:0,kind:'command'}),'invoke');
  assert.equal(nativeMenuPointerRelease({button:0,kind:'command',disabled:true}),'keep');
  assert.equal(nativeMenuPointerRelease({button:0,kind:'submenu'}),'submenu');
  assert.equal(nativeMenuPointerRelease({button:0,kind:'name'}),'keep');
  assert.equal(nativeMenuPointerRelease({button:0,kind:'name',sameOpenedName:true}),'cancel');
  assert.equal(nativeMenuPointerRelease({button:0,kind:'outside'}),'cancel');
  assert.equal(nativeMenuPointerRelease({button:2,kind:'command'}),'keep');
});
