import {CELL,FLOOR} from './catalog.js';
// Production0xFD7F/FF8E→3C5D4, rather than unused3C6EE focusrects:
// SaveDC, WHITE_PEN(stock6), NULL_BRUSH(stock5), Rectangle, RestoreDC.
// Rectangle's right/bottom are exclusive.3C7C7 offsets non36px tools12px.
const nativeHeights={stairs:72,escalator:72,cinema:72,partyhall:72,recycling:72,metro:108,cathedral:180};
export function nativeConstructionGhost(preview,viewport) {
  if(!preview)return null;
  const height=nativeHeights[preview.key]??(preview.high-preview.low+1)*FLOOR;
  let left=preview.x*CELL,right=left+preview.width*CELL,top=-(preview.high+1)*FLOOR+(nativeHeights[preview.key]?12:0),bottom=top+height;
  if(viewport){left=Math.max(left,viewport.left);right=Math.min(right,viewport.right);top=Math.max(top,viewport.top);bottom=Math.min(bottom,viewport.bottom);}
  if(right<=left||bottom<=top)return null;
  return {x:left,y:top,width:right-left,height:bottom-top,stroke:'#ffffff',lineWidth:1,fill:null};
}
