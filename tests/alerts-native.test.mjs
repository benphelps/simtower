import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {nativeUnaffordableChoice} from '../src/original-alerts.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function bombTower(){
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,40,120);tower.build('floor',1,40,120);tower.build('security',1,40);
  while(tower.state.construction.length)tower.finishConstruction();
  tower.state.star=3;tower.state.calendarDay=59;tower.state.day=60;tower.state.tick=239;tower.randomInt=()=>0;tower.step();
  assert.equal(tower.state.dialogs[0].id,3020);return tower;
}
test('native cash guard accepts exact funds and only guards the payment command',()=>{
  const state={cash:100,emergency:{kind:'bomb',stage:'demand',demand:100}};
  assert.equal(nativeUnaffordableChoice(state,data,3020,2),false);state.cash=99;
  assert.equal(nativeUnaffordableChoice(state,data,3020,2),true);assert.equal(nativeUnaffordableChoice(state,data,3020,1),false);
  state.emergency={kind:'fire',helicopter:null};state.cash=data.events.fireCrewCost*data.moneyScale;
  assert.equal(nativeUnaffordableChoice(state,data,3012,2),false);state.cash--;
  assert.equal(nativeUnaffordableChoice(state,data,3012,2),true);
});
test('insufficient payment suspends its refusal until the nested original error is acknowledged, including reload',()=>{
  const tower=bombTower();tower.state.cash=tower.state.emergency.demand-1;const cash=tower.state.cash,tick=tower.state.tick;
  tower.answerEmergency(3020,2);
  assert.deepEqual(tower.state.dialogs.map(d=>d.id),[1004,3020]);assert.equal(tower.state.emergency.stage,'demand');assert.equal(tower.state.cash,cash);
  tower.step(50);assert.equal(tower.state.tick,tick);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  for(const mutate of [s=>s.affordabilityContinuation.control=2,s=>s.affordabilityContinuation.id=3012,s=>s.dialogs.shift()]){
    const bad=JSON.parse(saved);mutate(bad);assert.throws(()=>copy.load(JSON.stringify(bad)),/affordability/);assert.equal(copy.save(),saved);
  }
  copy.answerEmergency(1004,1);assert.equal(copy.state.cash,cash);assert.equal(copy.state.emergency.stage,'briefing');assert.equal(copy.state.dialogs[0].id,3022);assert.equal(copy.state.affordabilityContinuation,undefined);
});
test('original ALRT1004 is distinct from STRL1004 and retains its own message text',()=>{
  assert.equal(data.alerts[1004].text,'Not enough money.');assert.equal(data.alerts[1004].flags,0);
  assert.notEqual(data.strings[1004][0],data.alerts[1004].text);
});
test('native timer default silently refuses an unaffordable demand and pays when exactly affordable',()=>{
  const poor=bombTower();poor.state.cash=poor.state.emergency.demand-1;const cash=poor.state.cash;
  poor.answerEmergency(3020,2,{automatic:true});assert.equal(poor.state.cash,cash);assert.equal(poor.state.dialogs[0].id,3022);assert.equal(poor.state.affordabilityContinuation,undefined);
  const funded=bombTower();funded.state.cash=funded.state.emergency.demand;
  funded.answerEmergency(3020,2,{automatic:true});assert.equal(funded.state.cash,0);assert.equal(funded.state.emergency,null);
});
