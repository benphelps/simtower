import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeStartupAction,nativeSaveGuardRequired,nativeSaveGuardText,nativeSaveGuardOutcome,nativeFont,nativeConstructionSprites,NATIVE_EMPTY_FLOOR_TILE} from '../src/original-startup.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
test('original startup commands map to New/Quit/Load and preserve cancellation',()=>{
  assert.equal(nativeStartupAction(1),'new');assert.equal(nativeStartupAction(2),'quit');assert.equal(nativeStartupAction(3),'open');assert.equal(nativeStartupAction(0),null);
});
test('save guard still applies to a successfully saved populated tower but skips empty/invalid worlds',()=>{
  assert.equal(nativeSaveGuardRequired({saveEnabled:true,groundRecords:1}),true);
  assert.equal(nativeSaveGuardRequired({saveEnabled:true,groundRecords:0}),false);
  assert.equal(nativeSaveGuardRequired({saveEnabled:false,groundRecords:8}),false);
  assert.equal(nativeSaveGuardText(data,'untitled','new'),'Save the tower "untitled" before closing?');
  assert.equal(nativeSaveGuardText(data,'Hotel','quit'),'Save the tower "Hotel" before quitting?');
});
test('Yes saves first and aborts on cancelled or failed saving',()=>{
  assert.equal(nativeSaveGuardOutcome(6),'save');assert.equal(nativeSaveGuardOutcome(6,true),'continue');assert.equal(nativeSaveGuardOutcome(6,false),'cancel');assert.equal(nativeSaveGuardOutcome(7),'continue');assert.equal(nativeSaveGuardOutcome(2),'cancel');
});
test('native font heights are character pixels and floor/construction use original strip',()=>{
  assert.equal(nativeFont(6).pixelHeight,9);assert.equal(nativeFont(13).pixelHeight,13);assert.equal(nativeFont().outPrecision,7);
  assert.deepEqual(NATIVE_EMPTY_FLOOR_TILE,{sheet:1000,sx:16,sy:0,width:8,height:36});
  assert.deepEqual(nativeConstructionSprites({key:'office',x:10,floor:2,width:9}),[{sheet:5000,sx:0,sy:0,x:80,y:-108,width:72,height:12},{sheet:3625,sx:0,sy:0,x:80,y:-96,width:72,height:24}]);
  assert.deepEqual(nativeConstructionSprites({key:'cinema',x:10,floor:2,width:31,height:2}).filter(p=>p.sheet===3625).map(p=>[p.width,p.y,p.height]),[[248,-96,24],[248,-60,24]]);
});
