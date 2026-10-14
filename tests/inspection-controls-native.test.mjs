import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeTransportInfo,nativeCarHitRect,nativeCarAtPoint,nativeOccupantLayout,nativePanelOccupants,nativeFacilityPanel,nativeInspectionTitle,nativeFacilityPreviewCrop,nativePreviewFit} from '../src/original-inspection-controls.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
const dialogs=JSON.parse(readFileSync(new URL('../public/assets/dialogs.json',import.meta.url)));
test('standard/service single-strip dialogs and express/stair two-strip dialogs use original type titles and load/capacity',()=>{
  const car={people:[1,2,3]};
  assert.deepEqual(nativeTransportInfo(data,{key:'elevator'},car),{dialog:762,title:'Standard Elevator',count:'3 / 21'});
  assert.deepEqual(nativeTransportInfo(data,{key:'service'},car),{dialog:762,title:'Service Elevator',count:'3 / 21'});
  assert.deepEqual(nativeTransportInfo(data,{key:'express'},car),{dialog:761,title:'Express Elevator',count:'3 / 42'});
  assert.deepEqual(nativeTransportInfo(data,{key:'stairs'},null,[1,2]),{dialog:761,title:'Stairs',count:'2'});
});
test('car inspection follows continuous motion and ignores shaft edges plus roof pixels',()=>{
  const car={id:2,floor:1.5},shaft={key:'elevator',x:10,width:4,cars:[car]};
  assert.deepEqual(nativeCarHitRect(shaft,car),{x:82,y:-85,width:28,height:31});
  assert.equal(nativeCarAtPoint(shaft,{x:83,y:-70}),car);
  for(const point of [{x:81,y:-70},{x:110,y:-70},{x:90,y:-86},{x:90,y:-54}])assert.equal(nativeCarAtPoint(shaft,point),null);
});
test('occupant portraits use exact variable-width original strips and native second-row overflow',()=>{
  const rooms=[{id:10,key:'office'},{id:11,key:'housekeeping'}],entries=Array.from({length:35},(_,i)=>({actor:{id:i,room:10,index:0}}));
  const layout=nativeOccupantLayout(entries,[dialogs[761].hotspots[4],dialogs[761].hotspots[9]],rooms);
  assert.deepEqual([layout[0].x,layout[0].y,layout[33].x,layout[34].x,layout[34].y],[22,106,286,22,148]);
  assert.equal(nativeOccupantLayout(entries,[dialogs[762].hotspots[4]],rooms).length,34);
  const wide=nativeOccupantLayout([{id:1,room:11,index:0,name:'Named'}],[[20,40,100,76]],rooms);
  assert.deepEqual([wide[0].width,wide[0].portrait.sheet,wide[0].portrait.x],[16,702,80]);
});
test('clinic selects admitted visiting office/condo identities and excludes queueing/travelling/returning patients',()=>{
  const state={rooms:[{id:1,key:'office'},{id:2,key:'condo'},{id:3,key:'medical'}],actors:[
    {id:1,room:1,job:3,state:35,trip:null},{id:2,room:2,job:3,state:35,trip:null},
    {id:3,room:1,job:3,state:66,trip:null},{id:4,room:2,job:3,state:35,trip:10},{id:5,room:3,job:3,state:35,trip:null}]};
  assert.deepEqual(nativePanelOccupants(state,state.rooms[2]).map(a=>a.id),[1,2]);
  for(const key of ['security','housekeeping','medical'])assert.equal(nativeFacilityPanel({key}).stateLabel,false);
  assert.equal(nativeFacilityPanel({key:'medical'}).secondStrip,true);
  const cinema={id:20,key:'cinema',show:{stage:2}},actors=[{id:21,room:20,state:3,trip:null},{id:22,room:20,state:32,trip:null},{id:23,room:20,state:3,trip:10}];
  assert.deepEqual(nativePanelOccupants({rooms:[cinema],actors},cinema).map(a=>a.id),[21]);
  assert.deepEqual(nativePanelOccupants({rooms:[cinema],actors},{...cinema,show:{stage:1}}),[]);
});
test('native previews remove the ceiling and use integer scaling and floor suffixes',()=>{
  const medical={key:'medical',x:10,floor:2,width:26};
  assert.deepEqual(nativeFacilityPreviewCrop(medical),{x:80,y:-96,width:208,height:24});
  assert.equal(nativeInspectionTitle(data,medical),'Medical Center, Floor 3');
  assert.equal(nativeInspectionTitle(data,{...medical,floor:-2}),'Medical Center, Floor B2');
  assert.deepEqual(nativePreviewFit({width:208,height:24},{x:150,y:40,width:100,height:41}),{x:150,y:55,width:99,height:11});
  assert.deepEqual(nativePreviewFit({width:32,height:24},{x:0,y:0,width:100,height:100}),{x:18,y:26,width:64,height:48});
  // Both dimensions smaller selects the larger native percentage, even
  // when it exceeds the target in the other axis (249D4's literal branch).
  assert.deepEqual(nativePreviewFit({width:200,height:200},{x:0,y:0,width:100,height:80}),{x:0,y:-10,width:100,height:100});
});
