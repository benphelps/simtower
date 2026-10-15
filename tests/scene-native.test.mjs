import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneBackgroundSprites, citySprites, cloudArea, OriginalCloudField,nativeBackgroundViewport,nativeBufferGrid,secomFacadeSprites } from '../src/original-scene.js';
import { originalRainPalette, OriginalRainColors, collectScenePixels, applyScenePalette } from '../src/original-rain.js';
import { cathedralAnimationPhase, advanceCathedralCeremony } from '../src/original-cathedral.js';

test('native scene uses original ordered gradient bands, repeats only highest sky, dirtonce and cityatground',()=>{
  const sprites=sceneBackgroundSprites({left:0,right:32,top:-3960,bottom:720});
  assert.deepEqual(sprites.filter(s=>s.x===0).map(s=>[s.sheet,s.y]),[[857,-3960],[857,-3600],[857,-3240],[857,-2880],[856,-2520],[855,-2160],[854,-1800],[853,-1440],[852,-1080],[851,-720],[850,-360],[849,0]]);
  assert.equal(new Set(sprites.filter(s=>s.sheet===849).map(s=>s.y)).size,1);
  assert.deepEqual(citySprites({left:110,right:300,top:-70,bottom:20}).map(s=>[s.x,s.y]),[[96,-55],[192,-55],[288,-55]]);
});
test('native SECOM type45 facade uses absolute four-cell column phase across room edges',()=>{
  assert.deepEqual(secomFacadeSprites({x:11,floor:4,width:2}),[
    {sheet:3880,x:88,y:-180,sx:24,sy:0,width:8,height:36},
    {sheet:3880,x:96,y:-180,sx:0,sy:0,width:8,height:36}]);
});
test('native four cloud slots spawn uniformly in visible cloud area, persist, and respawn only after clipping',()=>{
  const field=new OriginalCloudField(),viewport={left:100,right:700,top:-500,bottom:0};let calls=0;
  const random=max=>{calls++;return max-1;};const clouds=field.update(viewport,random);
  assert.equal(clouds.length,4);assert.equal(calls,12);assert.ok(clouds.every(c=>c.sheet===903&&c.x===483&&c.y===-116));
  field.update(viewport,()=>assert.fail('fully contained cloud must persist'));
  field.update({...viewport,left:500},()=>0);assert.ok(field.slots.some(c=>c?.x===500));
  assert.deepEqual(cloudArea({left:0,right:800,top:-4000,bottom:-3500}),{left:0,right:800,top:-3600,bottom:-3500});
  assert.equal(cloudArea({left:0,right:800,top:-71,bottom:100}),null);
});
test('chosen native cloud shape is disabled if it does not fit instead of scaling art',()=>{
  const field=new OriginalCloudField();assert.deepEqual(field.update({left:0,right:96,top:-150,bottom:-72},()=>0),[]);
});
test('cloud RNG runs only when viewport changes or native background becomes dirty, including empty slots',()=>{
  const field=new OriginalCloudField(),viewport={left:0,right:96,top:-150,bottom:-72};let calls=0;
  field.update(viewport,()=>{calls++;return 0;});assert.equal(calls,4);
  field.update(viewport,()=>assert.fail('unchanged empty slots must not churn renderer RNG'));
  field.update(viewport,()=>{calls++;return 0;},{dirty:true});assert.equal(calls,8);
  field.update({...viewport,right:300},()=>{calls++;return 0;});assert.equal(calls,20);
});
test('native cloud random rectangle uses aligned scroll and the extra retained buffer row and column',()=>{
  assert.deepEqual(nativeBackgroundViewport({left:100,right:700,top:-500,bottom:0}),{left:96,right:704,top:-504,bottom:36});
  const field=new OriginalCloudField(),calls=[];
  const cloud=field.update(nativeBackgroundViewport({left:100,right:700,top:-500,bottom:0}),max=>{calls.push(max);return max-1;});
  assert.deepEqual(calls,[4,392,389,4,392,389,4,392,389,4,392,389]);
  assert.ok(cloud.every(c=>c.sheet===903&&c.x===487&&c.y===-116));
  assert.deepEqual(nativeBackgroundViewport({left:101,right:701,top:-499,bottom:1}),{left:96,right:704,top:-504,bottom:36});
  assert.deepEqual(nativeBufferGrid({left:100,right:700,top:-500,bottom:0}),{x:12,topFloor:13,width:76,height:15});
});
test('rain uses twelve ORIGINAL indexed banks with exact native colors and freezes at1490 until new sky palette',()=>{
  const sky=Array.from({length:6},(_,i)=>[10+i,20+i,30+i]);
  assert.deepEqual(originalRainPalette(sky,0,80,true),[...sky,...sky]);
  const zero=originalRainPalette(sky,0,81,true),one=originalRainPalette(sky,1,81,true);
  assert.deepEqual(zero[0],[206,239,255]);assert.deepEqual(zero[11],[74,76,102]);assert.deepEqual(one.slice(6),zero.slice(0,6));
  const colors=new OriginalRainColors();colors.update(sky,0,100,true);assert.deepEqual(colors.update(sky,1,100,true),zero);
  assert.deepEqual(colors.update(sky,2,1490,true),zero);assert.deepEqual(colors.update(sky.map(c=>c.map(v=>v+1)),3,1500,true),[...sky,...sky].map(c=>c.map(v=>v+1)));
});
test('indexed source export retains native rain positions hidden by RGB extraction and recolors only palette pixels',()=>{
  const source=JSON.parse(readFileSync(new URL('../public/assets/scene-indices.json',import.meta.url)));
  const tile=source.resources[850],indices=Buffer.from(tile.indices,'base64');assert.equal(indices.length,32*360);
  assert.equal([...indices].filter(i=>i>=207&&i<=218).length,610);
  const pixels=collectScenePixels([188,207,218,255]),rgba=new Uint8ClampedArray(16).fill(99);
  const sky=Array.from({length:6},()=>[1,2,3]),rain=Array.from({length:12},()=>[4,5,6]);applyScenePalette(rgba,pixels,sky,rain);
  assert.deepEqual([...rgba],[1,2,3,99,4,5,6,99,4,5,6,99,99,99,99,99]);
});
test('cathedral animation phase uses BASEtype40 native registration slot',()=>{
  const state={rooms:[{key:'cathedral',nativeTenantIndex:2,nativeTenantSlots:[{type:36,index:2},{type:40,index:5}]}],cathedralCeremony:true,cathedralCeremonyStep:0,tick:11};
  assert.equal(cathedralAnimationPhase(state),5);advanceCathedralCeremony(state);assert.equal(state.cathedralCeremonyStep,1);
  state.tick=12;advanceCathedralCeremony(state);assert.equal(state.cathedralCeremonyStep,1);
});

