import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {OriginalFacadeGrid,nativeFacadeRecords} from '../src/original-facade-grid.js';
import {Renderer} from '../src/renderer.js';
import {nativeInteriorRecord} from '../src/original-interiors.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
const viewport={left:160,right:800,top:-180,bottom:0};
function fixture(){const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,20,100);tower.build('floor',1,20,100);
  const grid=new OriginalFacadeGrid();grid.sync(tower.state,viewport);grid.redraw(tower.state.elapsedTicks);
  tower.nativeGridHook=event=>grid.bind(tower.state,viewport,event);return {tower,grid};}

test('real structural build retains the previous facade until a native tick, then draws four source overlays',()=>{
  const {tower,grid}=fixture();assert.equal(tower.build('floor',2,20,100).ok,true);
  let overlays=grid.redraw(tower.state.elapsedTicks);assert.ok(overlays.length>0);assert.ok(overlays.every(part=>!part.ink));
  const row=grid.rows.get(2);assert.equal(row.cells[0].flag,3);
  for(let pass=0;pass<4;pass++){
    tower.step();overlays=grid.redraw(tower.state.elapsedTicks);assert.ok(overlays.every(part=>part.ink));
    assert.equal(row.cells[0].flag,4+pass);
    grid.redraw(tower.state.elapsedTicks);assert.equal(row.cells[0].flag,4+pass,'extra browser paint cannot consume another native pass');
  }
  tower.step();assert.deepEqual(grid.redraw(tower.state.elapsedTicks),[]);assert.equal(row.cells[0].flag,-1);
});

test('native explicit redraw can replay at the same tick while Pause preserves scaffold flags',()=>{
  const {tower,grid}=fixture();tower.build('floor',2,20,100);
  grid.refresh(tower.state,viewport);assert.ok(grid.redraw(tower.state.elapsedTicks).every(part=>part.ink));
  assert.equal(grid.rows.get(2).cells[0].flag,4);
  grid.refresh(tower.state,viewport,{paused:true});grid.redraw(tower.state.elapsedTicks,{paused:true});
  assert.equal(grid.rows.get(2).cells[0].flag,4);
  grid.refresh(tower.state,viewport,{paused:true,rebind:true});grid.redraw(tower.state.elapsedTicks,{paused:true});
  assert.equal(grid.rows.get(2).cells[0].flag,4,'9D89 preserves3..6 only when paused');
  grid.refresh(tower.state,viewport,{rebind:true});assert.deepEqual(grid.redraw(tower.state.elapsedTicks),[]);
});

test('ordinary facility row rebind cancels prior unpaused scaffold but does not start another fade',()=>{
  const {tower,grid}=fixture();tower.build('floor',2,20,100);tower.step();grid.redraw(tower.state.elapsedTicks);
  assert.equal(tower.build('office',2,40).ok,true);
  assert.deepEqual(grid.redraw(tower.state.elapsedTicks),[]);assert.equal(grid.rows.get(2).cells[0].flag,7);
  const office=tower.state.rooms.find(room=>room.key==='office');assert.deepEqual(nativeFacadeRecords(tower.state,2).find(record=>record.id.startsWith(`${office.id}:`)),{id:`${office.id}:7:40`,start:40,end:49,type:7});
});

test('offscreen new floors do not carry GUI scaffold state into a later camera visit',()=>{
  const {tower,grid}=fixture();tower.build('floor',-1,20,100);
  grid.sync(tower.state,{...viewport,top:-36,bottom:72});assert.deepEqual(grid.redraw(tower.state.elapsedTicks),[]);
});

test('AA87 samples a fully scaffold-covered builder before drawing but preserves its dirty byte until a normal cell',()=>{
  const {tower,grid}=fixture();assert.equal(tower.build('office',2,20).ok,true);
  const room=tower.state.rooms[0],calls=[],view={state:tower.state,randomInt:max=>{calls.push(max);return 0;}},renderer={facadeGrid:grid,interiorPoses:new Map(),showPeople:false};
  tower.step();Renderer.prototype.sampleInteriors.call(renderer,view,viewport);grid.redraw(tower.state.elapsedTicks);
  assert.deepEqual(calls,[8,6]);assert.equal(nativeInteriorRecord(room).dirty,1);
  Renderer.prototype.sampleInteriors.call(renderer,view,viewport);assert.equal(calls.length,2,'retained dirty alone does not invent a browser A1EE');
  grid.refresh(tower.state,viewport,{paused:true});Renderer.prototype.sampleInteriors.call(renderer,view,viewport);grid.redraw(tower.state.elapsedTicks,{paused:true});
  assert.deepEqual(calls,[8,6,8,6],'explicit same-tick paused A1EE samples before the scaffold switch');
  assert.equal(nativeInteriorRecord(room).dirty,1);
  const row=grid.rows.get(2);row.cells[0].flag=7;grid.refresh(tower.state,viewport);
  Renderer.prototype.sampleInteriors.call(renderer,view,viewport);assert.equal(nativeInteriorRecord(room).dirty,0,'A933 consumes+13 once any facility cell is drawn');
});

