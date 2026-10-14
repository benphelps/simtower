import {lobbyShaftMember} from './original-construction.js';
import {nativeTransportSlotAssignments,NATIVE_SHAFT_SLOTS} from './original-transport-slots.js';

export const TRANSPORT_ANCHORS=[0,14,29,44,59,74,89];
const bit=index=>(0x80000000>>>index)>>>0;
const has=(mask,index)=>Boolean(mask&bit(index));
// 0x33EE3 reads floor transition flags: bit0 means an escalator exists;
// any ordinary-only transition reduces the reach from six to three levels.
export function nativeStairComponents(state) {
  const transitions=new Map();
  for(const link of state.links)for(let floor=link.floor-(link.span??1);floor<link.floor;floor++)
    transitions.set(floor,(transitions.get(floor)||0)|(link.key==='escalator'?1:2));
  const components=[];
  for(const anchor of TRANSPORT_ANCHORS){
    let low=anchor,high=anchor,ordinary=false;
    for(let f=anchor;f<anchor+6;f++){const flags=transitions.get(f);if(!flags)break;ordinary ||=!(flags&1);if(ordinary&&f>=anchor+3)break;high=f+1;}
    ordinary=false;
    for(let f=anchor-1;f>=anchor-6;f--){const flags=transitions.get(f);if(!flags)break;ordinary ||=!(flags&1);if(ordinary&&f<anchor-3)break;low=f;}
    if(low<high)components.push({index:components.length,anchor,low,high});
  }
  return components;
}
// 0x33C1F stores at most sixteen lobby groups, in floor/table order.
// Service shafts may have a lobby membership but never connect through it.
export function nativeTransportComponents(state) {
  const shafts=state.shafts.slice(0,24),slots=nativeTransportSlotAssignments(shafts,NATIVE_SHAFT_SLOTS),stairs=nativeStairComponents(state),groups=[];
  for(const [floor,bounds] of Object.entries(state.floors).sort((a,b)=>+a[0]-+b[0])){
    const f=+floor;if(!bounds.lobby||f===1||f===2)continue;
    let mask=0;shafts.forEach((shaft,index)=>{if(shaft.stops.includes(f)&&lobbyShaftMember(bounds,shaft))mask|=bit(slots[index]);});
    if(!mask)continue;if(groups.length===16)break;
    for(const component of stairs)if(f>=component.low&&f<=component.high)mask|=bit(24+component.index);
    groups.push({floor:f,mask:mask>>>0});
  }
  const members=[...shafts.map((shaft,index)=>({index:slots[index],key:shaft.key,stops:new Set(shaft.stops),id:shaft.id})),...stairs.map(c=>({...c,index:24+c.index,key:'stairs',stops:new Set(Array.from({length:c.high-c.low+1},(_,i)=>c.low+i))}))];
  const maps=new Map();
  for(const member of members){let connected=0;for(const group of groups)if(has(group.mask,member.index))connected|=group.mask;connected=(connected&~bit(member.index))>>>0;const floors=new Map();
    for(let floor=-10;floor<110;floor++){
      let value=0;
      if(member.stops.has(floor)){groups.forEach((group,index)=>{if(group.floor===floor&&has(group.mask,member.index))value=index+1;});}
      else if(member.key!=='service')for(const target of members)if(target.key!=='service'&&has(connected,target.index)&&target.stops.has(floor))value|=bit(target.index);
      floors.set(floor,value>>>0);
    }
    maps.set(member.index,{member,connected,floors});
  }
  return {shafts,shaftIndices:new Map(shafts.map((shaft,index)=>[shaft.id,slots[index]])),stairs,groups,maps};
}
export function nativeShaftComponentIndex(components,shaftId) {return components.shaftIndices.get(shaftId)??-1;}
// 0x346B3/0x34766 choose the first eligible lobby group's direction.
export function nativeTransferFloor(components,memberIndex,from,to) {
  const map=components.maps.get(memberIndex);if(!map||!map.floors.get(to))return null;
  for(const group of components.groups)if(group.floor!==from&&has(group.mask,memberIndex)){
    const alternatives=(group.mask&~bit(memberIndex))>>>0;
    if(alternatives&map.floors.get(to))return group.floor;
  }
  return null;
}

const COMPONENT_CACHE=new WeakMap();
const PREVIEW_COMPONENTS=new WeakMap();
//1E0A0 temporarily clears other shaft active bytes without calling33C1F
// or33872.1E3B8 therefore boards using the original C2 transfer tables.
// Retain that snapshot only for a disposable forecast; ordinary live
// construction still invalidates cached tables through its signature.
export function retainPreviewTransportComponents(state,components=transportComponentsFor(state)) {
  PREVIEW_COMPONENTS.set(state,components);return components;
}
export function transportComponentsFor(state) {
  if(PREVIEW_COMPONENTS.has(state))return PREVIEW_COMPONENTS.get(state);
  const signature=state.shafts.map(sh=>[sh.id,sh.nativeTransportSlot,sh.key,sh.x,sh.width,sh.stops.join(',')].join(':')).join(';')+'|'+Object.entries(state.floors).filter(([,b])=>b.lobby).map(([f,b])=>[f,b.x,b.width].join(':')).join(';')+'|'+state.links.map(l=>[l.id,l.nativeTransportSlot,l.key,l.floor,l.span??1].join(':')).join(';');
  const cached=COMPONENT_CACHE.get(state);if(cached?.signature===signature)return cached.components;
  const components=nativeTransportComponents(state);COMPONENT_CACHE.set(state,{signature,components});return components;
}
