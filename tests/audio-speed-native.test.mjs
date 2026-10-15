import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAudioChannel, OriginalAudioMixer, originalSoundRequest,
  dialogSoundRequest, facilitySample, inspectionSound, ambientSamplePoint,
  ambientSound, AUDIO_STARVATION_MS } from '../src/original-audio.js';
import { OriginalTickScheduler } from '../src/original-speed.js';
import { EFFECTS_BASE_PALETTE, effectsPalette, OriginalEffectsClock,
  collectEffectsPixels, applyEffectsPalette } from '../src/original-effects.js';

function mixerScene() {
  let time=0;const clips=[];
  const mixer=new OriginalAudioMixer(id=>{
    const audio={id,currentTime:0,plays:0,pauses:0,onended:null,
      play(){this.plays++;return Promise.resolve();},pause(){this.pauses++;}};
    clips.push(audio);return audio;
  },{now:()=>time});
  return {mixer,clips,setTime:value=>time=value};
}
test('original two-channel allocation preempts strictly lower priority and reserves channel1 for priority5',()=>{
  assert.equal(chooseAudioChannel([null,null],0),0);
  assert.equal(chooseAudioChannel([{priority:1},null],0),1);
  assert.equal(chooseAudioChannel([{priority:1},{priority:3}],1),-1);
  assert.equal(chooseAudioChannel([{priority:1},{priority:3}],2),0);
  assert.equal(chooseAudioChannel([{priority:5},{priority:5}],5),1);
});
test('two simultaneous samples retain separate playback and priority preemption stops only selected channel',()=>{
  const {mixer,clips}=mixerScene();
  mixer.play(originalSoundRequest(6001,0));mixer.play(originalSoundRequest(6001,0));
  assert.equal(clips.length,2);assert.equal(mixer.play(originalSoundRequest(6002,0)),false);
  mixer.play(originalSoundRequest(1448,1));assert.equal(clips[0].pauses,1);assert.equal(clips[1].pauses,0);
  assert.equal(mixer.channels[0].id,1448);assert.equal(mixer.channels[1].id,6001);
});
test('native repeat count is total plays, zero is once, and completion frees the channel',()=>{
  const {mixer,clips}=mixerScene();mixer.play(originalSoundRequest(5003,2));
  const audio=clips[0];assert.equal(audio.plays,1);
  audio.onended();audio.onended();audio.onended();assert.equal(audio.plays,4);
  audio.onended();assert.equal(mixer.channels[0],null);
  mixer.play(originalSoundRequest(6001,0));clips[1].onended();assert.equal(mixer.channels[0],null);
});
test('blocked sound clears both native channels after600 wall-clock units',()=>{
  const {mixer,clips,setTime}=mixerScene();
  mixer.play(originalSoundRequest(5000,2));mixer.play(originalSoundRequest(5003,2));
  setTime(AUDIO_STARVATION_MS-1);assert.equal(mixer.play(originalSoundRequest(6001,0)),false);
  setTime(AUDIO_STARVATION_MS);assert.equal(mixer.play(originalSoundRequest(6001,0)),true);
  assert.equal(clips[0].pauses,1);assert.equal(clips[1].pauses,1);
});
test('native modal cues stop both channels and use event-specific original samples',()=>{
  assert.equal(dialogSoundRequest(3010).id,10006);assert.equal(dialogSoundRequest(3011).id,10006);
  assert.equal(dialogSoundRequest(3020).id,10003);assert.equal(dialogSoundRequest(3040).id,10001);
  assert.equal(originalSoundRequest(10009,0).category,2); // native priority5 is Events
  const {mixer,clips}=mixerScene();mixer.play(originalSoundRequest(6001));mixer.play(originalSoundRequest(1448,1));
  mixer.play(dialogSoundRequest(3020));assert.equal(clips[0].pauses,1);assert.equal(clips[1].pauses,1);
});
test('disabling one sound category stops both native channels and blocks later disabled samples',()=>{
  const {mixer,clips}=mixerScene();mixer.play(originalSoundRequest(6001));mixer.play(originalSoundRequest(1448,1));
  mixer.setEnabled(1,false);assert.equal(clips[0].pauses,1);assert.equal(clips[1].pauses,1);
  assert.equal(mixer.play(originalSoundRequest(1448,1)),false);
  assert.equal(mixer.play(originalSoundRequest(1448,1),{force:true}),true);
});
test('native inactive/iconic audio flushes both channels and rejects all priorities',()=>{
  const {mixer,clips}=mixerScene();
  mixer.play(originalSoundRequest(6001,0));mixer.play(originalSoundRequest(5003,2));
  mixer.setActive(false);
  assert.deepEqual(mixer.channels,[null,null]);
  assert.deepEqual(clips.map(clip=>[clip.pauses,clip.onended]),[[1,null],[1,null]]);
  for(let priority=0;priority<=5;priority++)assert.equal(mixer.play({id:6001,priority},{force:true}),false);
  assert.equal(clips.length,2);
});
test('reactivating native mixer retains sound preferences and never resumes flushed clips',()=>{
  const {mixer,clips}=mixerScene();mixer.setEnabled(1,false);
  mixer.play(originalSoundRequest(5003,2));mixer.setActive(false);mixer.setActive(true);
  assert.deepEqual(mixer.enabled,[true,false,true]);assert.deepEqual(mixer.channels,[null,null]);
  assert.equal(clips[0].plays,1);assert.equal(mixer.play(originalSoundRequest(1448,1)),false);
  assert.equal(mixer.play(originalSoundRequest(6001,0)),true);
  assert.equal(clips.length,2);
});
test('facility inspection samples native active state and exact sound selection',()=>{
  const state={tick:300,actors:[{room:1,floor:2,state:0,trip:null}]};
  const office={id:1,key:'office',floor:2,tenantState:1};
  assert.equal(inspectionSound(state,office,()=>0).id,1448);
  state.tick=1600;assert.equal(inspectionSound(state,office,()=>0).id,1448);
  office.tenantState=8;assert.equal(inspectionSound(state,office,()=>0),null);
  assert.equal(inspectionSound(state,{key:'cinema',show:{stage:3},movie:{active:true,index:13}},()=>0).id,9014);
  assert.equal(inspectionSound(state,{key:'fastfood',commercial:{state:3,inside:10}},()=>0),null);
  assert.equal(inspectionSound(state,{key:'fastfood',commercial:{state:1,inside:1}},()=>0).id,1385);
  assert.equal(facilitySample(9,()=>0),1576);assert.equal(facilitySample(9,()=>1),1577);
  assert.equal(facilitySample(11,()=>1),1705);assert.equal(facilitySample(6,()=>1),1385);
});
test('native room counters suppress sleeping/vacant sound and show metadata governs venue activity',()=>{
  const state={tick:2200,actors:[]};
  for(const key of ['condo','single','twin','suite']) {
    const field=key==='condo'?'tenantState':'hotelState';
    for(const mode of [0,8,16,24,32,40,48,56,64])assert.equal(inspectionSound(state,{key,[field]:mode},()=>0),null);
    for(const mode of [1,2,9,10])assert.ok(inspectionSound(state,{key,[field]:mode},()=>0));
  }
  for(const stage of [0,1])assert.equal(inspectionSound(state,{key:'partyhall',occupied:true,show:{stage}},()=>0),null);
  for(const stage of [2,3])assert.equal(inspectionSound(state,{key:'partyhall',occupied:false,show:{stage}},()=>0).id,2856);
  assert.equal(inspectionSound(state,{key:'cinema',show:{stage:2},movie:{active:true,index:13}},()=>0),null);
});
test('ambient sound samples six native viewport points and respects native phase/event gates',()=>{
  const viewport={x:10,topFloor:20,width:100,height:9};
  assert.deepEqual(ambientSamplePoint(viewport,0),{x:35,floor:16});
  assert.deepEqual(ambientSamplePoint(viewport,5),{x:85,floor:14});
  const state={tick:300,calendarDay:6,rooms:[]};
  assert.equal(ambientSound(state,viewport,()=>0).id,10012);
  state.tick=2200;state.calendarDay=9;assert.equal(ambientSound(state,viewport,()=>0).id,10011);
  state.emergency={kind:'bomb'};assert.equal(ambientSound(state,viewport,()=>0),null);
  state.emergency=null;state.tick=240;assert.equal(ambientSound(state,viewport,()=>0),null);
  state.tick=2400;assert.equal(ambientSound(state,viewport,()=>0),null);
});
test('normal clock follows six native wall-clock units without accumulated catch-up bursts',()=>{
  let time=0,ticks=0;const scheduler=new OriginalTickScheduler({now:()=>time});
  time=95;assert.equal(scheduler.frame(()=>ticks++),0);
  time=96;assert.equal(scheduler.frame(()=>ticks++),1);
  time=1000;assert.equal(scheduler.frame(()=>ticks++),1);assert.equal(ticks,2);
  assert.equal(scheduler.frame(()=>ticks++),0);
});
test('New/Open clock initialization starts a fresh normal gate after asset loading',()=>{
  let time=0,ticks=0;const scheduler=new OriginalTickScheduler({now:()=>time});
  time=1008;scheduler.reset();
  assert.equal(scheduler.frame(()=>ticks++),0);
  time=1103;assert.equal(scheduler.frame(()=>ticks++),0);
  time=1104;assert.equal(scheduler.frame(()=>ticks++),1);
  assert.equal(ticks,1);
});
test('Fast Mode runs one visible tick per native16ms unit instead of CPU-dependent batches',()=>{
  let time=0,ticks=0;const scheduler=new OriginalTickScheduler({now:()=>time});
  time=15;assert.equal(scheduler.frame(()=>ticks++,{fast:true}),0);
  time=16;assert.equal(scheduler.frame(()=>ticks++,{fast:true}),1);
  assert.equal(scheduler.frame(()=>ticks++,{fast:true}),0);
  time=10000;assert.equal(scheduler.frame(()=>ticks++,{fast:true}),1);assert.equal(ticks,2,'a delayed paint advances once without a catch-up burst');
});
test('Fast clock rate stays bounded on a fast CPU or high-refresh display and is six times normal',()=>{
  let time=0,normal=0,fast=0;const slow=new OriginalTickScheduler({now:()=>time}),quick=new OriginalTickScheduler({now:()=>time});
  for(time=1;time<=9600;time++){slow.frame(()=>normal++);quick.frame(()=>fast++,{fast:true});}
  assert.equal(normal,100);assert.equal(fast,600);
  for(const flag of ['paused','hidden','modal'])assert.equal(quick.frame(()=>assert.fail(),{fast:true,[flag]:true}),0);
});
test('pause, hidden or native modal states prevent Fast Mode from advancing',()=>{
  let time=100;const scheduler=new OriginalTickScheduler({now:()=>time});
  for(const flag of ['paused','hidden','modal'])assert.equal(scheduler.frame(()=>assert.fail(),{fast:true,[flag]:true}),0);
  time=191;assert.equal(scheduler.frame(()=>assert.fail()),0);
  time=192;assert.equal(scheduler.frame(()=>true),1);
});

