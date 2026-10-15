import {CATALOG} from './catalog.js';
import {tenantSlotParts} from './original-tenant-slots.js';
import {bindNativeGridRow,markNativeGridScaffold,nativeGridDraw} from './original-cell-grid.js';
import {nativeBackgroundViewport} from './original-scene.js';

//The physical floor records outlive registration of metro31/32 and never
//require registration for recycling20/21 or SECOM45. Do not omit their art.
export function nativeRoomFacadeParts(room) {
  const registered=tenantSlotParts(room),parts=[];
  for(let level=0;level<(room.height||1);level++){
    const floor=room.floor-level;
    if(room.nativeConstructionParts&&!room.nativeConstructionParts.some(part=>part.floor===floor))continue;
    const local=registered.filter(part=>part.floor===floor);
    parts.push(...(local.length?local:[{floor,x:room.x,width:room.width,type:room.key==='secom'?45:CATALOG[room.key]?.id+level}]));
  }
  return parts;
}

//38C0A places24px artwork twelve pixels below3C972's tiled5000 header.
//Each native record restarts the128px tile, including the cinema's booth.
export function nativeFacadeHeaderSprites(room,assets) {
  return nativeRoomFacadeParts(room).flatMap(part=>{
    const height=assets?.get(1000+part.type*64)?.height;
    if(height!==24&&height!==60)return []; //2280's60px base also enters38E76.
    return nativeHeaderSlices(part);
  });
}
function nativeHeaderSlices(part) {
  const width=part.width*8;
  return Array.from({length:Math.ceil(width/128)},(_,index)=>({sheet:5000,x:part.x*8+index*128,y:-(part.floor+1)*36,
    sx:0,sy:0,width:Math.min(128,width-index*128),height:12}));
}
export function nativeRubbleSprites(part) {
  //A6BF draws native type47 through3139F; its24px4008 source is staged
  //with the same3C972 header as other24px facilities.
  return [...nativeHeaderSlices(part),{sheet:4008,x:part.x*8,y:-(part.floor+1)*36+12,
    sx:0,sy:0,width:part.width*8,height:24}];
}

export function nativeFacadeRecords(state,floor) {
  const bounds=state.floors[floor];if(!bounds)return [];
  const records=[];
  for(const room of state.rooms) {
    for(const part of nativeRoomFacadeParts(room)) {
      if(part.floor!==floor)continue;
      records.push({id:`${room.id}:${part.type}:${part.x}`,start:part.x,end:part.x+part.width,type:part.type});
    }
  }
  for(const part of state.rubble||[])if(part.floor===floor)records.push({id:`rubble:${floor}:${part.x}`,start:part.x,end:part.x+part.width,type:47});
  //Native structural records fill the gaps left by ordinary facilities.
  records.push({id:`floor:${floor}`,start:bounds.x,end:bounds.x+bounds.width,type:bounds.lobby?24:0});
  return records;
}

//The original grid belongs to the window, not the save. Extra browser
//paints repeat its last image; only a native tick or explicit UI redraw
//advances the four retained scaffold passes.
export class OriginalFacadeGrid {
  constructor(){this.rows=new Map();this.viewKey='';this.epoch=null;this.forced=false;}
  sync(state,viewport,{paused=false}={}) {
    viewport=nativeBackgroundViewport(viewport);
    const left=Math.floor(viewport.left/8),columns=Math.ceil(viewport.right/8)-left;
    const top=Math.ceil(-viewport.top/36)-1,bottom=Math.floor(-viewport.bottom/36);
    const key=[left,columns,top,bottom].join(':');if(key===this.viewKey)return false;
    const old=[...this.rows.values()];this.rows=new Map();let index=0;
    for(let floor=top;floor>=bottom;floor--,index++)this.rows.set(floor,{left,cells:bindNativeGridRow(old[index]?.cells,nativeFacadeRecords(state,floor),left,columns,{paused,capacity:Math.max(103,columns)})});
    this.viewKey=key;this.forced=true;return true;
  }
  bind(state,viewport,{floor,spans=[]},{paused=false}={}) {
    this.sync(state,viewport,{paused});const row=this.rows.get(floor);if(!row)return;
    row.cells=bindNativeGridRow(row.cells,nativeFacadeRecords(state,floor),row.left,row.cells.length,{paused,capacity:Math.max(103,row.cells.length)});
    for(const span of spans)markNativeGridScaffold(row.cells,span.start,span.end,row.left);
  }
  refresh(state,viewport,{paused=false,rebind=false}={}) {
    if(rebind)this.viewKey='';
    this.sync(state,viewport,{paused});this.forced=true;
  }
  drawDue(epoch,{capture=false}={}){return !capture&&(this.forced||this.epoch!==epoch);}
  hasNormalCell(room) {
    const prefix=`${room.id}:`,row=this.rows.get(room.floor);
    return Boolean(row?.cells.some(cell=>typeof cell.record==='string'&&cell.record.startsWith(prefix)&&(cell.flag===7||cell.flag===-1)));
  }
  redraw(epoch,{paused=false,capture=false}={}) {
    const advance=this.drawDue(epoch,{capture}),overlays=[];
    for(const [floor,row] of this.rows)for(const [index,cell] of row.cells.entries()) {
      if(advance)cell.overlay=nativeGridDraw(cell,{paused})?.kind==='scaffold';
      if(cell.overlay||cell.flag>=3&&cell.flag<=6)overlays.push({floor,x:(row.left+index)*8,y:-(floor+1)*36,sheet:3624,sx:cell.column*8,sy:0,width:8,height:36,ink:Boolean(cell.overlay)});
    }
    if(advance){this.epoch=epoch;this.forced=false;}
    return overlays;
  }
}
