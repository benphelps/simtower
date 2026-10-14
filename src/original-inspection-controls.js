import {nativeCarOrder} from './original-transport-slots.js';
import { HOTELS,elevatorCapacity } from './catalog.js';
import { nativePersonPortrait } from './original-person-info.js';
import { nativeFacilityOccupants,nativeFacilityTitle } from './original-inspection.js';

export function nativeTransportInfo(data,item,car,passengers=[]) {
  //20B13: Express761, standard/service762.20E67: both stair types761.
  const kind={express:0,elevator:1,service:2,escalator:3,stairs:4}[item.key];
  const count=car?car.people.length:passengers.length;
  return {dialog:car&&item.key!=='express'?762:761,title:data.strings[400][kind],
    count:car?`${count} / ${elevatorCapacity(item.key)}`:String(count)};
}
//11C1B uses the actual sub-floor car position. The solid body has a2px
// horizontal inset, top5px inset and exclusive bottom at the car's base.
export function nativeCarHitRect(shaft,car) {
  const top=-(car.floor+1)*36;
  return {x:shaft.x*8+2,y:top+5,width:shaft.width*8-4,height:31};
}
export function nativeCarAtPoint(shaft,point) {
  let result=null;
  for(const car of nativeCarOrder(shaft)) {
    const r=nativeCarHitRect(shaft,car);
    if(point.x>=r.x&&point.x<r.x+r.width&&point.y>=r.y&&point.y<r.y+r.height)result=car;
  }
  return result; //15C37 scans all eight slots; the last overlapping car wins.
}

//22F89/2313F +23504: occupants form horizontal8/16px strips, not a
// wrapping grid. Empty passenger slots do not leave visual gaps. Express
// and stairs have a second strip9; standard/service omit it. A last wide
// portrait can cross the right inset because the native loop checks only
// the cursor before the next identity, not the proposed right edge.
export function nativeOccupantLayout(entries,rectangles,rooms,vipActor=null,inset=2,rightInset=2) {
  const result=[];let row=0,cursor;
  const rect=()=>rectangles[row];
  for(const entry of entries) {
    const actor=entry.actor??entry,home=rooms.find(r=>r.id===actor.room);
    if(!home)continue;
    if(cursor===undefined)cursor=rect()?.[0]+inset;
    while(rect()&&cursor>=rect()[2]-rightInset){row++;cursor=rect()?.[0]+inset;}
    if(!rect()||rect()[2]<=rect()[0]||rect()[3]<=rect()[1])break;
    const portrait=nativePersonPortrait(actor,home,actor.id===vipActor);
    result.push({actor,person:entry.person,portrait,x:cursor,y:rect()[1]+5,width:portrait.width,height:24,row});
    cursor+=portrait.width;
  }
  return result;
}

export function nativeClinicOccupants(state,clinic) {
  //22A40→4071A selects office/condo identity state35 and clinic index+6.
  const eligible=new Set(state.rooms.filter(r=>['office','condo'].includes(r.key)).map(r=>r.id));
  return state.actors.filter(a=>eligible.has(a.room)&&a.job===clinic.id&&a.state===35&&a.trip===null);
}
export function nativePanelOccupants(state,room) {
  if(room.key==='medical')return nativeClinicOccupants(state,room);
  //22BC8 shows only admitted state3 once the show reaches stage2.
  if(['cinema','partyhall'].includes(room.key))return room.show?.stage>=2?state.actors.filter(a=>a.room===room.id&&a.state===3&&a.trip===null):[];
  if(room.key==='cathedral')return state.actors.filter(a=>a.room===room.id&&a.state===3);
  return nativeFacilityOccupants(state,room);
}
export function nativeFacilityPanel(room) {
  //1FD89 category+748. Generic8 has no Rename child; clinic/cathedral9
  // have two occupant strips, while staff have only the first strip.
  const dialog=({office:748,single:749,twin:750,suite:751,condo:752,shop:753,housekeeping:754,security:755,medical:757,cathedral:757,cinema:758,partyhall:759,fastfood:760,restaurant:760})[room.key]??756;
  return {dialog,rename:dialog!==756,occupantInset:['office','condo',...HOTELS,'security','housekeeping'].includes(room.key)?7:2,
    stateLabel:['office','condo',...HOTELS,'shop'].includes(room.key),secondStrip:[757,758,759].includes(dialog),rightInset:['cinema','partyhall'].includes(room.key)?10:2};
}
export function nativeInspectionTitle(data,room) {
  //21F92/22441 appends original Floor text, with composite categories
  // normalizing the visible facility floor. Browser room.floor is its top.
  const floor=room.floor-(room.key==='metro'?1:(room.height||1)-1);
  return nativeFacilityTitle(data,room)+data.strings[712][0]+(floor<0?data.strings[712][1]+(-floor):floor+1);
}
export function nativeFacilityPreviewCrop(room) {
  //24520 removes12px of ceiling before reading the rendered facility.
  return {x:room.x*8,y:-(room.floor+1)*36+12,width:room.width*8,height:(room.height||1)*36-12};
}
export function nativePreviewFit(source,target) {
  //249D4 uses whole-percent arithmetic. If BOTH dimensions must shrink,
  // it uses the larger ratio; otherwise the smaller, capped at200%.
  const wr=Math.trunc(target.width*100/source.width),hr=Math.trunc(target.height*100/source.height);
  const percent=wr>hr?(wr<100?wr:Math.min(hr,200)):wr<hr?(hr<100?hr:Math.min(wr,200)):wr;
  const width=wr===hr&&wr!==100?target.width:Math.trunc(source.width*percent/100);
  const height=wr===hr&&wr!==100?target.height:Math.trunc(source.height*percent/100);
  return {x:target.x+Math.trunc((target.width-width)/2),y:target.y+Math.trunc((target.height-height)/2),width,height};
}
