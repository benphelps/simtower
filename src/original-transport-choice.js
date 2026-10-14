import {transportComponentsFor,nativeTransferFloor,nativeShaftComponentIndex} from './original-transport-components.js';

const INVALID=32767;
const ordered=items=>[...items].sort((a,b)=>(a.nativeTransportSlot??a.id)-(b.nativeTransportSlot??b.id));
function directReach(state,from,to) {
  if(Math.abs(to-from)>6)return false;
  let ordinary=false;
  for(let floor=Math.min(from,to);floor<Math.max(from,to);floor++){
    const links=state.links.filter(l=>floor>=l.floor-(l.span??1)&&floor<l.floor);
    if(!links.length)return false;
    ordinary ||= !links.some(l=>l.key==='escalator');
  }
  return !ordinary||Math.abs(to-from)<=3;
}
function ordinaryReach(state,from,to) {
  if(Math.abs(to-from)>3)return false;
  for(let floor=Math.min(from,to);floor<Math.max(from,to);floor++)
    if(!state.links.some(l=>l.key==='stairs'&&floor>=l.floor-(l.span??1)&&floor<l.floor))return false;
  return true;
}
function linkCandidates(state,from,direction,origin,ordinaryOnly=false) {
  const candidates=[];
  for(const link of ordered(state.links)){
    if(ordinaryOnly&&link.key!=='stairs')continue;
    const bottom=link.floor-(link.span??1);
    if(direction>0?bottom!==from:link.floor!==from)continue;
    const cost=Math.abs(link.x-origin)*8+(link.key==='stairs'?640:0);
    candidates.push({cost,edge:{kind:'stairs',type:link.key,id:link.id,from,to:direction>0?link.floor:bottom,x:link.x+link.width/2,accessX:link.x}});
  }
  return candidates;
}
function firstMinimum(candidates,initial=null){
  let best=initial;
  for(const candidate of candidates)if(candidate.cost<INVALID&&(!best||candidate.cost<best.cost))best=candidate;
  return best;
}
function transferSuppressed(components,index,from,to){
  const table=components.maps.get(index),current=table?.floors.get(from),target=table?.floors.get(to);
  if(!current||!target)return false;
  const group=components.groups[current-1];
  return Boolean(group&&((group.mask&target)>>>0)===target);
}
function componentDirection(components,index,from,to) {
  const table=components.maps.get(index);if(!table?.member.stops.has(from))return null;
  if(table.member.stops.has(to))return Math.sign(to-from);
  if(transferSuppressed(components,index,from,to))return null;
  const floor=nativeTransferFloor(components,index,from,to);
  return floor===null?null:Math.sign(floor-from);
}

// Direct translation of34C04 candidate scans. Strict comparisons preserve
// native slot order on ties; only the first access is scored.3E2A0 calls this
// again after each link/car leg using the actor's HOME left edge.
export function chooseNativeTransport(state,from,to,service=false,originX) {
  if(from===to)return {cost:0,edge:null};
  if(!state.floors[from]||!state.floors[to])return null;
  const origin=originX??state.floors[from].x+state.floors[from].width/2;
  const components=transportComponentsFor(state);let best=null;
  if(service){
    //34D45/35128 permits ordinary stairs for service workers. Escalators
    // and passenger elevators are excluded, not ordinary stairs.
    if(Math.abs(to-from)===1||ordinaryReach(state,from,to))
      best=firstMinimum(linkCandidates(state,from,Math.sign(to-from),origin,true));
  }else{
    if(Math.abs(to-from)===1||directReach(state,from,to))
      best=firstMinimum(linkCandidates(state,from,Math.sign(to-from),origin));
    if(best&&best.cost<640)return best;
    if(!best){
      //34362 scans the eight compressed stair components in order; its
      // usable cost is zero. Select the first and seek an actual nearby
      // link one level in the component's chosen direction.
      for(const component of components.stairs){
        const direction=componentDirection(components,24+component.index,from,to);
        if(direction!==null){best=firstMinimum(linkCandidates(state,from,direction,origin));break;}
      }
      if(best&&best.cost<640)return best;
    }
  }
  for(const shaft of ordered(state.shafts)){
    if(!shaft.stops.includes(from)||(shaft.key==='service')!==service)continue;
    const index=nativeShaftComponentIndex(components,shaft.id);
    const direct=shaft.stops.includes(to);
    if(!direct&&transferSuppressed(components,index,from,to))continue;
    const destination=direct?to:nativeTransferFloor(components,index,from,to);
    if(destination===null)continue;
    const count=state.people.filter(p=>p.stage==='queue'&&p.floor===from&&p.path[0]?.id===shaft.id&&Number(p.path[0].to>from)===Number(destination>from)).length;
    const cost=shaft.key==='express'?count:Math.abs(shaft.x-origin)*8+(direct?(count===40?1000:640):(count===40?6000:3000));
    const candidate={cost,edge:{kind:'elevator',id:shaft.id,from,to:destination,x:shaft.x+shaft.width/2,accessX:shaft.x}};
    best=firstMinimum([candidate],best);
  }
  return best;
}

// A route is an inspection/preview of repeated native access choices.
// Simulation reselects at each real handoff, so it never trusts later edges.
export function nativeTransportRoute(state,from,to,service=false,originX) {
  if(from===to)return [];
  const path=[],seen=new Set();let floor=from;
  for(let leg=0;leg<128&&floor!==to;leg++){
    if(seen.has(floor))return path.length?path:null;
    seen.add(floor);
    const choice=chooseNativeTransport(state,floor,to,service,originX);
    if(!choice?.edge)return path.length?path:null;
    path.push(choice.edge);floor=choice.edge.to;
  }
  return path.length?path:null;
}

export function nativeBoardingDestination(state,shaft,from,target,direction) {
  //3EFEE re-resolves the category destination at boarding, then345C1:
  // direct served floor wins regardless ring direction; otherwise the
  // first matching transfer group MUST be in the existing ring direction.
  if(shaft.stops.includes(target))return target;
  const components=transportComponentsFor(state),index=nativeShaftComponentIndex(components,shaft.id),map=components.maps.get(index);
  if(!map?.floors.get(target))return null;
  const memberBit=(0x80000000>>>index)>>>0;
  for(const group of components.groups){
    if(group.floor===from||Boolean(group.floor>from)!==Boolean(direction)||!(group.mask&memberBit))continue;
    if(((group.mask&~memberBit)&map.floors.get(target))>>>0)return group.floor;
  }
  return null;
}
export function nativeQueuedTarget(state,actor,person,home) {
  if(!actor)return person.to;
  //46CEE:96..99 returnhome;64 goesoutside;69 resolves packedparking;
  //65 resolves commercial metadata;66 resolves the clinic registry.
  if(person.purpose==='departure'&&['office','condo','single','twin','suite'].includes(home.key))return actor.parkingFloor??state.rooms.find(r=>r.id===actor.parking)?.floor??0;
  if(person.purpose==='clinic-arrival'&&actor.medicalSlot!==undefined)return state.medicalRegistry[actor.medicalSlot]?.floor??-11;
  if(['lunch-arrival','show-meal-arrival','metro-arrival'].includes(person.purpose)){
    if(actor.commercialSlot!==undefined)return actor.commercialSlot<0?0:state.commercialRegistry?.[actor.commercialSlot]?.floor??-11;
    return state.rooms.find(r=>r.id===actor.job)?.floor??person.to;
  }
  return person.to;
}
