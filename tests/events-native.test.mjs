import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { syncActors, beginActorTrip } from '../src/original-people.js';
import { EVENT_TIMING, chooseDisasterFloor, startScheduledEvent,
  answerEmergencyDialog, stepEmergency, requestFireRescue,
  fireRescueAvailable, bombDamageCells, emergencySprites, validateEvents, disasterDamageDecision, resetEmergencySecurity, emergencyActive } from '../src/original-events.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function scene(star=3,day=59,secom=false) {
  const state={star,calendarDay:day,tick:240,lobbyHeight:1,
    floors:{0:{x:10,width:64},1:{x:10,width:64},2:{x:10,width:64},3:{x:10,width:64}},
    rooms:[{id:1,key:'security',floor:1}],
    actors:Array.from({length:6},(_,index)=>({id:10+index,room:1,index})),emergency:null};
  if(secom)state.rooms.push({id:2,key:'secom',floor:1});
  const log={dialogs:[],spent:[],damage:[],sound:[],focus:[],evacuations:0};
  const hooks={dialog:(...args)=>log.dialogs.push(args),spend:(...args)=>log.spent.push(args),
    damage:(...args)=>log.damage.push(args),sound:(...args)=>log.sound.push(args),
    focus:(...args)=>log.focus.push(args),evacuate:()=>log.evacuations++,setTick:tick=>state.tick=tick};
  return {state,log,hooks};
}
test('native event timing is recovered PART data',()=>{
  assert.deepEqual(EVENT_TIMING,{scan:1,stairs:3,spread:7,verticalSpread:80,
    helicopter:1,result:2,secomFire:80,extinguish:5});
});
test('disaster floor selection follows contiguous structure and skips the tall ground lobby',()=>{
  const {state}=scene();assert.equal(chooseDisasterFloor(state,()=>0),1);
  assert.equal(chooseDisasterFloor(state,max=>max-1),3);
  state.lobbyHeight=3;assert.equal(chooseDisasterFloor(state,()=>0),3);
  delete state.floors[2];assert.equal(chooseDisasterFloor(state,()=>0),null);
});
test('bomb triggers at native date/tick with exact rating dependent demand',()=>{
  for(const [star,cost] of [[2,200000],[3,300000],[4,1000000]]) {
    const {state,log,hooks}=scene(star);assert.equal(startScheduledEvent(state,data,()=>0,hooks),true);
    assert.deepEqual(log.dialogs,[[3020,cost]]);assert.equal(state.emergency.deadline,1200);
    assert.equal(state.emergency.floor,1);assert.equal(state.emergency.x,10);
  }
  for(const change of [{star:1},{star:5},{calendarDay:58},{tick:241},{rooms:[]}]) {
    const {state,hooks}=scene();Object.assign(state,change);
    assert.equal(startScheduledEvent(state,data,()=>0,hooks),false);
  }
});
test('paying native bomb button 2 deducts ransom and ends the event without search',()=>{
  const {state,log,hooks}=scene();startScheduledEvent(state,data,()=>0,hooks);
  assert.equal(answerEmergencyDialog(state,data,3020,2,hooks),true);
  assert.equal(state.emergency,null);assert.deepEqual(log.spent,[[300000,'Pay terrorist demand']]);
  assert.equal(log.evacuations,0);assert.deepEqual(log.sound,[[10015,2]]);
});
test('SECOM dispatches one staff directly towards known bomb floor and finding it schedules native success',()=>{
  const {state,log,hooks}=scene(3,59,true);
  startScheduledEvent(state,data,max=>max-1,hooks);
  answerEmergencyDialog(state,data,3020,1,hooks);
  assert.deepEqual(log.dialogs.at(-1),[3021,4]);
  assert.deepEqual(state.emergency.staff.map(staff=>staff.state),[0,1,1,1,1,1]);
  state.tick=241;stepEmergency(state,data,hooks);
  assert.equal(state.emergency.staff[0].floor,3);assert.equal(state.emergency.staff[0].travel,6);
  for(let tick=242;tick<=250;tick++){state.tick=tick;stepEmergency(state,data,hooks);}
  assert.equal(state.emergency.found,true);assert.equal(log.damage.length,0);
  assert.deepEqual(log.focus.at(-1),[3,70]);
  assert.equal(state.emergency.staff.filter(staff=>staff.state===0&&staff.mode===4).length,1);
  const finder=state.emergency.staff.find(staff=>staff.state===0&&staff.mode===4);assert.equal(finder.delay,100);
  state.tick=251;stepEmergency(state,data,hooks);assert.equal(finder.delay,99);assert.equal(finder.mode,4);
  state.tick=252;stepEmergency(state,data,hooks);
  assert.equal(state.emergency,null);assert.deepEqual(log.dialogs.at(-1),[3023,4]);assert.equal(state.tick,1500);
});
test('without SECOM all six staff allocate separate search floors using shared bounds and exterior stairs',()=>{
  const {state,hooks}=scene();startScheduledEvent(state,data,()=>0,hooks);
  answerEmergencyDialog(state,data,3020,1,hooks);
  const event=state.emergency;
  assert.ok(event.staff.every(staff=>staff.state===0));
  assert.deepEqual(event.staff.map(staff=>staff.floor),[1,1,1,0,0,0]);
  const staff=event.staff[1];
  state.tick=241;stepEmergency(state,data,hooks);
  assert.equal(staff.floor,2);assert.equal(staff.travel,3);
  assert.deepEqual(event.staff.slice(0,4).map(staff=>staff.floor),[1,2,3,0]);
});