test('native machinery palette rotates three lights and alternates original ventilation colors',()=>{
  const a=effectsPalette(0),b=effectsPalette(1),c=effectsPalette(2);
  assert.deepEqual(a.slice(0,3),[[243,255,255],[158,184,184],[243,255,255]]);
  assert.deepEqual(b.slice(0,3),[[243,255,255],[243,255,255],[158,184,184]]);
  assert.deepEqual(c.slice(0,3),[[158,184,184],[243,255,255],[243,255,255]]);
  assert.deepEqual(a[3],EFFECTS_BASE_PALETTE[4]);assert.deepEqual(b[3],EFFECTS_BASE_PALETTE[3]);
  assert.deepEqual(effectsPalette(65535)[1],[243,255,255]); // signed native counter-1
});
test('Effects has its own240ms clock and freezing it preserves the current original palette',()=>{
  const clock=new OriginalEffectsClock();assert.equal(clock.advance(239),null);
  assert.deepEqual(clock.advance(240),effectsPalette(0));assert.equal(clock.counter,1);
  assert.equal(clock.advance(480,false),null);assert.equal(clock.counter,1);
  assert.deepEqual(clock.advance(10000),effectsPalette(1));assert.equal(clock.counter,2);
});
test('native Effects clock begins at application uptime and new tower resets only animation phase',()=>{
  const clock=new OriginalEffectsClock(1000);assert.equal(clock.advance(1200),null);
  assert.deepEqual(clock.advance(1240),effectsPalette(0));assert.equal(clock.counter,1);
  const gate=clock.lastUnits;clock.resetCounter();assert.equal(clock.lastUnits,gate);assert.equal(clock.counter,0);
  assert.equal(clock.advance(1240),null);assert.deepEqual(clock.advance(1480),effectsPalette(0));
});
test('original effects recoloring changes only recovered palette pixels and preserves transparency',()=>{
  const rgba=new Uint8ClampedArray([243,255,255,0,130,130,130,255,12,24,36,127]);
  const pixels=collectEffectsPixels(rgba);assert.deepEqual(pixels,[[0,0],[4,7]]);
  applyEffectsPalette(rgba,pixels,effectsPalette(2));
  assert.deepEqual([...rgba],[158,184,184,0,79,79,79,255,12,24,36,127]);
});
