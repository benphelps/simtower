import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { Tower } from '../src/simulation.js';
import {initialLobbyHeight,lobbyHeight,lobbyGraphic,lobbyColumn,lobbySlices,lobbyCanopies,lobbyLinkPlacement,tallLobbyLinkSlices,cranePlacement} from '../src/original-lobbies.js';

test('native first lobby modifiers select fixed single/double/triple height',()=>{
  const state={floors:{}};
  assert.equal(initialLobbyHeight(state),1);assert.equal(initialLobbyHeight(state,{shiftKey:true}),1);
  assert.equal(initialLobbyHeight(state,{ctrlKey:true}),2);assert.equal(initialLobbyHeight(state,{ctrlKey:true,shiftKey:true}),3);
  state.floors[0]={lobby:true};state.lobbyHeight=2;
  assert.equal(initialLobbyHeight(state,{ctrlKey:true,shiftKey:true}),2);
});
test('legacy browser lobby height inference and explicit native flag agree',()=>{
  assert.equal(lobbyHeight({floors:{0:{lobby:true}}}),1);
  assert.equal(lobbyHeight({floors:{0:{lobby:true},1:{lobby:true}}}),2);
  assert.equal(lobbyHeight({floors:{0:{lobby:true},1:{lobby:true},2:{lobby:true}}}),3);
});
test('native lobby layers use their respective strips and source blocks at all rating tiers',()=>{
  for(const [star,delta] of [[1,0],[2,0],[3,1],[4,2],[5,2]]) {
    assert.deepEqual(lobbyGraphic(star,0,1),{sheet:2536+delta,columnOffset:0});
    assert.deepEqual(lobbyGraphic(star,0,2),{sheet:2536+delta,columnOffset:82});
    assert.deepEqual(lobbyGraphic(star,1,2),{sheet:2600+delta,columnOffset:0});
    assert.deepEqual(lobbyGraphic(star,0,3),{sheet:2536+delta,columnOffset:82});
    assert.deepEqual(lobbyGraphic(star,1,3),{sheet:2600+delta,columnOffset:41});
    assert.deepEqual(lobbyGraphic(star,2,3),{sheet:2664+delta,columnOffset:0});
    assert.deepEqual(lobbyGraphic(star,14,3),{sheet:2536+delta,columnOffset:41});
  }
});
test('native column cadence remains tied to site coordinates after lobby merging or viewport changes',()=>{
  assert.deepEqual(Array.from({length:35},(_,i)=>lobbyColumn(32+i,32)),[...Array.from({length:32},(_,i)=>i),0,1,2]);
  assert.deepEqual(Array.from({length:5},(_,i)=>lobbyColumn(5+i,5)),[34,35,36,8,9]);
  assert.deepEqual(Array.from({length:4},(_,i)=>lobbyColumn(6+i,6)),[32,33,8,9]);
  assert.equal(lobbyColumn(40,32),lobbyColumn(40,0));
});
test('all emitted lobby source slices fit original resources, including narrow unaligned lobbies',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
  for(const height of [1,2,3])for(const star of [1,3,5])for(const x of [0,5,6,31,40])for(const floor of [...Array.from({length:height},(_,i)=>i),14]) {
    const slices=lobbySlices({x,width:67},floor,star,height);assert.equal(slices.length,67);
    for(const slice of slices){
      const asset=manifest.resources.find(r=>r.id===slice.sheet&&r.format==='CGPk');
      assert.ok(asset);assert.ok(slice.sx>=0&&slice.sx+slice.width<=asset.width);assert.equal(slice.height,asset.height);
    }
  }
});

