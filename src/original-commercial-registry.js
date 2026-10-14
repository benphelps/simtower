import { COMMERCIAL_TYPES, validateCommercialState,admitCommercialVisit } from './original-commercial.js';
import {recordJourneyStress} from './original-journeys.js';
import {nativeAdmissionRetryStats} from './original-person-info.js';

export const COMMERCIAL_REGISTRY_LIMIT = 512;
const LIST_LIMITS = {shop:310, restaurant:150, fastfood:230};
const emptyLists=()=>Object.fromEntries([...COMMERCIAL_TYPES].map(key=>[key,Array.from({length:7},()=>[])]));
export function commercialLobbyBand(floor) {
  // 0x33590 signed IDIV: ten registered floors around each sky lobby.
  const band=Math.trunc((floor+5)/15),remainder=(floor+5)%15;
  return band>=0&&band<7&&remainder<=9?band:-1;
}
export function nativeCommercialActorSlot(index) {return (index&255)<<24>>24;}
function roomFor(state,record) {
  return record&&!record.deleted?state.rooms.find(room=>room.id===record.room&&COMMERCIAL_TYPES.has(room.key)&&!room.constructionRemaining):null;
}
function append(state,index) {
  const record=state.commercialRegistry[index],band=commercialLobbyBand(record.floor);
  if(band>=0)state.commercialLists[record.key][band].push(index);
}
export function initializeCommercialRegistry(state) {
  if(state.commercialRegistry!==undefined)return;
  state.commercialRegistry=Array(COMMERCIAL_REGISTRY_LIMIT).fill(null);state.commercialLists=emptyLists();
  // Legacy browser saves cannot recover removed records or their list order.
  for(const room of state.rooms.filter(room=>COMMERCIAL_TYPES.has(room.key)&&!room.constructionRemaining).sort((a,b)=>a.id-b.id))registerCommercialRoom(state,room);
}
export function registerCommercialRoom(state,room) {
  // 0x32673 allocates the first floorFF entry and appends even if closed.
  initializeCommercialRegistry(state);
  const existing=state.commercialRegistry.findIndex(record=>record?.room===room.id&&!record.deleted);
  if(existing>=0){room.commercialSlot=existing;return existing;}
  const index=state.commercialRegistry.indexOf(null);if(index<0)return -1;
  room.commercialSlot=index;
  state.commercialRegistry[index]={room:room.id,key:room.key,floor:room.floor,deleted:false};append(state,index);return index;
}
export function removeCommercialRoom(state,room) {
  // 0x3C074 sets metadata tenant+1 FF, preserving floor, state and lists.
  initializeCommercialRegistry(state);
  const record=state.commercialRegistry.find(record=>record?.room===room.id&&!record.deleted);
  if(record){record.deleted=true;record.commercial=structuredClone(room.commercial);}
}
export function prepareCommercialLists(state,restaurant=false) {
  // 0x32024 at240 clears ALL lists and frees tombstones. 0x320F0 at1600
  // merely appends live restaurants. Newly built restaurants can appear twice.
  initializeCommercialRegistry(state);
  if(!restaurant)state.commercialLists=emptyLists();
  for(let index=0;index<COMMERCIAL_REGISTRY_LIMIT;index++) {
    const record=state.commercialRegistry[index];if(!record)continue;
    if(!restaurant&&record.deleted){state.commercialRegistry[index]=null;continue;}
    if(!record.deleted&&(record.key==='restaurant')===restaurant)append(state,index);
  }
}
export function commercialRegistryCount(state) {
  initializeCommercialRegistry(state);
  const records=state.commercialRegistry.filter(Boolean),registered=new Set(records.map(record=>record.room));
  return records.length+state.rooms.filter(room=>COMMERCIAL_TYPES.has(room.key)&&!registered.has(room.id)).length;
}
export function resolveCommercialSlot(state,actor) {
  if(actor.commercialSlot===undefined)return null;
  initializeCommercialRegistry(state);
  const index=nativeCommercialActorSlot(actor.commercialSlot);
  // 0x32F9E: negative actor+6 means outside/ground, including BYTE overflow.
  if(index<0){actor.job=null;delete actor.missingVenue;return {index,record:null,room:null,floor:0,missing:false};}
  const record=state.commercialRegistry[index],room=roomFor(state,record);
  actor.job=room?.id??null;
  if(!room)actor.missingVenue=true;else delete actor.missingVenue;
  // A reclaimed floorFF is native -1, therefore browser floor -11.
  return {index,record:record??null,room:room??null,floor:record?.floor?? -11,missing:!room};
}
export function chooseCommercialDestination(state,floor,key,randomInt) {
  // 0x333BD→33201 samples once, THEN rejects a closed/unleased state.
  // Deleted room indices do not remove an otherwise open metadata candidate.
  initializeCommercialRegistry(state);
  const group=Math.max(0,Math.trunc((floor+1)/15)),local=state.commercialLists[key]?.[group]??[];
  const list=local.length?local:state.commercialLists[key]?.[0]??[];
  if(!list.length)return null;
  const selectedIndex=list[randomInt(list.length)],record=state.commercialRegistry[selectedIndex];
  const commercial=roomFor(state,record)?.commercial??record?.commercial;
  if(!commercial||[-1,3].includes(commercial.state))return null;
  // 0x4866D/45FDC store only AL in actor+6, even though lists store WORDs.
  const actor={commercialSlot:nativeCommercialActorSlot(selectedIndex)};
  return {...resolveCommercialSlot(state,actor),selectedIndex};
}
export function commercialActorVenue(state,actor) {
  const selected=resolveCommercialSlot(state,actor);
  return selected??{room:state.rooms.find(room=>room.id===actor.job)??null,floor:actor.floor,missing:Boolean(actor.missingVenue)};
}
export function admitSelectedCommercialVisit(tower,actor) {
  const selected=commercialActorVenue(tower.state,actor),venue=selected.room;
  if(selected.index>=0)actor.floor=selected.floor;
  const result=admitCommercialVisit(venue?.commercial,true,venue);
  if(result.status==='admitted'){venue.commercial=result.record;venue.visitors=result.record.visitors;actor.commercialInside=true;}
  else if(result.status==='missing') {
    // 32C9A adds the missing penalty and commits only for a selected slot;
    // negative/offsite actor+6 takes32DC1 without that history commit.
    if(selected.index>=0||selected.index===undefined&&(actor.job!==null||actor.missingVenue)) {
      const stress=tower.data.visits.missingPenalty;
      Object.assign(actor,recordJourneyStress(actor,stress));
      const home=tower.state.rooms.find(room=>room.id===actor.room),stat=home?.trips?.[actor.resident];
      if(stat)Object.assign(stat,recordJourneyStress(stat,stress));
    }
    actor.commercialInside=false;
  }
  return result.status;
}
export function retryCommercialAdmission(tower,actor,home,beginTrip,purpose,admit) {
  const selected=commercialActorVenue(tower.state,actor);
  const destination=selected.index===undefined?selected.room?.floor??actor.floor:selected.floor;
  const normalize=floor=>floor< -10?0:floor;
  // 486C5/46064/45807 use saved current floor, then3E2A0 reroutes if
  // metadata was reclaimed/reused while the actor waited for admission.
  if(normalize(actor.floor)!==normalize(destination))return beginTrip(tower,actor,home,actor.floor,destination,purpose);
  Object.assign(actor,nativeAdmissionRetryStats(actor,tower.state.tick));
  const stat=home.trips?.[actor.resident];if(stat)Object.assign(stat,nativeAdmissionRetryStats(stat,tower.state.tick));
  admit();return true;
}
export function validateCommercialRegistry(state) {
  const fail=()=>{throw new Error('Invalid commercial registry.');};
  if(!Array.isArray(state.commercialRegistry)||state.commercialRegistry.length!==512||!state.commercialLists||typeof state.commercialLists!=='object')fail();
  const records=state.commercialRegistry.filter(Boolean);
  if(new Set(records.map(record=>record.room)).size!==records.length)fail();
  for(let index=0;index<512;index++) {
    const record=state.commercialRegistry[index];if(record===null)continue;
    if(!record||!Number.isSafeInteger(record.room)||record.room<=0||!COMMERCIAL_TYPES.has(record.key)||!Number.isInteger(record.floor)||record.floor< -10||record.floor>109||typeof record.deleted!=='boolean')fail();
    const room=roomFor(state,record);
    if(record.deleted){if(state.rooms.some(room=>room.id===record.room))fail();validateCommercialState(record.commercial);}
    else if(!room||room.key!==record.key||room.floor!==record.floor||room.commercialSlot!==index)fail();
  }
  for(const key of COMMERCIAL_TYPES) {
    const lists=state.commercialLists[key];if(!Array.isArray(lists)||lists.length!==7)fail();
    for(const [band,list]of lists.entries())if(!Array.isArray(list)||list.length>LIST_LIMITS[key]||list.some(index=>!Number.isInteger(index)||index<0||index>=512||!state.commercialRegistry[index]||state.commercialRegistry[index].key!==key||commercialLobbyBand(state.commercialRegistry[index].floor)!==band))fail();
  }
  if(commercialRegistryCount(state)>512||state.rooms.some(room=>COMMERCIAL_TYPES.has(room.key)&&!room.constructionRemaining&&!records.some(record=>record.room===room.id&&!record.deleted)))fail();
  for(const actor of state.actors||[])if(actor.commercialSlot!==undefined&&(!Number.isInteger(actor.commercialSlot)||actor.commercialSlot< -128||actor.commercialSlot>127))fail();
  return true;
}
