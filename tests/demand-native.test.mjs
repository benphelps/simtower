import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors,updateActors,beginActorTrip,finishActorTrip} from '../src/original-people.js';
import {commercialOpeningBudget} from '../src/original-demand.js';
import {finishCommercialActorTrip} from '../src/original-commercial.js';
import {businessReceipt} from '../src/original-economy.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function commercialTower() {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  for(let floor=1;floor<=3;floor++)tower.build('floor',floor,10,109);
  tower.build('shop',1,10);tower.build('fastfood',2,10);tower.build('office',3,25);
  while(tower.state.construction.length)tower.finishConstruction();
  for(const room of tower.state.rooms){room.occupied=true;if(room.commercial)room.commercial.state=0;}
  syncActors(tower);const food=tower.state.rooms.find(room=>room.key==='fastfood'),shop=tower.state.rooms.find(room=>room.key==='shop'),office=tower.state.rooms.find(room=>room.key==='office');
  return {tower,food,shop,office};
}
test('native day budgets use fixed PART caps and rainy priority, retaining independent facility reputation buckets',()=>{
  assert.deepEqual(commercialOpeningBudget([35,50,25],'fastfood',false),{kind:0,source:35,limit:35,remaining:35});
  assert.deepEqual(commercialOpeningBudget([26,12,99],'shop',true),{kind:1,source:26,limit:30,remaining:26});
  assert.deepEqual(commercialOpeningBudget([26,12,99],'shop',true,true),{kind:2,source:99,limit:18,remaining:18});
  assert.equal(commercialOpeningBudget([0,0,0],'restaurant',false).remaining,10);
});
test('adding an adjacent escalator changes accessibility, while native commercial budgets remain independent',()=>{
  const {tower,food,shop}=commercialTower();food.commercial.recommendations=[34,50,25];shop.commercial.recommendations=[24,30,18];
  tower.openBusinesses();const foodBudget=food.commercial.remaining,shopBudget=shop.commercial.remaining;
  assert.equal(tower.route(0,food.floor),null);
  assert.equal(tower.build('escalator',1,11).ok,true);assert.equal(tower.build('escalator',2,11).ok,true);
  assert.ok(tower.route(0,food.floor).every(edge=>edge.type==='escalator'));
  assert.equal(food.commercial.remaining,foodBudget);assert.equal(shop.commercial.remaining,shopBudget);
  food.commercial.recommendations=[34,50,25];shop.commercial.recommendations=[24,30,18];tower.openBusinesses();
  assert.equal(food.commercial.remaining,34);assert.equal(shop.commercial.remaining,24);
});
test('shared office visitor travels by adjacent escalator and increases destination receipts without spending own demand or pooling referrals',()=>{
  const {tower,food,shop,office}=commercialTower();
  for(let floor=1;floor<=3;floor++)assert.equal(tower.build('escalator',floor,11).ok,true);
  const actor=tower.state.actors.find(actor=>actor.room===office.id&&actor.index===1);actor.state=1;actor.floor=3;
  tower.state.tick=800+actor.slot%16;tower.randomInt=()=>0;updateActors(tower);
  const trip=tower.state.people.find(person=>person.id===actor.trip);assert.equal(actor.job,food.id);
  assert.equal(trip.path[0].type,'escalator');assert.equal(trip.tripDelay,data.transport.escalatorStress);
  food.commercial.visitors=data.businessReceipts[12].thresholds[0]-1;
  const budget=food.commercial.remaining,visitors=food.commercial.visitors,shopVisitors=shop.commercial.visitors,feedback=[...food.commercial.recommendations];
  finishActorTrip(tower,actor,office,trip,true,'lunch-arrival');
  assert.equal(food.commercial.visitors,visitors+1);assert.equal(food.commercial.remaining,budget);
  assert.equal(shop.commercial.visitors,shopVisitors);assert.equal(actor.state,34);
  tower.state.tick+=64;beginActorTrip(tower,actor,office,2,3,'lunch-return');const home=tower.state.people.find(person=>person.id===actor.trip);
  finishActorTrip(tower,actor,office,home,true,'lunch-return');assert.deepEqual(food.commercial.recommendations,feedback);
  const own=tower.state.actors.find(actor=>actor.room===food.id);own.commercialBooked=true;own.delay=0;own.trips=1;
  const otherFeedback=[...shop.commercial.recommendations];finishCommercialActorTrip(tower,own,food,true,'commercial-departure');
  assert.equal(food.commercial.recommendations[0],feedback[0]+2);assert.deepEqual(shop.commercial.recommendations,otherFeedback);
  const before=tower.state.cash,receipt=businessReceipt(data,12,visitors+1,tower.state.calendarDay);
  assert.ok(receipt>businessReceipt(data,12,visitors,tower.state.calendarDay));
  tower.closeBusinesses(false);assert.equal(tower.state.cash-before,receipt);assert.equal(shop.commercial.lastProfit,0);
});
