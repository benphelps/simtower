import {nativeRoomActorBlockParts} from './original-actor-pool.js';

export const CONSTRUCTION_RECORD_LIMIT=10; //3862B BYTE count/head, three parallel arrays.
export function newConstructionRing(){return {head:0,count:0,slots:Array(10).fill(null)};}
export function constructionRecordParts(room,tick=0){
  return nativeRoomActorBlockParts(room).map(({level,floor,type,completedType})=>({level,floor,type,completedType,remaining:12,dirty:1,completed:false,startedTick:tick}));
}
export function constructionEntries(ring){return Array.from({length:ring.count},(_,index)=>ring.slots[(ring.head+index)%10]);}
export function constructionRecord(state,entry){return state.rooms.find(room=>room.id===entry?.room)?.nativeConstructionParts?.find(part=>part.level===entry.level);}
export function refreshConstructionAdapter(state){
  for(const room of state.rooms)if(room.nativeConstructionParts)room.constructionRemaining=Math.max(0,...room.nativeConstructionParts.filter(part=>!part.completed).map(part=>part.remaining));
  state.construction=[...new Set(constructionEntries(state.nativeConstructionRing).map(entry=>entry.room))];
}
export function completeConstructionHead(state,complete){
  const ring=state.nativeConstructionRing;if(!ring.count)return null;
  const entry=ring.slots[ring.head],part=constructionRecord(state,entry);
  if(!part)throw new Error('Missing native construction record.');
  //38680 always completes the HEAD, even though387F1 finds a zero byscan.
  part.remaining=0;part.completed=true;part.dirty=1;
  const room=state.rooms.find(room=>room.id===entry.room);
  room.constructionRemaining=Math.max(0,...room.nativeConstructionParts.filter(part=>!part.completed).map(part=>part.remaining));
  complete?.(entry,part);
  ring.slots[ring.head]=null;ring.head=(ring.head+1)%10;ring.count--;
  refreshConstructionAdapter(state);return entry;
}
export function enqueueConstructionRecord(state,room,part,tick,complete){
  const ring=state.nativeConstructionRing;
  if(ring.count===10)completeConstructionHead(state,complete);
  const tenantIndex=room.nativeTenantSlots?.find(slot=>slot.floor===part.floor&&slot.type===part.type)?.index;
  ring.slots[(ring.head+ring.count)%10]={room:room.id,level:part.level,floor:part.floor,tenantIndex,startedTick:tick};ring.count++;
  refreshConstructionAdapter(state);
}
export function advanceConstructionRing(state,complete){
  for(const entry of constructionEntries(state.nativeConstructionRing)){
    const part=constructionRecord(state,entry);if(!part)throw new Error('Missing native construction record.');
    part.remaining=(part.remaining-1)&255;part.dirty=1;
    if(part.remaining===0)return completeConstructionHead(state,complete);
  }
  refreshConstructionAdapter(state);return null;
}
export function removeConstructionRoom(state,roomId){
  const entries=constructionEntries(state.nativeConstructionRing).filter(entry=>entry.room!==roomId);
  state.nativeConstructionRing=newConstructionRing();for(const entry of entries){state.nativeConstructionRing.slots[state.nativeConstructionRing.count++]=entry;}
  refreshConstructionAdapter(state);
}
export function initializeConstructionRing(state,complete){
  if(state.nativeConstructionRing)return false;
  const legacy=[...(state.construction||[])];state.nativeConstructionRing=newConstructionRing();
  for(const room of state.rooms){
    room.nativeConstructionParts??=constructionRecordParts(room,state.tick);
    for(const part of room.nativeConstructionParts){part.remaining=room.constructionRemaining||0;part.completed=part.remaining===0;}
  }
  for(const id of legacy){const room=state.rooms.find(r=>r.id===id);if(!room)continue;
    for(const part of room.nativeConstructionParts)if(!part.completed)enqueueConstructionRecord(state,room,part,state.tick,complete);
  }
  refreshConstructionAdapter(state);return true;
}
export function validateConstructionRing(state){
  const ring=state.nativeConstructionRing,integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  if(!ring||!integer(ring.head,0,9)||!integer(ring.count,0,10)||!Array.isArray(ring.slots)||ring.slots.length!==10)throw new Error('Invalid native construction ring.');
  const entries=constructionEntries(ring),owners=new Set();
  for(const [index,entry] of ring.slots.entries()){
    const active=((index-ring.head+10)%10)<ring.count;
    if(!active){if(entry!==null)throw new Error('Invalid native construction ring.');continue;}
    const room=state.rooms.find(room=>room.id===entry?.room),part=constructionRecord(state,entry),owner=`${entry?.room}:${entry?.level}`;
    if(!room||!part||part.completed||owners.has(owner)||entry.floor!==part.floor||!integer(entry.tenantIndex,0,149)||entry.tenantIndex!==room.nativeTenantSlots?.find(slot=>slot.floor===part.floor&&slot.type===part.type)?.index||entry.startedTick!==part.startedTick||!integer(entry.startedTick,0,2599))throw new Error('Invalid native construction record.');owners.add(owner);
  }
  for(const room of state.rooms){
    const expected=constructionRecordParts(room,state.tick),parts=room.nativeConstructionParts;
    if(!Array.isArray(parts)||parts.length!==expected.length||new Set(parts.map(part=>part?.level)).size!==parts.length||parts.some(part=>{
      const source=expected.find(value=>value.level===part.level);
      return !source||source.type!==part.type||source.completedType!==part.completedType||source.floor!==part.floor||typeof part.completed!=='boolean'||![0,1].includes(part.dirty)||!integer(part.startedTick,0,2599)||!integer(part.remaining,part.completed?0:1,part.completed?0:12)||owners.has(`${room.id}:${part.level}`)===part.completed;
    })||room.constructionRemaining!==Math.max(0,...parts.filter(part=>!part.completed).map(part=>part.remaining)))throw new Error('Invalid native construction part.');
  }
  if(JSON.stringify(state.construction)!==JSON.stringify([...new Set(entries.map(entry=>entry.room))]))throw new Error('Invalid construction queue adapter.');
  return true;
}
export function nativeRoomCompleted(room){return !room.constructionRemaining;}
export function nativeRoomPartCompleted(room,level=0){const part=room.nativeConstructionParts?.find(part=>part.level===level);return part?part.completed:!room.constructionRemaining;}
export function nativeRoomHasCompletedActors(room){return room.nativeActorBlocks?.some(block=>!block.construction&&block.actorType>0)||!room.constructionRemaining;}
