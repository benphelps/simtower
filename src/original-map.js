import { CATALOG, CELL, FLOOR, HOTELS } from './catalog.js';
import {nativeHotelState} from './original-hotels.js';

export const MAP_WIDTH=200,MAP_HEIGHT=288,MAP_SCALE=1/15,WORLD_HEIGHT=4320;
export const MAP_COLORS={structure:'#cccccc',elevator:'#000000',express:'#0000ff',service:'#ff0000',bad:'#e60000',average:'#cccc00',good:'#00ffff',low:'#00ff00'};

// 0xED00: signed integer scaling of world rectangles. Browser world y=0
// is the ground surface, at native y=3960 in the 4320-pixel site.
export function projectMapPoint(x,y) {return {x:Math.trunc(x*MAP_SCALE),y:Math.trunc((y+110*FLOOR)*MAP_SCALE)};}
export function mapFacilityRect(item) {
  const top=projectMapPoint(item.x*CELL,-(item.floor+1)*FLOOR);
  const bottom=projectMapPoint((item.x+item.width)*CELL,-(item.floor+1-(item.height||1))*FLOOR);
  return {x:top.x,y:top.y,width:bottom.x-top.x,height:bottom.y-top.y};
}
export function mapShaftLine(shaft) {
  const top=projectMapPoint(shaft.x*CELL,-(shaft.high+2)*FLOOR),bottom=projectMapPoint(shaft.x*CELL,-(shaft.low-1)*FLOOR);
  return {x:top.x,y:top.y,height:bottom.y-top.y,color:MAP_COLORS[shaft.key]};
}
export function mapViewportRect(camera,width,height,zoom=1) {
  const left=camera.x-width/zoom/2,top=camera.y-height/zoom/2;
  const a=projectMapPoint(left,top),b=projectMapPoint(left+width/zoom,top+height/zoom);
  return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};
}

// 0xC958 / 0x37C67: click or held-pointer movement always centers the
// highlighted rectangle beneath the point, then clamps it inside the map.
// It does not retain an offset from the point where a drag first began.
export function mapNavigation(point,viewport) {
  if(point.x<0||point.x>=MAP_WIDTH||point.y<0||point.y>=MAP_HEIGHT)return null;
  const width=Math.min(MAP_WIDTH,viewport.width),height=Math.min(MAP_HEIGHT,viewport.height);
  const x=Math.max(0,Math.min(MAP_WIDTH-width,Math.trunc(point.x)-Math.trunc(width/2)));
  const y=Math.max(0,Math.min(MAP_HEIGHT-height,Math.trunc(point.y)-Math.trunc(height/2)));
  return {x,y,width,height,camera:{x:(x+width/2)/MAP_SCALE,y:(y+height/2)/MAP_SCALE-110*FLOOR}};
}

const PRICED_TYPES=new Set([3,4,5,7,9,10]);
// 0x368D3 selects a flat minimap color, or a numbered hatch for the
// Edit view. 0x38176 tiles 8x36 columns from original bitmap 1003.
export function diagnosticAppearance(room,mode) {
  let kind;
  if(mode===1){
    const evaluation=room.evaluation;
    kind=evaluation===0?'bad':evaluation===1?'average':evaluation===2||evaluation===3?'good':null;
  } else if(mode===2) {
    const tier=PRICED_TYPES.has(CATALOG[room.key]?.id)?room.price:4;
    kind=['bad','average','low','good'][tier]??null;
  } else if(mode===3&&HOTELS.has(room.key)) {
    // The binary's state byte >=40 is the authority. Older browser rooms
    // represent this as a vacated dirty room instead of a native state byte.
    const raw=room.hotelState??room.nativeState??nativeHotelState(room,0);
    const dirty=((raw&255)<<24>>24)>=40;
    kind=dirty?'bad':null;
  }
  if(!kind)return null;
  const hatch={good:0,low:1,average:2,bad:3}[kind];
  return {color:MAP_COLORS[kind],hatch:{sheet:1003,sx:hatch*8,sy:0,width:8,height:36}};
}
