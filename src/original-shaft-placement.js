import {NATIVE_SHAFT_SLOTS,NATIVE_LINK_SLOTS,nativeTransportSlotAssignments} from './original-transport-slots.js';

//3931B..39329 /399BF3: express0, standard1, service2.
export function nativeShaftType(key) {
  const type={express:0,elevator:1,service:2}[key];
  if(type===undefined)throw new Error('Invalid native elevator type.');
  return type;
}
export const nativeShaftWidth=type=>type===0?6:4;

//F9B4 initially allocates zeroed records. Deletion14BCC and New1A527
//clear the active byte without clearing+1; all24 saved headers include+1.
export function newNativeShaftSlotTypes(previous) {
  if(previous===undefined)return Array(NATIVE_SHAFT_SLOTS).fill(0);
  if(!Array.isArray(previous)||previous.length!==NATIVE_SHAFT_SLOTS||[...previous].some(type=>![0,1,2].includes(type)))throw new Error('Invalid native elevator slot types.');
  return [...previous];
}
export function loadedNativeShaftSlotTypes(state) {
  const types=newNativeShaftSlotTypes(state.nativeShaftSlotTypes),slots=nativeTransportSlotAssignments(state.shafts,NATIVE_SHAFT_SLOTS);
  for(const [index,shaft]of state.shafts.entries()) {
    const slot=slots[index],type=nativeShaftType(shaft.key);
    if(state.nativeShaftSlotTypes===undefined)types[slot]=type;
    else if(types[slot]!==type)throw new Error('Invalid native elevator slot type.');
  }
  return types;
}

const intersect=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
export function nativeShaftCollisionRect({x,low,high},type,padding=0) {
  //3921D converts x to8px cells before39904 stores+3E. These are
  //cell/floor units, not pixel rectangles;3D5D2 delegates INTERSECTRECT.
  return {left:x-padding,top:low-2,right:x+nativeShaftWidth(type)+padding,bottom:high+1};
}
export function nativeShaftTransportCollision(state,proposal) {
  //15988: the selected physical slot's OLD type is supplied here.
  //39904 does not write its replacement type until15988 succeeds.
  const area=nativeShaftCollisionRect(proposal,proposal.type,8),slots=nativeTransportSlotAssignments(state.shafts,NATIVE_SHAFT_SLOTS);
  const shafts=state.shafts.map((shaft,index)=>({shaft,slot:slots[index]})).sort((a,b)=>a.slot-b.slot);
  for(const {shaft,slot}of shafts)if(slot!==proposal.slot&&intersect(area,nativeShaftCollisionRect(shaft,nativeShaftType(shaft.key))))return {kind:'shaft',id:shaft.id,slot};
  const linkArea=nativeShaftCollisionRect(proposal,proposal.type),linkSlots=nativeTransportSlotAssignments(state.links,NATIVE_LINK_SLOTS);
  const links=state.links.map((link,index)=>({link,slot:linkSlots[index]})).sort((a,b)=>a.slot-b.slot);
  for(const {link,slot}of links) {
    const span=link.span??1;
    const bounds={left:link.x,top:link.floor-span-1,right:link.x+8,bottom:link.floor};
    if(intersect(linkArea,bounds))return {kind:'link',id:link.id,slot};
  }
  return null;
}
