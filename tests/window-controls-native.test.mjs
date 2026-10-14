import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeMainWindowGeometry,nativeInitialCamera,nativeOpenedCamera,nativeCameraFromScroll,nativeCameraScroll,nativeScrollbarGeometry,nativePauseToggle,nativeViewSelection,nativeViewEnabled,nativeToolAllowed,nativeSimulationActive,nativeScrollPosition,nativeScrollCamera,nativeConstructionAutoScroll,nativeFloatingWindowHit,nativeFloatingVisibility,nativeAccelerator,nativePopupChoice } from '../src/original-window-controls.js';

test('pause forces magnifier, resume preserves it, and diagnostic resume returns to running Edit',()=>{
  const running={running:true,mode:'build',view:0};
  const paused=nativePauseToggle(running);
  assert.deepEqual(paused,{running:false,mode:'inspect',view:0});
  assert.equal(nativeToolAllowed('build',paused),false);assert.equal(nativeToolAllowed('finger',paused),false);
  assert.equal(nativeToolAllowed('demolish',paused),false);assert.equal(nativeToolAllowed('inspect',paused),true);
  assert.deepEqual(nativePauseToggle(paused),{running:true,mode:'inspect',view:0});
  const diagnostic=nativeViewSelection(running,2);
  assert.deepEqual(diagnostic,{running:false,mode:'inspect',view:2});
  assert.deepEqual(nativePauseToggle(diagnostic),{running:true,mode:'inspect',view:0});
});
test('one-star Hotel map button is visible but cannot enter that view before hotels unlock',()=>{
  for(const view of [0,1,2])assert.equal(nativeViewEnabled(view,1),true);
  assert.equal(nativeViewEnabled(3,1),false);assert.equal(nativeViewEnabled(3,2),true);
  const controls={running:true,mode:'build',view:0,star:1};
  assert.deepEqual(nativeViewSelection(controls,3),controls);
});
test('scroll and modal gates preserve running preference and modeless schedule advances while Edit inputs remain disabled',()=>{
  const control={running:true,mode:'inspect',view:0};
  assert.equal(nativeSimulationActive({...control,scheduleOpen:true}),true);
  assert.equal(nativeToolAllowed('inspect',{...control,scheduleOpen:true}),false);
  for(const block of ['scrolling','preview','modalOpen','menuCapture'])assert.equal(nativeSimulationActive({...control,[block]:true}),false);
  assert.equal(nativeSimulationActive({...control,running:false}),false);
  const preview={...control,preview:true};assert.deepEqual(nativePauseToggle(preview),preview);assert.deepEqual(nativeViewSelection(preview,1),preview);
});
test('held native popup selection uses exact row bands and cancels on leaving the rectangle',()=>{
  assert.equal(nativePopupChoice({x:0,y:0},64,32,4),0);
  assert.equal(nativePopupChoice({x:63,y:31},64,32,4),0);
  assert.equal(nativePopupChoice({x:63,y:32},64,32,4),1);
  assert.equal(nativePopupChoice({x:63,y:127},64,32,4),3);
  assert.equal(nativePopupChoice({x:64,y:32},64,32,4),null);
  assert.equal(nativePopupChoice({x:0,y:128},64,32,4),null);
  assert.equal(nativePopupChoice({x:0,y:-1},64,32,4),null);
});
test('native line/page/thumb scrolling is clamped to full-world extents',()=>{
  assert.equal(nativeScrollPosition(100,'lineForward',500,3000),116);
  assert.equal(nativeScrollPosition(100,'pageForward',500,3000),584);
  assert.equal(nativeScrollPosition(5,'lineBack',500,3000),0);
  assert.equal(nativeScrollPosition(2400,'pageForward',500,3000),2500);
  assert.equal(nativeScrollPosition(0,'thumb',500,3000,9999),2500);
  assert.equal(nativeScrollPosition(0,'thumb',4000,3000,10),0);
  assert.deepEqual(nativeScrollCamera({x:-100,y:-5000},1000,720,2),{x:250,y:-3780});
  assert.deepEqual(nativeScrollCamera({x:9999,y:9999},1000,720,2),{x:2750,y:180});
});
test('floating native caption hides through exact six-pixel box and preserves visibility across minimize',()=>{
  assert.equal(nativeFloatingWindowHit({x:4,y:1},431,49),'hide');
  assert.equal(nativeFloatingWindowHit({x:9,y:6},431,49),'hide');
  assert.equal(nativeFloatingWindowHit({x:10,y:6},431,49),'caption');
  assert.equal(nativeFloatingWindowHit({x:4,y:7},431,49),'caption');
  assert.equal(nativeFloatingWindowHit({x:4,y:8},431,49),'client');
  assert.equal(nativeFloatingWindowHit({x:431,y:0},431,49),null);
  const preferences={info:true,map:false,tools:true};
  assert.deepEqual(nativeFloatingVisibility(preferences,true),{info:false,map:false,tools:false});
  assert.deepEqual(nativeFloatingVisibility(preferences),preferences);
});
test('successful held construction scrolls only its construction axis and clamps to site edges',()=>{
  const camera={x:1500,y:-200};
  assert.deepEqual(nativeConstructionAutoScroll(camera,{x:1080,y:-72},1000,720,'x',2),{x:1540,y:-200});
  assert.deepEqual(nativeConstructionAutoScroll(camera,{x:1080,y:-72},1000,720,'y',2),{x:1500,y:-236});
  assert.deepEqual(nativeConstructionAutoScroll(camera,{x:1000,y:720},1000,720,'y'),camera);
  assert.deepEqual(nativeConstructionAutoScroll({x:500,y:-200},{x:-100,y:0},1000,720,'x'),{x:500,y:-200});
});
test('the original accelerator table has F1 Help only',()=>{
  assert.equal(nativeAccelerator({key:'F1'}),40021);
  for(const modifier of ['ctrlKey','altKey','shiftKey','metaKey'])assert.equal(nativeAccelerator({key:'F1',[modifier]:true}),null);
  assert.equal(nativeAccelerator({key:'s',ctrlKey:true}),null);assert.equal(nativeAccelerator({key:' '}),null);
});

