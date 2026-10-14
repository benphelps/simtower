import { CATALOG, CELL, FLOOR, skyLobbyFloor,elevatorCapacity } from './catalog.js';

// 0x2A2FB / 0x2A382 contain separate rating branches, but every branch
// compares against the same constants in the supplied Win16 executable.
export const SHAFT_LIMIT = 24;
export const CAR_LIMIT = 8;
export const LINK_LIMIT = 64; // 0x39D6C: stairs and escalators share this pool.

// 0x191B5 / 0x192BB, used by 0x190D5 / 0x191DD respectively.
export const ESCALATOR_TYPES = new Set([0, 6, 10, 12, 18, 19, 24, 29, 30, 31]);

// 0x189DA: upper/lower pieces are different facility types, each using
// the same 64-pixel frame index. Frame zero represents an unused link.
export function linkSprites(link,frame=0) {
  const span=link.span??1;
  if(span>1) {
    const levels=span+1,frames=link.key==='stairs'?11:12,base=link.key==='stairs'?0:levels*11;
    return Array.from({length:levels},(_,level)=>({id:span===2?4073:4074,dy:level*FLOOR,height:FLOOR,sx:(base+frame+level*frames)*64}));
  }
  const sheet=link.key==='stairs'&&frame>=7?1:0,sx=(frame-sheet*7)*64;
  return link.key==='stairs'
    ? [{id:2408+sheet,dy:12,height:24,sx},{id:2472+sheet,dy:36,height:36,sx}]
    : [{id:2728,dy:0,height:36,sx:frame*64},{id:2792,dy:36,height:36,sx:frame*64}];
}

const overlap = (a,b) => a.x < b.x+b.width && b.x < a.x+a.width;
const roomCoversFloor = (r,floor) => floor <= r.floor && floor > r.floor-(r.height||1);

// Native floor records form ordered horizontal runs, including empty type 0.
// An endpoint exactly on a run boundary belongs to the run ending there.
function endpointType(state,floor,end) {
  const room=state.rooms.find(r=>roomCoversFloor(r,floor) && r.x < end && end <= r.x+r.width);
  if(room)return CATALOG[room.key]?.id;
  return state.floors[floor]?.lobby ? 24 : 0;
}

// 0x192E3: ordinary links reserve their left half on the lower storey,
// and their right half on the upper one. Adjacent links can consequently
// stack at the same x. Tall-lobby links instead reserve a full rectangle.
export function linkFootprint(link,placing=false) {
  const span=link.span??((link.height||2)-1),low=link.floor-span;
  // 0x19666 tests a newly placed tall link's lobby body against complete
  // existing transport footprints. Its upper landing is not reserved here.
  if(span>1)return Array.from({length:span+(placing?0:1)},(_,i)=>({floor:low+i,x:link.x,width:link.width}));
  return [{floor:low,x:link.x,width:link.width/2},{floor:link.floor,x:link.x+link.width/2,width:link.width/2}];
}

// 0x18F66: ordinary link selection follows the visible diagonal, with
// six-pixel steps in eight-pixel horizontal cells and a 24-pixel band.
// Transport selection precedes underlying rooms in 0xC3B0.
export function linkAtPoint(state,worldX,worldY) {
  return state.links.find(link=>{
    const cellOffset=Math.floor(worldX/CELL)-link.x;
    if(cellOffset<0||cellOffset>=link.width)return false;
    const span=link.span??1;
    // Tall links use their lobby-body rectangle. The upper landing's
    // first strip is excluded by 0x18F66's native floor comparisons.
    if(span>1)return worldY>=-link.floor*FLOOR && worldY<-(link.floor-span)*FLOOR;
    const relativeY=worldY+(link.floor+1)*FLOOR;
    if(relativeY<0||relativeY>=2*FLOOR)return false;
    return relativeY>=12+(8-cellOffset)*6 && relativeY<36+(8-cellOffset)*6;
  });
}

export function linkPlacementError(state,key,floor,x,width=8,span=1) {
  if(!['stairs','escalator'].includes(key))return 'Invalid transportation item.';
  if(state.links.length>=LINK_LIMIT)return 'No more stairs or escalators available.';
  const area={x,width};
  const low=floor-span;
  for(const f of [low,floor]) {
    const bounds=state.floors[f];
    if(!bounds||x<bounds.x||x+width>bounds.x+bounds.width)return 'Build floors across both transportation landings first.';
  }
  // 0x190D5 uses a strict upper-floor right-edge comparison; 0x191DD
  // allows the lower right edge. These asymmetrical comparisons are native.
  if(x+width>=state.floors[floor].x+state.floors[floor].width)return 'Transportation needs space beyond the upper landing.';
  if(key==='escalator') {
    if(!ESCALATOR_TYPES.has(endpointType(state,floor,x+width)) || !ESCALATOR_TYPES.has(endpointType(state,low,x+1)))return 'Escalators can only connect commercial or public areas.';
  }
  // Both ordinary and tall links reserve their full width against shafts,
  // including the top and bottom machinery (0x192E3 / 0x19666).
  if(state.shafts.some(sh=>overlap(sh,area)&&(span>1?floor-1:floor)>=sh.low-1&&low<=sh.high+1))return 'Cannot place over other transportation items.';
  const parts=linkFootprint({floor,x,width,span},true);
  if(state.links.some(link=>linkFootprint(link).some(other=>parts.some(part=>part.floor===other.floor&&overlap(part,other)))))return 'Cannot place over other transportation items.';
  return null;
}

