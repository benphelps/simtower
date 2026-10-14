import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {findRoute,accessCost,lateralStress,transferLobby,STAIR_SPAN,ESCALATOR_SPAN} from '../src/original-routes.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function world(top=35){return {floors:Object.fromEntries(Array.from({length:top+1},(_,i)=>[i,{x:0,width:200,lobby:i===0}])),shafts:[],links:[],people:[]};}
function lift(s,id,low,high,x=40,key='elevator'){const sh={id,key,x,width:4,low,high,stops:Array.from({length:high-low+1},(_,i)=>low+i)};s.shafts.push(sh);return sh;}
function links(s,count,type='stairs'){for(let floor=1;floor<=count;floor++)s.links.push({id:100+floor,floor,x:20,width:8,key:type});}
test('native stairs reach three transitions/four floor levels and reject a fourth in both directions',()=>{
  const s=world();links(s,4);assert.equal(STAIR_SPAN,3);
  assert.equal(findRoute(s,0,3).length,3);assert.equal(findRoute(s,3,0).length,3);
  assert.equal(findRoute(s,0,4),null);assert.equal(findRoute(s,4,0),null);
});
test('native escalators reach six transitions/seven levels; any necessary stair reduces the span',()=>{
  const s=world();links(s,7,'escalator');assert.equal(ESCALATOR_SPAN,6);
  assert.equal(findRoute(s,0,6).length,6);assert.equal(findRoute(s,6,0).length,6);assert.equal(findRoute(s,0,7),null);
  s.links[3].key='stairs';assert.equal(findRoute(s,0,6),null);
  assert.equal(findRoute(s,3,6).length,3);
});
test('a nearby usable escalator is chosen before both local and express elevator requests',()=>{
  const s=world();links(s,2,'escalator');lift(s,1,0,2,21);lift(s,2,0,2,20,'express');
  assert.deepEqual(findRoute(s,0,2,false,20).map(e=>e.type),['escalator','escalator']);
});
test('equivalent lifts are selected by traveller position rather than construction order',()=>{
  const s=world();lift(s,1,0,10,10);lift(s,2,0,10,100);
  assert.equal(findRoute(s,0,10,false,99)[0].id,2);assert.equal(findRoute(s,0,10,false,11)[0].id,1);
});
test('a full directional ring adds native cost; only the requested direction affects choice',()=>{
  const s=world();lift(s,1,0,10,10);lift(s,2,0,10,30);
  s.people=Array.from({length:40},(_,id)=>({id,floor:0,stage:'queue',path:[{id:1,kind:'elevator',to:10}]}));
  assert.equal(findRoute(s,0,10,false,11)[0].id,2);
  for(const p of s.people){p.floor=10;p.path[0].to=0;}
  assert.equal(findRoute(s,0,10,false,11)[0].id,1);
  assert.equal(accessCost('elevator',0,39),640);assert.equal(accessCost('elevator',0,40),1000);
  assert.equal(accessCost('elevator',0,39,true),3000);assert.equal(accessCost('elevator',0,40,true),6000);
  assert.equal(accessCost('express',100,5),5);
});
test('one elevator change is allowed at a built sky lobby; an arbitrary shared floor is insufficient',()=>{
  const s=world();lift(s,1,0,14);lift(s,2,14,29,70);
  assert.equal(findRoute(s,0,29),null);s.floors[14].lobby=true;
  assert.deepEqual(findRoute(s,0,29).map(e=>[e.from,e.to]),[[0,14],[14,29]]);
  assert.equal(transferLobby(s,14),true);assert.equal(transferLobby(s,2),false);
  s.floors[2].lobby=true;assert.equal(transferLobby(s,2),false);
});
test('native indirect access uses transfer penalty on the first lift, without summing later lift access',()=>{
  const s=world(29);s.floors[14].lobby=true;
  lift(s,1,0,14,0);lift(s,2,14,29,1,'express');lift(s,3,0,29,100);
  assert.equal(findRoute(s,0,29,false,0)[0].id,3);
  s.shafts.pop();assert.deepEqual(findRoute(s,0,29,false,0).map(e=>e.id),[1,2]);
});
test('a third elevator ride is refused even if all shafts share built lobbies',()=>{
  const s=world(45);s.floors[14].lobby=true;s.floors[29].lobby=true;
  lift(s,1,0,14);lift(s,2,14,29,70);lift(s,3,29,44,100);
  assert.equal(findRoute(s,0,44),null);
});
test('native stair/lift components require a registered lobby handoff rather than an ordinary shared floor',()=>{
  const s=world();links(s,2);lift(s,1,2,10);
  assert.equal(findRoute(s,0,10),null);
  assert.equal(findRoute(s,10,0),null);
  s.shafts=[];lift(s,2,0,14);s.floors[14].lobby=true;s.links=[{id:90,key:'stairs',floor:15,x:20,width:8}];
  assert.deepEqual(findRoute(s,0,15).map(e=>e.kind),['elevator','stairs']);
});
test('service workers use service shafts and tenants cannot use them',()=>{
  const s=world();lift(s,1,0,10,10,'service');links(s,3,'escalator');
  assert.equal(findRoute(s,0,10),null);assert.equal(findRoute(s,0,10,true)[0].id,1);
  s.shafts=[];assert.equal(findRoute(s,0,3,true),null);
});
test('native lateral stress and PART stair/escalator costs are charged once per traversed link',()=>{
  assert.equal(lateralStress(79),0);assert.equal(lateralStress(80),30);assert.equal(lateralStress(124),30);assert.equal(lateralStress(125),60);
  assert.deepEqual(data.transport,{queueTimeout:300,fullQueueStress:5,boardingFailureStress:0,noRouteStress:300,escalatorStress:16,stairStress:35});
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,0,199);t.build('floor',1,0,199);t.build('office',1,100);t.build('stairs',1,10);
  const r=t.state.rooms[0],p=t.spawn(r,0,1);p.x=p.path[0].x;t.updatePeople(.5);assert.equal(p.tripDelay,35);
  t.state.links=[];t.build('elevator',0,81,81,1);
  assert.equal(t.spawn(r,0,1).tripDelay,0); // 79 cells to native shaft access.
  t.state.shafts[0].x=82;assert.equal(t.spawn(r,0,1).tripDelay,30);
});
test('spawn passes actual departure location to routing and paths remain deterministic in browser saves',()=>{
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,0,199);t.build('floor',1,0,199);t.build('office',1,150);
  t.build('elevator',0,10,10,1);t.build('elevator',0,130,130,1);
  const p=t.spawn(t.state.rooms[0],1,0);assert.equal(p.path[0].id,t.state.shafts[1].id);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
});