test('bomb search stops a range at native tall-lobby parts instead of hopping over excluded floors',()=>{
  const {state,hooks}=scene();state.lobbyHeight=3;state.rooms[0].floor=3;
  startScheduledEvent(state,data,()=>0,hooks);answerEmergencyDialog(state,data,3020,1,hooks);
  state.tick=241;stepEmergency(state,data,hooks);
  const lower=state.emergency.staff[3];assert.equal(lower.state,1);assert.equal(lower.floor,2);
  assert.equal(state.emergency.searchRanges[1].low,3);
});

test('native emergency dispatch visits security offices in floor/x order then all six children',()=>{
  const {state,hooks}=scene();state.rooms.unshift({id:2,key:'security',floor:3,x:10});
  state.actors.unshift(...Array.from({length:6},(_,index)=>({id:20+index,room:2,index})));
  startScheduledEvent(state,data,()=>0,hooks);answerEmergencyDialog(state,data,3020,1,hooks);
  assert.deepEqual(state.emergency.staff.map(staff=>staff.actor),[10,11,12,13,14,15,20,21,22,23,24,25]);
});

test('native active emergency staff request original event sample every sixteen ticks',()=>{
  const {state,log,hooks}=scene();startScheduledEvent(state,data,()=>0,hooks);
  answerEmergencyDialog(state,data,3020,1,hooks);state.tick=256;stepEmergency(state,data,hooks);
  assert.deepEqual(log.sound.at(-1),[10014,2]);
  const count=log.sound.length;state.tick=257;stepEmergency(state,data,hooks);assert.equal(log.sound.length,count);
});

