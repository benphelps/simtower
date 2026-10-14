// Win16 visible cell table:9D89 binds a row;9D0F marks newly added
// structural floor cells;A1EE redraws its flags. This is retained indexed
// imagery, not a translucency fade. Every cell is8x36 pixels.
export const NATIVE_GRID_COLUMNS=103;
export const NATIVE_GRID_ROWS=17;
export const NATIVE_GRID_EMPTY=-7;
export const NATIVE_GRID_CLEAN=-1;
export const NATIVE_GRID_REDRAW=7;
export const nativeScaffoldPending=flag=>Number.isInteger(flag)&&flag>=3&&flag<=6;

export function nativeAddedFloorSpans(previous,current) {
  if(!current)return [];
  const end=current.x+current.width;
  if(!previous)return [{start:current.x,end}];
  const spans=[];
  if(current.x<previous.x)spans.push({start:current.x,end:previous.x});
  if(end>previous.x+previous.width)spans.push({start:previous.x+previous.width,end});
  return spans;
}

export function nativeGridColumn(type,start,column) {
  //9F0F..A0A6: ordinary record columns are relative. Floor/lobby tiles
  //continue the32-cell absolute phase, with the initial misaligned strip.
  const relative=column-start;
  if(type===0||type===24) {
    const offset=start%8;
    return offset!==0&&relative+offset<8 ? relative+(offset<6?34:32) : (relative+start%32)&31;
  }
  return type===45?(relative+start%4)&3:relative;
}

export function bindNativeGridRow(previous,records,left,columns,{paused=false,capacity=NATIVE_GRID_COLUMNS}={}) {
  // The default preserves the native table. The user-authorized unlimited
  // browser window can supply a larger capacity for its visible cell count.
  const count=Math.min(Math.max(NATIVE_GRID_COLUMNS,Math.trunc(capacity)),Math.max(0,Math.trunc(columns)));
  return Array.from({length:count},(_,index)=>{
    const column=left+index,record=records.find(record=>column>=record.start&&column<record.end);
    if(!record)return {record:null,column:0,flag:NATIVE_GRID_EMPTY};
    const old=previous?.[index];
    return {record:record.id,column:nativeGridColumn(record.type,record.start,column),
      flag:paused&&nativeScaffoldPending(old?.flag)?old.flag:NATIVE_GRID_REDRAW};
  });
}

export function markNativeGridScaffold(row,start,end,left) {
  //9D0F clips half-open x bounds against the current viewport. It does
  //not mark an offscreen world record for a later camera visit.
  for(let index=Math.max(0,start-left);index<Math.min(row.length,end-left);index++)row[index].flag=3;
  return row;
}

export function nativeGridDraw(cell,{paused=false,changed=false}={}) {
  const flag=cell.flag;
  if(nativeScaffoldPending(flag)) {
    if(!paused)cell.flag=flag+1;
    return {kind:'scaffold',sheet:3624,sourceColumn:cell.column};
  }
  if(flag!==NATIVE_GRID_REDRAW&&!(flag===NATIVE_GRID_CLEAN&&changed))return null;
  cell.flag=NATIVE_GRID_CLEAN;
  return {kind:'facility',record:cell.record,sourceColumn:cell.column};
}

//31521→317E9 merges two8-pixel LONGs per scanline. Each zero INDEX
//retains the previous destination index; nonzero copies source exactly.
export function mergeNativeIndexedOverlay(destination,source) {
  if(destination.length!==source.length)throw new Error('Mismatched native indexed overlay.');
  for(let index=0;index<source.length;index++)if(source[index]!==0)destination[index]=source[index];
  return destination;
}