test('actual Tower ordinary room mutations do not regenerate clouds; explicit full GUI refresh does',async()=>{
  const {Renderer}=await import('../src/renderer.js'),{Tower}=await import('../src/simulation.js');
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
  const tower=new Tower(data,{sandbox:true,seed:1994});tower.build('lobby',0,20,100);tower.build('floor',1,20,100);
  const renderer=Object.assign(Object.create(Renderer.prototype),{clouds:new OriginalCloudField(),guiCapture:false});
  const viewport={left:160,right:240,top:-180,bottom:0},calls=[];
  const nativeRandom=tower.randomInt.bind(tower);tower.randomInt=max=>{calls.push(max);return nativeRandom(max);};
  renderer.sceneClouds(tower,viewport);assert.deepEqual(calls,[4,4,4,4],'all selected shapes exceed the 88px retained buffer');
  tower.build('office',1,20);const before=JSON.stringify(tower.state);
  renderer.sceneClouds(tower,viewport);assert.equal(calls.length,4);assert.equal(JSON.stringify(tower.state),before);
  renderer.refreshNativeGrid=()=>{};renderer.render=(actual,elapsed,options)=>renderer.sceneClouds(actual,viewport,options);
  renderer.drawNativeGui(tower);assert.equal(calls.length,4,'inspector A1EE does not run B3A3');
  renderer.drawNativeGui(tower,{rebind:true});assert.deepEqual(calls,[4,4,4,4,4,4,4,4],'F296 retries all empty slots even at unchanged viewport');
  renderer.sceneClouds(tower,viewport);assert.equal(calls.length,8,'extra browser paints remain inert');
  renderer.sceneClouds(tower,{...viewport,left:161,right:241});assert.equal(calls.length,12,'a one-pixel scroll refreshes even when aligned buffer bounds stay equal');
  renderer.guiCapture=true;renderer.sceneDirty=true;renderer.sceneClouds(tower,viewport);assert.equal(calls.length,12);assert.equal(renderer.sceneDirty,true);
});