test('native emergency reset distinguishes bomb/fire activation and clears only security state at ending',()=>{
  const {state}=scene();state.actors.push({id:20,room:3,state:66,floor:2,trip:30,delay:90,trips:4});state.rooms.push({id:3,key:'office',floor:2});
  const ordinary=structuredClone(state.actors.at(-1));resetEmergencySecurity(state,1);
  assert.deepEqual(state.actors.slice(0,6).map(a=>[a.state,a.floor]),[[0,1],[0,1],[0,1],[0,0],[0,0],[0,0]]);
  state.rooms.push({id:4,key:'secom',floor:1});resetEmergencySecurity(state,1);
  assert.deepEqual(state.actors.slice(0,6).map(a=>a.state),[0,1,1,1,1,1]);resetEmergencySecurity(state,8);
  assert.ok(state.actors.slice(0,6).every(a=>a.state===0&&a.floor===1));
  resetEmergencySecurity(state);assert.ok(state.actors.slice(0,6).every(a=>a.state===1&&a.floor===-10&&a.delay===0&&a.trips===0));
  assert.deepEqual(state.actors.at(-1),ordinary);
});
test('unresolved bomb explodes at tick1200, damages native six-level forty-column area and reports after two ticks',()=>{
  const {state,log,hooks}=scene();startScheduledEvent(state,data,()=>0,hooks);
  answerEmergencyDialog(state,data,3020,1,hooks);
  state.tick=1199;stepEmergency(state,data,hooks);assert.equal(log.damage.length,0);
  state.tick=1200;stepEmergency(state,data,hooks);
  assert.equal(state.emergency.found,false);
  assert.equal(log.damage.length,4*40);
  assert.deepEqual(log.damage[0],[0,-10]);assert.deepEqual(log.damage.at(-1),[3,29]);
  state.tick=1202;stepEmergency(state,data,hooks);
  assert.equal(state.emergency,null);assert.deepEqual(log.dialogs.at(-1),[3024,2]);assert.equal(state.tick,1500);
});
test('blast area includes floor+3 and excludes x+20',()=>{
  const {state,log,hooks}=scene();state.floors[4]={x:10,width:64};
  bombDamageCells(state,{floor:1,x:20},hooks);
  assert.equal(log.damage.length,5*40);assert.deepEqual(log.damage.at(-1),[4,39]);
});
test('fire requires the native date, security, rating, width and absence of cathedral',()=>{
  const {state,log,hooks}=scene(3,83);startScheduledEvent(state,data,()=>0,hooks);
  assert.equal(state.emergency.kind,'fire');assert.deepEqual(log.dialogs,[[3011,2]]);
  for(const change of [{star:2},{calendarDay:82},{rooms:[{key:'cathedral'},{key:'security'}]}]) {
    const {state,hooks}=scene(3,83);Object.assign(state,change);
    assert.equal(startScheduledEvent(state,data,()=>0,hooks),false);
  }
  const narrow=scene(3,83);narrow.state.floors[1].width=31;
  assert.equal(startScheduledEvent(narrow.state,data,()=>0,narrow.hooks),false);
});
test('SECOM fire delay and native delayed rescue choice use original templates',()=>{
  const {state,log,hooks}=scene(3,83,true);startScheduledEvent(state,data,()=>0,hooks);
  assert.deepEqual(log.dialogs,[[3010,2]]);assert.equal(state.emergency.spreadDelay,80);
  state.tick=241;stepEmergency(state,data,hooks);assert.equal(log.damage.length,0);
  state.tick=242;stepEmergency(state,data,hooks);assert.deepEqual(log.dialogs.at(-1),[3012,500000]);
  answerEmergencyDialog(state,data,3012,1,hooks);
  assert.deepEqual(log.dialogs.at(-1),[3014,0]);assert.equal(state.emergency.staff.length,6);
  assert.equal(log.spent.length,0);
});