export function groundLobbyHeight(state) {
  if([1,2,3].includes(state.lobbyHeight))return state.lobbyHeight;
  let height=1;
  while(height<3&&state.floors[height]?.lobby)height++;
  return height;
}

// 0x15B36 -> 0x15B80 / 0x15BDB: express floors above ground must
// be fifteenth floors, and intermediate levels inside a tall ground lobby
// cannot be stops for any elevator type.
export function elevatorStopAllowed(state,shaft,floor) {
  return Number.isInteger(floor) && floor>=shaft.low && floor<=shaft.high
    && !(floor>0&&floor<groundLobbyHeight(state))
    && (shaft.key!=='express'||floor<=0||skyLobbyFloor(floor));
}

// 0x14925 calls 0x158CD first: an active car's configured waiting floor
// is protected even if the car is currently travelling somewhere else.
export function elevatorStopError(state,shaft,floor) {
  if(!elevatorStopAllowed(state,shaft,floor))return 'This floor cannot be an elevator stop.';
  if(shaft.cars.some(c=>c.parkingFloor===floor))return 'A car is assigned to wait on this floor.';
  return null;
}

// 0x150B9 / 0x15427 cap the dragged end to 29 transitions instead of
// rejecting an overlong standard/service shaft. The opposite end is fixed.
export function cappedShaftRange(shaft,low,high) {
  if(shaft.key==='express'||high-low<=29)return {low,high,capped:false};
  if(low!==shaft.low&&high===shaft.high)return {low:high-29,high,capped:true};
  return {low,high:low+29,capped:true};
}
export function removedShaftFloors(shaft,low,high) {
  const floors=[];
  for(let f=shaft.high;f>high;f--)floors.push(f);
  for(let f=shaft.low;f<low;f++)floors.push(f);
  return floors;
}

// Native end retraction snaps an out-of-range car to the new end, clears
// movement and door counters, and records that end as its departure floor.
// Destination/call refresh follows passenger evacuation in the caller.
export function cappedCarState(car,low,high) {
  const clamp=value=>Math.max(low,Math.min(high,value));
  const updates={parkingFloor:clamp(car.parkingFloor)};
  if(car.floor<low||car.floor>high)Object.assign(updates,{floor:clamp(car.floor),motionCooldown:0,doors:0,departureFloor:clamp(car.floor),visitArmed:false});
  return updates;
}

// 0x15D6C -> 0x15D9A / 0x15EC5: only already registered passengers
// are interrupted. Future path legs and walkers are not hall-ring members.
// Return car occupants separately: stop edits unload cars before draining
// queues, while native end retraction drains queues before unloading cars.
export function stopEvacuationPeople(state,shaft,floors) {
  const removed=new Set(floors),order=new Map(floors.map((floor,i)=>[floor,i])),riders=[];
  for(const car of shaft.cars)for(const id of car.people) {
    const person=state.people.find(p=>p.id===id);
    if(person&&removed.has(person.path[0]?.to))riders.push(person);
  }
  const waiters=state.people.filter(p=>p.stage==='queue'&&p.path[0]?.id===shaft.id&&removed.has(p.floor));
  waiters.sort((a,b)=>order.get(a.floor)-order.get(b.floor) || Number(a.path[0].to<a.floor)-Number(b.path[0].to<b.floor) || (a.queueOrder??a.id)-(b.queueOrder??b.id));
  return {riders,waiters};
}

// 0x3481D: warning1 = tenant route lost, 2 = housekeeping route lost,
// 3 = lobby transfer broken. Width membership reproduces 0x33C1F for
// the browser's one contiguous lobby record per floor; the original game's
// 16-group compression remains a separate routing compatibility limit.
export function stopIsolationWarning(state,shaft,floor) {
  if(!shaft.stops.includes(floor))return 0;
  if(shaft.key!=='service'&&state.links.some(l=>floor>=l.floor-(l.span??1)&&floor<=l.floor))return 0;
  const others=state.shafts.filter(other=>other.id!==shaft.id&&other.key===shaft.key&&other.stops.includes(floor));
  const bounds=state.floors[floor];
  const member=sh=>lobbyShaftMember(bounds,sh);
  if(bounds?.lobby&&(floor===0||skyLobbyFloor(floor))&&member(shaft)&&others.some(member))return 3;
  if(others.length)return 0;
  return shaft.key==='service'?2:1;
}

