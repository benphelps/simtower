import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors, updateActors, finishActorTrip } from '../src/original-people.js';
import { showActorCount, showEntrance, showExit, newShowState, prepareShowDay,
  openShowBatch, projectShow, closeShowBatch, updateShowActor, finishShowActorTrip,
  validateShowState, validateShowActor, missingVenueRecovery, showSprites } from '../src/original-shows.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function scene(key='cinema') {
  const room={id:1,key,floor:8,width:key==='cinema'?31:24,x:4,show:newShowState(),...(key==='cinema'?{movie:{index:7,days:0,active:false}}:{})};
  const actors=Array.from({length:showActorCount(key)},(_,resident)=>({id:10+resident,room:1,resident,state:39,trip:null,floor:0,delay:0,trips:0}));
  const state={tick:1000,calendarDay:0,rooms:[room],actors};
  const tower={state,data,randomInt:()=>0};
  prepareShowDay(room,data);return {room,actors,state,tower};
}
test('native cinema has two56person pools and party has two40person pools, independent of demand',()=>{
  const cinema=scene(),party=scene('partyhall');
  assert.equal(cinema.actors.length,112);assert.deepEqual(cinema.room.show.remaining,[60,60]);assert.equal(cinema.room.dailyPopulation,120);
  assert.equal(party.actors.length,80);assert.deepEqual(party.room.show.remaining,[0,50]);assert.equal(party.room.dailyPopulation,50);
  assert.equal(showEntrance(cinema.room),8);assert.equal(showEntrance(party.room),7);assert.equal(showExit(cinema.room),7);
});
test('opening resets only the original selected half without creating new people',()=>{
  const {room,actors}=scene();const ids=actors.map(a=>a.id);openShowBatch(room,actors,0);
  assert.ok(actors.slice(0,56).every(a=>a.state===32));assert.ok(actors.slice(56).every(a=>a.state===39));
  assert.deepEqual(actors.map(a=>a.id),ids);assert.equal(room.show.stage,1);projectShow(room);assert.equal(room.movie.active,false);
});
test('initial failed show routing restores reservation; interrupted existing journey does not',()=>{
  const {tower,room,actors}=scene(),actor=actors[0];openShowBatch(room,actors,0);
  updateShowActor(tower,actor,room,(t,a,r,from,to,purpose)=>finishShowActorTrip(t,a,r,false,purpose),()=>null);
  assert.equal(room.show.remaining[0],60);assert.equal(actor.state,32);assert.equal(actor.trips,0);
  room.show.remaining[0]--;actor.showBooked=true;
  finishShowActorTrip(tower,actor,room,false,'show-arrival',{to:8});
  assert.equal(room.show.remaining[0],59);assert.equal(actor.state,39);
});
test('actual arrivals count inside/receipts; first cinema close sends only present attendees to dining',()=>{
  const {tower,state,room,actors}=scene();openShowBatch(room,actors,0);
  for(const actor of actors.slice(0,40))finishShowActorTrip(tower,actor,room,true,'show-arrival',{to:8});
  assert.equal(room.show.inside,40);assert.equal(room.show.visitors,40);assert.deepEqual(room.movie.halfVisitors,[40,0]);
  projectShow(room);assert.equal(room.show.stage,3);assert.equal(room.movie.active,true);
  actors[40].state=96;state.tick=1500;
  assert.equal(closeShowBatch(room,actors,0,state,data),null);
  assert.ok(actors.slice(0,40).every(a=>a.state===1));assert.equal(actors[40].state,96);assert.equal(room.show.inside,0);assert.equal(room.show.stage,1);
  state.tick=1900;assert.equal(closeShowBatch(room,actors,1,state,data),data.movie.receipts[1]*data.moneyScale);
});
test('party attendance is fixed50 even without hotels; receipts require actual admission',()=>{
  const {room,state,actors,tower}=scene('partyhall');openShowBatch(room,actors,1);assert.equal(room.dailyPopulation,50);
  state.tick=1600;assert.equal(closeShowBatch(room,actors,1,state,data),0);
  finishShowActorTrip(tower,actors[40],room,true,'show-arrival',{to:7});
  assert.equal(closeShowBatch(room,actors,1,state,data),200*data.moneyScale);assert.equal(actors[40].state,5);
  state.calendarDay=59;assert.equal(closeShowBatch(room,actors,1,state,data),0);
});
test('afternoon movie visitors pick native category/lower floor, wait at a full venue, and leave directly outside',()=>{
  const {room,state,actors,tower}=scene();const actor=actors[0];actor.state=1;
  const venue={id:2,key:'shop',floor:6,commercial:{state:2,inside:40,visitors:0}};state.rooms.push(venue);tower.randomInt=()=>2;
  const calls=[];updateShowActor(tower,actor,room,(...args)=>calls.push(args.slice(3)),(t,floor,key)=>{assert.equal(floor,7);assert.equal(key,'shop');return venue;});
  assert.deepEqual(calls,[[7,6,'show-meal-arrival']]);
  finishShowActorTrip(tower,actor,room,true,'show-meal-arrival',{to:6});assert.equal(actor.state,65);
  actor.currentStress=502;const trips=actor.trips,delay=actor.delay;
  venue.commercial.inside=39;state.tick=1516;updateShowActor(tower,actor,room,()=>assert.fail(),()=>null);
  assert.equal(actor.trips,(trips+1)&255);assert.equal(actor.delay,(delay+502)&65535);
  assert.equal(actor.state,34);assert.equal(venue.commercial.inside,40);assert.equal(actor.commercialInside,true);
  state.tick+=data.visits.shop;updateShowActor(tower,actor,room,(...args)=>calls.push(args.slice(3)),()=>null);
  assert.deepEqual(calls.at(-1),[6,0,'show-meal-departure']);assert.equal(venue.commercial.inside,39);
  finishShowActorTrip(tower,actor,room,true,'show-meal-departure',{to:0});assert.equal(actor.state,39);
});
test('failed initial food route retries transport offsite before leaving directly outside',()=>{
  const {room,state,actors,tower}=scene(),actor=actors[0];
  finishShowActorTrip(tower,actor,room,false,'show-meal-arrival');assert.equal(actor.state,65);assert.equal(actor.floor,7);
  updateShowActor(tower,actor,room,(t,a,r,from,to,purpose)=>{assert.equal(from,7);assert.equal(to,0);finishShowActorTrip(t,a,r,true,purpose,{to});},()=>null);assert.equal(actor.state,34);
  const calls=[];updateShowActor(tower,actor,room,(...args)=>calls.push(args.slice(3)),()=>null);
  assert.deepEqual(calls,[[0,0,'show-meal-departure']]); //32E4E writes nativefloor10 for an offsite destination.
});
test('missed arrivals become state39 once evening starts, without consuming demand',()=>{
  const {room,state,actors,tower}=scene();actors[0].state=32;state.tick=1600;
  updateShowActor(tower,actors[0],room,()=>assert.fail(),()=>null);assert.equal(actors[0].state,39);assert.equal(room.show.remaining[0],60);
});
test('show save validation rejects malformed quotas, pool booking markers and negative inside counts',()=>{
  const {room,actors}=scene();validateShowState(room);validateShowActor(actors[0]);
  room.show.remaining=[61,0];assert.throws(()=>validateShowState(room),/Invalid show patron/);
  room.show.remaining=[0,0];room.show.inside=-1;assert.throws(()=>validateShowState(room),/Invalid show patron/);
  actors[0].showBooked=1;assert.throws(()=>validateShowActor(actors[0]),/Invalid show actor/);
});
test('destroyed service venues preserve foreign trips and distinguish arrival warning from existing treatment',()=>{
  assert.equal(missingVenueRecovery({state:66},{purpose:'clinic-arrival'}).medicalNotice,true);
  assert.deepEqual(missingVenueRecovery({state:35}),{preserveTrip:true,state:35,immediateReturn:true,medicalNotice:false});
  assert.equal(missingVenueRecovery({state:65},{purpose:'show-meal-arrival'}).preserveTrip,true);
  assert.equal(missingVenueRecovery({state:0}),null);
});

