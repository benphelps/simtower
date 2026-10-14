import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {CATALOG} from '../src/catalog.js';

const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building(key='elevator') {
  const t=new Tower(data,{sandbox:true});
  assert.equal(t.build('lobby',0,40,139).ok,true);
  for(const floor of [1,2,3,-1,-2,-3])assert.equal(t.build('floor',floor,40,139).ok,true);
  if(key)assert.equal(t.build(key,0,60,60,3).ok,true);
  return t;
}

test('3A117 room records can be built behind every native elevator type, retaining its cars and stops',()=>{
  for(const shaftKey of ['elevator','service','express']) {
    for(const key of ['office','condo','single','twin','suite','housekeeping','fastfood','restaurant','shop','security','medical','secom']) {
      const t=building(shaftKey),shaft=t.state.shafts[0],before=t.save(),shaftBefore=JSON.stringify(shaft);
      const p=t.plan(key,3,58);
      assert.equal(p.error,undefined,`${key} behind ${shaftKey}`);
      assert.equal(t.save(),before,'planning has no side effects');
      const cash=t.state.cash;
      assert.equal(t.build(key,3,58).ok,true,`${key} behind ${shaftKey}`);
      assert.equal(t.state.rooms[0].key,key);assert.equal(t.state.rooms[0].x,58);
      assert.equal(t.state.rooms[0].width,CATALOG[key].width);
      assert.equal(t.state.cash,cash-p.cost);
      assert.equal(t.state.shafts[0],shaft);assert.equal(JSON.stringify(shaft),shaftBefore);
      t.finishAllConstruction();
      assert.equal(t.state.rooms[0].constructionRemaining,0);
      assert.equal(JSON.stringify(shaft),shaftBefore);
    }
  }
});

test('3A8BF validates both cinema/party-hall floor records without reserving elevator columns',()=>{
  for(const shaftKey of ['elevator','service','express'])for(const key of ['cinema','partyhall']) {
    const t=building(shaftKey),shaftBefore=JSON.stringify(t.state.shafts),floorBefore=JSON.stringify(t.state.floors);
    assert.equal(t.build(key,3,58).ok,true);
    const room=t.state.rooms[0];
    assert.equal(t.roomAt(3,60),room);assert.equal(t.roomAt(2,60),room);
    t.finishAllConstruction();
    assert.equal(room.constructionRemaining,0);
    assert.equal(JSON.stringify(t.state.shafts),shaftBefore);
    assert.equal(JSON.stringify(t.state.floors),floorBefore);
  }
});

test('basement ramp/parking and structural floor construction retain overlapping elevator records',()=>{
  for(const shaftKey of ['elevator','service','express']) {
    const t=building(shaftKey),shaft=t.state.shafts[0];
    assert.equal(t.resizeShaft(shaft.id,-3,3).ok,true);
    const shaftBefore=JSON.stringify(shaft);
    assert.equal(t.build('ramp',-1,58).ok,true);
    assert.equal(t.state.rooms[0].constructionRemaining,0);
    assert.equal(JSON.stringify(shaft),shaftBefore);
    const p=building(shaftKey),ps=p.state.shafts[0];p.resizeShaft(ps.id,-3,3);
    p.build('ramp',-1,100);
    const parkingShaft=JSON.stringify(ps);
    assert.equal(p.build('parking',-1,60).ok,true);
    assert.equal(p.roomAt(-1,60).key,'parking');assert.equal(JSON.stringify(ps),parkingShaft);
    assert.equal(p.build('floor',2,40,139).ok,true);assert.equal(JSON.stringify(ps),parkingShaft);
  }
});

test('building behind an elevator preserves an existing onboard journey and its home occupants',()=>{
  const t=building();t.build('office',3,90);t.finishAllConstruction();
  const home=t.state.rooms[0];t.admitTenant(home);
  const passenger=t.spawn(home,0,3),shaft=t.state.shafts[0],car=shaft.cars[0];
  passenger.stage='car';car.people.push(passenger.id);car.target=3;
  const homeBefore=JSON.stringify(home),passengerBefore=JSON.stringify(passenger),shaftBefore=JSON.stringify(shaft);
  assert.equal(t.build('office',3,58).ok,true);
  assert.equal(JSON.stringify(home),homeBefore);assert.equal(JSON.stringify(passenger),passengerBefore);
  assert.equal(JSON.stringify(shaft),shaftBefore);assert.ok(car.people.includes(passenger.id));
});

test('occupied and incomplete floor records still reject conflicting construction behind elevators atomically',()=>{
  for(const occupied of [false,true])for(const shaftKey of ['elevator','service','express']) {
    const t=building(shaftKey);assert.equal(t.build('office',3,58).ok,true);
    if(occupied){t.finishAllConstruction();t.admitTenant(t.state.rooms[0]);assert.equal(t.state.rooms[0].occupied,true);}
    else assert.ok(t.state.rooms[0].constructionRemaining>0);
    const before=t.save();
    assert.match(t.build('single',3,60).error,/on top of other items/);
    assert.equal(t.save(),before);
    assert.match(t.build('cinema',3,50).error,/on top of other items/);
    assert.equal(t.save(),before);
  }
});

