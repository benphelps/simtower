import { calendar, clockTime } from './original-clock.js';
import {nativeRoomPartCompleted} from './original-construction-ring.js';
import { populationRating, resetAfterPromotion } from './original-progression.js';

// 0x47F0B allocates eight visitors for each of the five original cathedral
// floor records (types36..40). The browser combines these in one room.
export const CATHEDRAL_VISITORS=40;
export const cathedralEntrance = room => room.floor-(room.height||5)+1;

// 0xAB30 resets all forty actor states at native tick0.
export function resetCathedralDay(state,hooks={}) {
  const rooms=new Set(state.rooms.filter(room=>room.key==='cathedral').map(room=>room.id));
  for(const actor of state.actors||[])if(rooms.has(actor.room)) {
    hooks.cancelTrip?.(actor);actor.state=32;actor.floor=0;actor.trip=null;
  }
}

// 0x4633A: weekend only, phase0, one-in-twelve after tick80; forced after
// tick240. Missing the morning phase changes an outside visitor to39.
export function cathedralActorAction(state,actor,randomInt) {
  if(actor.state===5)return 'worship-return';
  if(actor.state!==32||!calendar(state.calendarDay).weekend)return null;
  const phase=clockTime(state.tick).phase;
  if(phase>0){actor.state=39;return null;}
  if(state.tick>240||state.tick>80&&randomInt(12)===0)return 'worship-arrival';
  return null;
}

// 0xAEEB counts state3 across all five original floor records and requires
// EXACTLY forty present plus the additional15000 population threshold.
export function towerMilestoneReady(state,population,thresholds) {
  if(state.star!==5||state.tick>=800||populationRating(population,thresholds)<=state.star)return false;
  const rooms=new Set(state.rooms.filter(room=>room.key==='cathedral').map(room=>room.id));
  return (state.actors||[]).filter(actor=>rooms.has(actor.room)&&actor.state===3).length===CATHEDRAL_VISITORS;
}

// Called only on successful arrival:0x464B2 writes state3 then0xAC20 tests
// congregation/population and0xADE5 starts the original wedding ceremony.
export function finishCathedralTrip(state,actor,room,purpose,success,population,thresholds,hooks={}) {
  if(!success){actor.state=39;return false;}
  if(purpose==='worship-return'){actor.state=39;actor.floor=0;return false;}
  if(purpose!=='worship-arrival')return false;
  actor.state=3;actor.floor=cathedralEntrance(room);
  if(state.tick>=800)return false;
  if(!towerMilestoneReady(state,population,thresholds)) {
    room.worshipState=3;return false;
  }
  state.star=6;resetAfterPromotion(state);
  state.cathedralCeremony=true;
  state.cathedralCeremonyStep=0;
  for(const cathedral of state.rooms.filter(item=>item.key==='cathedral'))cathedral.worshipState=2;
  hooks.dialog?.(3034);hooks.sound?.(10008,2);
  hooks.focus?.(cathedralEntrance(room)+2,room.x+14);
  return true;
}

// 0xACA9 at tick1200 resets artwork and lets present congregation leave.
export function closeCathedralWorship(state) {
  const rooms=new Set(state.rooms.filter(room=>room.key==='cathedral').map(room=>room.id));
  for(const room of state.rooms)if(rooms.has(room.id))room.worshipState=0;
  for(const actor of state.actors||[])if(rooms.has(actor.room)&&actor.state===3)actor.state=5;
  state.cathedralCeremony=false;
  state.cathedralCeremonyStep=0;
}

// 0x6BC2 schedules the base type40 room at (tick+nativePoolIndex)%16.
// 0x7E2E advances a shared ceremony counter. Rendering drives this native
// people animation; dirty base records update even when People is disabled.
export function cathedralAnimationPhase(state) {
  const room=state.rooms.find(room=>room.key==='cathedral');
  return room?.nativeTenantSlots?.find(slot=>slot.type===40)?.index ?? room?.nativeTenantIndex ?? 0;
}
export function advanceCathedralCeremony(state,nativePoolIndex=cathedralAnimationPhase(state),peopleAnimations=true,forced=false) {
  if(!state.cathedralCeremony||!forced&&(!peopleAnimations||(state.tick+nativePoolIndex)%16!==0))return;
  state.cathedralCeremonyStep=(state.cathedralCeremonyStep||0)+1;
}
export class OriginalCathedralRenderClock {
  constructor(){this.states=new WeakMap();}
  update(state,room,viewport,{peopleAnimations=true,dirty=false,nativeRedraw=false}={}) {
    if(!state.cathedralCeremony){this.states.delete(state);return false;}
    if(!nativeRoomPartCompleted(room,(room.height||5)-1))return false;
    // A1EE/6BC2 updates the visible bottom type40 record, rather than any
    // visible cathedral roof record or an offscreen simulation callback.
    const left=room.x*8,right=left+room.width*8,top=-(cathedralEntrance(room)+1)*36;
    if(right<=viewport.left||left>=viewport.right||top+36<=viewport.top||top>=viewport.bottom)return false;
    const signature=[room.id,room.worshipState,cathedralAnimationPhase(state)].join(':'),previous=this.states.get(state);
    const changed=dirty||!previous||previous.signature!==signature;
    const epoch=state.elapsedTicks??(state.calendarDay??0)*2600+state.tick;
    if(previous?.tick===state.tick&&previous.epoch===epoch&&previous.signature===signature&&!dirty&&!nativeRedraw)return false;
    const due=changed||peopleAnimations&&(state.tick+cathedralAnimationPhase(state))%16===0;
    this.states.set(state,{signature,tick:previous?.tick??null,epoch:previous?.epoch??null});
    if(!due)return false;
    // Dirty jumps6E24→6E3D, bypassing People6E26 and cohort6E2D.
    advanceCathedralCeremony(state,cathedralAnimationPhase(state),peopleAnimations,changed);
    this.states.set(state,{signature,tick:state.tick,epoch});return true;
  }
}

export function cathedralCeremonySprites(state,room) {
  if(!state.cathedralCeremony)return [];
  // 0x7E2E writes the current pose, then increments its counter.
  const step=Math.max(0,(state.cathedralCeremonyStep||0)-1);
  const columns=step<14?[step,27-step]:[13,13];
  const frames=step<14?[0,1]:step<19?[step-12,step-12]:[7,7];
  return columns.map((column,index)=>({sheet:2088,sx:frames[index]*16,sy:0,
    x:(room.x+column)*8,y:-(cathedralEntrance(room)+1)*36,width:16,height:36}));
}

// Native base-type40 artwork changes alone for ordinary worship; all five
// floor records change to frame2 for the ceremony. Each base bitmap has day
// and night, then the following resources supply ceremony and worship.
export function cathedralSprites(room,night=false) {
  return [3304,3368,3432,3496,3560].map((base,level)=>{
    const state=room.worshipState===2?2:room.worshipState===3&&level===4?3:night?1:0;
    return {sheet:state>=2?base+state-1:base,sx:state===1?224:0,sy:0,
      x:room.x*8,y:-(room.floor+1)*36+level*36,width:224,height:36};
  });
}

export function validateCathedral(state) {
  if(state.cathedralCeremony!==undefined&&typeof state.cathedralCeremony!=='boolean'||
      state.cathedralCeremonyStep!==undefined&&(!Number.isInteger(state.cathedralCeremonyStep)||state.cathedralCeremonyStep<0||state.cathedralCeremonyStep>2600)||
      state.rooms.some(room=>room.key==='cathedral'&&room.worshipState!==undefined&&
        ![0,1,2,3].includes(room.worshipState)))throw new Error('Invalid cathedral state.');
}
