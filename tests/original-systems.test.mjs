import test from 'node:test';
import {initializeMedicalRegistry} from '../src/original-medical.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {finishActorTrip} from '../src/original-people.js';
import {nextRandom,tenantEvaluation,meanTenantStress,hotelStress,noisyNeighbor,recyclingStage,movieAudience,movieReceipt,newElevatorPrograms,elevatorProgram,carMotion,tenureLabel} from '../src/original-systems.js';
import {quarterAccounts,recordAccount,rentAmount} from '../src/original-economy.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building(high=4){const t=new Tower(data,{sandbox:true});t.build('lobby',0,40,139);for(let f=1;f<=high;f++)t.build('floor',f,40,139);return t;}

test('Borland rand matches the recovered 32-bit recurrence and 15-bit output',()=>{
  let seed=1;const values=[];
  for(let i=0;i<8;i++){const result=nextRandom(seed);seed=result.seed;values.push(result.value);}
  assert.deepEqual(values,[346,130,10982,1090,11656,7117,17595,6415]);
  assert.equal(nextRandom(0xffffffff).seed,0xfea5b1cc);
});
test('stress averages residents equally and applies strict original evaluation thresholds',()=>{
  assert.equal(meanTenantStress([{delay:159,trips:2},{delay:400,trips:10},{delay:0,trips:0}]),39);
  assert.deepEqual([79,80,149,150].map(s=>tenantEvaluation(data,s,3)),[2,1,1,0]);
  assert.equal(tenantEvaluation(data,199,4),1);assert.equal(tenantEvaluation(data,200,4),0);
  assert.equal(tenantEvaluation(data,-1,1),-1);
  assert.deepEqual([0,1,2,3].map(p=>hotelStress(20,p,false)),[50,20,0,0]);
  assert.equal(hotelStress(100,3,true),60);
});
test('noise scans the original horizontal radius, not the floor above',()=>{
  const office={id:1,key:'office',floor:2,x:40,width:9};
  assert.equal(noisyNeighbor(office,[office,{id:2,key:'fastfood',floor:3,x:40,width:16}]),undefined);
  assert.equal(noisyNeighbor(office,[office,{id:2,key:'fastfood',floor:2,x:60,width:16}]),undefined);
  assert.equal(noisyNeighbor(office,[office,{id:2,key:'fastfood',floor:2,x:59,width:16}]).id,2);
  assert.equal(noisyNeighbor(office,[office,{id:2,key:'fastfood',floor:2,x:58,width:16}]).id,2);
});
test('native noise excludes construction and includes both exact radius edges',()=>{
  const office={id:1,key:'office',floor:2,x:40,width:9};
  const left={id:2,key:'fastfood',floor:2,x:14,width:16};
  assert.equal(noisyNeighbor(office,[office,left]).id,2);
  assert.equal(noisyNeighbor(office,[office,{...left,x:13}]),undefined);
  assert.equal(noisyNeighbor(office,[office,{...left,constructionRemaining:1}]),undefined);
  assert.equal(noisyNeighbor({...office,constructionRemaining:1},[office,left]),undefined);
  assert.equal(noisyNeighbor(office,[office,{id:3,key:'shop',floor:2,x:49,width:12,occupied:false}]).id,3);
  assert.equal(noisyNeighbor({id:4,key:'fastfood',floor:2,x:40,width:16},[left]),undefined);
});
test('recycling overflow is checked at the end of the night at 2500 residents per center',()=>{
  assert.deepEqual([0,499,500,2499,2500].map(p=>recyclingStage(p,1)),[1,1,2,5,6]);
  assert.equal(recyclingStage(4999,2),5);assert.equal(recyclingStage(5000,2),6);
  const t=building();for(let f=-1;f>=-2;f--)t.build('floor',f,40,139);
  t.build('recycling',-1,40);t.step(12);t.state.star=3;t.updateGarbage(5);
  assert.equal(t.state.garbage.working,true);assert.equal(t.state.garbage.stage,1);
  t.state.tick=2599;t.step();assert.equal(t.state.garbage.stage,0);
});
test('movie audience decays in three-day stages and original receipts use total attendance',()=>{
  assert.deepEqual([0,3,6,9].map(d=>movieAudience(data,0,d)),[40,40,40,20]);
  assert.deepEqual([0,3,6,9].map(d=>movieAudience(data,7,d)),[60,60,40,20]);
  assert.deepEqual([0,39,40,79,80,99,100].map(n=>movieReceipt(data,n)),[0,0,2000,2000,10000,10000,15000]);
});
test('cinema has a native booth, two persistent cohort batches and one closing receipt',()=>{
  const t=building();t.build('cinema',3,40);t.build('elevator',0,100,100,3);t.step(13);
  const r=t.state.rooms[0];r.movie.index=7;t.prepareShows();
  assert.equal(r.width,31);assert.equal(r.movie.attendance,120);assert.equal(t.population,120);
  const actors=t.state.actors.filter(a=>a.room===r.id).sort((a,b)=>a.resident-b.resident);assert.equal(actors.length,112);
  t.startShows('cinema',0);assert.equal(t.state.people.length,0);
  assert.ok(actors.slice(0,56).every(a=>a.state===32));assert.ok(actors.slice(56).every(a=>a.state===39));
  t.startShows('cinema',1);assert.ok(actors.every(a=>a.state===32));
  for(const actor of actors.slice(0,100))finishActorTrip(t,actor,r,{to:r.floor,tripDelay:0},true,'show-arrival');
  const cash=t.state.cash;
  t.finishShows('cinema',0);assert.equal(t.state.cash,cash);
  t.finishShows('cinema',1);assert.equal(t.state.cash-cash,15000);assert.equal(t.population,120);
});
test('new movie selection cycles the native seven titles and is atomic when unaffordable',()=>{
  const t=building();t.build('cinema',3,40);t.step(12);const r=t.state.rooms[0];r.movie.index=6;
  const cash=t.state.cash;assert.equal(t.changeMovie(r.id,'new').cost,300000);assert.equal(r.movie.index,7);assert.equal(t.state.cash,cash-300000);
  assert.equal(t.changeMovie(r.id,'classic').cost,150000);assert.equal(r.movie.index,1);
  t.state.sandbox=false;t.state.cash=0;const saved=t.save();assert.match(t.changeMovie(r.id,'new').error,/money/);assert.equal(t.save(),saved);
});
test('treasure searches B3 at one star and does not repeat for later construction',()=>{
  const t=new Tower(data,{sandbox:true});t.build('lobby',0,40,65);
  for(let f=-1;f>=-2;f--)t.build('floor',f,40,65);
  assert.equal(t.state.nativeFlags.treasure,false);
  const cash=t.state.cash,first=t.build('floor',-3,40,65);
  assert.equal(t.state.cash-cash+first.cost,200000);assert.equal(t.state.dialogs.at(-1).id,3040);
  const found=t.state.cash,more=t.build('floor',-4,40,65);assert.equal(t.state.cash,found-more.cost);
});
test('ordinary demolition is free and a sold condo repays its original price tier',()=>{
  const t=building();t.build('office',1,40);t.build('condo',2,40);t.step(13);
  const cash=t.state.cash;t.demolish(1,40);assert.equal(t.state.cash,cash);
  const r=t.state.rooms[0];r.sold=true;r.price=2;delete r.salePrice;t.demolish(2,40);assert.equal(t.state.cash,cash-rentAmount(data,9,2));
});
test('finance keeps native category totals separate from construction and other income',()=>{
  const a=quarterAccounts(2000000);recordAccount(a,-40000,7,'construction');recordAccount(a,10000,7);recordAccount(a,-3000,1,'maintenance');recordAccount(a,200000,null);recordAccount(a,-150000,9);
  assert.equal(a.construction,40000);assert.equal(a.income[0],10000);assert.equal(a.income[9],-150000);assert.equal(a.maintenance[1],3000);assert.equal(a.other,200000);
});
test('quarter rent stops after 120 quarters of office tenure',()=>{
  const t=building();t.build('office',1,40);t.build('elevator',0,100,100,1);t.step(12);const r=t.state.rooms[0];t.admitTenant(r);r.tenure=119;
  t.settleQuarter();assert.equal(r.tenure,120);assert.equal(t.state.accounts.income[0],10000);
  t.settleQuarter();assert.equal(t.state.accounts.income[0],0);
});
test('tenant tenure uses original one-based quarters and the 30-year ceiling caption',()=>{
  assert.deepEqual([0,3,4,119,120].map(n=>tenureLabel(data,n)),['1Q','4Q','1Year1Q','29Year4Q','Over 30 years']);
});
test('native facility pools reject excess construction without charging or mutating the tower',()=>{
  for(const [key,existing,count] of [['security','security',10],['medical','medical',10],['cinema','partyhall',16],['shop','fastfood',512]]) {
    const t=building();t.state.rooms=Array.from({length:count},(_,i)=>({id:i+1,key:existing,floor:4,x:200,width:1}));
    if(key==='medical'){delete t.state.medicalRegistry;initializeMedicalRegistry(t.state);}
    const saved=t.save();assert.match(t.build(key,3,40).error,/No more/);assert.equal(t.save(),saved);
  }
});
test('weekday/weekend elevator slots are independent and native car movement accelerates',()=>{
  const sh={programs:newElevatorPrograms()};sh.programs[1][3].wait=2;
  assert.equal(elevatorProgram(sh,1200,false).wait,0);assert.equal(elevatorProgram(sh,1200,true).wait,2);
  assert.deepEqual(carMotion('elevator',10,0),{floors:1,delay:5});
  assert.deepEqual(carMotion('elevator',10,2),{floors:1,delay:2});
  assert.deepEqual(carMotion('elevator',10,4),{floors:1,delay:0});
  assert.deepEqual(carMotion('express',10,5),{floors:3,delay:0});
});
test('rain starts on the recovered day modulus, stops at 17:00 and is excluded at five stars',()=>{
  const t=new Tower(data);t.state.calendarDay=4;t.state.tick=2599;t.step();assert.equal(t.state.rain,true);
  t.state.tick=1599;t.step();assert.equal(t.state.rain,false);
  t.state.star=5;t.state.tick=2599;t.step();assert.equal(t.state.rain,false);
});
test('Santa is a once-per-year native event and moves ten pixels left, one down each update',()=>{
  const t=new Tower(data);t.state.calendarDay=11;t.state.tick=1999;t.step();assert.deepEqual(t.state.santa,{x:2860,y:-1764});
  t.step();assert.deepEqual(t.state.santa,{x:2850,y:-1763});
  t.step(300);assert.equal(t.state.santa,null);
});