test('show sprites use native state and movie-specific booth banks with original24px upper layers',()=>{
  const {room}=scene();room.show.stage=3;room.movie.index=13;
  const sprites=showSprites(room);
  assert.deepEqual(sprites.map(s=>[s.sheet,s.sx,s.height]),[[3177,336,24],[3241,336,36],[2152,576,24],[2216,576,36]]);
  assert.equal(sprites[0].y,-9*36+12);
  const party=scene('partyhall').room;party.show.stage=2;assert.deepEqual(showSprites(party).map(s=>s.sx),[384,384]);
});
function showTower() {
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  for(let floor=1;floor<=8;floor++)tower.build('floor',floor,10,109);
  assert.equal(tower.build('elevator',0,40,40,8).ok,true);
  assert.equal(tower.build('cinema',8,50).ok,true);assert.equal(tower.build('partyhall',4,50).ok,true);
  assert.equal(tower.build('fastfood',2,50).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);tower.prepareShows();tower.openBusinesses(false);
  return {tower,cinema:tower.state.rooms.find(r=>r.key==='cinema'),party:tower.state.rooms.find(r=>r.key==='partyhall'),food:tower.state.rooms.find(r=>r.key==='fastfood')};
}
test('Tower creates persistent112/80 show actors and opening causes cohort travel instead of a burst',()=>{
  const {tower,cinema,party}=showTower(),actors=tower.state.actors.filter(a=>a.room===cinema.id).sort((a,b)=>a.resident-b.resident);
  assert.equal(actors.length,112);assert.equal(tower.state.actors.filter(a=>a.room===party.id).length,80);
  assert.ok(actors.every(a=>a.state===39));tower.startShows('cinema',0);assert.equal(tower.state.people.length,0);
  const actor=actors[0];tower.randomInt=()=>0;tower.state.tick=1008+actor.slot%16;updateActors(tower);
  const person=tower.state.people.find(p=>p.id===actor.trip);assert.equal(person.purpose,'show-arrival');assert.equal(person.to,cinema.floor);assert.equal(actor.state,96);
  tower.startShows('partyhall',1);const guest=tower.state.actors.find(a=>a.room===party.id&&a.resident===40);
  tower.state.tick=1200+guest.slot%16;updateActors(tower);
  assert.equal(tower.state.people.find(p=>p.id===guest.trip).to,party.floor-1);
});
test('Tower first movie attendees visit services from lower level; final receipts use actual admissions',()=>{
  const {tower,cinema,food}=showTower(),actors=tower.state.actors.filter(a=>a.room===cinema.id).sort((a,b)=>a.resident-b.resident);
  tower.startShows('cinema',0);tower.state.tick=1450;
  for(const actor of actors.slice(0,40))finishActorTrip(tower,actor,cinema,{to:cinema.floor,tripDelay:0},true,'show-arrival');
  tower.state.tick=1500;tower.finishShows('cinema',0);assert.equal(actors[0].state,1);
  tower.randomInt=()=>0;tower.state.tick=1504+actors[0].slot%16;updateActors(tower);
  const person=tower.state.people.find(p=>p.id===actors[0].trip);
  assert.equal(person.purpose,'show-meal-arrival');assert.equal(person.floor,cinema.floor-1);assert.equal(person.to,food.floor);assert.equal(person.destX,food.x+food.width/2);
  tower.state.tick=1900;const before=tower.state.cash;tower.finishShows('cinema',1);
  assert.equal(tower.state.cash-before,data.movie.receipts[1]*data.moneyScale);assert.equal(cinema.movie.receipts,data.movie.receipts[1]*data.moneyScale);
});
test('Tower show state and identities roundtrip; malformed show saves reject atomically',()=>{
  const {tower,cinema}=showTower();tower.startShows('cinema',0);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  const invalid=JSON.parse(saved);invalid.rooms.find(r=>r.id===cinema.id).show.remaining[0]=61;
  assert.throws(()=>copy.load(JSON.stringify(invalid)),/Invalid show patron/);assert.equal(copy.save(),saved);
  const badActor=JSON.parse(saved);badActor.actors.find(a=>a.room===cinema.id).resident=112;
  assert.throws(()=>copy.load(JSON.stringify(badActor)),/Invalid show actor/);assert.equal(copy.save(),saved);
});
test('native cinema reserves31cells initially, splits booth7/auditorium24 on completion, and defers title RNG',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);
  tower.build('floor',1,10,109);tower.build('floor',2,10,109);
  const rolls=[];tower.randomInt=max=>{rolls.push(max);return 7;};
  assert.equal(tower.build('cinema',2,20).ok,true);const cinema=tower.state.rooms.find(room=>room.key==='cinema');
  assert.equal(cinema.width,31);assert.deepEqual(cinema.nativeTenantSlots.map(slot=>slot.type).sort((a,b)=>a-b),[18,19]);
  assert.equal(cinema.movie.pendingTitle,true);assert.deepEqual(rolls,[]);
  assert.match(tower.plan('office',2,44).error,/Cannot place on top/);
  assert.equal(tower.build('office',2,51).ok,true);const office=tower.state.rooms.find(room=>room.key==='office');
  const originalOfficeSlot=office.nativeTenantIndex,cash=tower.state.cash,floors=JSON.stringify(tower.state.floors),bases=cinema.nativeActorBlocks.map(block=>block.base);
  tower.finishConstruction();assert.equal(tower.state.cash,cash);assert.equal(JSON.stringify(tower.state.floors),floors);
  assert.deepEqual(rolls,[14]);assert.equal(cinema.movie.index,7);assert.equal(cinema.movie.pendingTitle,false);
  assert.deepEqual(cinema.nativeActorBlocks.map(block=>block.base),bases);
  assert.ok(cinema.constructionRemaining>0);assert.deepEqual(cinema.nativeTenantSlots.filter(slot=>slot.floor===1).map(slot=>slot.type),[35,19]);
  tower.finishConstruction();assert.equal(cinema.constructionRemaining,0);assert.deepEqual(rolls,[14]);
  assert.equal(office.nativeTenantIndex,originalOfficeSlot);assert.equal(originalOfficeSlot,1);
  const upper=cinema.nativeTenantSlots.filter(slot=>slot.floor===2);
  assert.deepEqual(upper.map(slot=>[slot.type,slot.x,slot.width,slot.index]),[[34,20,7,0],[18,27,24,2]]);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
});
test('cinema pending title persists through construction save and completed title cannot be pending',()=>{
  const tower=new Tower(data,{sandbox:true});tower.build('lobby',0,10,109);tower.build('floor',1,10,109);tower.build('floor',2,10,109);tower.build('cinema',2,20);
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);assert.equal(copy.save(),saved);
  copy.randomInt=()=>13;copy.finishConstruction();const cinema=copy.state.rooms.find(room=>room.key==='cinema');assert.equal(cinema.movie.index,13);assert.ok(cinema.constructionRemaining>0);
  const completed=copy.save(),bad=JSON.parse(completed);bad.rooms.find(room=>room.id===cinema.id).movie.pendingTitle=true;
  assert.throws(()=>copy.load(JSON.stringify(bad)),/Invalid cinema construction title/);assert.equal(copy.save(),completed);
});
