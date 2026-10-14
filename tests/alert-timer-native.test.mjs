import test from 'node:test';
import assert from 'node:assert/strict';
import {OriginalAlertTimer,NATIVE_ALERT_TIMEOUT_MS,nativeAlertTimedDefault} from '../src/original-alert-timer.js';
function clock(){let now=0,next=1;const pending=new Map();return {
  setTimeout(callback,delay){const id=next++;pending.set(id,{callback,at:now+delay});return id;},
  clearTimeout(id){pending.delete(id);},
  advance(ms){now+=ms;for(const [id,item]of pending)if(item.at<=now){pending.delete(id);item.callback();}},
  get count(){return pending.size;}
};}
test('generic native alerts choose2 automatically after exactly0x93E0 wall-clock milliseconds',()=>{
  const fake=clock(),timer=new OriginalAlertTimer(fake),calls=[];
  timer.start(3012,(...args)=>calls.push(args));fake.advance(NATIVE_ALERT_TIMEOUT_MS-1);assert.deepEqual(calls,[]);
  fake.advance(1);assert.deepEqual(calls,[[2,{automatic:true}]]);fake.advance(100000);assert.equal(calls.length,1);
});
test('closing or replacing a dialog cancels its timer and inspectors/modelessschedule never acquire one',()=>{
  const fake=clock(),timer=new OriginalAlertTimer(fake),calls=[];
  timer.start(3020,()=>calls.push('bomb'));timer.start(3000,()=>calls.push('vip'));assert.equal(fake.count,1);
  fake.advance(NATIVE_ALERT_TIMEOUT_MS);assert.deepEqual(calls,['vip']);
  timer.start(3010,()=>calls.push('fire'));timer.stop();fake.advance(NATIVE_ALERT_TIMEOUT_MS);assert.deepEqual(calls,['vip']);
  for(const id of [400,500,730,748,763,10000,4002]){assert.equal(nativeAlertTimedDefault(id),false);timer.start(id,()=>calls.push(id));assert.equal(fake.count,0);}
  for(const id of [3000,3012,3020,3034,3040,4000,4001])assert.equal(nativeAlertTimedDefault(id),true);
});
test('default alert clock preserves the browser Window receiver for scheduling and cancellation',()=>{
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,calls=[];
  try {
    globalThis.setTimeout=function(_callback,delay){assert.equal(this,globalThis,'browser timer rejects an unrelated receiver');calls.push(['set',delay]);return 7;};
    globalThis.clearTimeout=function(handle){assert.equal(this,globalThis,'browser cancellation rejects an unrelated receiver');calls.push(['clear',handle]);};
    const timer=new OriginalAlertTimer();timer.start(3020,()=>{});timer.stop();
    assert.deepEqual(calls,[['set',NATIVE_ALERT_TIMEOUT_MS],['clear',7]]);
  } finally {globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
