// Original bitmap 1515 contains five people, each with a right-facing and
// left-facing 16 x 24 pose. They are directions, not alternating gait frames.
// 0x17A33 selects a stable actor portrait base; 0x16EF6 adds a side-dependent
// pose offset before drawing. This sheet has no separate walking gait cycle.
import { nativePersonKind, nativeQueueDisplayStress, nativeStressBand } from './original-person-info.js';
export const WALKER_SHEET = 1515;
export const PERSON_WIDTH = 16;
export const PERSON_HEIGHT = 24;
export function nativeQueueFrame(person, actor, room, state, data) {
  // 0x17A33 selects the role's ten-cell block. 0x1710F draws up queues
  // left of the shaft with pose9 (8/9 for a two-cell person);0x173D9 draws
  // down queues on the right with pose0 (0/1 for a two-cell person).
  const kind = nativePersonKind(actor, room), base = { 0: 0, 1: 10, 2: 20, 3: 30, 4: 40, 5: 80, 6: 60, 8: 70, 10: 50 }[kind];
  const width = kind === 6 || kind === 8 || kind === 10 ? 16 : 8;
  const up = person.path?.[0]?.to > person.floor;
  const cell = base + (up ? width === 16 ? 8 : 9 : 0);
  // 0x38C0A packs the type8 strip:1512 is60cells,1513 the next54cells.
  const frame = { sheet: cell < 60 ? 1512 : 1513, x: (cell < 60 ? cell : cell - 60) * 8,
    y: 0, width, height: 24, flip: false };
  if (state && data) {
    // 0x17995 / 0x319BF replace paletteFF (black) only, preserving the
    // other original pixels. Priority is VIP yellow, named blue, stress.
    const stress=state.elevatorPreview?.stressByPerson?.[person.id]??nativeQueueDisplayStress(actor,person,state,room);
    const band = nativeStressBand(data, stress, state.star);
    const palette = state.vip?.actor === actor.id ? 125 : actor.name ? 45 : band === 2 ? 26 : band === 1 ? 22 : null;
    if (palette !== null) frame.ink = { palette, rgb: { 125: [255,255,0], 45: [25,25,255], 26: [255,25,25], 22: [255,127,127] }[palette] };
  }
  return frame;
}
export function nativeQueuePosition(shaft, person, earlierFrames, frame) {
  // 0x1699C sets the entry edges;1710F/173D9 pack each following person
  // by its actual one/two-cell width. Return the sprite's left edge in cells.
  const widthCells = frame.width / 8, occupied = earlierFrames.reduce((sum, f) => sum + f.width / 8, 0);
  return person.path?.[0]?.to > person.floor ? shaft.x - 3 - occupied - (widthCells - 1) : shaft.x + shaft.width + 2 + occupied;
}
export function nativeQueueBounds(state, shaft, floor) {
  // 16110 sorts every shaft covering this row, including machinery rows.
  // 17E7B/17F01 limit the two rings to the floor edges or the neighboring
  // shaft midpoint. The midpoint deliberately uses four cells for express
  // shafts too. Missing floor never moves a ring to the opposite side.
  const bounds=state.floors?.[floor];
  if(!bounds)return {left:0,right:0,floorLeft:0,floorRight:0};
  const shafts=state.shafts.filter(other=>floor>=other.low-1&&floor<=other.high+1||other===shaft)
    .sort((a,b)=>a.x-b.x);
  const index=shafts.indexOf(shaft),previous=shafts[index-1],next=shafts[index+1];
  return {
    left:previous&&previous.x>=bounds.x?shaft.x-Math.floor((shaft.x-previous.x-4)/2):bounds.x,
    right:next&&next.x<=bounds.x+bounds.width?next.x-Math.floor((next.x-shaft.x-4)/2):bounds.x+bounds.width,
    floorLeft:bounds.x,floorRight:bounds.x+bounds.width,
  };
}
export function nativeQueueVisibleSpan(bounds, x, width, up=false) {
  // 1710F/173D9 draw one eight-pixel cell at a time, so a wide portrait
  // may retain only its shaft-facing half at the floor edge. Only the
  // primary cell tests the ring limit; its second cell can cross a midpoint.
  const facingX=x+(up?width-1:0);
  if(facingX<bounds.left||facingX>=bounds.right)return null;
  const left=Math.max(x,bounds.floorLeft),right=Math.min(x+width,bounds.floorRight);
  return right>left?{x:left,width:right-left,sourceX:left-x}:null;
}
export function personFrame(person, actor, room, state, data) {
  if (person.stage === 'queue' && actor && room) return nativeQueueFrame(person, actor, room, state, data);
  const character = Math.abs(person.appearance || 0) % 5;
  const facing = person.direction < 0 ? 1 : 0;
  return { sheet: WALKER_SHEET, x: (character * 2 + facing) * PERSON_WIDTH, y: 0, width: PERSON_WIDTH, height: PERSON_HEIGHT, flip: false };
}
