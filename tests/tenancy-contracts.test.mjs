import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {rentAmount} from '../src/original-economy.js';
import {syncActors,updateActors} from '../src/original-people.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function condo(){const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,99);t.build('floor',1,10,99);t.build('condo',1,10);t.build('elevator',0,40,40,1);t.step(12);syncActors(t);t.state.tick=t.state.actors[0].slot%16;updateActors(t);return t;}
test('condo sale price is locked in model and native dialog contract until residents vacate',()=>{
  const t=condo(),r=t.state.rooms[0],saved=t.save();assert.equal(r.sold,true);assert.equal(r.salePrice,rentAmount(data,9,1));
  assert.match(t.setRoomPrice(r.id,0).error,/occupied/);assert.equal(t.save(),saved);
  t.vacateRoom(r);assert.equal(t.setRoomPrice(r.id,0).ok,true);
});
test('price editing uses native condo facade rather than recomputing accepted population or sale ownership',()=>{
  const t=condo(),r=t.state.rooms[0];t.vacateRoom(r);const population=t.population;
  r.tenantState=16;assert.match(t.setRoomPrice(r.id,0).error,/occupied/);assert.equal(t.population,population);
  r.tenantState=24;r.occupied=true;r.sold=true;assert.equal(t.setRoomPrice(r.id,0).ok,true);assert.equal(t.population,population);
});
test('dissatisfied condo residents recover their sale payment once, as negative condo income',()=>{
  const t=condo(),r=t.state.rooms[0],cash=t.state.cash,sale=r.salePrice;
  for(const p of r.trips){p.delay=300;p.trips=1;}
  t.settleQuarter();assert.equal(r.occupied,false);assert.equal(r.sold,false);assert.equal(r.salePrice,0);
  const upkeep=t.state.accounts.maintenance.reduce((a,b)=>a+b,0);
  assert.equal(t.state.cash,cash-sale-upkeep);assert.equal(t.state.accounts.income[9],-sale);
  const after=t.state.cash;t.vacateRoom(r);assert.equal(t.state.cash,after);
});
test('refund uses the recorded purchase, then re-selling posts a new payment and clears old stress',()=>{
  const t=condo(),r=t.state.rooms[0],cash=t.state.cash,oldSale=r.salePrice;
  r.price=0; // Simulate corruption by an old browser editor; refund cannot increase.
  t.vacateRoom(r);assert.equal(t.state.cash,cash-oldSale);
  t.setRoomPrice(r.id,2);const actor=t.state.actors[0],arrival=t.state.people.find(p=>p.id===actor.trip);arrival.path=[];arrival.stage='walk';t.updatePeople(0,arrival.id);assert.equal(r.salePrice,rentAmount(data,9,2));
  assert.equal(t.state.cash,cash-oldSale+r.salePrice);assert.ok(r.trips.every(p=>p.delay===0&&p.trips===0));
  t.demolish(r.floor,r.x);assert.equal(t.state.cash,cash-oldSale);
});
test('eviction preserves active resident travel/car references and named identities until normal completion',()=>{
  const t=condo(),r=t.state.rooms[0],a=t.state.actors.find(a=>a.room===r.id);a.name='Resident';
  const p=t.state.people.find(p=>p.id===a.trip),car=t.state.shafts[0].cars[0];car.people.push(p.id);p.stage='car';const people=t.state.people.map(p=>p.id),state=a.state;
  t.vacateRoom(r);assert.deepEqual(t.state.people.map(p=>p.id),people);assert.deepEqual(car.people,[p.id]);
  assert.equal(a.trip,p.id);assert.equal(a.state,state);assert.equal(a.name,'Resident');
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
});
test('old browser saves infer condo sale value and corrupt sale records fail atomically',()=>{
  const t=condo(),old=JSON.parse(t.save());delete old.rooms[0].salePrice;
  const copy=new Tower(data);copy.load(JSON.stringify(old));assert.equal(copy.state.rooms[0].salePrice,rentAmount(data,9,1));
  const saved=copy.save(),bad=JSON.parse(saved);bad.rooms[0].salePrice=-10;assert.throws(()=>copy.load(JSON.stringify(bad)));assert.equal(copy.save(),saved);
});
