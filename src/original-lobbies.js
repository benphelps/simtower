import { CELL, FLOOR } from './catalog.js';

// 0xC358 decodes MK_CONTROL (8) / MK_SHIFT (4), and 0x392B3 chooses
// the permanent ground-lobby height when the FIRST lobby is constructed.
export function initialLobbyHeight(state,{ctrlKey=false,shiftKey=false}={}) {
  if(state.floors[0])return lobbyHeight(state);
  return ctrlKey ? shiftKey ? 3 : 2 : 1;
}
export function lobbyHeight(state) {
  if([1,2,3].includes(state.lobbyHeight))return state.lobbyHeight;
  // Compatibility with browser saves predating the explicit native flag.
  let height=1;while(height<3&&state.floors[height]?.lobby)height++;
  return height;
}

// 0xA705: graphics types 24/25/26 are three separate floor strips.
// Each rating changes their resource IDs without changing column offsets.
export function lobbyGraphic(star,floor,height=1) {
  const rating=star>=4?2:star>=3?1:0;
  if(floor===2&&height===3)return {sheet:2664+rating,columnOffset:0};
  if(floor===1&&height>=2)return {sheet:2600+rating,columnOffset:height===3?41:0};
  return {sheet:2536+rating,columnOffset:floor===0?height>1?82:0:41};
}

// 0x09D89 -> 0xA02E builds lobby/empty-floor patterns in eight-pixel
// columns. Repetition follows absolute tower x, including a special initial
// run when the horizontal room record begins inside an eight-cell period.
export function lobbyColumn(cell,runStart) {
  const offset=cell-runStart,phase=runStart%8;
  if(phase!==0&&offset+phase<8)return offset+(phase<6?34:32);
  return (offset+runStart%32)&31;
}
export function lobbySlices(bounds,floor,star,height=1) {
  const {sheet,columnOffset}=lobbyGraphic(star,floor,height);
  return Array.from({length:bounds.width},(_,offset)=>{
    const cell=bounds.x+offset;
    return {sheet,x:cell*CELL,y:-(floor+1)*FLOOR,sx:(columnOffset+lobbyColumn(cell,bounds.x))*CELL,sy:0,width:CELL,height:FLOOR};
  });
}

// 0x35480, 0x357F4, 0x3594E: ground-storey canopies follow the
// scaffolding pass and use the two 56x36 halves of original bitmap 1001.
// The source sheet is staged after the 96-pixel color reference bitmap.
export function lobbyCanopies(bounds,floor=0) {
  if(floor!==0||!bounds?.lobby)return [];
  return [{sheet:1001,x:bounds.x*CELL-56,y:-FLOOR,sx:0,sy:0,width:56,height:FLOOR},
    {sheet:1001,x:(bounds.x+bounds.width)*CELL,y:-FLOOR,sx:56,sy:0,width:56,height:FLOOR}];
}

// 0x39D6C adjusts links drawn inside a double/triple ground lobby so
// they connect its ground storey directly to the first storey above it.
export function lobbyLinkPlacement(state,floor) {
  const height=lobbyHeight(state);
  return height>=2&&floor>0&&floor<=height ? {floor:height,span:height} : {floor,span:1};
}

// 0x18CA5 uses original graphics type48: 4073 for a double lobby,
// 4074 for a triple lobby, rendered top to bottom one strip per storey.
export function tallLobbyLinkSlices(link,tick,counts={up:0,down:0}) {
  const span=link.span??1;if(span<2)return [];
  const levels=span+1,stairs=link.key==='stairs',frames=stairs?11:12;
  const base=stairs?0:levels*11;
  const active=counts.up||counts.down;
  const animation=active?tick%(frames-1)+1:0;
  return Array.from({length:levels},(_,level)=>({
    sheet:span===2?4073:4074,x:link.x*CELL,y:-(link.floor+1)*FLOOR+level*FLOOR,
    sx:(base+animation+level*frames)*64,sy:0,width:64,height:FLOOR,
  }));
}

// 0x356CA records the LEFT edge when the highest structural floor changes.
// Extending that same floor leaves its recorded crane location untouched.
// A new highest floor of six cells or less removes the crane (0x356B2).
export function cranePlacement(floors,previous=null) {
  const levels=Object.keys(floors).map(Number);
  if(!levels.length)return null;
  const floor=Math.max(...levels),bounds=floors[floor];
  if(previous?.floor===floor)return previous;
  return bounds.width>6?{floor,x:bounds.x}:null;
}
