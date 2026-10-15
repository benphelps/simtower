import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDialogReturnRedraw,nativeEmergencyActivationRedraw,nativeFacilityInspectorAvailable} from '../src/original-redraw-requests.js';
import {Renderer} from '../src/renderer.js';
import {OriginalCloudField} from '../src/original-scene.js';
import {Tower} from '../src/simulation.js';
import {readFileSync} from 'node:fs';

test('only source facility and Find return paths request a full background redraw',()=>{
  for(let id=748;id<=760;id++)assert.deepEqual(nativeDialogReturnRedraw(id),{rebind:false,backgroundRefresh:true});
  for(const id of [510,520])assert.deepEqual(nativeDialogReturnRedraw(id),{rebind:true,backgroundRefresh:true});
  for(const id of [400,500,731,761,762,763,764,3000,3010,3012,3020,3040,1004,'about','save'])assert.equal(nativeDialogReturnRedraw(id),null,String(id));
  assert.equal(nativeFacilityInspectorAvailable(0),false);assert.equal(nativeFacilityInspectorAvailable(45),false);assert.equal(nativeFacilityInspectorAvailable(13),true);
  assert.equal(nativeEmergencyActivationRedraw(0),null);assert.deepEqual(nativeEmergencyActivationRedraw(1),{rebind:true,redraw:true});
});

test('actual emergency activation drains construction and resets actors before bomb-only native full refresh',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
  for(const mode of [0,1]) {
    const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,20,100);tower.build('office',1,20);
    const events=[];tower.nativeGridHook=event=>events.push({event,remaining:tower.state.construction.length,states:tower.state.actors.map(actor=>actor.state)});
    assert.ok(tower.state.construction.length>0);const seed=tower.state.seed,cash=tower.state.cash;
    tower.activateEmergency(mode);
    assert.equal(tower.state.construction.length,0);assert.equal(tower.state.seed,seed);assert.equal(tower.state.cash,cash);
    const redraws=events.filter(entry=>entry.event.redraw);
    if(mode===0)assert.deepEqual(redraws,[],'fireARG0 returns without9CE0/F296');
    else {assert.equal(redraws.length,1);assert.equal(events.at(-1),redraws[0]);assert.deepEqual(redraws[0].event,{rebind:true,redraw:true});assert.equal(redraws[0].remaining,0);assert.ok(redraws[0].states.every(state=>state===39));}
  }
});

test('closing Finance and ordinary alerts cannot consume empty-cloud RNG while real inspector and Find returns do',()=>{
  const viewport={left:0,right:80,top:-180,bottom:0},calls=[],tower={state:{},randomInt:max=>{calls.push(max);return 0;}};
  const renderer=Object.assign(Object.create(Renderer.prototype),{clouds:new OriginalCloudField(),guiCapture:false});
  renderer.sceneClouds(tower,viewport);assert.equal(calls.length,4);
  renderer.refreshNativeGrid=()=>{};renderer.render=(model,time,options)=>renderer.sceneClouds(model,viewport,options);
  for(const id of [500,761,763,3012,3020]){const plan=nativeDialogReturnRedraw(id);if(plan)renderer.drawNativeGui(tower,plan);renderer.sceneClouds(tower,viewport);}
  assert.equal(calls.length,4);
  for(const id of [748,510])renderer.drawNativeGui(tower,nativeDialogReturnRedraw(id));
  assert.equal(calls.length,12,'one original four-slot B5F0 retry per actual full background request');
});
