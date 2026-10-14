import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantSlotParts, firstFreeTenantSlot, tenantSlotAllocation, tenantSlotForRoom } from '../src/original-tenant-slots.js';
const room = (id,key,floor,x,width=9,fields={}) => ({ id,key,floor,x,width,constructionRemaining:0,...fields });
test('native tenant slots follow registration order including medical, parking and lobby records', () => {
  const state = { floors: { 0: { lobby:true,x:0,width:40 } }, rooms: [room(2,'medical',0,10,26),room(3,'parking',-1,10,4),room(4,'office',0,0)] };
  const plan = tenantSlotAllocation(state);
  assert.equal(plan.floors[0].nativeTenantIndex,0);
  assert.equal(plan.rooms.find(p=>p.roomId===2).nativeTenantIndex,1);
  assert.equal(plan.rooms.find(p=>p.roomId===4).nativeTenantIndex,2);
  assert.equal(plan.rooms.find(p=>p.roomId===3).nativeTenantIndex,0);
  assert.equal(tenantSlotForRoom(state.rooms,state.rooms[2]),1);
});
test('registration survives room-table order changes and reuses the first demolished hole', () => {
  const state = { floors:{},rooms:[room(8,'office',1,40,9,{nativeTenantIndex:2}),room(7,'medical',1,20,26,{nativeTenantIndex:0}),room(9,'single',1,10,4)] };
  const plan=tenantSlotAllocation(state);
  assert.deepEqual(plan.rooms.map(p=>p.nativeTenantIndex),[2,0,1]);
  assert.equal(firstFreeTenantSlot([{floor:1,index:0},{floor:1,index:2}],1),1);
  assert.equal(tenantSlotForRoom(state.rooms,{...state.rooms[2],nativeTenantIndex:1}),1);
});
test('native multi-storey slots preserve cinema booth/auditorium, party, metro and cathedral records', () => {
  assert.deepEqual(tenantSlotParts(room(1,'cinema',2,10,31)).map(p=>[p.floor,p.type,p.x,p.width]),[[2,34,10,7],[2,18,17,24],[1,35,10,7],[1,19,17,24]]);
  assert.deepEqual(tenantSlotParts(room(1,'partyhall',2,10,24)).map(p=>[p.floor,p.type]),[[2,29],[1,30]]);
  assert.deepEqual(tenantSlotParts(room(1,'metro',-8,10,30)).map(p=>[p.floor,p.type]),[[-10,33]]);
  assert.deepEqual(tenantSlotParts(room(1,'cathedral',104,10,28)).map(p=>p.type),[36,37,38,39,40]);
  assert.equal(tenantSlotParts(room(1,'recycling',2,10,25)).length,0);
  assert.equal(tenantSlotParts(room(1,'recycling',2,10,25,{constructionRemaining:12})).length,2);
  const cinema=tenantSlotAllocation({floors:{},rooms:[room(1,'cinema',2,10,31)]}).rooms[0];
  assert.equal(cinema.nativeTenantIndex,0); // The booth owns the active pool.
  assert.equal(cinema.nativeTenantSlots.find(p=>p.type===18).index,1);
});
test('tall ground lobby child25/26 have no tenant registration and malformed explicit slots are rejected', () => {
  const state={lobbyHeight:3,floors:{0:{lobby:true,x:0,width:40},1:{lobby:true,x:0,width:40},2:{lobby:true,x:0,width:40},14:{lobby:true,x:0,width:40}},rooms:[]};
  assert.deepEqual(tenantSlotAllocation(state).floors.map(p=>p.floor),[0,14]);
  assert.throws(()=>tenantSlotAllocation({floors:{},rooms:[room(1,'office',1,0,9,{nativeTenantIndex:0}),room(2,'medical',1,10,26,{nativeTenantIndex:0})]}),/registration/);
  assert.equal(firstFreeTenantSlot(Array.from({length:150},(_,index)=>({floor:1,index})),1),-1);
});
