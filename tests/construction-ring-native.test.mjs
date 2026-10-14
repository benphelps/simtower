import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {syncActors} from '../src/original-people.js';
import {constructionEntries,validateConstructionRing} from '../src/original-construction-ring.js';
import {noisyNeighbor} from '../src/original-systems.js';
import {startScheduledEvent} from '../src/original-events.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function scene(){const t=new Tower(data,{sandbox:true});t.build('lobby',0,10,210);for(let floor=1;floor<=4;floor++)t.build('floor',floor,10,210);return t;}
test('native construction ring stores each floor and stops decrementing later records after its first completion',()=>{
  const t=scene();t.build('cinema',2,10);t.build('office',3,10);
  const cinema=t.state.rooms.find(r=>r.key==='cinema'),office=t.state.rooms.find(r=>r.key==='office');
  assert.deepEqual(constructionEntries(t.state.nativeConstructionRing).map(e=>[e.room,e.level,e.floor]),[[cinema.id,1,1],[cinema.id,0,2],[office.id,0,3]]);
  for(let tick=0;tick<11;tick++)t.updateConstruction();assert.deepEqual(cinema.nativeConstructionParts.map(p=>p.remaining),[1,1]);assert.equal(office.constructionRemaining,1);
  t.updateConstruction();assert.deepEqual(cinema.nativeConstructionParts.map(p=>[p.level,p.remaining,p.completed]),[[1,0,true],[0,1,false]]);assert.equal(office.constructionRemaining,1);
  assert.equal(cinema.nativeActorBlocks.find(b=>b.level===1).actorType,18);assert.equal(cinema.nativeActorBlocks.find(b=>b.level===0).actorType,-18);
  syncActors(t);assert.equal(t.state.actors.filter(a=>a.room===cinema.id).length,56);assert.ok(t.state.actors.filter(a=>a.room===cinema.id).every(a=>a.resident>=56));
  const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
  t.updateConstruction();assert.equal(cinema.constructionRemaining,0);assert.equal(office.constructionRemaining,1);syncActors(t);assert.equal(t.state.actors.filter(a=>a.room===cinema.id).length,112);
  t.updateConstruction();assert.equal(office.constructionRemaining,0);assert.equal(t.state.nativeConstructionRing.count,0);assert.deepEqual(t.state.construction,[]);
});
test('ten-record overflow completes only the oldest native part and completion frees builders before the next part allocation',()=>{
  const t=scene();t.build('medical',3,10);const clinic=t.state.rooms[0];for(let index=0;index<9;index++)t.build('office',4,10+index*10);
  assert.equal(t.state.nativeConstructionRing.count,10);for(let floor=-1;floor>=-3;floor--)t.build('floor',floor,10,210);while(t.state.dialogs.length)t.answerEmergency(t.state.dialogs[0].id,1);
  t.build('metro',-1,110);const metro=t.state.rooms.find(r=>r.key==='metro');
  assert.equal(clinic.constructionRemaining,0);assert.equal(metro.nativeActorBlocks.find(b=>b.level===0).base,60);assert.equal(metro.nativeActorBlocks.find(b=>b.level===1).base,0);
  assert.equal(t.state.nativeConstructionRing.count,10);assert.equal(t.state.rooms.filter(r=>r.key==='office'&&!r.constructionRemaining).length,2);assert.equal(validateConstructionRing(t.state),true);
});
test('cinema completion re-registers only its completed native floor and preserves the unfinished sibling slot',()=>{
  const t=scene();t.build('cinema',2,10);const cinema=t.state.rooms[0];t.build('office',2,60);const sibling=cinema.nativeTenantSlots.find(slot=>slot.floor===2).index;
  t.finishConstruction();assert.deepEqual(cinema.nativeTenantSlots.filter(slot=>slot.floor===1).map(slot=>slot.type),[35,19]);assert.deepEqual(cinema.nativeTenantSlots.filter(slot=>slot.floor===2).map(slot=>slot.type),[18]);assert.equal(cinema.nativeTenantSlots.find(slot=>slot.floor===2).index,sibling);
  t.finishConstruction();assert.deepEqual(cinema.nativeTenantSlots.filter(slot=>slot.floor===2).map(slot=>[slot.type,slot.index]),[[34,0],[18,2]]);
});
test('construction record saves reject altered countdowns, duplicate ring owners and missing records atomically',()=>{
  const t=scene();t.build('partyhall',2,10);const saved=t.save();
  for(const mutate of [s=>s.rooms[0].nativeConstructionParts[0].remaining=13,s=>s.nativeConstructionRing.slots[1]={...s.nativeConstructionRing.slots[0]},s=>s.rooms[0].nativeConstructionParts.pop()]){
    const bad=JSON.parse(saved);mutate(bad);assert.throws(()=>t.load(JSON.stringify(bad)),/construction/);assert.equal(t.save(),saved);
  }
});
test('a completed cinema floor makes native noise and exposes its shared movie program while its sibling remains pending',()=>{
  const t=scene();t.build('cinema',2,10);const cinema=t.state.rooms[0];
  assert.match(t.changeMovie(cinema.id,'new').error,/not available/);t.finishConstruction();
  const lower={id:90,key:'office',floor:1,x:41,width:9},upper={...lower,id:91,floor:2};
  assert.equal(noisyNeighbor(lower,[lower,cinema]),cinema);assert.equal(noisyNeighbor(upper,[upper,cinema]),undefined);
  assert.equal(t.changeMovie(cinema.id,'new').cost,300000);assert.ok(cinema.constructionRemaining>0);
});
test('recycling capacity counts placed centers while only their completed native floors process refuse',()=>{
  const t=scene();for(let floor=-1;floor>=-3;floor--)t.build('floor',floor,10,210);while(t.state.dialogs.length)t.answerEmergency(t.state.dialogs[0].id,1);
  t.build('recycling',-1,110);const center=t.state.rooms.find(r=>r.key==='recycling');t.state.star=3;Object.defineProperty(t,'population',{get:()=>1000});
  t.updateGarbage(5);assert.equal(t.state.garbage.working,true);assert.equal(center.garbageStage,0);assert.equal(center.garbageLowerStage,0);
  t.finishConstruction();t.updateGarbage(5);assert.equal(center.garbageStage,3);assert.equal(center.garbageLowerStage,0);
  t.finishConstruction();t.updateGarbage(5);assert.equal(center.garbageLowerStage,3);
});
test('legacy browser construction queues migrate to native floor records and preserve partial countdown progress',()=>{
  const t=scene();t.build('cinema',2,10);for(let tick=0;tick<4;tick++)t.updateConstruction();const legacy=JSON.parse(t.save());delete legacy.nativeConstructionRing;
  for(const room of legacy.rooms)delete room.nativeConstructionParts;
  const copy=new Tower(data);copy.load(JSON.stringify(legacy));assert.equal(copy.state.nativeConstructionRing.count,2);assert.deepEqual(copy.state.rooms[0].nativeConstructionParts.map(part=>part.remaining),[8,8]);
  for(let tick=0;tick<8;tick++)copy.updateConstruction();assert.equal(copy.state.rooms[0].nativeConstructionParts.filter(part=>part.completed).length,1);assert.equal(copy.state.rooms[0].constructionRemaining,1);
});
test('legacy logical queues exceeding ten native records force oldest completion during migration without orphaning builder blocks',()=>{
  const t=scene();for(let index=0;index<6;index++)t.build('partyhall',2,10+index*25);
  const legacy=JSON.parse(t.save());delete legacy.nativeConstructionRing;delete legacy.nativeActorPool;legacy.actors=[];legacy.construction=legacy.rooms.map(room=>room.id);
  for(const room of legacy.rooms){room.constructionRemaining=12;delete room.nativeConstructionParts;delete room.nativeActorBlocks;delete room.nativeTenantSlots;delete room.nativeTenantIndex;}
  const copy=new Tower(data);copy.load(JSON.stringify(legacy));assert.equal(copy.state.nativeConstructionRing.count,10);assert.equal(copy.state.rooms[0].constructionRemaining,0);assert.equal(copy.state.rooms[0].nativeConstructionParts.filter(part=>part.completed).length,2);
  syncActors(copy);assert.equal(copy.state.actors.length,80);const roundtrip=new Tower(data);roundtrip.load(copy.save());assert.equal(roundtrip.save(),copy.save());
});
test('native dawn and240 opening drain all builder records before daily venue quotas and ordinary cohort work',()=>{
  for(const tick of [2599,239]){
    const t=scene();t.build('cinema',2,10);const cinema=t.state.rooms[0];t.state.tick=tick;t.randomInt=()=>7;t.step();
    assert.equal(t.state.nativeConstructionRing.count,0);assert.equal(cinema.constructionRemaining,0);assert.equal(cinema.movie.pendingTitle,false);assert.equal(t.state.actors.filter(a=>a.room===cinema.id).length,112);
    if(tick===239){assert.equal(cinema.movie.attendance,120);assert.equal(t.population,120);}
  }
});
test('native emergency activation drains builders only after its announcement or search briefing returns',()=>{
  for(const kind of ['fire','bomb']){
    const t=scene();t.build('security',3,160);t.finishAllConstruction();t.build('cinema',2,10);const cinema=t.state.rooms.find(r=>r.key==='cinema');t.state.star=3;t.state.calendarDay=kind==='fire'?83:59;t.state.tick=240;t.randomInt=()=>0;
    assert.equal(startScheduledEvent(t.state,data,n=>t.randomInt(n),t.eventHooks()),true);assert.equal(cinema.constructionRemaining,12);
    if(kind==='fire')t.answerEmergency(3011,1);else{t.answerEmergency(3020,1);assert.equal(cinema.constructionRemaining,12);t.answerEmergency(3022,1);}
    assert.equal(cinema.constructionRemaining,0);assert.equal(t.state.nativeConstructionRing.count,0);assert.equal(t.state.actors.filter(a=>a.room===cinema.id).length,112);
  }
});
