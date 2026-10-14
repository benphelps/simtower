import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));

test('connected native service-only tower has no invented occupancy/satisfaction RNG during ordinary idle ticks',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,20,220);
  for(const floor of [1,2,-1,-2,-3])tower.build('floor',floor,20,220);
  for(const [key,floor,x] of [['medical',1,20],['secom',2,20],['recycling',-2,20],['ramp',-1,80],['parking',-1,100]])assert.equal(tower.build(key,floor,x).ok,true);
  assert.equal(tower.build('elevator',-3,180,180,2).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();
  while(tower.state.dialogs.length)tower.answerEmergency(tower.state.dialogs[0].id,1);
  tower.state.tick=500;const seed=tower.state.seed,initial=tower.state.rooms.map(room=>[room.id,room.occupied,room.satisfaction]);
  tower.step(128);
  assert.equal(tower.state.tick,628);assert.equal(tower.state.seed,seed,'dedicated service counters have no generic every-four-ticks random move-in draw');
  assert.deepEqual(tower.state.rooms.map(room=>[room.id,room.occupied,room.satisfaction]),initial);
  assert.equal(tower.state.actors.length,0);assert.equal(tower.state.people.length,0);
});
