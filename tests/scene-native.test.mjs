import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneBackgroundSprites, citySprites, cloudArea, OriginalCloudField,nativeSceneStructureKey,secomFacadeSprites } from '../src/original-scene.js';
import { originalRainPalette, OriginalRainColors, collectScenePixels, applyScenePalette } from '../src/original-rain.js';
import { cathedralAnimationPhase, advanceCathedralCeremony } from '../src/original-cathedral.js';

test('native scene uses original ordered gradient bands, repeats only highest sky, dirtonce and cityatground',()=>{
  const sprites=sceneBackgroundSprites({left:0,right:32,top:-3960,bottom:720});
  assert.deepEqual(sprites.map(s=>[s.sheet,s.y]),[[857,-3960],[857,-3600],[857,-3240],[857,-2880],[856,-2520],[855,-2160],[854,-1800],[853,-1440],[852,-1080],[851,-720],[850,-360],[849,0]]);
  assert.equal(sprites.filter(s=>s.sheet===849).length,1);
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
test('native scene refresh key follows structural/full-refresh changes without actor/construction/palette churn',()=>{
  const state={floors:{0:{x:0,width:100,lobby:true}},rooms:[{id:1,key:'office',floor:1,x:5,width:9,constructionRemaining:12}],shafts:[{id:2,key:'elevator',x:20,low:0,high:1,stops:[0,1],cars:[{id:3,floor:0}]}],links:[]};
  const first=nativeSceneStructureKey(state);state.rooms[0].constructionRemaining=0;state.rooms[0].occupied=true;state.tick=1200;state.rain=true;state.shafts[0].cars[0].floor=1;
  assert.equal(nativeSceneStructureKey(state),first);
  state.shafts[0].stops.pop();assert.notEqual(nativeSceneStructureKey(state),first);
  const previous=nativeSceneStructureKey(state);state.rooms=[];assert.notEqual(nativeSceneStructureKey(state),previous);
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
