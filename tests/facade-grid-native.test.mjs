import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {OriginalFacadeGrid,nativeFacadeRecords,nativeRoomFacadeParts,nativeFacadeHeaderSprites,nativeRubbleSprites} from '../src/original-facade-grid.js';
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

test('completed physical metro and recycling floor records remain in the facade grid without tenant registrations',()=>{
  const metro={id:1,key:'metro',x:20,floor:-1,width:36,height:3,constructionRemaining:0};
  assert.deepEqual(nativeRoomFacadeParts(metro).map(part=>part.type),[31,32,33]);
  const state={rooms:[metro],floors:{'-1':{x:20,width:36},'-2':{x:20,width:36},'-3':{x:20,width:36}}};
  for(const [level,type]of [31,32,33].entries())assert.equal(nativeFacadeRecords(state,-1-level)[0].type,type);
  assert.deepEqual(nativeRoomFacadeParts({id:2,key:'recycling',x:20,floor:-1,width:25,height:2}).map(part=>part.type),[20,21]);
});

test('completed24px native facade records receive original5000 headers with per-record cinema tile restarts',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url))),assets=new Map(manifest.resources.filter(r=>r.path.endsWith('.png')).map(r=>[r.id,r]));
  const office={id:1,key:'office',x:88,floor:1,width:9,constructionRemaining:0,tenantState:1};
  assert.deepEqual(nativeFacadeHeaderSprites(office,assets),[{sheet:5000,x:704,y:-72,sx:0,sy:0,width:72,height:12}]);
  const cinema={id:2,key:'cinema',x:44,floor:4,width:31,height:2,constructionRemaining:0};
  assert.deepEqual(nativeFacadeHeaderSprites(cinema,assets),[
    {sheet:5000,x:352,y:-180,sx:0,sy:0,width:56,height:12},
    {sheet:5000,x:408,y:-180,sx:0,sy:0,width:128,height:12},
    {sheet:5000,x:536,y:-180,sx:0,sy:0,width:64,height:12}]);
  assert.deepEqual(nativeFacadeHeaderSprites({key:'secom',x:20,width:4,floor:1},assets),[],'full36px sources have no extra ceiling');
  assert.equal(nativeFacadeHeaderSprites({key:'recycling',x:20,width:25,floor:-1,height:2},assets).length,2,'2280 base60px format also receives the original ceiling');
  const calls=[],renderer={assets,sprite:(...args)=>calls.push(args)};
  Renderer.prototype.room.call(renderer,office,{state:{tick:0}},false);
  assert.deepEqual(calls[0],[5000,704,-72,72,12,0,0,72,12]);assert.equal(calls[1][0],1448);
});

test('native retained-buffer margin samples actual pending records and consumes their dirty bytes without extending client bounds',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,20,120);
  for(const floor of [1,2,3,4,5,-1,-2])tower.build('floor',floor,20,120);
  for(const [key,floor,x]of [['office',1,100],['recycling',-1,20],['office',5,40]])assert.equal(tower.build(key,floor,x).ok,true);
  const grid=new OriginalFacadeGrid();grid.sync(tower.state,viewport);
  assert.equal(grid.rows.get(1).cells.length,81,'640px client reserves81 native8px columns');
  assert.ok(grid.rows.has(-1));assert.equal(grid.rows.has(-2),false,'180px client reserves6 native36px rows');
  const calls=[],nativeRandom=tower.randomInt.bind(tower);tower.randomInt=max=>{calls.push(max);return nativeRandom(max);};
  const renderer=Object.assign(Object.create(Renderer.prototype),{facadeGrid:grid,interiorPoses:new Map(),showPeople:false});
  renderer.sampleInteriors(tower,viewport);
  assert.deepEqual(calls,[8,6,24,6],'rightmost clipped column then bottom clipped row retain native scan order');
  assert.deepEqual([...renderer.interiorPoses.keys()],tower.state.rooms.slice(0,2).map(room=>`${room.id}:0`));
  for(const room of tower.state.rooms.slice(0,2))assert.equal(nativeInteriorRecord(room).dirty,0,'A933 normal margin cell consumes roomdirty');
  assert.equal(nativeInteriorRecord(tower.state.rooms[2]).dirty,1,'outside buffer remains dirty and consumes no RNG');
  grid.redraw(tower.state.elapsedTicks);renderer.sampleInteriors(tower,viewport);assert.equal(calls.length,4);
  assert.deepEqual(viewport,{left:160,right:800,top:-180,bottom:0},'source sampling never changes the actual client paint rectangle');
});


test('native damage type47 retains physical record identity and the source5000 ceiling above4008 rubble',()=>{
  const rubble={floor:1,x:20,width:25},state={floors:{1:{x:20,width:100}},rooms:[],rubble:[rubble]};
  assert.deepEqual(nativeFacadeRecords(state,1)[0],{id:'rubble:1:20',start:20,end:45,type:47});
  assert.deepEqual(nativeRubbleSprites(rubble),[
    {sheet:5000,x:160,y:-72,sx:0,sy:0,width:128,height:12},
    {sheet:5000,x:288,y:-72,sx:0,sy:0,width:72,height:12},
    {sheet:4008,x:160,y:-60,sx:0,sy:0,width:200,height:24}]);
});
