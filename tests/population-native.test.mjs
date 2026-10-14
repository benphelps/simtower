import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower } from '../src/simulation.js';
import { newPopulationCounters,changeNativePopulation,clearNativePopulationCategory,nativePopulationEvent,populationResetTypes,nativePopulationCategory,validatePopulationCounters } from '../src/original-population.js';

test('accepted resident capacities and extra shop tenancy ten are native counter events', () => {
  let counters=newPopulationCounters();
  for(const key of ['office','condo','single','twin','suite','shop']) {
    const event=nativePopulationEvent({key},'admit');
    counters=changeNativePopulation(counters,event.type,event.delta);
  }
  assert.equal(counters.total,24);
  counters=changeNativePopulation(counters,10,17); // previous-day generated shop patrons
  assert.equal(counters.categories[4],27);
  counters=clearNativePopulationCategory(counters,10);
  assert.equal(counters.total,14); // daily reset clears allowance AND initial admission bonus
});
test('commercial and show deletion preserve allowance until the native category reset', () => {
  let counters=changeNativePopulation(newPopulationCounters(),12,50);
  const removed=nativePopulationEvent({key:'fastfood',occupied:true,constructionRemaining:0},'remove');
  counters=changeNativePopulation(counters,removed.type,removed.delta);
  assert.equal(counters.total,50);
  counters=changeNativePopulation(counters,18,120);
  assert.equal(nativePopulationEvent({key:'cinema',occupied:true},'remove').delta,0);
  assert.equal(clearNativePopulationCategory(counters,34).total,50);
  assert.deepEqual(populationResetTypes(240),[12,10,18,29]);
  assert.deepEqual(populationResetTypes(1600),[6]);assert.deepEqual(populationResetTypes(0),[]);
});
test('resident deletion uses original occupancy facade ranges and excludes service cohorts', () => {
  assert.equal(nativePopulationEvent({key:'office',tenantState:8},'remove').delta,-6);
  assert.equal(nativePopulationEvent({key:'condo',tenantState:16},'remove').delta,-3);
  assert.equal(nativePopulationEvent({key:'suite',hotelState:16},'remove').delta,-2);
  assert.equal(nativePopulationEvent({key:'suite',hotelState:64,occupied:true},'remove').delta,0);
  assert.equal(nativePopulationEvent({key:'office',tenantState:16},'remove').delta,0);
  for(const type of [11,13,14,15,33,36])assert.equal(nativePopulationCategory(type),-1);
});
test('counter updates sign-extend WORD deltas and preserve category/global LONG consistency', () => {
  const counters=changeNativePopulation(changeNativePopulation(newPopulationCounters(),7,6),7,65530);
  assert.equal(counters.total,0);assert.equal(counters.categories[0],0);
  assert.throws(()=>validatePopulationCounters({categories:Array(10).fill(0),total:6}));
  assert.throws(()=>validatePopulationCounters({categories:Array(10).fill(0.5),total:5}));
});
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function building() {
  const tower=new Tower(data,{sandbox:true});
  tower.build('lobby',0,40,180);
  for(let floor=1;floor<=3;floor++)tower.build('floor',floor,40,180);
  return tower;
}
test('Tower shop initial tenancy contributes an extra ten until opening resets its category', () => {
  const tower=building();tower.state.tick=300;tower.build('shop',1,40);tower.finishConstruction();
  const shop=tower.state.rooms[0];assert.equal(tower.population,10);
  tower.admitTenant(shop);assert.equal(tower.population,20);
  tower.admitTenant(shop);assert.equal(tower.population,20);
  shop.commercial.generated=17;tower.state.tick=240;tower.openBusinesses();
  assert.equal(tower.population,17);
});
test('Tower deleting the last commercial room preserves its accepted counter through save until reset', () => {
  const tower=building();tower.state.tick=300;tower.build('shop',1,40);tower.finishConstruction();
  const shop=tower.state.rooms[0];tower.admitTenant(shop);assert.equal(tower.population,20);
  tower.removeRoom(shop);assert.equal(tower.state.rooms.length,0);assert.equal(tower.population,20);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.population,20);assert.equal(copy.save(),tower.save());
  copy.state.tick=240;copy.openBusinesses();assert.equal(copy.population,0);
});
test('Tower show allowance counts once per daily setup and survives demolition until setup', () => {
  const tower=building();tower.build('partyhall',2,40);tower.finishConstruction();
  assert.equal(tower.population,0);tower.prepareShows();assert.equal(tower.population,50);
  tower.prepareShows();assert.equal(tower.population,50);
  tower.removeRoom(tower.state.rooms[0]);assert.equal(tower.population,50);
  tower.prepareShows();assert.equal(tower.population,0);
});
test('Tower accepted resident capacities change at contracts and checkout instead of inside counts', () => {
  const tower=building();tower.build('office',1,40);tower.build('condo',2,40);tower.build('twin',3,40);
  while(tower.state.construction.length)tower.finishConstruction();
  const [office,condo,hotel]=tower.state.rooms;
  tower.admitTenant(office);tower.admitTenant(condo);tower.checkInHotel(hotel);
  assert.equal(tower.population,11);tower.checkInHotel(hotel);assert.equal(tower.population,11);
  hotel.hotelState=16;office.tenantState=8;condo.tenantState=16;assert.equal(tower.population,11);
  tower.vacateRoom(office);assert.equal(tower.population,5);tower.vacateRoom(office);assert.equal(tower.population,5);
  tower.checkOut(hotel);assert.equal(tower.population,3);
  tower.removeRoom(condo);assert.equal(tower.population,0);
});
test('Tower hotel infestation changes facade without dropping accepted population', () => {
  const tower=building();tower.build('single',1,40);tower.build('single',1,44);
  while(tower.state.construction.length)tower.finishConstruction();
  const [source,target]=tower.state.rooms;source.hotelState=56;source.accepting=false;
  tower.checkInHotel(target);assert.equal(tower.population,1);
  tower.state.tick=1600;tower.evaluateHotels();
  assert.equal(target.hotelState,64);assert.equal(target.occupied,true);assert.equal(tower.population,1);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.population,1);
  tower.removeRoom(target);assert.equal(tower.population,1); // Native demolition ignores a facade>=24.
});
test('Tower validates persisted categories atomically and migrates an older population snapshot', () => {
  const tower=building();tower.build('office',1,40);tower.finishConstruction();tower.admitTenant(tower.state.rooms[0]);
  const saved=tower.save(), malformed=JSON.parse(saved);malformed.nativePopulation.total++;
  assert.throws(()=>tower.load(JSON.stringify(malformed)));assert.equal(tower.save(),saved);
  const legacy=JSON.parse(saved);delete legacy.nativePopulation;
  const copy=new Tower(data);copy.load(JSON.stringify(legacy));assert.equal(copy.population,6);
});
