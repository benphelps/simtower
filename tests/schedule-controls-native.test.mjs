import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeScheduleControls,nativeScheduleScroll,nativeScheduleSimulationButton} from '../src/original-schedule-controls.js';
import fs from 'node:fs';
test('Simulate swaps only its original Resume hotspot and preserves independent normal/pressed art',()=>{
  const templates=JSON.parse(fs.readFileSync(new URL('../public/assets/dialogs.json',import.meta.url)));
  const bounds=templates[400].hotspots[2],rect=[bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]];
  assert.deepEqual(nativeScheduleSimulationButton(false),{label:'Simulate',normalSheet:null,pressedSheet:401,sourceRect:rect});
  assert.deepEqual(nativeScheduleSimulationButton(true),{label:'Resume',normalSheet:410,pressedSheet:411,sourceRect:rect});
  for(const id of [401,410,411]){const bytes=fs.readFileSync(new URL(`../public/assets/bitmaps/${id}.png`,import.meta.url));assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[200,428]);}
});
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
