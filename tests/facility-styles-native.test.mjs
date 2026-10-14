import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {newFacilityStyleCounters,takeFacilityStyle,validateFacilityStyleCounters} from '../src/original-facility-styles.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building(){const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,160);tower.build('floor',1,40,160);return tower;}
test('native facade counters are independent cycles with commercial allocation at completion',()=>{
  let counters=newFacilityStyleCounters();
  assert.equal(takeFacilityStyle(counters,'restaurant','placement').counters,counters);
  for(let index=0;index<9;index++){const style=takeFacilityStyle(counters,'twin','placement');assert.equal(style.variant,index%4);counters=style.counters;}
  assert.equal(counters.single,0);assert.equal(counters.restaurant,0);
  const restaurant=takeFacilityStyle(counters,'restaurant','completion');assert.equal(restaurant.variant,0);assert.equal(restaurant.counters.restaurant,1);
});
test('Tower original office and hotel facades continue lifetime cycles after demolition and save/load',()=>{
  const tower=building();tower.build('office',1,40);const first=tower.state.rooms.find(room=>room.key==='office');assert.equal(first.variant,0);
  tower.removeRoom(first);tower.build('office',1,40);const second=tower.state.rooms.find(room=>room.key==='office');assert.equal(second.variant,1);
  tower.build('twin',1,70);const twin=tower.state.rooms.find(room=>room.key==='twin');assert.equal(twin.variant,0);tower.removeRoom(twin);
  const loaded=new Tower(data);loaded.load(tower.save());loaded.build('twin',1,70);assert.equal(loaded.state.rooms.find(room=>room.key==='twin').variant,1);
});
test('Tower canceled food construction spends no style, and completed removed venues keep advancing names/art',()=>{
  const tower=building();tower.build('fastfood',1,40);tower.removeRoom(tower.state.rooms.find(room=>room.key==='fastfood'));assert.equal(tower.state.nativeFacilityStyles.fastfood,0);
  tower.build('fastfood',1,40);tower.finishConstruction();let food=tower.state.rooms.find(room=>room.key==='fastfood');assert.equal(food.variant,0);assert.equal(tower.state.nativeFacilityStyles.fastfood,1);
  tower.removeRoom(food);tower.build('fastfood',1,40);assert.equal(tower.state.nativeFacilityStyles.fastfood,1);tower.finishConstruction();food=tower.state.rooms.find(room=>room.key==='fastfood');assert.equal(food.variant,1);
});
test('native style save validation rejects out-of-cycle counters atomically',()=>{
  const tower=building(),before=tower.save(),bad=JSON.parse(before);bad.nativeFacilityStyles.shop=11;assert.throws(()=>tower.load(JSON.stringify(bad)),/style counters/);assert.equal(tower.save(),before);
  assert.equal(validateFacilityStyleCounters(newFacilityStyleCounters()),true);
});
