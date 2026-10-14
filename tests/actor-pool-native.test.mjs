import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Tower, demoTower } from '../src/simulation.js';
import { syncActors } from '../src/original-people.js';
import { newActorPool, allocateActorBlock, completeActorBlock, releaseActorBlock, nativeActorGlobalSlot, nativeActorCohort, nativeActorBlockSize, validateActorPool, nativeRoomActorBlockParts, reserveRoomActorBlocks, completeRoomActorBlocks, nativeActorSlotForResident, validateActorPoolRooms } from '../src/original-actor-pool.js';
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function towerWithRooms() {
  const tower=new Tower(data,{sandbox:true});
  assert.equal(tower.build('lobby',0,40,180).ok,true);
  for(let floor=1;floor<=3;floor++)assert.equal(tower.build('floor',floor,40,180).ok,true);
  for(const [key,floor,x] of [['office',1,40],['single',1,60],['medical',2,40]])assert.equal(tower.build(key,floor,x).ok,true);
  return tower;
}

test('hotel reserved child and ongoing builders determine later resident cohort', () => {
  let pool = newActorPool();
  const office = allocateActorBlock(pool, { owner: 'office', type: 7 }); pool = office.pool;
  const hotel = allocateActorBlock(pool, { owner: 'hotel', type: 3 }); pool = hotel.pool;
  const condo = allocateActorBlock(pool, { owner: 'condo', type: 9 }); pool = condo.pool;
  assert.equal(hotel.block.base, 6); assert.equal(condo.block.base, 8);
  const complete = completeActorBlock(pool, hotel.block);
  assert.equal(complete.block.base, 6);
  assert.equal(nativeActorGlobalSlot(complete.block, 1), 7);
  assert.equal(nativeActorGlobalSlot(office.block, 0), -1);
  assert.equal(nativeActorCohort(7, 23), true); assert.equal(nativeActorCohort(7, 22), false);
});
test('allocator uses the first sufficiently long free run instead of appending', () => {
  let pool = newActorPool();
  for (const [owner,type] of [['first',7],['second',9],['third',7]]) pool = allocateActorBlock(pool, {owner,type}).pool;
  pool = releaseActorBlock(pool, 'first');
  const restaurant = allocateActorBlock(pool, {owner:'restaurant',type:6});
  assert.equal(restaurant.block.base, 15); // six-record hole is too small
  const hotel = allocateActorBlock(restaurant.pool, {owner:'hotel',type:4});
  assert.equal(hotel.block.base, 0);
  const condo = allocateActorBlock(hotel.pool, {owner:'condo',type:9});
  assert.equal(condo.block.base, 3);
});
test('completed medical metadata frees its builders without freeing a later replacement', () => {
  const clinic = allocateActorBlock(newActorPool(), {owner:'clinic',type:13});
  const completed = completeActorBlock(clinic.pool, clinic.block);
  assert.equal(completed.block.actorType, 0); assert.equal(completed.pool.blocks.length, 0);
  const office = allocateActorBlock(completed.pool, {owner:'office',type:7});
  assert.equal(office.block.base, completed.block.base);
  assert.equal(releaseActorBlock(office.pool, 'clinic').blocks.length, 1);
});
test('tail headroom grows in 256-record pages and demolition does not shrink', () => {
  let pool = newActorPool(256);
  pool = allocateActorBlock(pool, {owner:'first',type:7}).pool;
  assert.equal(pool.capacity, 512);
  pool = allocateActorBlock(pool, {owner:'metro',type:33}).pool;
  assert.equal(pool.capacity, 512); // 266 tail records remain
  pool = allocateActorBlock(pool, {owner:'food',type:6}).pool;
  assert.equal(pool.capacity, 768);
  for (const block of [...pool.blocks]) pool = releaseActorBlock(pool, block.owner);
  assert.equal(pool.capacity, 768); assert.equal(pool.blocks.length, 0);
});
test('native block sizes include inactive children and multi-storey native records', () => {
  assert.deepEqual([3,4,5,9,36,6,29,18,34,33,13].map(nativeActorBlockSize), [2,3,3,3,8,48,40,56,56,240,6]);
  const booth = allocateActorBlock(newActorPool(), {owner:'booth',type:34});
  const auditorium = allocateActorBlock(booth.pool, {owner:'auditorium',type:18});
  let completed = completeActorBlock(auditorium.pool, booth.block);
  assert.equal(completed.block.actorType, 18);
  completed = completeActorBlock(completed.pool, auditorium.block);
  assert.equal(completed.block.actorType, 0); assert.equal(completed.pool.blocks.length, 1);
  assert.equal(allocateActorBlock(completed.pool, {owner:'parking',type:11}).block, null);
});
test('saved pools reject overlapping occupied blocks', () => {
  assert.throws(() => validateActorPool({capacity:512,blocks:[{owner:1,base:0,size:6,actorType:7},{owner:2,base:5,size:3,actorType:9}]}));
});
test('cinema conversion keeps its two construction blocks and bottom-first native timing', () => {
  const room = {id:1,key:'cinema',floor:10};
  const construction = reserveRoomActorBlocks(newActorPool(),room);
  assert.deepEqual(construction.blocks.map(block => [block.type,block.base]), [[19,0],[18,56]]);
  const completed = completeRoomActorBlocks(construction.pool,construction.blocks);
  assert.deepEqual(completed.blocks.map(block => [block.type,block.actorType,block.base]), [[35,18,0],[34,18,56]]);
  assert.equal(completed.pool.blocks.reduce((sum,block) => sum+block.size,0),112);
  room.nativeActorBlocks=completed.blocks;
  assert.equal(nativeActorSlotForResident(room,0),56); assert.equal(nativeActorSlotForResident(room,56),0);
  assert.equal(nativeActorSlotForResident(room,111),55);
});
test('metro builders occupy all three floors then upper-floor blocks become reusable', () => {
  const room = {id:1,key:'metro',floor:-3};
  const construction = reserveRoomActorBlocks(newActorPool(),room);
  assert.deepEqual(construction.blocks.map(block => [block.type,block.base]), [[31,0],[32,6],[33,12]]);
  const completed = completeRoomActorBlocks(construction.pool,construction.blocks);
  room.nativeActorBlocks=completed.blocks;
  assert.equal(completed.pool.blocks.length,1);
  assert.equal(nativeActorSlotForResident(room,0),12);
  assert.equal(allocateActorBlock(completed.pool,{owner:'office',type:7}).block.base,0);
});
test('cathedral native construction always allocates bottom to top', () => {
  assert.deepEqual(nativeRoomActorBlockParts({id:1,key:'cathedral',floor:99}).map(part => part.type),[40,39,38,37,36]);
  assert.deepEqual(nativeRoomActorBlockParts({id:1,key:'partyhall',floor:9}).map(part => part.type),[30,29]);
  assert.deepEqual(nativeRoomActorBlockParts({id:1,key:'partyhall',floor:-2}).map(part => part.type),[29,30]);
});
test('Tower completion and save/load preserve exact hotel offset and freed clinic records', () => {
  const tower=towerWithRooms(), bases=tower.state.rooms.map(room=>room.nativeActorBlocks[0].base);
  assert.deepEqual(bases,[0,6,8]);
  while(tower.state.construction.length)tower.finishConstruction();
  syncActors(tower);
  assert.equal(tower.state.actors.find(actor=>actor.room===tower.state.rooms[1].id).slot,7);
  assert.equal(tower.state.nativeActorPool.blocks.length,2);
  validateActorPoolRooms(tower.state.nativeActorPool,tower.state.rooms);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.save(),tower.save());
});
test('Tower disaster releases the actor block for a replacement without shrinking the pool', () => {
  const tower=towerWithRooms();while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const office=tower.state.rooms[0], capacity=tower.state.nativeActorPool.capacity;
  assert.equal(tower.damageFacilityAt(office.floor,office.x),true);
  assert.equal(tower.state.nativeActorPool.blocks.some(block=>block.owner===`${office.id}:0`),false);
  assert.equal(tower.build('office',1,40).ok,true);
  assert.equal(tower.state.rooms.at(-1).nativeActorBlocks[0].base,0);
  assert.equal(tower.state.nativeActorPool.capacity,capacity);
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.save(),tower.save());
});
test('Tower load rejects altered room bases, orphan allocations and duplicated resident identities atomically', () => {
  const tower=towerWithRooms();while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const saved=tower.save();
  for(const mutate of [
    state=>state.rooms[0].nativeActorBlocks[0].base=50,
    state=>state.rooms[0].nativeActorBlocks=[],
    state=>state.nativeActorPool.blocks.push({owner:'orphan',type:7,floor:3,base:50,size:6,actorType:7,construction:false}),
    state=>state.actors[1].resident=state.actors[0].resident,
    state=>state.actors[0].slot=100,
  ]) {
    const malformed=JSON.parse(saved);mutate(malformed);
    assert.throws(()=>tower.load(JSON.stringify(malformed)));
    assert.equal(tower.save(),saved);
  }
});
test('demo finishes actual native actor blocks before initializing its occupied buildings', () => {
  const tower=demoTower(data);
  validateActorPoolRooms(tower.state.nativeActorPool,tower.state.rooms);
  for(const actor of tower.state.actors)assert.equal(actor.slot,nativeActorSlotForResident(tower.state.rooms.find(room=>room.id===actor.room),actor.resident));
  const copy=new Tower(data);copy.load(tower.save());assert.equal(copy.save(),tower.save());
});
test('legacy browser saves migrate visible actors into native blocks including hotel child0', () => {
  const tower=towerWithRooms();while(tower.state.construction.length)tower.finishConstruction();syncActors(tower);
  const legacy=JSON.parse(tower.save());delete legacy.nativeActorPool;
  for(const room of legacy.rooms)delete room.nativeActorBlocks;
  legacy.actors.forEach((actor,index)=>actor.slot=index);
  const copy=new Tower(data);copy.load(JSON.stringify(legacy));
  assert.equal(copy.state.actors.find(actor=>copy.state.rooms.find(room=>room.id===actor.room).key==='single').slot,7);
  validateActorPoolRooms(copy.state.nativeActorPool,copy.state.rooms);
});
