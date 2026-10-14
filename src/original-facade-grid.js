import {CATALOG} from './catalog.js';
import {tenantSlotParts} from './original-tenant-slots.js';
import {bindNativeGridRow,markNativeGridScaffold,nativeGridDraw} from './original-cell-grid.js';

export function nativeFacadeRecords(state,floor) {
  const bounds=state.floors[floor];if(!bounds)return [];
  const records=[];
  for(const room of state.rooms) {
    const parts=tenantSlotParts(room);
    for(const part of parts.length?parts:Array.from({length:room.height||1},(_,level)=>({floor:room.floor-level,x:room.x,width:room.width,type:room.key==='secom'?45:CATALOG[room.key]?.id+level}))) {
      if(part.floor!==floor)continue;
      records.push({id:`${room.id}:${part.type}:${part.x}`,start:part.x,end:part.x+part.width,type:part.type});
    }
  }
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