// 0x33C1F uses inclusive horizontal overlap, including an edge touch,
// rather than requiring the shaft to fit entirely inside the lobby record.
export function lobbyShaftMember(bounds,shaft) {
  return Boolean(bounds&&bounds.x<=shaft.x+shaft.width&&bounds.x+bounds.width>=shaft.x);
}

const SHIFT_EXCLUDED=new Set(['floor','lobby','elevator','express','service','stairs','escalator']);
const PROTECTED_ROOM_TYPES=new Set([14,15,24,25,26,31,32,33,36,37,38,39,40,45]);
// 0x3BDF8 / 0x3BEE9 visit floor records bottom-to-top, then cells left-to-
// right. A room touched at even one cell is removed in its entirety. Caller
// must execute sequentially: native replacement precedes build validation,
// and stops at a protected record after any earlier removals have occurred.
export function shiftReplacementRooms(state,key,floor,x,width) {
  if(SHIFT_EXCLUDED.has(key))return [];
  const height={cinema:2,partyhall:2,recycling:2,metro:3,cathedral:5}[key]??1;
  const seen=new Set(),result=[];
  for(let f=floor-height+1;f<=floor;f++) {
    for(let cell=x;cell<x+width;cell++) {
      const room=state.rooms.find(r=>roomCoversFloor(r,f)&&r.x<=cell&&cell<r.x+r.width);
      if(!room||seen.has(room.id))continue;
      seen.add(room.id);
      const blocked=room.constructionRemaining>0||PROTECTED_ROOM_TYPES.has(CATALOG[room.key]?.id);
      result.push({room,blocked});if(blocked)return result;
    }
  }
  return result;
}

// 0x3ADCE parks fixed-width blocks on the original clicked floor; 0x3AF63
// extends a ramp vertically at its original x. Attempted frontiers advance
// even when an individual build fails, so retracing the pointer retries none.
export function constructionDragBatch(key,origin,target,previous) {
  if(!['parking','ramp'].includes(key))return {placements:[],progress:previous};
  const parking=key==='parking',step=parking?CATALOG.parking.width:1;
  const start=parking?origin.x:origin.floor,value=parking?target.x:target.floor;
  const progress=previous?{...previous}:{min:start,max:start};
  const positions=previous?[]:[start];
  while(progress.min-step>=value){progress.min-=step;positions.push(progress.min);}
  while(progress.max+step<=value){progress.max+=step;positions.push(progress.max);}
  return {placements:positions.map(position=>({key,floor:parking?origin.floor:position,x:parking?position:origin.x})),progress};
}

// 0x3B09E constructs Floor/Lobby on button-down and every held movement.
// The requested interval always contains the original clicked rectangle.
// Existing structure survives retracing; building never shrinks the floor.
export function constructionDragSpan(key,origin,target=origin) {
  if(!['floor','lobby'].includes(key))return null;
  const width=key==='floor'?1:4;
  return {key,floor:origin.floor,x:Math.min(origin.x,target.x),endX:Math.max(origin.x,target.x)+width-1};
}

// 0x13914 selects bitmap20256..20265 via375E5 (its input256..265 has
// 20000 added before loading). Current position wins over turnaround, then
// passenger destinations, then this car's hall-call assignments. No glyph
// represents an empty cell. Waiting-floor outlines are drawn separately.
export function elevatorScheduleCell(shaft,car,floor,people) {
  const waiting=car.parkingFloor===floor;
  const ownCall=direction=>shaft.calls?.[`${floor}:${direction}`]===car.id;
  const destinations=new Set(car.people.map(id=>people.find(p=>p.id===id)?.path[0]?.to).filter(Number.isFinite));
  const assigned=Object.values(shaft.calls||{}).some(id=>id===car.id);
  const direction=car.direction??1;
  let sheet=null;
  if(car.floor===floor) {
    sheet=waiting&&!assigned&&!destinations.size?20263
      :car.people.length>=elevatorCapacity(shaft.key)?direction?20264:20265
      :direction?20256:20257;
  } else if(car.turnFloor===floor)sheet=direction?20260:20261;
  else if(destinations.has(floor))sheet=20262;
  else if(ownCall(direction))sheet=direction?20258:20259;
  else if(ownCall(1-direction))sheet=direction?20259:20258;
  return {sheet,waiting};
}