test('shaft and stair/escalator placement retains the protected transport collision checks',()=>{
  for(const shaftKey of ['elevator','service','express']) {
    const t=building(shaftKey),before=t.save();
    const conflicting=shaftKey==='service'?'elevator':'service';
    assert.match(t.build(conflicting,0,60,60,3).error,/transportation/);
    assert.equal(t.save(),before);
    for(const key of ['stairs','escalator']) {
      assert.match(t.build(key,2,58).error,/transportation/);
      assert.equal(t.save(),before);
      assert.match(t.build(key,1,58).error,/transportation/);
      assert.equal(t.save(),before);
    }
  }
});

test('39904→15988 permits initial shafts through incomplete and occupied facilities without replacing their records',()=>{
  for(const shaftKey of ['elevator','service','express'])for(const key of ['office','condo','cinema','partyhall'])for(const complete of [false,true]) {
    const t=building(null);assert.equal(t.build(key,3,58).ok,true);
    if(complete){t.finishAllConstruction();t.admitTenant(t.state.rooms[0]);}
    const room=t.state.rooms[0],roomsBefore=JSON.stringify(t.state.rooms),actorsBefore=JSON.stringify(t.state.actors),poolBefore=JSON.stringify(t.state.nativeActorPool),before=t.save();
    assert.equal(t.plan(shaftKey,0,60,60,3).error,undefined);
    assert.equal(t.save(),before);
    assert.equal(t.build(shaftKey,0,60,60,3).ok,true);
    assert.equal(t.state.rooms[0],room);assert.equal(JSON.stringify(t.state.rooms),roomsBefore);
    assert.equal(JSON.stringify(t.state.actors),actorsBefore);assert.equal(JSON.stringify(t.state.nativeActorPool),poolBefore);
  }
});

test('3A117/3BBDF permit single- and two-storey facilities behind existing staircase and escalator overlays',()=>{
  for(const linkKey of ['stairs','escalator'])for(const key of ['office','condo','single','medical','shop','cinema','partyhall'])for(const floor of [2,3]) {
    const t=building(null);assert.equal(t.build(linkKey,3,60).ok,true);
    const link=t.state.links[0],linkBefore=JSON.stringify(link),before=t.save();
    assert.equal(t.plan(key,floor,60).error,undefined,`${key} behind ${linkKey} landing ${floor}`);
    assert.equal(t.save(),before);
    assert.equal(t.build(key,floor,60).ok,true);
    assert.equal(t.state.links[0],link);assert.equal(JSON.stringify(link),linkBefore);
    t.finishAllConstruction();assert.equal(t.state.rooms[0].constructionRemaining,0);
    assert.equal(JSON.stringify(link),linkBefore);
  }
});

test('existing escalators retain their routes after private rooms are built, while new escalators validate both endpoint types',()=>{
  const t=building(null);assert.equal(t.build('escalator',3,60).ok,true);
  const route=t.route(2,3),link=t.state.links[0];assert.deepEqual(route.map(leg=>leg.id),[link.id]);
  assert.equal(t.build('office',3,60).ok,true);assert.equal(t.build('condo',2,60).ok,true);
  assert.deepEqual(t.route(2,3),route);
  const before=t.save();assert.match(t.build('escalator',3,60).error,/commercial or public/);assert.equal(t.save(),before);
  const reverse=building(null);reverse.build('office',3,60);reverse.build('condo',2,60);
  const reverseBefore=reverse.save();assert.match(reverse.build('escalator',3,60).error,/commercial or public/);
  assert.equal(reverse.save(),reverseBefore);assert.equal(reverse.build('stairs',3,60).ok,true);
  assert.equal(reverse.state.rooms.length,2);
});

test('underlying rooms still need supporting floor bounds and cannot replace occupied/incomplete records beneath links',()=>{
  for(const key of ['stairs','escalator']) {
    const t=building(null);t.build(key,3,60);t.build('office',3,60);
    const before=t.save();assert.match(t.build('condo',3,60).error,/other items/);assert.equal(t.save(),before);
    t.finishAllConstruction();t.admitTenant(t.state.rooms[0]);const occupied=t.save();
    assert.match(t.build('single',3,60).error,/other items/);assert.equal(t.save(),occupied);
    assert.match(t.build('cinema',3,136).error,/wider than Lobby/);assert.equal(t.save(),occupied);
    const unsupported=building(null);unsupported.build(key,3,60);
    unsupported.state.floors[2].width=40;
    const noSupport=unsupported.save();assert.match(unsupported.build('office',3,90).error,/floor below/);
    assert.equal(unsupported.save(),noSupport);
  }
});

test('rooms behind transportation do not bypass the native floor/type restrictions or link pool footprints',()=>{
  const t=building(null);t.build('stairs',3,60);const before=t.save();
  assert.match(t.build('office',0,60).error,/only for Lobby/);assert.equal(t.save(),before);
  assert.match(t.build('single',-1,60).error,/underground/);assert.equal(t.save(),before);
  assert.match(t.build('stairs',3,60).error,/transportation/);assert.equal(t.save(),before);
  assert.match(t.build('elevator',2,60,60,3).error,/transportation/);assert.equal(t.save(),before);
  assert.equal(t.build('stairs',2,60).ok,true,'stacked links use opposite footprint halves');
});