test('explicit A1EE redraw replays an unchanged native cohort at the same tick without treating browser repaints as source calls',()=>{
  const {tower,grid}=fixture();tower.build('office',1,40);tower.finishAllConstruction();
  const room=tower.state.rooms[0];room.tenantState=1;room.occupied=true;
  tower.state.actors[0].state=0;tower.state.actors[0].trip=null;tower.state.tick=(16-room.nativeTenantIndex%16)%16;
  const calls=[],view={state:tower.state,randomInt:max=>{calls.push(max);return 0;}},renderer={facadeGrid:grid,interiorPoses:new Map(),showPeople:true};
  grid.refresh(tower.state,viewport);Renderer.prototype.sampleInteriors.call(renderer,view,viewport);grid.redraw(tower.state.elapsedTicks);
  const first=calls.length;assert.ok(first>0);Renderer.prototype.sampleInteriors.call(renderer,view,viewport);assert.equal(calls.length,first);
  grid.refresh(tower.state,viewport);Renderer.prototype.sampleInteriors.call(renderer,view,viewport);assert.equal(calls.length,first*2,'6BC2 does not deduplicate explicit GUI A1EE by native tick');
});

test('renderer restores pre-transport cells and copies original indexed scaffold once per retained image',()=>{
  const {tower,grid}=fixture();tower.build('floor',2,20,100);tower.step();
  const calls=[],facadeCanvas={width:640,height:180},backgroundCanvas={width:640,height:180};
  const renderer={facadeGrid:grid,canvas:{width:640,height:180},width:640,height:180,camera:{x:480,y:-90},zoom:1,
    facadeCanvas,backgroundCanvas,facadeViewKey:'480:-90:1:640:180',ctx:{drawImage:(...args)=>calls.push(['restore',...args])},
    facadeContext:{drawImage:(...args)=>calls.push(['retain',...args])},sprite:(...args)=>calls.push(['ink',...args])};
  Renderer.prototype.retainFacade.call(renderer,tower,viewport);
  assert.equal(calls[0][0],'restore');assert.equal(calls[0][1],facadeCanvas);assert.deepEqual(calls[1],['ink',3624,160,-108,8,36,272,0,8,36]);
  assert.equal(calls.at(-1)[0],'retain');assert.equal(calls.at(-1)[1],renderer.canvas);
});

test('synchronous native GUI redraw restores phase flags, skips palette calls, and limits background refresh toF296',()=>{
  const tower={},calls=[],renderer=Object.assign(Object.create(Renderer.prototype),{
    guiCapture:true,nativeTickFrame:true,nativeGuiRedraw:false,
    refreshNativeGrid:(actual,options)=>calls.push(['refresh',actual,options]),
    render(actual,elapsed,options){assert.equal(this.guiCapture,false);assert.equal(this.nativeTickFrame,false);assert.equal(this.nativeGuiRedraw,true);
      assert.equal(this.updateEffects(1000),false);calls.push(['render',actual,options]);}
  });
  renderer.drawNativeGui(tower);assert.deepEqual(calls.map(call=>[call[0],call[2]]),[['refresh',{rebind:false}],['render',{palette:false,sky:false,backgroundRefresh:false}]]);
  assert.equal(renderer.guiCapture,true);assert.equal(renderer.nativeTickFrame,true);assert.equal(renderer.nativeGuiRedraw,false);
  calls.length=0;renderer.drawNativeGui(tower,{rebind:true});assert.deepEqual(calls[1][2],{palette:false,sky:false,backgroundRefresh:true});
  renderer.render=()=>{throw new Error('draw failed');};assert.throws(()=>renderer.drawNativeGui(tower),/draw failed/);
  assert.equal(renderer.guiCapture,true);assert.equal(renderer.nativeTickFrame,true);assert.equal(renderer.nativeGuiRedraw,false);
  delete renderer.nativeGuiRedraw;assert.throws(()=>renderer.drawNativeGui(tower),/draw failed/);assert.equal(Object.hasOwn(renderer,'nativeGuiRedraw'),false);
});

test('source redraw callbacks synchronously finish native cohort sampling before construction returns',()=>{
  const {tower,grid}=fixture(),calls=[];
  const renderer=Object.assign(Object.create(Renderer.prototype),{
    facadeGrid:grid,facadeViewport:()=>viewport,drawNativeGui:(actual,options)=>calls.push(['draw',actual,options])
  });
  renderer.bindNativeGrid(tower,{floor:1,spans:[],redraw:true,rebind:true});
  assert.deepEqual(calls,[['draw',tower,{rebind:true}]]);
  renderer.bindNativeGrid(tower,{floor:1,spans:[]});assert.equal(calls.length,1,'ordinary row mutation must not draw');
});