test('native ground canopies use exact halves and remain on ground for taller lobbies',()=>{
  assert.deepEqual(lobbyCanopies({x:40,width:100,lobby:true}),[
    {sheet:1001,x:264,y:-36,sx:0,sy:0,width:56,height:36},
    {sheet:1001,x:1120,y:-36,sx:56,sy:0,width:56,height:36},
  ]);
  assert.deepEqual(lobbyCanopies({x:40,width:100,lobby:true},14),[]);
});

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
test('Tower first-lobby plans preview multiple storeys without mutating state and charge once per storey',()=>{
  for(const [height,modifiers] of [[1,{}],[2,{ctrlKey:true}],[3,{ctrlKey:true,shiftKey:true}]]) {
    const t=new Tower(data),before=t.save();
    const plan=t.plan('lobby',0,40,59,0,modifiers);assert.equal(plan.cost,height*100000);
    assert.deepEqual(plan.additions.map(a=>a.level),Array.from({length:height},(_,i)=>i));assert.equal(t.save(),before);
    assert.equal(t.build('lobby',0,40,59,0,modifiers).ok,true);assert.equal(t.state.lobbyHeight,height);
    for(let floor=0;floor<height;floor++)assert.deepEqual({x:t.bounds(floor).x,width:t.bounds(floor).width,lobby:t.bounds(floor).lobby},{x:40,width:20,lobby:true});
    assert.equal(t.state.cash,2000000-height*100000);
  }
});
test('Tower lobby extensions preserve fixed native height, grow all storeys and charge only added width',()=>{
  const t=new Tower(data);t.build('lobby',0,40,59,0,{ctrlKey:true});
  const result=t.build('lobby',0,60,69,0,{ctrlKey:true,shiftKey:true});assert.equal(result.cost,100000);
  assert.equal(t.state.lobbyHeight,2);assert.equal(t.bounds(2),undefined);
  for(const floor of [0,1])assert.deepEqual({x:t.bounds(floor).x,width:t.bounds(floor).width,lobby:t.bounds(floor).lobby},{x:40,width:30,lobby:true});
});
test('failed first-lobby construction does not freeze the modifier-selected height',()=>{
  const t=new Tower(data);t.state.cash=1;const before=t.save();
  assert.match(t.build('lobby',0,40,59,0,{ctrlKey:true,shiftKey:true}).error,/money/);assert.equal(t.save(),before);
  t.state.cash=2000000;assert.equal(t.build('lobby',0,40,59).ok,true);assert.equal(t.state.lobbyHeight,1);
});
test('browser save round-trip retains taller lobby records and fixed height',()=>{
  const t=new Tower(data);t.build('lobby',0,40,59,0,{ctrlKey:true,shiftKey:true});
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.state.lobbyHeight,3);assert.equal(copy.save(),t.save());
});

test('links constructed inside tall lobbies normalize to ground-to-next-storey spans',()=>{
  for(const height of [2,3]){
    const state={floors:{0:{lobby:true}},lobbyHeight:height};
    for(let floor=1;floor<=height;floor++)assert.deepEqual(lobbyLinkPlacement(state,floor),{floor:height,span:height});
    assert.deepEqual(lobbyLinkPlacement(state,0),{floor:0,span:1});
    assert.deepEqual(lobbyLinkPlacement(state,height+1),{floor:height+1,span:1});
  }
});
test('tall transportation resource frame layout matches native per-level stepping and timing',()=>{
  const metadata=JSON.parse(readFileSync(new URL('../public/assets/lobby-transports.json',import.meta.url)));
  for(const span of [2,3])for(const key of ['stairs','escalator'])for(const active of [false,true]){
    const link={span,key,floor:span,x:40,width:8};
    const slices=tallLobbyLinkSlices(link,10,{up:Number(active),down:0});assert.equal(slices.length,span+1);
    const frames=key==='stairs'?11:12,base=key==='stairs'?0:(span+1)*11,anim=active?10%(frames-1)+1:0;
    assert.equal(slices[0].sx,(base+anim)*64);
    for(let level=0;level<slices.length;level++){
      assert.equal(slices[level].sx,(base+anim+level*frames)*64);
      assert.equal(slices[level].y,-(span+1-level)*36);
      assert.ok(slices[level].sx+64<=metadata.find(r=>r.id===slices[level].sheet).width);
    }
  }
});

test('native crane anchors at left edge, remains on same-floor extensions, and disappears on a narrow new top',()=>{
  const floors={0:{x:40,width:20}},first=cranePlacement(floors);assert.deepEqual(first,{floor:0,x:40});
  floors[0]={x:30,width:40};assert.equal(cranePlacement(floors,first),first);
  floors[1]={x:32,width:12};const next=cranePlacement(floors,first);assert.deepEqual(next,{floor:1,x:32});
  floors[2]={x:36,width:6};assert.equal(cranePlacement(floors,next),null);
  floors[2].width=7;assert.deepEqual(cranePlacement(floors),{floor:2,x:36});
});

test('Tower tall lobby links connect ground to next storey in one span and use decoded original multi-level art',()=>{
  for(const height of [2,3])for(const key of ['stairs','escalator']){
    const t=new Tower(data,{sandbox:true});t.build('lobby',0,40,99,0,{ctrlKey:true,shiftKey:height===3});
    assert.equal(t.build('floor',height,40,99).ok,true);assert.equal(t.build(key,1,50).ok,true);
    const link=t.state.links[0];assert.equal(link.floor,height);assert.equal(link.span,height);
    assert.deepEqual(t.route(0,height).map(e=>[e.from,e.to]),[[0,height]]);
    assert.deepEqual(t.route(height,0).map(e=>[e.from,e.to]),[[height,0]]);
    const slices=tallLobbyLinkSlices(link,t.state.tick);assert.equal(slices.length,height+1);
    assert.equal(slices[0].sheet,height===2?4073:4074);
  }
});