test('fire first dispatch uses zero access and assigns each child only its native floor residue',()=>{
  const {state,hooks}=scene(3,83);state.floors[7]={x:10,width:64};startScheduledEvent(state,data,()=>0,hooks);
  state.emergency.frontiers[7]={left:42,right:42};answerEmergencyDialog(state,data,3012,1,hooks);
  assert.ok(state.emergency.staff.every(staff=>staff.x===0));state.tick=241;stepEmergency(state,data,hooks);
  const firefighter=state.emergency.staff.find(staff=>staff.index===5);
  assert.equal(firefighter.floor,7);assert.equal(firefighter.travel,18);
  assert.ok(state.emergency.staff.filter(staff=>staff.index!==5).every(staff=>staff.x===0));
});
test('paid helicopter disables further rescue and sweeps fire frontiers leftwards',()=>{
  const {state,log,hooks}=scene(3,83);startScheduledEvent(state,data,()=>0,hooks);
  assert.equal(fireRescueAvailable(state),true);assert.equal(requestFireRescue(state,data,hooks),true);
  answerEmergencyDialog(state,data,3012,2,hooks);
  assert.deepEqual(log.spent,[[500000,'Emergency fire crew']]);assert.equal(fireRescueAvailable(state),false);
  const event=state.emergency;event.helicopter=event.x;
  state.tick=241;stepEmergency(state,data,hooks);
  assert.deepEqual(event.frontiers[1],{left:-1,right:-1});
  state.tick=242;stepEmergency(state,data,hooks);
  assert.equal(state.emergency,null);assert.deepEqual(log.dialogs.at(-1),[3013,0]);assert.equal(state.tick,1500);
});
test('native fire spread advances at seven-tick boundaries and ignites upper floors at eighty',()=>{
  const {state,log,hooks}=scene(3,83);startScheduledEvent(state,data,()=>0,hooks);
  state.tick=245;stepEmergency(state,data,hooks);
  assert.deepEqual(state.emergency.frontiers[1],{left:41,right:43});
  assert.deepEqual(log.damage.slice(0,2),[[1,42],[1,54]]);
  state.tick=320;stepEmergency(state,data,hooks);
  assert.deepEqual(state.emergency.frontiers[2],{left:42,right:42});
  assert.equal(state.emergency.frontiers[0].left,-1);
  state.tick=2000;stepEmergency(state,data,hooks);assert.equal(state.emergency,null);
});

test('native fire, smoke, helicopter and firefighter overlay rectangles use original resource frames',()=>{
  const {state,hooks}=scene(3,83,true);startScheduledEvent(state,data,()=>0,hooks);
  state.tick=242;
  assert.deepEqual(emergencySprites(state)[0],{sheet:3948,sx:192,sy:0,x:336,y:-72,width:96,height:36});
  answerEmergencyDialog(state,data,3012,1,hooks);
  const staff=state.emergency.staff[0];staff.mode=4;
  assert.equal(emergencySprites(state).find(sprite=>sprite.sheet===1517).sx,224);
  staff.travel=1;assert.equal(emergencySprites(state).filter(sprite=>sprite.sheet===1517).length,5);
  answerEmergencyDialog(state,data,3012,2,hooks);
  assert.equal(emergencySprites(state).find(sprite=>sprite.sheet===3949).width,96);
  state.emergency.spreadDelay=0;
  assert.equal(emergencySprites(state)[0].sheet,3946);
});

test('emergency saves validate event geometry, staff identity and result shape',()=>{
  for(const day of [59,83]) {
    const {state,hooks}=scene(3,day,true);startScheduledEvent(state,data,()=>0,hooks);
    answerEmergencyDialog(state,data,day===59?3020:3012,1,hooks);
    validateEvents(state);
    const corrupt=JSON.parse(JSON.stringify(state));corrupt.emergency.staff[0].actor=9999;
    assert.throws(()=>validateEvents(corrupt),/Invalid emergency staff data/);
    corrupt.emergency=JSON.parse(JSON.stringify(state.emergency));corrupt.emergency.floor=109;
    assert.throws(()=>validateEvents(corrupt),/Invalid emergency data/);
    corrupt.emergency=JSON.parse(JSON.stringify(state.emergency));
    if(day===59){corrupt.emergency.stage='result';corrupt.emergency.found='yes';corrupt.emergency.resultTick=242;}
    else corrupt.emergency.frontiers[1].left=10000;
    assert.throws(()=>validateEvents(corrupt),/Invalid (bomb|fire) event data/);
  }
});