// 0x13494 makes twelve-pixel cells on a thirteen-pixel grid, with floor
// index0 at the bottom of the fifteen-row display. Car index-1 is numbers.
export function elevatorScheduleRect(bounds,floorIndex,carIndex) {
  return {x:bounds.x+1+(carIndex+1)*13,y:bounds.y+1+(14-floorIndex)*13,width:12,height:12};
}

// 0x16617 draws the shaft's number from graphics type16, assembled from
// consecutive bitmap2024..2029 resources by38C0A. The first three sheets
// are ordinary dark numbers; the next three are waiting-floor red numbers.
export function shaftNumberSlices(shaft,floor) {
  const red=shaft.cars.some(c=>c.parkingFloor===floor),base=red?2027:2024;
  const dx=shaft.key==='express'?8:0;
  if(!shaft.stops.includes(floor))return [{sheet:base,sx:0,dx,width:32,height:36}];
  const number=floor+1;
  if(number>0&&(number<10||number===100))return [{sheet:base,sx:number===100?320:number*32,dx,width:32,height:36}];
  if(floor<0)return [{sheet:base+2,sx:floor===-10?16:32,dx,width:16,height:36},{sheet:base+1,sx:(-floor%10)*16,dx:dx+16,width:16,height:36}];
  return [{sheet:base+2,sx:48+(Math.trunc(number/10)-1)*16,dx,width:16,height:36},{sheet:base+1,sx:number%10*16,dx:dx+16,width:16,height:36}];
}

// 0x390FC type44 starts on native floor9 (B1), then retains one global
// column. Missing intermediate ramps affect accessibility, not placement.
export function rampPlacementError(state,floor,x) {
  if(floor>=0)return 'Item unavailable above ground';
  const ramps=state.rooms.filter(r=>r.key==='ramp').sort((a,b)=>a.floor-b.floor);
  if(!ramps.length&&floor!==-1)return 'Parking Ramps must connect to the 1st floor';
  if(ramps.length&&ramps[0].x!==x)return 'Parking Ramps must be connected vertically';
  if(ramps.some(r=>r.floor===floor))return 'Cannot place on top of other items';
  return null;
}
// 0x30ACA requires a ramp record on the selected parking floor. Ramps and
// parking bypass47740's twelve-update construction pool through47843.
export function parkingPlacementError(state,floor) {
  return state.rooms.some(r=>r.key==='ramp'&&r.floor===floor)?null:'Parking Ramps must be placed on this level';
}
export function immediateConstruction(key) {return ['floor','lobby','parking','ramp'].includes(key);}
// 0x3C7C7 converts the pointer to site pixels, subtracts half the selected
// construction rectangle's width, then truncates to an eight-pixel cell.
// This is an input adapter; Tower.plan/build coordinates remain left anchors.
export function nativeConstructionPointer(key,worldX,worldY) {
  // 0x388D0 cinema's general width WORD is24, but its selected rectangle
  // is explicitly248pixels (31cells) at38A48.3C7C7 centers this rectangle;
  //390FC reserves31 from the outset, then2E172 splits it into7+24.
  const width=key==='floor'?1:CATALOG[key]?.width??1;
  return {x:Math.trunc((worldX-width*CELL/2)/CELL),floor:109-Math.trunc((worldY+3960)/FLOOR)};
}
export function rampConnected(state,floor) {
  if(floor>=0)return false;
  const first=state.rooms.find(r=>r.key==='ramp'&&r.floor===-1);
  return Boolean(first&&Array.from({length:-floor},(_,i)=>-i-1).every(f=>state.rooms.some(r=>r.key==='ramp'&&r.floor===f&&r.x===first.x)));
}
// 0x306C5 uses different art for B1 with a lower continuation, intermediate
// ramp floors, and the bottom/single ramp. Construction order is irrelevant.
export function rampSprite(state,room) {
  const below=state.rooms.some(r=>r.key==='ramp'&&r.floor===room.floor-1&&r.x===room.x);
  return {sheet:3816+(below?(room.floor===-1?2:1):0),sx:0,dy:12,width:128,height:24};
}
// 0x308AD walks each side of the connected ramp in native floor-record
// order. Empty type0 runs at least four cells wide terminate accessibility;
// a smaller gap or a nonparking room record does not terminate the scan.
export function parkingReachable(state,space) {
  if(!rampConnected(state,space.floor))return false;
  const ramp=state.rooms.find(r=>r.key==='ramp'&&r.floor===space.floor);
  const left=Math.min(space.x,ramp.x),right=Math.max(space.x+space.width,ramp.x+ramp.width);
  const runs=state.rooms.filter(r=>roomCoversFloor(r,space.floor)&&r.x<right&&r.x+r.width>left).sort((a,b)=>a.x-b.x);
  let end=left;
  for(const room of runs){if(room.x-end>=4)return false;end=Math.max(end,room.x+room.width);}
  return right-end<4;
}