test('native transport removal rebinds before full GUI replay; rejected stop changes never replay',async()=>{
  const {Tower}=await import('../src/simulation.js');
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url))),tower=new Tower(data,{sandbox:true});
  tower.build('lobby',0,20,100);tower.build('floor',1,20,100);tower.build('floor',2,20,100);
  tower.build('elevator',0,40,40,2);tower.build('stairs',2,60);
  const shaft=tower.state.shafts[0],link=tower.state.links[0],calls=[];
  tower.nativeGridHook=event=>calls.push({event,shafts:tower.state.shafts.length,links:tower.state.links.length});
  assert.ok(tower.setElevatorStop(shaft.id,4).error);assert.deepEqual(calls,[]);
  assert.equal(tower.setElevatorStop(shaft.id,1,true).ok,true);
  assert.deepEqual(calls.pop().event,{redraw:true,backgroundRefresh:true});
  assert.equal(tower.demolish(link.floor,link.x).ok,true);
  assert.deepEqual(calls.pop(),{event:{rebind:true,redraw:true},shafts:1,links:0});
  assert.equal(tower.demolish(shaft.low,shaft.x).ok,true);
  assert.deepEqual(calls.pop(),{event:{rebind:true,redraw:true},shafts:0,links:0});
});


test('native background strip starts at aligned buffer left before the final scroll-remainder crop',()=>{
  const first=sceneBackgroundSprites({left:111,right:175,top:-350,bottom:-300}).filter(part=>part.sheet===850);
  assert.deepEqual(first.map(part=>part.x),[104,136,168]);
  assert.deepEqual(sceneBackgroundSprites({left:112,right:176,top:-350,bottom:-300}).filter(part=>part.sheet===850).map(part=>part.x),[112,144,176]);
});

test('Simulate preserves clouds on ordinary paints but Show full refresh uses the original background branch',async()=>{
  const {Renderer}=await import('../src/renderer.js'),calls=[];
  const tower={state:{elevatorPreview:{}},randomInt:max=>{calls.push(max);return 0;}};
  const renderer=Object.assign(Object.create(Renderer.prototype),{clouds:new OriginalCloudField(),guiCapture:false});
  const viewport={left:0,right:80,top:-180,bottom:0};
  renderer.sceneClouds(tower,viewport);assert.deepEqual(calls,[],'1E132 calls F2B2 witharg0=0');
  renderer.refreshNativeGrid=()=>{};renderer.render=(actual,time,options)=>renderer.sceneClouds(actual,viewport,options);
  renderer.drawNativeGui(tower,{rebind:true});assert.deepEqual(calls,[4,4,4,4],'Showcase5 callsF296(arg1) even during preview');
  renderer.sceneClouds(tower,viewport);assert.equal(calls.length,4,'preview paints do not repeatedly retry empty slots');
});
