import { CATALOG } from './catalog.js';

export const TENANT_SLOT_LIMIT = 150; // 0x484E0 stack bitmap has150 WORDs.
export const REGISTERED_TENANT_TYPES = new Set([3,4,5,6,7,9,10,11,12,13,14,15,18,19,24,29,30,33,34,35,36,37,38,39,40]);

export function tenantSlotParts(room) {
  // 0x47843 assigns each native child RECORD its own per-floor +12 slot.
  // Browser multi-storey rooms combine several records into one object.
  let parts;
  if (room.key === 'cinema') {
    parts = [0,1].flatMap(level => {const native=room.nativeConstructionParts?.find(part=>part.level===level);
      const booth = (native?native.completed:!room.constructionRemaining) && room.width >= 31 ? 7 : 0;
      return [
      ...(booth ? [{ floor: room.floor-level, type: 34+level, x: room.x, width: booth }] : []),
      { floor: room.floor-level, type: 18+level, x: room.x+booth, width: room.width-booth },
    ];});
  } else if (room.key === 'partyhall') parts = [0,1].map(level => ({ floor: room.floor-level, type: 29+level, x: room.x, width: room.width }));
  else if (room.key === 'metro') parts = [0,1,2].map(level => ({ floor: room.floor-level, type: 31+level, x: room.x, width: room.width }));
  else if (room.key === 'cathedral') parts = [0,1,2,3,4].map(level => ({ floor: room.floor-level, type: 36+level, x: room.x, width: room.width }));
  else if (room.key === 'recycling') parts = [0,1].map(level => ({ floor: room.floor-level, type: 20+level, x: room.x, width: room.width }));
  else parts = [{ floor: room.floor, type: CATALOG[room.key]?.id, x: room.x, width: room.width }];
  return parts.filter(part => {
    const native=room.nativeConstructionParts?.find(native=>native.floor===part.floor);
    if(room.nativeConstructionParts&&!native)return false; //Placement inserts/queues each floor sequentially.
    return REGISTERED_TENANT_TYPES.has(part.type) || (native?!native.completed:room.constructionRemaining>0)&&part.type>0;
  });
}
export function firstFreeTenantSlot(records, floor) {
  const used = new Set(records.filter(record => record.floor === floor && Number.isInteger(record.index)).map(record => record.index));
  for (let index = 0; index < TENANT_SLOT_LIMIT; index++) if (!used.has(index)) return index;
  return -1; // Native returns0xFF if all slots are registered.
}
export function tenantSlotAllocation(state, { reallocateRoomId = null, reallocateFloor = null } = {}) {
  // Preserve original registration slots after horizontal table changes.
  // Missing old-browser fields migrate in build-id order. Completion may
  // release the temporary construction slot then choose the first free slot.
  const records = [], patches = [], floors = [];
  for (const [key, bounds] of Object.entries(state.floors || {})) {
    const floor = +key;
    if (!bounds.lobby || floor > 0 && floor < (state.lobbyHeight || 1)) continue;
    records.push({ floor, type: 24, x: bounds.x, width: bounds.width, owner: 'floor',
      index: bounds.nativeTenantIndex, order: -Infinity });
  }
  for (const room of state.rooms || []) for (const [part, record] of tenantSlotParts(room).entries()) {
    const previous = room.nativeTenantSlots?.find(slot => slot.floor === record.floor && slot.type === record.type && slot.x === record.x);
    const primary = room.key === 'cinema' ? record.type === 34 || (room.constructionRemaining > 0 || room.width < 31) && record.type === 18
      : record.type === CATALOG[room.key].id || room.key === 'metro' && record.type === 33;
    records.push({ ...record, owner: 'room', roomId: room.id, part, primary, order: room.id,
      index: room.id === reallocateRoomId&&(reallocateFloor===null||reallocateFloor===record.floor) ? undefined : previous?.index ?? (primary ? room.nativeTenantIndex : undefined) });
  }
  const assigned = [];
  for (const record of records) {
    if (!Number.isInteger(record.index) || record.index === -1) continue;
    if (record.index < 0 || record.index >= TENANT_SLOT_LIMIT || assigned.some(other => other.floor === record.floor && other.index === record.index)) throw new Error('Invalid native tenant slot registration.');
    assigned.push(record);
  }
  for (const record of records.sort((a,b) => a.order-b.order || a.floor-b.floor || a.x-b.x)) {
    if (!Number.isInteger(record.index) || record.index === -1) {
      record.index = firstFreeTenantSlot(assigned, record.floor);
      if (record.index >= 0) assigned.push(record);
    }
  }
  for (const room of state.rooms || []) {
    const slots = records.filter(record => record.roomId === room.id).map(({ floor,type,x,width,index }) => ({ floor,type,x,width,index }));
    const primary = records.find(record => record.roomId === room.id && record.primary);
    patches.push({ roomId: room.id, nativeTenantIndex: primary?.index ?? -1, nativeTenantSlots: slots });
  }
  for (const record of records.filter(record => record.owner === 'floor')) floors.push({ floor: record.floor, nativeTenantIndex: record.index });
  return { rooms: patches, floors, records: records.map(({ order, ...record }) => record) };
}
export function tenantSlotForRoom(rooms, room) {
  if (Number.isInteger(room.nativeTenantIndex) && room.nativeTenantIndex >= 0) return room.nativeTenantIndex;
  // Without a floor/lobby context, this legacy fallback counts all eligible
  // preceding native records, including medical and parking registrations.
  return rooms.filter(other => other.id < room.id).flatMap(tenantSlotParts).filter(part => part.floor === room.floor).length;
}
