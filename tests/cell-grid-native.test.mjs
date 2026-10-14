import test from 'node:test';
import assert from 'node:assert/strict';
import {bindNativeGridRow,markNativeGridScaffold,nativeGridDraw,nativeGridColumn,mergeNativeIndexedOverlay} from '../src/original-cell-grid.js';

test('native new-floor scaffold retains prior pixels for four unpaused redraws before real facade',()=>{
  const row=bindNativeGridRow(null,[{id:1,start:20,end:30,type:7}],18,14);
  markNativeGridScaffold(row,22,26,18);
  const cell=row[4];
  for(let flag=3;flag<=6;flag++){
    assert.equal(cell.flag,flag);assert.deepEqual(nativeGridDraw(cell),{kind:'scaffold',sheet:3624,sourceColumn:2});
  }
  assert.equal(cell.flag,7);assert.deepEqual(nativeGridDraw(cell),{kind:'facility',record:1,sourceColumn:2});
  assert.equal(cell.flag,-1);assert.equal(nativeGridDraw(cell),null);
  assert.equal(nativeGridDraw(cell,{changed:true}).kind,'facility');
});

test('pause repeatedly draws current scaffold and rebind preserves only3..6',()=>{
  const records=[{id:2,start:0,end:8,type:0}],row=bindNativeGridRow(null,records,0,8);
  markNativeGridScaffold(row,0,8,0);
  for(let draw=0;draw<5;draw++)assert.equal(nativeGridDraw(row[0],{paused:true}).kind,'scaffold');
  assert.equal(row[0].flag,3);
  assert.equal(bindNativeGridRow(row,records,0,8,{paused:true})[0].flag,3);
  assert.equal(bindNativeGridRow(row,records,0,8)[0].flag,7);
  row[0].flag=-1;assert.equal(bindNativeGridRow(row,records,0,8,{paused:true})[0].flag,7);
});

test('native viewport clipping never retains offscreen scaffold requests',()=>{
  const row=bindNativeGridRow(null,[{id:1,start:0,end:200,type:7}],40,103);
  markNativeGridScaffold(row,35,42,40);
  assert.deepEqual(row.slice(0,4).map(cell=>cell.flag),[3,3,7,7]);
  markNativeGridScaffold(row,150,180,40);assert.equal(row.at(-1).flag,7);
  assert.equal(bindNativeGridRow(null,[],0,150).length,103);
  assert.equal(bindNativeGridRow(null,[],0,150,{capacity:150}).length,150);
  assert.equal(bindNativeGridRow(null,[],0,1)[0].flag,-7);
});

test('native floor/lobby misalignment and SECOM tiles preserve absolute source phase',()=>{
  assert.deepEqual(Array.from({length:8},(_,offset)=>nativeGridColumn(24,5,5+offset)),[34,35,36,8,9,10,11,12]);
  assert.deepEqual(Array.from({length:4},(_,offset)=>nativeGridColumn(0,6,6+offset)),[32,33,8,9]);
  assert.equal(nativeGridColumn(0,31,32),0);
  assert.deepEqual(Array.from({length:5},(_,offset)=>nativeGridColumn(45,6,6+offset)),[2,3,0,1,2]);
});

test('scaffold overlay copies source indexed ink and preserves zero-index background exactly',()=>{
  const destination=Uint8Array.from([188,3,194,203,0,255,19,7]);
  assert.deepEqual([...mergeNativeIndexedOverlay(destination,Uint8Array.from([0,5,0,0,24,0,17,0]))],[188,5,194,203,24,255,17,7]);
  assert.throws(()=>mergeNativeIndexedOverlay(new Uint8Array(2),new Uint8Array(1)));
});

