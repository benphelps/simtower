import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors} from '../src/original-people.js';
import { reserveVIPGuest, admitVIPGuest, checkoutVIPGuest, failVIPGuest, expireVIPReservation } from '../src/original-vip.js';
const data={strings:{700:['Outside','VIP'],1005:Array.from({length:6},(_,i)=>`info${i}`)}};
function scene() {
  const actor={id:2,index:1,room:1,parking:9,delay:0,trips:0};
  const room={id:1,key:'suite',floor:12,dirt:100,price:3};
  const state={star:3,calendarDay:3,nativeFlags:{vipPassed:false},vip:null,actors:[actor]};
  return {state,room,actor};
}
test('native VIP reserves primary suite guest with current parking, independent of dirty room/price/noise',()=>{
  const {state,room,actor}=scene(),dialogs=[];
  assert.equal(reserveVIPGuest(state,actor,room,{dialog:(...a)=>dialogs.push(a)}),true);assert.deepEqual(dialogs,[[3000,13]]);
  assert.equal(reserveVIPGuest(state,actor,room),false);
});
test('VIP automatic naming respects native20name limit while existing name can be replaced',()=>{
  const {state,room,actor}=scene(),log=[];reserveVIPGuest(state,actor,room);
  state.actors.push(...Array.from({length:20},(_,i)=>({id:10+i,name:`Name${i}`})));
  assert.equal(admitVIPGuest(state,actor,data,{dialog:id=>log.push(id),notice:text=>log.push(text)}),true);
  assert.equal(state.vip.arrived,true);assert.equal(actor.name,undefined);assert.deepEqual(log,[3001,'info5']);
  actor.name='Guest';admitVIPGuest(state,actor,data);assert.equal(actor.name,'VIP');
});
test('native VIP checkout uses signed wrapped counters and no separate room condition penalty',()=>{
  for(const [delay,trips,passed] of [[300,2,true],[302,2,false],[65535,1,true],[300,255,true],[300,0,true]]) {
    const {state,room,actor}=scene();reserveVIPGuest(state,actor,room);actor.delay=delay;actor.trips=trips;
    assert.equal(checkoutVIPGuest(state,actor),passed);assert.equal(state.nativeFlags.vipPassed,passed);assert.equal(state.vip,null);
  }
});
test('lost reservation fails active identity; native1600expiry does not clear earned pass',()=>{
  const {state,room,actor}=scene();reserveVIPGuest(state,actor,room);assert.equal(failVIPGuest(state,{id:99}),false);
  assert.equal(failVIPGuest(state,actor),true);assert.equal(state.nativeFlags.vipPassed,false);
  reserveVIPGuest(state,actor,room);state.nativeFlags.vipPassed=true;state.calendarDay=4;expireVIPReservation(state);
  assert.equal(state.vip,null);assert.equal(state.nativeFlags.vipPassed,true);
});
const nativeData=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function vipTower() {
  const tower=new Tower(nativeData,{sandbox:true});tower.build('lobby',0,10,109);tower.build('floor',1,10,109);tower.build('floor',2,10,109);
  for(const x of [10,20,30,50])tower.build('office',1,x);
  tower.build('suite',2,70);while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const room=tower.state.rooms.find(room=>room.key==='suite'),actor=tower.state.actors.find(actor=>actor.room===room.id&&actor.index===1);
  actor.parkingFloor=-1;tower.state.star=3;tower.state.calendarDay=3;return {tower,room,actor};
}
test('Tower VIP uses packed parking reservation, native naming cap and wrapped history after browser save',()=>{
  const {tower,room,actor}=vipTower();
  for(const named of tower.state.actors.filter(person=>person!==actor).slice(0,20))named.name='Guest';
  assert.equal(tower.reserveVIP(actor,room),true);assert.deepEqual(tower.state.dialogs.at(-1),{id:3000,value:3});
  tower.answerEmergency(3000,1);
  assert.equal(tower.arriveVIP(actor),true);assert.equal(actor.name,undefined);assert.equal(tower.state.dialogs.at(-1).id,3001);
  tower.answerEmergency(3001,1);
  assert.equal(tower.state.notices[0].text,nativeData.strings[1005][5]);
  const saved=tower.save(),copy=new Tower(nativeData);copy.load(saved);assert.equal(copy.save(),saved);
  const guest=copy.state.actors.find(person=>person.id===actor.id);guest.delay=65535;guest.trips=1;
  assert.equal(copy.checkoutVIP(guest),true);assert.equal(copy.state.nativeFlags.vipPassed,true);assert.equal(copy.state.dialogs.at(-1).id,3002);
  assert.notEqual(copy.state.vip,null);copy.answerEmergency(3002,1);assert.equal(copy.state.vip,null);
});
test('Tower VIP reserve requires original date/rating/child, and expiry preserves a previously earned pass',()=>{
  const {tower,room,actor}=vipTower();tower.state.calendarDay=2;assert.equal(tower.reserveVIP(actor,room),false);
  tower.state.calendarDay=3;tower.state.star=4;assert.equal(tower.reserveVIP(actor,room),false);
  tower.state.star=3;assert.equal(tower.reserveVIP({...actor,index:2},room),false);
  assert.equal(tower.reserveVIP(actor,room),true);tower.answerEmergency(3000,1);tower.state.nativeFlags.vipPassed=true;tower.state.calendarDay=4;tower.state.tick=1599;tower.step();
  assert.equal(tower.state.vip,null);assert.equal(tower.state.nativeFlags.vipPassed,true);
});