test('native disasters preserve protected services/construction and replace whole ordinary rooms with rubble',()=>{
  for(const key of ['security','housekeeping','metro','cathedral','lobby','secom']) {
    assert.equal(disasterDamageDecision({key}).damaged,false);
  }
  assert.equal(disasterDamageDecision({key:'office',constructionRemaining:1}).damaged,false);
  assert.deepEqual(disasterDamageDecision({key:'condo',sold:true}),
    {damaged:true,refundCondo:true,wholeFacility:true,nativeType:47,sheet:4008});
  for(const key of ['medical','office','cinema','partyhall','recycling','ramp','parking']) {
    assert.equal(disasterDamageDecision({key}).damaged,true);
  }
});
test('native emergency staff must fit both cells in viewport and elevator preview suppresses overlays',()=>{
  const {state,hooks}=scene(3,59);startScheduledEvent(state,data,()=>0,hooks);answerEmergencyDialog(state,data,3020,1,hooks);
  const staff=state.emergency.staff[0];for(const other of state.emergency.staff)other.state=1;
  Object.assign(staff,{state:0,travel:0,floor:1,x:20});
  const viewport={left:160,right:176,top:-72,bottom:-36};
  assert.equal(emergencySprites(state,viewport).length,1);
  assert.equal(emergencySprites(state,{...viewport,left:161}).length,0);
  assert.equal(emergencySprites(state,{...viewport,right:175}).length,0);
  assert.equal(emergencySprites(state,{...viewport,top:-71}).length,0);
  state.elevatorPreview={};assert.deepEqual(emergencySprites(state,viewport),[]);
});

function emergencyTower(day=59) {
  const tower=new Tower(data,{sandbox:true});
  tower.build('lobby',0,10,109);
  for(let floor=1;floor<=3;floor++)tower.build('floor',floor,10,109);
  tower.build('elevator',0,40,40,3);tower.build('security',1,90);tower.build('office',2,10);
  while(tower.state.construction.length)tower.finishConstruction();
  syncActors(tower);tower.state.star=3;tower.state.calendarDay=day;tower.state.tick=239;
  tower.randomInt=()=>0;
  return tower;
}

test('Tower native bomb trigger/pay decisions persist and malformed event loads are atomic',()=>{
  const tower=emergencyTower();tower.step();assert.equal(tower.state.emergency.kind,'bomb');
  assert.equal(tower.state.dialogs.at(-1).id,3020);
  tower.answerEmergency(3020,1);tower.answerEmergency(3022,1);const saved=tower.save(),copy=new Tower(data);
  copy.load(saved);assert.equal(copy.save(),saved);
  const malformed=JSON.parse(saved);malformed.emergency.staff[0].mode=7;
  assert.throws(()=>copy.load(JSON.stringify(malformed)),/Invalid emergency staff data/);assert.equal(copy.save(),saved);
  const payment=emergencyTower();payment.step();const cash=payment.state.cash;
  assert.equal(payment.answerEmergency(3020,2),true);assert.equal(payment.state.cash,cash-300000);assert.equal(payment.state.emergency,null);
});

test('Tower fire freezes ordinary journeys and enables native rescue only while unpaid',()=>{
  const tower=emergencyTower(83),office=tower.state.rooms.find(room=>room.key==='office');office.occupied=true;
  const actor=tower.state.actors.find(actor=>actor.room===office.id);
  beginActorTrip(tower,actor,office,2,0,'departure');const trip=tower.state.people.find(person=>person.id===actor.trip),x=trip.x;
  tower.step();assert.equal(tower.state.emergency.kind,'fire');assert.equal(trip.x,x);tower.answerEmergency(3011,1);
  assert.equal(tower.canCallFireRescue,true);
  const cash=tower.state.cash;tower.answerEmergency(3012,2);
  assert.equal(tower.state.cash,cash-500000);assert.equal(tower.canCallFireRescue,false);
  tower.step();assert.equal(trip.x,x);
});

