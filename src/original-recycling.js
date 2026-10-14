import { recyclingStage } from './original-systems.js';
import {nativeRoomPartCompleted} from './original-construction-ring.js';

export const RECYCLING_TICKS = { 1600: 0, 1800: 1, 2000: 2, 2200: 3, 2400: 4, 2566: 5 };
export function recyclingPlacementAllowed(rooms, floor, x, width = 25) {
  // 0xF7F8/3A8BF: native widths are inclusive bounds. Both native floor
  // records count; in the combined browser object this is topdistance<=2.
  const centers = rooms.filter(room => room.key === 'recycling');
  if (!centers.length) return true;
  const nativeLow = Math.max(-10, floor - 2), high = floor + 1;
  const left = x - 25, right = x + width - 1 + 25;
  return centers.some(room => (room.floor >= nativeLow && room.floor <= high || room.floor - 1 >= nativeLow && room.floor - 1 <= high)
    && room.x >= left && room.x + room.width - 1 <= right);
}
export function initializeRecyclingRoom(room) {
  room.garbageStage ??= 0; room.garbageLowerStage ??= room.garbageStage;
}
export function processRecycling(state, population, stage, hooks = {}) {
  // 0xF530/F780: no invented transport or worker-capacity condition.
  if (state.star < 3) return;
  const centers = state.rooms.filter(room => room.key === 'recycling'); //5A678 increments on placement.
  if (!centers.length) { state.garbage.working = false; state.garbage.stage = 6; hooks.notice?.(3); return; }
  const required = recyclingStage(population, centers.length), current = Math.min(stage, required);
  if (required > stage) {
    if (stage === 5) { hooks.notice?.(4); state.garbage.working = false; }
  } else state.garbage.working = true;
  state.garbage.stage = current;
  for (const room of centers) {
    initializeRecyclingRoom(room);
    if (nativeRoomPartCompleted(room,0)&&(state.garbage.working || room.garbageStage !== 5)) room.garbageStage = current;
    if (nativeRoomPartCompleted(room,1)&&(state.garbage.working || room.garbageLowerStage !== 5)) room.garbageLowerStage = current;
  }
}
export function collectRecycling(state, hooks = {}) {
  // 0xF60E: collection happens at dawn only when service is working and
  // a level has refuse. Lower record21 shows its special emptying state6.
  if (state.star < 3) return;
  const centers = state.rooms.filter(room => room.key === 'recycling');
  if (!centers.length) { state.garbage.working = false; hooks.notice?.(3); return; }
  let collected = false;
  for (const room of centers) {
    initializeRecyclingRoom(room);
    if (!state.garbage.working) continue;
    if (nativeRoomPartCompleted(room,0)&&room.garbageStage !== 0) { room.garbageStage = 0; collected = true; }
    if (nativeRoomPartCompleted(room,1)&&room.garbageLowerStage !== 0) { room.garbageLowerStage = 6; collected = true; }
  }
  if (collected) { state.garbage.stage = 0; hooks.sound?.(2280, 'Background'); }
  return collected;
}
export function finishRecyclingCollection(state) {
  // 0xF701 at tick32, regardless of current tower rating or ready flag.
  for (const room of state.rooms) if (room.key === 'recycling' && room.garbageLowerStage === 6) room.garbageLowerStage = 0;
}
export function recyclingSprites(room) {
  initializeRecyclingRoom(room);
  const x = room.x * 8, y = -(room.floor + 1) * 36;
  return [{ sheet: 2280 + room.garbageStage, x, y: y + 12, width: 200, height: 24, sx: 0, sy: 0 },
    { sheet: 2344 + room.garbageLowerStage, x, y: y + 36, width: 200, height: 36, sx: 0, sy: 0 }];
}
export function validateRecyclingRoom(room) {
  if (!Number.isInteger(room.garbageStage) || room.garbageStage < 0 || room.garbageStage > 5
    || !Number.isInteger(room.garbageLowerStage) || room.garbageLowerStage < 0 || room.garbageLowerStage > 6) throw new Error('Invalid recycling stage data.');
  return true;
}
