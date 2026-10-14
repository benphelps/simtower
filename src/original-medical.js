export const MEDICAL_REGISTRY_LIMIT = 10;
function clinicBand(floor) {
  // 0x33590, mirrored here to avoid a people/medical import cycle.
  const group=Math.trunc((floor+5)/15),remainder=(floor+5)%15;
  return group>=0&&group<7&&remainder<=9?group:-1;
}
function addLists(state, index) {
  const record=state.medicalRegistry[index],group=clinicBand(record.floor);
  state.medicalAll.push(index);
  if(group>=0)state.medicalLists[group].push(index);
}
export function initializeMedicalRegistry(state) {
  if(state.medicalRegistry!==undefined){if(!Array.isArray(state.medicalRegistry))throw new Error('Invalid medical registry.');for(const record of state.medicalRegistry.filter(Boolean)){if(typeof record!=='object')throw new Error('Invalid medical registry.');record.inside??=(state.actors||[]).filter(actor=>actor.job===record.room&&actor.state===35&&actor.trip===null).length&255;const room=state.rooms.find(room=>room.id===record.room);if(room)room.medicalInside=record.inside;}return;}
  state.medicalRegistry=Array(MEDICAL_REGISTRY_LIMIT).fill(null);
  state.medicalLists=Array.from({length:7},()=>[]);state.medicalAll=[];
  for(const room of state.rooms.filter(room=>room.key==='medical'&&!room.constructionRemaining).sort((a,b)=>a.id-b.id))registerMedicalRoom(state,room);
  for(const record of state.medicalRegistry.filter(Boolean)){record.inside=(state.actors||[]).filter(actor=>actor.job===record.room&&actor.state===35&&actor.trip===null).length&255;const room=state.rooms.find(room=>room.id===record.room);room.medicalInside=record.inside;}
}
export function registerMedicalRoom(state, room) {
  // 0x2C45F scans ten registry slots for floorFF, then921/997 append lists.
  initializeMedicalRegistry(state);
  const existing=state.medicalRegistry.findIndex(record=>record?.room===room.id&&!record.deleted);
  if(existing>=0)return existing;
  const index=state.medicalRegistry.indexOf(null);if(index<0)return -1;
  room.medicalInside=0;state.medicalRegistry[index]={room:room.id,floor:room.floor,deleted:false,inside:0};addLists(state,index);return index;
}
export function removeMedicalRoom(state, room) {
  initializeMedicalRegistry(state);
  const record=state.medicalRegistry.find(record=>record?.room===room.id);
  // 0x3BF6D sets roomindexFF only; floor and list membership survive.
  if(record)record.deleted=true;
}
export function resetMedicalRegistryDay(state) {
  initializeMedicalRegistry(state);
  // 0x2C3BF removes deleted slots, resets inside bytes and rebuilds lists.
  state.medicalAll=[];state.medicalLists=Array.from({length:7},()=>[]);
  for(let index=0;index<MEDICAL_REGISTRY_LIMIT;index++) {
    const record=state.medicalRegistry[index];
    if(record&&(record.deleted||!state.rooms.some(room=>room.id===record.room&&room.key==='medical')))state.medicalRegistry[index]=null;
    else if(record){record.inside=0;state.rooms.find(room=>room.id===record.room).medicalInside=0;addLists(state,index);}
  }
}
export function medicalRegistryCount(state) {
  initializeMedicalRegistry(state);
  // 0x390FC reserves the capacity when construction starts; 0x47843
  // registers the destination only when the clinic is complete.
  const registered=new Set(state.medicalRegistry.filter(Boolean).map(record=>record.room));
  return registered.size+state.rooms.filter(room=>room.key==='medical'&&room.constructionRemaining&&!registered.has(room.id)).length;
}
export function chooseMedicalDestination(state, floor, randomInt) {
  // 0x2C890/2C80F: local list with ground fallback; deleted slots remain
  // selectable until dawn. 2C7C2 returns that saved native floor even stale.
  initializeMedicalRegistry(state);
  const group=Math.max(0,Math.trunc((floor+1)/15));
  const local=state.medicalLists[group] || [],list=local.length?local:state.medicalLists[0];
  if(!list.length)return null;
  const index=list[randomInt(list.length)],record=state.medicalRegistry[index];
  const room=record.deleted?null:state.rooms.find(room=>room.id===record.room&&room.key==='medical');
  return {index,floor:record.floor,room:room??null,missing:!room};
}
export function resolveMedicalSlot(state,actor) {
  if(actor.medicalSlot===undefined)return null;
  const record=state.medicalRegistry[actor.medicalSlot];
  const room=record&&!record.deleted?state.rooms.find(room=>room.id===record.room&&room.key==='medical'):null;
  actor.job=room?.id??null;
  if(!room)actor.missingVenue=true;else delete actor.missingVenue;
  return {record,room:room??null};
}
export function changeMedicalPatients(state,actor,delta) {
  const slot=actor.medicalSlot??state.medicalRegistry.findIndex(record=>record?.room===actor.job&&!record.deleted),record=state.medicalRegistry[slot];
  if(!record||record.deleted)return;
  record.inside=(record.inside+delta)&255;
  const room=state.rooms.find(room=>room.id===record.room);if(room)room.medicalInside=record.inside;
}
export function validateMedicalRegistry(state) {
  const count=(value,max)=>Number.isInteger(value)&&value>=0&&value<=max;
  if(!Array.isArray(state.medicalRegistry)||state.medicalRegistry.length!==10
    ||!Array.isArray(state.medicalLists)||state.medicalLists.length!==7||!Array.isArray(state.medicalAll))throw new Error('Invalid medical registry.');
  for(const record of state.medicalRegistry)if(record!==null&&(!record||!count(record.room,Number.MAX_SAFE_INTEGER)
    ||!Number.isInteger(record.floor)||record.floor< -10||record.floor>109||typeof record.deleted!=='boolean'||!count(record.inside,255)
    ||!record.deleted&&!state.rooms.some(room=>room.id===record.room&&room.key==='medical'&&!room.constructionRemaining&&room.floor===record.floor)
    ||record.deleted&&state.rooms.some(room=>room.id===record.room)))throw new Error('Invalid medical registry.');
  const records=state.medicalRegistry.filter(Boolean);
  if(new Set(records.map(record=>record.room)).size!==records.length)throw new Error('Invalid medical registry.');
  if(medicalRegistryCount(state)>10||state.rooms.some(room=>room.key==='medical'&&!room.constructionRemaining&&!records.some(record=>record.room===room.id&&!record.deleted)))throw new Error('Invalid medical registry.');
  for(const [group,list]of state.medicalLists.entries())if(!Array.isArray(list)||list.length>10||new Set(list).size!==list.length
    ||list.some(index=>!count(index,9)||!state.medicalRegistry[index]||clinicBand(state.medicalRegistry[index].floor)!==group))throw new Error('Invalid medical registry.');
  if(state.medicalAll.length!==records.length||new Set(state.medicalAll).size!==state.medicalAll.length
    ||state.medicalAll.some(index=>!count(index,9)||!state.medicalRegistry[index]))throw new Error('Invalid medical registry.');
  for(let index=0;index<10;index++)if(state.medicalRegistry[index]) {
    const group=clinicBand(state.medicalRegistry[index].floor);
    if(group>=0&&!state.medicalLists[group].includes(index))throw new Error('Invalid medical registry.');
  }
  for(const actor of state.actors||[])if(actor.medicalSlot!==undefined&&(!count(actor.medicalSlot,9)||!['office'].includes(state.rooms.find(room=>room.id===actor.room)?.key)))throw new Error('Invalid medical person slot.');
  return true;
}
