import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeElevatorPointerGrid,nativeElevatorExtensionAt,nativeElevatorExtensionRange,nativeShaftEndSprites,nativeFingerStopAt,nativeFingerShaftAt} from '../src/original-elevator-construction-ui.js';
import {nativeGameCursor} from '../src/original-cursors.js';
import {nativeRedrawPlan} from '../src/original-redraw-plan.js';
const shaft={id:1,key:'elevator',nativeTransportSlot:4,x:10,width:4,low:0,high:4,visible:false};
test('native raw pointer floor boundaries and half-open cap widths select Finger-only extension',()=>{
  assert.deepEqual(nativeElevatorPointerGrid(80,0),{x:10,floor:-1});
  assert.equal(nativeElevatorPointerGrid(80,-36).floor,0);
  assert.equal(nativeElevatorPointerGrid(80,-36.1).floor,1);
  const state={shafts:[shaft]};
  assert.equal(nativeElevatorExtensionAt(state,'finger',80,-216).end,'top');
  assert.equal(nativeElevatorExtensionAt(state,'finger',80,-180),null);
  assert.equal(nativeElevatorExtensionAt(state,'finger',112,-198),null);
  assert.equal(nativeElevatorExtensionAt(state,'finger',111,-198).shaft,shaft);
  assert.equal(nativeElevatorExtensionAt(state,'finger',80,18).end,'bottom');
  assert.equal(nativeElevatorExtensionAt(state,'build',80,-198),null);
});
test('Finger stop clicks consume served body on press only when Show is enabled',()=>{
  assert.equal(nativeFingerStopAt({shafts:[shaft]},80,-18),null);
  const visible={...shaft,visible:true};
  assert.deepEqual(nativeFingerStopAt({shafts:[visible]},80,-18),{shaft:visible,floor:0});
  assert.equal(nativeFingerStopAt({shafts:[visible]},80,-198),null);
  assert.equal(nativeFingerShaftAt({shafts:[shaft]},80,-198),shaft);
  assert.equal(nativeFingerShaftAt({shafts:[shaft]},80,-18),shaft);
  assert.equal(nativeFingerShaftAt({shafts:[shaft]},112,-198),null);
});
test('extension chooses physical shaft order and ignores drags through the opposite end',()=>{
  const earlier={...shaft,id:2,nativeTransportSlot:1},state={shafts:[shaft,earlier]};
  assert.equal(nativeElevatorExtensionAt(state,'finger',80,-198).shaft,earlier);
  assert.deepEqual(nativeElevatorExtensionRange(shaft,'top',80,-306),{low:0,high:7});
  assert.deepEqual(nativeElevatorExtensionRange(shaft,'bottom',80,54),{low:-1,high:4});
  assert.equal(nativeElevatorExtensionRange(shaft,'top',80,18),null);
  assert.equal(nativeElevatorExtensionRange(shaft,'bottom',80,-306),null);
  assert.match(nativeGameCursor('finger',true,false),/1004/);
  assert.equal(nativeGameCursor('finger',true,true),'ns-resize');
  assert.match(nativeGameCursor('build',true,true),/1002/);
});
test('standard and service caps share1065 machinery rather than service FIRE artwork',()=>{
  const standard=nativeShaftEndSprites(shaft),service=nativeShaftEndSprites({...shaft,key:'service'});
  assert.deepEqual(service,standard);
  assert.deepEqual(standard.map(p=>[p.sheet,p.sx,p.y]),[[1065,128,-216],[1065,160,0]]);
  assert.deepEqual(nativeShaftEndSprites({...shaft,key:'express',width:6}).map(p=>[p.sheet,p.sx]),[[1067,240],[1067,288]]);
});
test('preview and diagnostic redraw paths suppress overlays absent from their native call tables',()=>{
  const state={emergency:{kind:'fire'},santa:{},crane:{}};
  const normal=nativeRedrawPlan(state),diagnostic=nativeRedrawPlan(state,1),preview=nativeRedrawPlan({...state,elevatorPreview:{}},1);
  assert.equal(normal.kind,'normal');assert.equal(normal.links,true);assert.equal(normal.emergency,true);
  assert.deepEqual(diagnostic.calls,['A1EE','366B5','163BA','1D00E']);
  for(const key of ['cars','queues','links','santa','emergency'])assert.equal(diagnostic[key],false,key);
  assert.equal(diagnostic.crane,true); //35480 is retained background, not an omitted overlay.
  assert.equal(diagnostic.findMarker,true);
  assert.deepEqual(preview.calls,['1E299','163BA','1699C','104B0']);
  for(const key of ['shafts','cars','queues'])assert.equal(preview[key],true,key);
  for(const key of ['links','findMarker','santa','emergency'])assert.equal(preview[key],false,key);
  assert.equal(preview.crane,true);
});
