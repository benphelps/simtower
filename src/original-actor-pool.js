import { CATALOG } from './catalog.js';

// Global 16-byte actor records, not the per-floor +12 tenant registrations.
// 0x48A90 searches actor+4 (type); hotel child0 and builders occupy slots too.
export const ACTOR_POOL_PAGE = 256;
export const INITIAL_ACTOR_POOL_CAPACITY = 512; // New-tower reset 0x48A06.
export const ACTIVE_ACTOR_TYPES = new Set([3,4,5,6,7,9,10,12,14,15,29,30,33,34,35,36,37,38,39,40]);
export const IMMEDIATE_ROOM_TYPES = new Set([0,11,24,44]); // 0x3A82C bypasses 0x47740.

export function nativeActorBlockSize(type) {
  type = Math.abs(type);
  if (type === 3) return 2;
  if ([4,5,9].includes(type)) return 3;
  if (type >= 36 && type <= 40) return 8;
  if ([6,10,12].includes(type)) return 48;
  if ([29,30].includes(type)) return 40;
  if ([18,19,34,35].includes(type)) return 56;
  if (type === 33) return 240;
  return 6;
}
export function nativeActiveActorType(type) {
  if (!ACTIVE_ACTOR_TYPES.has(type)) return 0;
  if (type === 34 || type === 35) return 18;
  if (type === 30) return 29;
  if (type >= 36 && type <= 40) return 36;
  return type;
}
export function newActorPool(capacity = INITIAL_ACTOR_POOL_CAPACITY) {
  const pool = { capacity, blocks: [] };
  validateActorPool(pool);
  return pool;
}
export function validateActorPool(pool) {
  if (!pool || !Number.isInteger(pool.capacity) || pool.capacity < ACTOR_POOL_PAGE || pool.capacity % ACTOR_POOL_PAGE !== 0 || !Array.isArray(pool.blocks)) throw new Error('Invalid native actor pool.');
  const blocks = [...pool.blocks].sort((a,b) => a.base-b.base);
  const owners = new Set(); let end = 0;
  for (const block of blocks) {
    if (block.owner == null || owners.has(block.owner) || !Number.isInteger(block.base) || block.base < end || !Number.isInteger(block.size) || block.size < 1 || block.base+block.size > pool.capacity || !Number.isInteger(block.actorType) || block.actorType === 0) throw new Error('Invalid native actor block.');
    owners.add(block.owner); end = block.base+block.size;
  }
  return true;
}
export function allocateActorBlock(pool, { owner, type, floor, tenantIndex, construction = true }) {
  validateActorPool(pool);
  if (owner == null || pool.blocks.some(block => block.owner === owner)) throw new Error('Duplicate native actor block owner.');
  if (!Number.isInteger(type) || type < 1) throw new Error('Invalid native actor type.');
  if (IMMEDIATE_ROOM_TYPES.has(type)) return { pool, block: null };
  const size = nativeActorBlockSize(type);
  let base = 0;
  for (const occupied of [...pool.blocks].sort((a,b) => a.base-b.base)) {
    if (occupied.base-base >= size) break;
    base = occupied.base+occupied.size;
  }
  // 0x48A90 keeps one 256-record page available beyond the selected run.
  // Native callers never request more than240; the maintained tail guarantees
  // this scan fits before 0x48B86 adds one page.
  if (base+size > pool.capacity) return { pool, block: null, failed: true };
  const capacity = pool.capacity + (pool.capacity-(base+size) < ACTOR_POOL_PAGE ? ACTOR_POOL_PAGE : 0);
  const actorType = construction ? -type : nativeActiveActorType(type);
  const block = { owner, type, floor, tenantIndex, base, size, actorType, construction };
  const next = { capacity, blocks: actorType ? [...pool.blocks, block] : [...pool.blocks] };
  return { pool: next, block };
}
export function completeActorBlock(pool, block) {
  // 0x38680 → 0x40C2F clears builders; 0x47843 → 0x41090 initializes
  // supported tenant records at the SAME room+0E base, without allocation.
  validateActorPool(pool);
  if (!block) return { pool, block: null };
  const previous = pool.blocks.find(other => other.owner === block.owner);
  if (!previous || previous.base !== block.base || !previous.construction) throw new Error('Missing native construction actor block.');
  const completed = { ...block, actorType: nativeActiveActorType(block.type), construction: false };
  const next = { capacity: pool.capacity, blocks: pool.blocks.filter(other => other.owner !== block.owner) };
  if (completed.actorType) next.blocks.push(completed);
  validateActorPool(next);
  return { pool: next, block: completed };
}
export function releaseActorBlock(pool, owner) {
  validateActorPool(pool);
  // Never release by base: a completed clinic/auditorium retains a stale base
  // whose now-free records can subsequently belong to a different tenant.
  return { capacity: pool.capacity, blocks: pool.blocks.filter(block => block.owner !== owner) };
}
export function nativeActorGlobalSlot(block, child) {
  if (!block || !block.actorType || block.construction || !Number.isInteger(child) || child < 0 || child >= block.size) return -1;
  return block.base+child;
}
export function nativeActorCohort(slot, tick) {
  return Number.isInteger(slot) && slot >= 0 && (slot & 15) === (tick & 15); // 0x41544.
}

