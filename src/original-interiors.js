import { HOTELS, CELL, FLOOR, CATALOG } from './catalog.js';

// Room+13 is a retained dirty BYTE. A1EE clears it only after drawing that
// native floor record; offscreen writes survive until its next visible pass.
export function nativeInteriorRecord(room,floor=room.floor) {
  room.nativeInteriors??=[];
  let record=room.nativeInteriors.find(record=>record.floor===floor);
  if(!record){record={floor,dirty:1,sampled:false,lastTick:null,lastEpoch:null,poses:[]};room.nativeInteriors.push(record);}
  return record;
}
export const interiorSampleEpoch=state=>state.elapsedTicks??(state.calendarDay??0)*2600+state.tick;
export function markInteriorDirty(room,floor=room.floor) {nativeInteriorRecord(room,floor).dirty=1;}
export function markAllInteriorsDirty(state) {
  for(const room of state.rooms)for(let level=0;level<(room.height||1);level++)markInteriorDirty(room,room.floor-level);
}
export function validateNativeInteriors(state) {
  for(const room of state.rooms){
    if(room.nativeInteriors===undefined)continue;
    if(!Array.isArray(room.nativeInteriors)||room.nativeInteriors.length>(room.height||1))throw new Error('Invalid native interior records.');
    const floors=new Set();
    for(const record of room.nativeInteriors){
      if(!record||!Number.isInteger(record.floor)||record.floor>room.floor||record.floor<room.floor-(room.height||1)+1||floors.has(record.floor)||![0,1].includes(record.dirty)||typeof record.sampled!=='boolean'||record.lastTick!==null&&(!Number.isInteger(record.lastTick)||record.lastTick<0||record.lastTick>=2600)||!Array.isArray(record.poses)||record.poses.length>6)throw new Error('Invalid native interior record.');
      if(record.sampled&&record.lastTick===null||record.lastEpoch!==undefined&&record.lastEpoch!==null&&(!Number.isInteger(record.lastEpoch)||record.lastEpoch<0||state.elapsedTicks!==undefined&&record.lastEpoch>state.elapsedTicks)||record.constructionRemaining!==undefined&&(!Number.isInteger(record.constructionRemaining)||record.constructionRemaining<0||record.constructionRemaining>12))throw new Error('Invalid native interior sample state.');
      floors.add(record.floor);const indices=new Set();
      for(const pose of record.poses){
        if(!pose||!Number.isInteger(pose.cell)||pose.cell<0||pose.cell>=room.width||!Number.isInteger(pose.pose)||pose.pose<0||pose.pose>98||!Number.isInteger(pose.index)||pose.index<0||pose.index>5||indices.has(pose.index)||pose.actor!==null&&!state.actors?.some(actor=>actor.id===pose.actor&&actor.room===room.id&&actor.index===pose.index))throw new Error('Invalid native interior pose.');
        if(pose.level!==undefined&&pose.level!==room.floor-record.floor)throw new Error('Invalid native interior pose floor.');
        indices.add(pose.index);
      }
      if(!record.sampled&&(record.poses.length||record.lastTick!==null||record.lastEpoch!==undefined&&record.lastEpoch!==null))throw new Error('Invalid unsampled native interior record.');
    }
  }
  return true;
}

export function nativeVisibleInteriorRooms(rooms,{left,right,top,bottom}) {
  //A1DD scans visible grid rows from top to bottom, then columns from left
  //to right;AA87 invokes6BC2 once per encountered facility span. Offscreen
  //rooms do not consume the shared simulation RNG for interior poses.
  return rooms.flatMap(room=>room.constructionRemaining>0||(room.height||1)>1
    ?Array.from({length:room.height||1},(_,level)=>{
      const part=room.nativeConstructionParts?.find(part=>part.level===level);
      return {...room,floor:room.floor-level,interiorOwner:room,interiorLevel:level,interiorKey:`${room.id}:${level}`,
        interiorConstructionPart:part,constructionRemaining:part?part.completed?0:part.remaining:room.constructionRemaining};
    }):[room])
    .filter(room=>room.x*CELL<right&&(room.x+room.width)*CELL>left
    &&-(room.floor+1)*FLOOR<bottom&&-room.floor*FLOOR>top)
    .sort((a,b)=>b.floor-a.floor||a.x-b.x);
}
export function nativeBuilderPose(room,randomInt) {
  //6E8B reads the type-table WORD width, not its construction RECT. Cinema
  //18/19 therefore samples within24cells although its reserved span is31.
  const width=room.key==='cinema'?24:CATALOG[room.key]?.width??room.width;
  return {cell:randomInt(width-1),pose:57+randomInt(6),actor:null,index:0};
}
export function constructionInteriorSprites(room,poses) {
  return poses.flatMap(pose=>roomInteriorSprites({...room,floor:room.floor-(pose.level||0)},[pose]));
}

