import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OriginalEffectsClock,effectsPalette} from '../src/original-effects.js';
import {OriginalRainColors,originalRainPalette,nativeSkyResetDue,nativeFullSkyResetDue} from '../src/original-rain.js';
import {EFFECTS_BASE_PALETTE} from '../src/original-effects.js';
import {Renderer} from '../src/renderer.js';
import {skyPalette} from '../src/original-clock.js';
import {Tower} from '../src/simulation.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
const sky=Array.from({length:6},(_,i)=>[50+i,60+i,70+i]);
function renderer(){return Object.assign(Object.create(Renderer.prototype),{
  effectsClock:new OriginalEffectsClock(),effectsEnabled:true,effectsSources:new Map(),
  assets:new Map(),peopleInk:new Map(),rainColors:new OriginalRainColors(),
  currentSky:sky,skySources:new Map(),sceneIndices:{},paletteKey:''
});}

test('slow native idle checks can animate rain again after a later sky reset in one iteration',()=>{
  const r=renderer(),tower={state:{tick:100,rain:true}};r.rainColors.resetSky(sky);
  assert.equal(r.palettePhase(tower,240),true);
  assert.deepEqual(r.rainColors.palette,originalRainPalette(sky,0,100,true));
  assert.equal(r.palettePhase(tower,250),false);assert.equal(r.effectsClock.counter,1);
  const evening=sky.map(rgb=>rgb.map(value=>value-10));r.rainColors.resetSky(evening);r.currentSky=evening;
  assert.deepEqual(r.rainColors.palette,[...evening,...evening],'5EB4 overrides earlier rain-bank ink');
  assert.equal(r.palettePhase(tower,480),true);
  assert.deepEqual(r.rainColors.palette,originalRainPalette(evening,1,100,true),'FFB5 can animate the reset banks');
  assert.deepEqual(r.effectsClock.palette,effectsPalette(1));assert.equal(r.effectsClock.counter,2);
});

test('ordinary repeated idle/pre-actor/post-actor/post-sky/Info checks share one wall-clock gate',()=>{
  const r=renderer(),tower={state:{tick:100,rain:true}};r.rainColors.resetSky(sky);
  assert.deepEqual([240,245,250,255,260].map(time=>r.palettePhase(tower,time)),[true,false,false,false,false]);
  assert.equal(r.effectsClock.counter,1);
  r.guiCapture=true;assert.equal(r.palettePhase(tower,500),false);assert.equal(r.effectsClock.counter,1);
  r.guiCapture=false;r.effectsEnabled=false;assert.equal(r.palettePhase(tower,510),false);
  r.effectsEnabled=true;tower.state.tick=1490;const banks=r.rainColors.palette;
  assert.equal(r.palettePhase(tower,520),true);assert.deepEqual(r.rainColors.palette,banks,'outside5B3E window retains the last bank');
});

test('scaffold source export distinguishes native zero indices from opaque original ink',()=>{
  const source=JSON.parse(readFileSync(new URL('../public/assets/scaffold-indices.json',import.meta.url)));
  const indices=Buffer.from(source.indices,'base64');assert.equal(indices.length,328*36);
  assert.ok(indices.includes(0));assert.ok(indices.some(value=>value!==0));
  assert.equal(source.id,3624);assert.equal(source.source,'SimTowerDOS/SIMTOWER.EXE');
});

test('native rain1500 reset conceals last rain frame even when the sky RGB palette has not changed',()=>{
  const r=renderer(),tower={state:{tick:1490,rain:true,elapsedTicks:0},data:{skyPalettes:Object.fromEntries([1000,1001,1002,1003].map(id=>[id,sky]))}};
  r.rainColors.resetSky(sky);r.rainColors.advanceEffects(1,1489,true);
  r.updateSky(tower);assert.notDeepEqual(r.rainColors.palette,[...sky,...sky],'1490..1499 retains last5B3E bank');
  tower.state.tick=1500;tower.state.elapsedTicks=10;r.updateSky(tower);
  assert.deepEqual(r.rainColors.palette,[...sky,...sky],'5F8B special1500 path resets even identical RGB');
  r.rainColors.advanceEffects(2,100,true);const animated=r.rainColors.palette;r.updateSky(tower);
  assert.deepEqual(r.rainColors.palette,animated,'extra browser repaint must not execute another5EB4');
  assert.equal(nativeSkyResetDue(1499,true),false);assert.equal(nativeSkyResetDue(1500,true),true);
});

test('native ordinary sky retains its rounded2599 colors after clock rollover and only initialization forces the day palette',()=>{
  const r=renderer(),tower={state:{tick:2599,rain:false,elapsedTicks:2599},data};
  r.updateSky(tower);const last=r.currentSky;assert.deepEqual(last,skyPalette(data,2599));
  assert.notDeepEqual(last,data.skyPalettes[1000]);tower.state.tick=0;tower.state.elapsedTicks=2600;r.updateSky(tower);
  assert.deepEqual(r.currentSky,last,'5F8B ARG0=0 performs no ordinary daytime write');
  r.skyEpoch=null;r.updateSky(tower);assert.deepEqual(r.currentSky,data.skyPalettes[1000],'1A63D calls5F8B ARG0=1');
  assert.deepEqual(skyPalette(data,2533,true),data.skyPalettes[1003],'rain branch bypasses normal dawn windows');
});

test('real Tower invokes optional palette phases around actor work without serializing callbacks or consuming RNG',()=>{
  const tower=new Tower(data),control=new Tower(data);tower.state.tick=500;control.state.tick=500;
  const phases=[];tower.nativeVisualHook=stage=>phases.push(stage);tower.step();control.step();
  assert.deepEqual(phases,['before-actors','after-actors']);assert.deepEqual(JSON.parse(tower.save()),JSON.parse(control.save()));
  assert.equal(tower.state.seed,control.state.seed);
  const saved=tower.save();assert.equal(saved.includes('nativeVisualHook'),false);
});

test('an actor/car modal suspends the late sky write until the native frame continuation returns',()=>{
  const r=renderer(),tower={state:{tick:2533,rain:false,elapsedTicks:2533},data};r.updateSky(tower);const previous=r.currentSky;
  tower.state.tick=2540;tower.state.elapsedTicks=2540;r.nativeTickFrame=false;r.updateSky(tower);
  assert.deepEqual(r.currentSky,previous,'noFFAF while the source car loop has not returned');
  r.nativeTickFrame=true;r.updateSky(tower);assert.deepEqual(r.currentSky,skyPalette(data,2540));
});

test('native5E53 rain1500 and initialized full CLUT reset machinery colors without resetting its counter or gate',()=>{
  const r=renderer(),tower={state:{tick:1500,rain:true,elapsedTicks:1500},data};r.rainColors.resetSky(sky);r.palettePhase({state:{tick:100,rain:true}},240);
  const counter=r.effectsClock.counter,gate=r.effectsClock.lastUnits;r.effectsEnabled=false;r.updateSky(tower);
  assert.deepEqual(r.effectsClock.palette,EFFECTS_BASE_PALETTE);assert.equal(r.effectsClock.counter,counter);assert.equal(r.effectsClock.lastUnits,gate);
  assert.equal(nativeFullSkyResetDue(1500,true),true);assert.equal(nativeFullSkyResetDue(2533,false,{initialize:true}),false);
  assert.equal(nativeFullSkyResetDue(500,false,{initialize:true}),true);
});