test('Tower fire damage refunds condos once, preserves protected security and leaves rebuildable native rubble',()=>{
  const tower=emergencyTower();tower.build('condo',1,70);tower.finishConstruction();syncActors(tower);
  const condo=tower.state.rooms.find(room=>room.key==='condo');condo.occupied=true;condo.sold=true;condo.salePrice=150000;
  const cash=tower.state.cash;
  assert.equal(tower.damageFacilityAt(1,75),true);assert.equal(tower.state.cash,cash-150000);
  assert.equal(tower.damageFacilityAt(1,75),false);assert.equal(tower.state.cash,cash-150000);
  assert.equal(tower.damageFacilityAt(1,95),false);assert.ok(tower.state.rooms.some(room=>room.key==='security'));
  assert.deepEqual(tower.state.rubble,[{floor:1,x:70,width:16}]);
  assert.equal(tower.build('office',1,70).ok,true);
  assert.deepEqual(tower.state.rubble,[{floor:1,x:79,width:7}]);
});

test('native emergency actor freeze leaves elevator movement running',()=>{
  const tower=emergencyTower(83);tower.step();tower.answerEmergency(3011,1);tower.answerEmergency(3012,1);tower.answerEmergency(3014,1);
  const car=tower.state.shafts[0].cars[0];
  car.floor=0;car.target=3;car.departureFloor=0;car.doors=0;car.motionCooldown=0;
  const office=tower.state.rooms.find(r=>r.key==='office'),actor=tower.state.actors.find(a=>a.room===office.id);
  actor.state=0;actor.floor=office.floor;actor.trip=null;
  tower.state.tick=400+actor.slot%16-1;
  tower.step();assert.equal(car.floor,1);assert.equal(actor.trip,null);
});