export function nativeRoomActorBlockParts(room) {
  const type = CATALOG[room.key]?.id;
  if (!Number.isInteger(type) || IMMEDIATE_ROOM_TYPES.has(type)) return [];
  const part = (level, constructionType, completedType = constructionType) => ({
    floor: room.floor-level, level, type: constructionType, completedType,
    size: nativeActorBlockSize(constructionType), owner: `${room.id}:${level}`,
  });
  if (room.key === 'cinema' || room.key === 'partyhall' || room.key === 'recycling') {
    // 0x3A8BF: lower native record first above ground, upper first below.
    // Cinema 0x2E172 turns the allocated18/19 records into34/35 booths;
    // inserted auditorium records have no newly allocated actor block.
    const levels = room.floor >= 1 ? [1,0] : [0,1];
    return levels.map(level => part(level, type+level, room.key === 'cinema' ? 34+level : type+level));
  }
  if (room.key === 'metro') return [0,1,2].map(level => part(level,31+level)); // 0x3AA29, underground.
  if (room.key === 'cathedral') return [4,3,2,1,0].map(level => part(level,36+level)); // 0x3AC17.
  return [part(0,type)];
}
export function reserveRoomActorBlocks(pool, room) {
  const blocks = [];
  for (const part of nativeRoomActorBlockParts(room)) {
    const allocation = allocateActorBlock(pool, { ...part, construction: true,
      tenantIndex: room.nativeTenantSlots?.find(slot => slot.floor === part.floor && slot.type === part.type)?.index });
    if (allocation.failed) throw new Error('Native actor pool exhausted.');
    pool = allocation.pool;
    if (allocation.block) blocks.push({ ...allocation.block, level: part.level, completedType: part.completedType });
  }
  return { pool, blocks };
}
export function completeRoomActorBlocks(pool, blocks) {
  const completed = [];
  for (const block of blocks) {
    const result = completeActorBlock(pool, { ...block, type: block.completedType ?? block.type });
    pool = result.pool; completed.push(result.block);
  }
  return { pool, blocks: completed };
}
export function nativeActorSlotForResident(room, resident) {
  if (!Number.isInteger(resident) || resident < 0) return -1;
  let level = 0, child = resident;
  if (['single','twin','suite'].includes(room.key)) child++;
  else if (room.key === 'cinema' || room.key === 'partyhall') {
    const size = room.key === 'cinema' ? 56 : 40;
    level = Math.trunc(resident/size); child = resident%size;
  } else if (room.key === 'metro') level = 2;
  else if (room.key === 'cathedral') { level = Math.trunc(resident/8); child = resident%8; }
  const block = room.nativeActorBlocks?.find(block => block.level === level);
  return nativeActorGlobalSlot(block,child);
}
export function validateActorPoolRooms(pool, rooms) {
  validateActorPool(pool);
  const expectedOwners = new Set();
  for (const room of rooms) {
    const expected = nativeRoomActorBlockParts(room), blocks = room.nativeActorBlocks;
    if (!Array.isArray(blocks) || blocks.length !== expected.length) throw new Error('Invalid room actor block allocation.');
    for (const part of expected) {
      const native=room.nativeConstructionParts?.find(native=>native.level===part.level);
      const construction = native?!native.completed:room.constructionRemaining > 0;
      const block = blocks.find(block => block.level === part.level);
      const type = construction ? part.type : part.completedType;
      const actorType = construction ? -type : nativeActiveActorType(type);
      if (!block || block.owner !== part.owner || block.type !== type || block.floor !== part.floor || block.size !== part.size || block.completedType !== part.completedType || block.construction !== construction || block.actorType !== actorType || !Number.isInteger(block.base) || block.base < 0 || block.base+block.size > pool.capacity) throw new Error('Invalid room actor block allocation.');
      const occupied = pool.blocks.find(other => other.owner === block.owner);
      if (actorType) {
        if (!occupied || ['type','floor','base','size','actorType','construction'].some(field => occupied[field] !== block[field])) throw new Error('Invalid room actor block ownership.');
        expectedOwners.add(block.owner);
      } else if (occupied) throw new Error('Invalid inactive room actor block.');
    }
  }
  if (pool.blocks.some(block => !expectedOwners.has(block.owner))) throw new Error('Orphaned native actor block.');
  return true;
}
