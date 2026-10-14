import test from 'node:test';import assert from 'node:assert/strict';
import {nativeMenuActivation,nativeMenuStep,nativeMenuMnemonic,nativeDialogModeless} from '../src/original-menus.js';
import {nativeSimulationActive,nativeToolAllowed} from '../src/original-window-controls.js';
test('USER menu activation is distinct from the original F1 accelerator and honors top-level access keys',()=>{
  for(const [key,result] of [['f','file'],['O','options'],['w','windows'],['h','help'],[' ','system']])assert.equal(nativeMenuActivation({key,altKey:true}),result);
  assert.equal(nativeMenuActivation({key:'F10'}),'bar');assert.equal(nativeMenuActivation({key:'F1'}),null);
  assert.equal(nativeMenuActivation({key:'Alt'}),'bar');assert.equal(nativeMenuActivation({key:'Alt',repeat:true}),null);
  assert.equal(nativeMenuActivation({key:'F10',shiftKey:true}),null);assert.equal(nativeMenuActivation({key:'s',ctrlKey:true}),null);
});
test('menu traversal skips disabled commands and wraps while access keys require an actual native marker',()=>{
  const items=[{mnemonic:'n'},{disabled:true,mnemonic:'o'},{mnemonic:'s'},{label:'Save As...'}];
  assert.equal(nativeMenuStep(items,0,1),2);assert.equal(nativeMenuStep(items,0,-1),3);assert.equal(nativeMenuStep(items,3,1),0);
  assert.equal(nativeMenuStep(items,-1,-1),3);
  assert.equal(nativeMenuMnemonic(items,'N'),0);assert.equal(nativeMenuMnemonic(items,'o'),-1);assert.equal(nativeMenuMnemonic(items,'a'),-1);
  assert.equal(nativeMenuStep([{disabled:true}],0,1),-1);
});
test('11E50 elevator schedule is modeless and continues idle simulation while editing tools are gated',()=>{
  assert.equal(nativeDialogModeless(400),true);for(const id of [500,10000,750,761,763])assert.equal(nativeDialogModeless(id),false);
  const controls={running:true,scheduleOpen:true,modalOpen:false};assert.equal(nativeSimulationActive(controls),true);assert.equal(nativeToolAllowed('build',controls),false);
  assert.equal(nativeSimulationActive({...controls,menuCapture:true}),false);assert.equal(nativeSimulationActive({...controls,preview:true}),false);
});
