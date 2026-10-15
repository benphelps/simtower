import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeDialogControlState,nativeDialogInitialFocus,nativeDialogKeyCommand} from '../src/original-dialog-keyboard.js';
const templates=JSON.parse(fs.readFileSync(new URL('../public/assets/dialogs.json',import.meta.url)));
const controls=(id,fields={})=>templates[id].controls.map(c=>({...c,...nativeDialogControlState(id,c,fields)}));

test('rename starts in the edit while Return uses Cancel, and named Delete is enabled',()=>{
  for(const id of [730,732]) {
    const empty=controls(id),named=controls(id,{4:'Tenant'});
    assert.equal(nativeDialogInitialFocus(id,empty),4);
    assert.equal(empty.find(c=>c.id===1).disabled,true);
    assert.equal(empty.find(c=>c.id===3).disabled,true);
    assert.equal(named.find(c=>c.id===1).disabled,false);
    assert.equal(named.find(c=>c.id===3).disabled,false);
    assert.equal(nativeDialogKeyCommand(id,'Enter','keydown',named,4),2);
    assert.equal(nativeDialogKeyCommand(id,'Enter','keydown',named,1),1);
    assert.equal(controls(id,{4:' '}).find(c=>c.id===1).disabled,false);
  }
});
test('finance only accepts released Return/Space and keeps Escape from closing it',()=>{
  assert.equal(nativeDialogInitialFocus(500,[]),null);
  for(const key of ['Enter',' ']) {
    assert.equal(nativeDialogKeyCommand(500,key,'keydown',[],null),null);
    assert.equal(nativeDialogKeyCommand(500,key,'keyup',[],null),1);
  }
  assert.equal(nativeDialogKeyCommand(500,'Escape','keydown',[],null),null);
  assert.equal(nativeDialogKeyCommand(500,'Escape','keyup',[],null),null);
});
test('USER cancel dispatches command2 even without a visible Cancel push button',()=>{
  assert.equal(nativeDialogKeyCommand(3012,'Escape','keydown',controls(3012),null),2);
  assert.equal(nativeDialogKeyCommand(763,'Escape','keydown',controls(763),null),2);
  assert.equal(nativeDialogKeyCommand(3010,'Enter','keydown',controls(3010),null),1);
  assert.equal(nativeDialogKeyCommand(10000,'Enter','keydown',controls(10000),3),3);
});
test('resource tab flags/disabled state preserve Find and inspector tab order',()=>{
  const find=controls(510);
  assert.equal(nativeDialogInitialFocus(510,find),1);
  assert.deepEqual(find.filter(c=>c.tabStop&&!c.disabled).map(c=>c.id),[1,5]);
  assert.equal(controls(748).find(c=>c.id===13).tabStop,true);
  assert.equal(nativeDialogKeyCommand(400,'Enter','keydown',[],7),null);
  assert.equal(nativeDialogKeyCommand(400,'Escape','keydown',[],7),null);
});
test('schedule caption has no USER window menu and its procedure ignores default close/cancel commands',()=>{
  const schedule=templates[400];
  assert.equal(schedule.style&0x00c00000,0x00c00000,'the caption remains movable');
  assert.equal(schedule.style&0x00080000,0,'WS_SYSMENU is absent');
  assert.deepEqual(schedule.controls.map(c=>[c.id,c.class]),[[7,'scrollbar']],'OK is an application bitmap hit, not a default USER push button');
  for(const key of ['Escape','Enter','Alt+F4'])for(const phase of ['keydown','keyup'])assert.equal(nativeDialogKeyCommand(400,key,phase,controls(400),7),null);
  assert.equal(templates[731].style&0x00080000,0);
  assert.equal(nativeDialogKeyCommand(731,'Escape','keydown',controls(731),2),2,'New Movie retains its actual Cancel control');
});