test('native Edit starts at actual pixel scale with 36 pixels of ground below the surface',()=>{
  assert.deepEqual(nativeInitialCamera(800,576),{x:1500,y:-252});
  assert.deepEqual(nativeCameraScroll(nativeInitialCamera(800,576),800,576),{x:1100,y:3420});
  assert.equal(576/2-nativeInitialCamera(800,576).y,540);
  assert.deepEqual(nativeCameraFromScroll({x:72,y:3612},800,576),{x:472,y:-60});
  assert.deepEqual(nativeCameraScroll({x:472,y:-60},800,576),{x:72,y:3612});
  assert.deepEqual(nativeCameraFromScroll({x:-100,y:9999},800,576),{x:400,y:72});
});
test('classic scrollbar thumb stays one system metric wide throughout the site',()=>{
  assert.deepEqual(nativeScrollbarGeometry(800,800,3000,1100),{thumb:16,travel:752,max:2200,offset:376});
  assert.equal(nativeScrollbarGeometry(800,800,3000,2200).offset,752);
  assert.equal(nativeScrollbarGeometry(16,16,3000,100).travel,0);
});

test('old browser JSON gets a one-time visible foundation migration without changing a current Edit camera',()=>{
  const state={floors:{0:{x:10,width:90}}},camera={x:1500,y:-252};
  assert.deepEqual(nativeOpenedCamera(state,camera,800,576),{x:440,y:-252});
  assert.deepEqual(nativeOpenedCamera(state,camera,800,576,true),camera);
  assert.deepEqual(nativeOpenedCamera({...state,editorScroll:{x:72,y:3612}},camera,800,576,true),{x:472,y:-60});
  assert.deepEqual(nativeOpenedCamera({...state,editorScroll:{x:null,y:NaN}},camera,800,576),{x:440,y:-252});
});

test('native normal and maximized main geometry uses recovered desktop offsets and OS tracking limits',()=>{
  assert.deepEqual(nativeMainWindowGeometry(1280,720),{normal:{x:204,y:53,width:815,height:575},minimum:{width:124,height:214},maximum:{width:839,height:635},maximized:{x:-4,y:-4,width:839,height:635}});
  const small=nativeMainWindowGeometry(640,480);
  assert.deepEqual(small.normal,{x:204,y:53,width:436,height:427});
  assert.deepEqual(small.maximum,{width:647,height:487});
});