export function interiorUpdateDue(tick, tenantIndex, changed = false, animations = true) {
  // 0x6BC2 updates immediately on room +13 dirty, otherwise one in16 ticks
  // according to its native tenant index, only while animation is enabled.
  return changed || animations && (tick + tenantIndex) % 16 === 0;
}
export function nativeInteriorFrame(pose, half = 0) {
  // 0x3160C copies one 8x24 cell at a time; residential drawings call it
  // for both the actor's cell and the following cell. Type8 packs1512/1513.
  const cell = pose + half;
  return { sheet: cell < 60 ? 1512 : 1513, sx: (cell < 60 ? cell : cell - 60) * CELL,
    sy: 0, width: CELL, height: 24 };
}
export function nativeInteriorPose(room, actor, state, randomInt) {
  // 0x6F4F office,0x7613 condo,0x78EF hotels,0x7B62/0x7CC8 food.
  // Only actor states0..5 draw interior silhouettes; sleeping16 does not.
  if (actor.state > 5 || actor.trip !== null && actor.trip !== undefined) return null;
  const index = actor.index, style = room.variant || 0, night = state.tick >= 1600;
  const randomCell = () => randomInt(room.width - 1);
  if (room.key === 'office') {
    if (style < 2 && index < 3) return { cell: style + index + 1, pose: [14, 16, 12][index] + randomInt(2) };
    if (index === 0) return { cell: 7, pose: 10 + randomInt(2) };
    if (index === 1 || index === 2) {
      const pose = (index === 1 ? 6 : 2) + randomInt(4);
      return { pose, cell: pose >= (index === 1 ? 8 : 4) ? (index === 1 ? 4 : 2) : randomCell() };
    }
    if (index === 3) return { cell: randomCell(), pose: randomInt(2) };
    if (index === 4 || index === 5) {
      const pose = (index === 4 ? 20 : 18) + randomInt(index === 4 ? 4 : 2);
      return { pose, cell: randomCell() };
    }
  }
  if (room.key === 'condo') {
    if (index === 0) return { cell: randomCell(), pose: state.calendarDay % 3 === 2 ? 34 : night ? 32 + randomInt(2) : 30 };
    if (index === 1) {
      const pose = 41 + randomInt(9);
      return { pose, cell: pose === 49 ? 1 : randomCell() };
    }
    if (index === 2) return { cell: randomCell(), pose: state.controlHeld ? 54 + randomInt(3) : 50 + randomInt(4) };
  }
  if (HOTELS.has(room.key)) {
    if (index === 0) return { cell: randomCell(), pose: 96 + randomInt(3) };
    if (index === 1) return { cell: randomCell(), pose: night ? 82 + randomInt(9) : 80 + randomInt(2) };
    if (index === 2) return { cell: randomCell(), pose: night && state.controlHeld ? 95 : 91 + randomInt(4) };
  }
  if (room.key === 'fastfood' && index < 2) return { cell: randomInt(3), pose: (index ? 65 : 63) + randomInt(2) };
  if (room.key === 'restaurant' && index < 2) return { cell: randomInt(3), pose: (index ? 76 : 73) + randomInt(index ? 4 : 3) };
  // Security/housekeeping home rooms have no actor-overlay branch inA86D.
  return null;
}
export function sampleRoomInteriors(state, room, actors, randomInt) {
  const identities = actors.filter(actor => actor.room === room.id).sort((a, b) => a.index - b.index);
  if (HOTELS.has(room.key) && room.housekeepingOverlay) identities.unshift({ index: 0, state: 3, trip: null });
  return identities.map(actor => {
    const pose = nativeInteriorPose(room, actor, state, randomInt);
    return pose && { ...pose, actor: actor.id ?? null, index: actor.index };
  }).filter(Boolean);
}
export function roomInteriorSprites(room, poses) {
  // 0x6706/0x67FE/0x68FB/0x69F3 copy both cells independently and clip
  // to the currently drawn room span. Preserve split resource boundaries.
  const sprites = [];
  for (const pose of poses) for (let half = 0; half < 2; half++) {
    const cell = pose.cell + half;
    if (cell < 0 || cell >= room.width) continue;
    sprites.push({ ...nativeInteriorFrame(pose.pose, half), x: (room.x + cell) * CELL,
      y: -(room.floor + 1) * FLOOR + 12, actor: pose.actor ?? null });
  }
  return sprites;
}
