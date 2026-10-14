import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors,beginActorTrip} from '../src/original-people.js';
import {queueTimeoutExpired,queuePrefix,interruptionState,activeLinkCounts,linkAnimationFrame} from '../src/original-journeys.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function tower(){const t=new Tower(data,{sandbox:true});t.build('lobby',0,0,99);t.build('floor',1,0,99);t.build('office',1,10);t.finishConstruction();t.admitTenant(t.state.rooms[0]);t.build('elevator',0,70,70,1);syncActors(t);return t;}
test('native timeout uses the zero sentinel and signed unwrapped clock comparison',()=>{
  assert.equal(queueTimeoutExpired(309,10),false);assert.equal(queueTimeoutExpired(310,10),true);
  assert.equal(queueTimeoutExpired(1000,0),false);assert.equal(queueTimeoutExpired(10,2590),false);
});
test('timeout removes only its directional FIFO prefix in ring order',()=>{
  const p=(id,queueOrder,floor,to,shaft=1)=>({id,queueOrder,floor,stage:'queue',path:[{id:shaft,to}]});
  const a=p(1,1,0,5),b=p(2,2,0,5),c=p(3,3,0,5),other=p(4,0,0,-2),floor=p(5,0,1,5),shaft=p(6,0,0,5,2);
  assert.deepEqual(queuePrefix([c,other,shaft,b,floor,a],b).map(p=>p.id),[1,2]);
});
test('queued trip interruption keeps native purpose-specific recovery and parking',()=>{
  assert.equal(interruptionState('office','lunch-arrival').state,5);assert.equal(interruptionState('office','lunch-arrival').releaseParking,false);
  assert.equal(interruptionState('office','lunch-return').state,38);assert.equal(interruptionState('office','lunch-return').releaseParking,true);
  assert.equal(interruptionState('condo','home').state,4);
  assert.equal(interruptionState('suite','arrival').state,4);assert.equal(interruptionState('suite','departure').failVIP,true);
  assert.equal(interruptionState('housekeeping','clean-arrival').recordStress,false);
});
test('Tower timeout on an actor cohort clears its prefix, records delay and leaves later waiters',()=>{
  const t=tower(),r=t.state.rooms[0],actors=t.state.actors.slice(0,3),people=[];
  for(const [index,a] of actors.entries()) {
    beginActorTrip(t,a,r,0,1,index===0?'arrival':'lunch-arrival');
    const p=t.state.people.find(p=>p.id===a.trip);p.stage='queue';p.x=p.path[0].x;p.queueOrder=index;p.queueTick=10;people.push(p);
  }
  t.state.tick=310;actors[1].slot=310%16;actors[0].slot=311%16;actors[2].slot=312%16;
  t.updatePeople(.5);
  assert.equal(actors[0].state,38);assert.equal(actors[1].state,5);assert.equal(actors[0].trip,null);assert.equal(actors[1].trip,null);
  assert.equal(actors[0].delay,300);assert.equal(actors[1].delay,300);assert.equal(r.trips[0].trips,1);
  assert.deepEqual(t.state.people.map(p=>p.id),[people[2].id]);assert.equal(people[2].stage,'queue');
});
test('native link usage lasts until the next actor cohort and selects original busy animation',()=>{
  const t=tower(),r=t.state.rooms[0],a=t.state.actors[0];t.state.shafts=[];t.build('stairs',1,40);
  beginActorTrip(t,a,r,0,1,'arrival');const p=t.state.people[0],id=t.state.links[0].id;
  t.state.tick=100;p.x=p.path[0].x;t.updatePeople(.5);
  assert.equal(p.stage,'link');assert.equal(p.floor,1);assert.deepEqual(activeLinkCounts(t.state.people,id),{up:1,down:0});
  assert.equal(linkAnimationFrame('stairs',100,activeLinkCounts(t.state.people,id)),10);
  t.state.tick=101;t.updatePeople(.5);assert.equal(p.stage,'link');
  t.state.tick=112;t.updatePeople(.5);assert.equal(p.stage,'done');assert.equal(p.path.length,0);assert.equal(a.trip,null);assert.equal(a.floor,1);
  assert.equal(linkAnimationFrame('stairs',112,activeLinkCounts(t.state.people,id)),0);
  assert.equal(linkAnimationFrame('escalator',20,{up:0,down:2}),7);
});
test('timed journey state survives browser save/load and rejects malformed timestamps atomically',()=>{
  const t=tower(),r=t.state.rooms[0],a=t.state.actors[0];beginActorTrip(t,a,r,0,1,'arrival');
  const p=t.state.people[0];p.x=p.path[0].x;t.updatePeople(.5);
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  const before=copy.save(),bad=JSON.parse(before);bad.people[0].queueTick=2600;
  assert.throws(()=>copy.load(JSON.stringify(bad)));assert.equal(copy.save(),before);
});

test('native link release chooses its next leg again from the home left edge',()=>{
  const t=tower(),r=t.state.rooms[0],a=t.state.actors[0];t.state.shafts=[];
  t.build('stairs',1,40);beginActorTrip(t,a,r,0,1,'arrival');const p=t.state.people[0];
  p.path.push({kind:'elevator',id:999,from:1,to:5,x:99});
  const selections=[],route=t.route.bind(t);
  t.route=(from,to,service,x)=>{selections.push({from,to,x});return route(from,to,service,x);};
  t.state.tick=112;t.updatePeople(0);
  assert.deepEqual(selections,[{from:1,to:1,x:r.x}]);assert.equal(p.stage,'done');assert.equal(a.trip,null);
});
test('native car alight completes an actor immediately in the elevator update',()=>{
  const t=tower(),r=t.state.rooms[0],a=t.state.actors[0];beginActorTrip(t,a,r,0,1,'arrival');
  const p=t.state.people.find(p=>p.id===a.trip),car=t.state.shafts[0].cars[0];
  p.stage='car';car.floor=1;car.target=1;car.people=[p.id];car.doors=0;car.motionCooldown=0;
  t.updateElevators();assert.equal(p.stage,'done');assert.equal(a.trip,null);assert.equal(a.floor,1);assert.deepEqual(car.people,[]);
});
