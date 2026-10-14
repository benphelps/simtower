import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeScheduleControls,nativeScheduleScroll} from '../src/original-schedule-controls.js';
test('native fifteen-row shaft editor disables its only USER control and aligns lowest floor to the bottom',()=>{
  assert.deepEqual(nativeScheduleControls({low:0,high:1}),{scrollEnabled:false,initialFocus:null,bitmapTabIndex:-1,blankTopRows:13,visibleRows:15});
  assert.equal(nativeScheduleControls({low:-2,high:12}).scrollEnabled,false);
  assert.equal(nativeScheduleControls({low:-2,high:12}).blankTopRows,0);
});
test('native scroll initially shows lowest fifteen and moves up by one or fourteen floors',()=>{
  const shaft={low:-2,high:30};
  assert.deepEqual(nativeScheduleScroll(shaft),{min:-2,max:16,position:16,offset:234,topFloor:12});
  const line=nativeScheduleScroll(shaft,16,'lineBack');assert.equal(line.position,15);assert.equal(line.topFloor,13);
  const page=nativeScheduleScroll(shaft,15,'pageBack');assert.equal(page.position,1);assert.equal(page.topFloor,27);
  assert.equal(nativeScheduleScroll(shaft,1,'pageBack').position,-2);
  assert.equal(nativeScheduleScroll(shaft,1,'pageForward').position,15);
  assert.equal(nativeScheduleScroll(shaft,15,'thumb',100).position,16);
  assert.equal(nativeScheduleScroll(shaft,15,'thumb',-100).topFloor,30);
});
test('sixteen floors enable child7 with bitmap day/period/grid buttons excluded from Tab',()=>{
  const controls=nativeScheduleControls({low:-2,high:13});
  assert.equal(controls.scrollEnabled,true);
  assert.equal(controls.initialFocus,7);
  assert.equal(controls.bitmapTabIndex,-1);
  assert.equal(controls.blankTopRows,0);
});