import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
test('Tower grid callbacks mark only new structure and rebind completed or removed native records',()=>{
  const tower=new Tower(data,{sandbox:true}),calls=[];
  tower.nativeGridHook=event=>calls.push(structuredClone(event));
  assert.equal(tower.build('lobby',0,40,100).ok,true);
  assert.deepEqual(calls.pop(),{rebind:true,redraw:true});
  assert.deepEqual(calls.pop(),{floor:0,spans:[{start:40,end:101}]});
  tower.build('floor',1,50,90);assert.deepEqual(calls.pop(),{rebind:true,redraw:true});assert.deepEqual(calls.pop(),{floor:1,spans:[{start:50,end:91}]});
  tower.build('floor',1,45,95);assert.deepEqual(calls.pop(),{floor:1,spans:[{start:45,end:50},{start:91,end:96}]});
  tower.build('office',1,50);assert.deepEqual(calls.pop(),{floor:1,spans:[]});
  const office=tower.state.rooms[0];tower.finishConstruction();assert.deepEqual(calls.pop(),{floor:1,spans:[]});
  tower.removeRoom(office);assert.deepEqual(calls.pop(),{floor:1,spans:[]});
  assert.equal(tower.save().includes('nativeGridHook'),false);
});

test('Tower extending a shaft marks new floor cells but retracting leaves the grid untouched',()=>{
  const tower=new Tower(data,{sandbox:true}),calls=[];
  tower.build('lobby',0,40,100);tower.build('floor',1,50,90);tower.build('elevator',0,70,70,1);
  tower.nativeGridHook=event=>calls.push(event);
  const shaft=tower.state.shafts[0];tower.resizeShaft(shaft.id,0,2);
  assert.deepEqual(calls,[{floor:2,spans:[{start:70,end:74}]},{rebind:true,redraw:true}]);
  calls.length=0;tower.resizeShaft(shaft.id,0,1);assert.deepEqual(calls,[]);
  assert.deepEqual(tower.state.floors[2],{x:70,width:4,lobby:false});
});

test('native crane refresh depends on actual placement and follows all row scaffold marks',()=>{
  const tower=new Tower(data,{sandbox:true}),calls=[];
  tower.nativeGridHook=event=>calls.push(structuredClone(event));
  tower.build('lobby',0,40,44);assert.equal(tower.state.crane,null);assert.equal(calls.some(event=>event.rebind),false);
  calls.length=0;tower.build('floor',1,40,44);assert.equal(tower.state.crane,null);assert.deepEqual(calls,[{floor:1,spans:[{start:40,end:45}]}]);
  calls.length=0;tower.build('lobby',0,20,100);assert.equal(tower.state.crane,null);assert.equal(calls.some(event=>event.rebind),false);
  calls.length=0;tower.build('floor',1,40,46);
  assert.deepEqual(tower.state.crane,{floor:1,x:40});assert.deepEqual(calls,[{floor:1,spans:[{start:45,end:47}]},{rebind:true,redraw:true}]);
  calls.length=0;tower.build('floor',1,30,46);
  assert.deepEqual(tower.state.crane,{floor:1,x:40});assert.deepEqual(calls,[{floor:1,spans:[{start:30,end:40}]}],'same highest floor keeps its earlier crane x');
  calls.length=0;tower.build('floor',2,40,44);
  assert.equal(tower.state.crane,null);assert.deepEqual(calls,[{floor:2,spans:[{start:40,end:45}]},{rebind:true,redraw:true}],'a narrow new highest floor clears the existing crane');
});

import {OriginalFacadeGrid} from '../src/original-facade-grid.js';
test('crane-triggered full row bind cancels unpaused scaffold flags and preserves them while paused',()=>{
  for(const paused of [false,true]) {
    const tower=new Tower(data,{sandbox:true}),grid=new OriginalFacadeGrid(),viewport={left:0,right:800,top:-108,bottom:0};
    tower.build('lobby',0,40,100);grid.sync(tower.state,viewport,{paused});
    tower.nativeGridHook=event=>{
      if(event.rebind)grid.refresh(tower.state,viewport,{paused,rebind:true});
      else grid.bind(tower.state,viewport,event,{paused});
    };
    tower.build('floor',1,50,90);
    assert.equal(grid.rows.get(1).cells[50].flag,paused?3:7);
    assert.equal(grid.redraw(0,{paused}).some(part=>part.floor===1),paused);
    assert.equal(grid.rows.get(1).cells[50].flag,paused?3:-1);
  }
});