test('scheduled bomb DialogBox suspends the native tick until demand and briefing have both returned',()=>{
  const tower=emergencyTower(),calls=[];
  tower.updateConstruction=()=>calls.push('construction');tower.checkRating=()=>calls.push('rating');tower.updatePeople=()=>calls.push('people');tower.updateElevators=()=>calls.push('cars');
  tower.step(100);assert.equal(tower.state.tick,240);assert.equal(tower.state.elapsedTicks,1);assert.deepEqual(calls,[]);
  assert.equal(tower.state.tickContinuation,'calendar-tail');assert.equal(tower.state.emergency.stage,'demand');
  tower.answerEmergency(3020,1);assert.equal(tower.state.emergency.stage,'briefing');assert.equal(tower.state.emergency.staff.length,0);assert.deepEqual(calls,[]);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.state.emergencyContinuation.action,'start-bomb');
  tower.answerEmergency(3022,1);assert.equal(tower.state.tickContinuation,undefined);assert.equal(tower.state.emergency.stage,'searching');
  assert.deepEqual(calls,['construction','rating','cars']);assert.ok(tower.state.emergency.staff.length);
  assert.equal(tower.state.tick,240);assert.equal(tower.state.elapsedTicks,1);
});
test('paying a bomb demand resumes ordinary cohorts and cars at the same native tick',()=>{
  const tower=emergencyTower(),calls=[];tower.updatePeople=()=>calls.push(['people',tower.state.tick]);tower.updateElevators=()=>calls.push(['cars',tower.state.tick]);
  tower.step();assert.deepEqual(calls,[]);tower.answerEmergency(3020,2);
  assert.deepEqual(calls,[['people',240],['cars',240]]);assert.equal(tower.state.tickContinuation,undefined);
});
test('fire rescue announcement and refusal suspend damage/security and elevator work inside the tick',()=>{
  const tower=emergencyTower(83),cars=[];tower.updateElevators=()=>cars.push(tower.state.tick);
  tower.step();assert.equal(tower.state.emergency.stage,'announcement');assert.equal(tower.canCallFireRescue,false);assert.deepEqual(cars,[]);
  tower.answerEmergency(3011,1);assert.equal(tower.state.emergency.stage,'burning');assert.deepEqual(cars,[240]);
  tower.step();assert.deepEqual(cars,[240,241]);const rubble=JSON.stringify(tower.state.rubble);tower.step();
  assert.equal(tower.state.dialogs[0].id,3012);assert.equal(tower.state.tick,242);assert.equal(JSON.stringify(tower.state.rubble),rubble);assert.deepEqual(cars,[240,241]);
  tower.answerEmergency(3012,1);assert.equal(tower.state.dialogs[0].id,3014);assert.equal(tower.state.emergency.staff.length,0);assert.deepEqual(cars,[240,241]);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.state.emergencyContinuation.resumeFireTick,true);
  tower.answerEmergency(3014,1);assert.ok(tower.state.emergency.staff.length);assert.deepEqual(cars,[240,241,242]);assert.equal(tower.state.tickContinuation,undefined);
});
test('bomb result DialogBox preserves its old clock until acknowledgment then resumes tick1500 work',()=>{
  const tower=emergencyTower(),cars=[];tower.step();tower.answerEmergency(3020,1);tower.answerEmergency(3022,1);
  tower.state.emergency.stage='result';tower.state.emergency.found=true;tower.state.emergency.resultTick=244;tower.state.tick=243;tower.updateElevators=()=>cars.push(tower.state.tick);
  tower.step();assert.equal(tower.state.tick,244);assert.equal(tower.state.emergency.stage,'reported');assert.deepEqual(cars,[]);
  const copy=new Tower(data);copy.load(tower.save());copy.answerEmergency(3023,1);assert.equal(copy.state.tick,1500);assert.equal(copy.state.emergency,null);
  tower.answerEmergency(3023,1);assert.deepEqual(cars,[1500]);assert.equal(tower.state.tickContinuation,undefined);
});
test('promotion DialogBox precedes emergency dispatch and native tick continuation validation is atomic',()=>{
  const tower=emergencyTower(2),calls=[];tower.checkRating=()=>tower.nativeDialog(3032);tower.updateElevators=()=>calls.push('cars');tower.step();
  assert.equal(tower.state.tickContinuation,'emergency');assert.deepEqual(calls,[]);
  const saved=tower.save(),bad=JSON.parse(saved);bad.tickContinuation='invented';assert.throws(()=>tower.load(JSON.stringify(bad)),/tick continuation/);assert.equal(tower.save(),saved);
  tower.answerEmergency(3032,1);assert.deepEqual(calls,['cars']);assert.equal(tower.state.tickContinuation,undefined);
});
test('a menu rescue DialogBox freezes the clock without creating an unfinished native tick',()=>{
  const tower=emergencyTower(83);tower.step();tower.answerEmergency(3011,1);
  assert.equal(tower.callFireRescue(),true);const tick=tower.state.tick,elapsed=tower.state.elapsedTicks;
  tower.step(20);assert.equal(tower.state.tick,tick);assert.equal(tower.state.elapsedTicks,elapsed);assert.equal(tower.state.tickContinuation,undefined);
  tower.answerEmergency(3012,2);assert.equal(tower.state.tick,tick);tower.step();assert.equal(tower.state.tick,tick+1);
});
test('fire completion clears its emergency mask before the result dialog, but resets staff and clock after acknowledgment',()=>{
  const tower=emergencyTower(83);tower.step();tower.answerEmergency(3011,1);tower.answerEmergency(3012,1);tower.answerEmergency(3014,1);
  const event=tower.state.emergency;event.frontiers={};tower.state.tick=300;tower.step();
  assert.equal(event.stage,'finished');assert.equal(tower.state.tick,301);assert.equal(tower.state.dialogs[0].id,3013);
  assert.equal(emergencyActive(tower.state),false);assert.deepEqual(emergencySprites(tower.state),[]);
  const active=tower.state.actors.filter(a=>a.state===0&&tower.state.rooms.some(r=>r.id===a.room&&r.key==='security'));assert.ok(active.length);
  tower.answerEmergency(3013,1);assert.equal(tower.state.tick,1500);assert.equal(tower.state.emergency,null);
  assert.ok(active.every(a=>a.state===1));assert.equal(tower.state.tickContinuation,undefined);
});
