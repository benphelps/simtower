import {nativeActorSlotForResident} from './original-actor-pool.js';
import {nativeRoomHasCompletedActors} from './original-construction-ring.js';
import {markInteriorDirty} from './original-interiors.js';
import {hasParkingReservation} from './original-parking-state.js';
import {METRO_ACTORS,updateMetroActor,finishMetroActorTrip} from './original-metro.js';
import {recordJourneyStress,nativeJourneyStressEnabled} from './original-journeys.js';
import {SHOW_TYPES,showActorCount,newShowState,updateShowActor,finishShowActorTrip} from './original-shows.js';
import {housekeepingCanStart,housekeepingTarget,housekeepingArrival,housekeepingCleaningTick} from './original-housekeeping.js';
import {nativeAdmissionRetryStats,nativePersonKind} from './original-person-info.js';
import { CATALOG, HOTELS } from './catalog.js';
import { INCOME_TYPES } from './original-economy.js';
import { reportMissingClinic, medicalAdmission, medicalTreatmentComplete } from './original-progression.js';
import {chooseMedicalDestination,resolveMedicalSlot,changeMedicalPatients} from './original-medical.js';
import { canSeekTenant, initialTenantActor,tenantRoomEntry,tenantRoomExit,tenantRoomSleep,tenantRoomWake,synchronizeTenantRoomState,nativeTenantSlot,nativeLeaseOccupied } from './original-tenancy.js';
import { COMMERCIAL_TYPES,COMMERCIAL_ACTORS,updateCommercialActor,finishCommercialActorTrip,leaveCommercialVisit } from './original-commercial.js';
import {registerCommercialRoom,chooseCommercialDestination,commercialActorVenue,admitSelectedCommercialVisit,retryCommercialAdmission} from './original-commercial-registry.js';
import { nativeHotelState,hotelPostArrivalState,hotelRoomEntry,hotelRoomExit,hotelRoomWake,hotelRoomSleep,hotelActorAction } from './original-hotels.js';
import {CATHEDRAL_VISITORS,cathedralEntrance,cathedralActorAction,finishCathedralTrip} from './original-cathedral.js';

export const RESIDENT_TYPES=new Set(['office','condo',...HOTELS]);
export const PERSISTENT_TYPES=new Set([...RESIDENT_TYPES,...COMMERCIAL_TYPES,...SHOW_TYPES,'metro','housekeeping','security','cathedral']);
// 0x305F7 uses actor child indices, not random per-trip car ownership.
export function requiresParking(key,index,floor,tenant,star) {
  return star>=3 && (key==='suite'&&index!==0 || key==='office'&&index===2&&(floor+10+tenant)%4===1);
}
// 0x2FFE9: separate category allowances; they share the physical space pool.
export function parkingQuota(key,spaces){return spaces*([2,1,1,2,1,1,1,1,1,0][INCOME_TYPES.indexOf(CATALOG[key]?.id)]||0);}
export function venueBand(floor) {
  // 0x33590 registers only the ten floors around each lobby. The five
  // floors between those bands do not enter a service destination list.
  const group=Math.trunc((floor+5)/15),remainder=(floor+5)%15;
  return group>=0&&group<7&&remainder<=9?group||0:-1;
}
export function chooseVenue(tower,floor,key) {
  const selected=chooseCommercialDestination(tower.state,floor,key,n=>tower.randomInt(n));
  if(!selected)return null;
  return {...selected.room,id:selected.room?.id??null,key:selected.room?.key??key,
    floor:selected.floor,commercialSlot:selected.index,missingVenue:selected.missing,
    commercial:selected.room?.commercial??selected.record?.commercial};
}
function officeActivity(tower,a) {
  // 0x42811 / 0x2C8D5: child zero's business trip; other workers lunch,
  // with a one-in-ten medical visit once the tower has three stars.
  return a.index===0?0:tower.state.star>=3&&tower.randomInt(10)===0?2:1;
}
function enterVenue(tower,a) {
  a.admissionTick=tower.state.tick;
  const clinic=a.state===66,selected=clinic?resolveMedicalSlot(tower.state,a):null;
  const venue=selected?.room??tower.state.rooms.find(r=>r.id===a.job);
  if(clinic) {
    if(selected)a.floor=selected.record?.floor?? -11;
    const admission=medicalAdmission(venue,tower.state.actors);
    if(admission==='waiting')return;
    if(admission==='admitted')changeMedicalPatients(tower.state,a,1);
    if(admission==='missing'&&(a.job!==null||a.missingVenue)){
      // 0x2C56D/581 commits the missing venue penalty (PART: zero) as
      // another history record before the office clears daily readiness.
      const stress=tower.data.visits.missingPenalty,room=tower.state.rooms.find(room=>room.id===a.room),stat=room?.trips?.[a.resident];
      Object.assign(a,recordJourneyStress(a,stress));if(stat)Object.assign(stat,recordJourneyStress(stat,stress));
      const info=reportMissingClinic(tower.state);tower.notice(tower.data.strings[1010][info-1]);
    }
  }
  if(!clinic) {
    const status=admitSelectedCommercialVisit(tower,a);
    if(status==='waiting')return;
    a.state=34;a.visitTick=tower.state.tick;delete a.missingVenue;return;
  }
  delete a.missingVenue;
  a.state=35;a.visitTick=tower.state.tick;
}
function beginVisit(tower,a,r,key) {
  const destination=key==='medical'?chooseMedicalDestination(tower.state,r.floor,n=>tower.randomInt(n)):null;
  const venue=key==='medical'?destination?.room:chooseVenue(tower,r.floor,key);a.job=venue?.id??null;delete a.missingVenue;
  if(key==='medical'){if(destination)a.medicalSlot=destination.index;else delete a.medicalSlot;}
  else {a.commercialSlot=venue?.commercialSlot?? -1;delete a.medicalSlot;if(venue?.missingVenue)a.missingVenue=true;}
  if(key==='medical'&&destination?.missing)a.missingVenue=true;
  if(key==='medical'&&!destination){const info=reportMissingClinic(tower.state);tower.notice(tower.data.strings[1010][info-1]);}
  const purpose=key==='medical'?'clinic-arrival':'lunch-arrival';
  return beginActorTrip(tower,a,r,a.floor,destination?.floor??venue?.floor??0,purpose);
}
export function syncActors(tower) {
  const s=tower.state;s.actors??=[];s.nextActorSlot??=0;s.vip??=null;
  const rooms=new Map(s.rooms.filter(r=>PERSISTENT_TYPES.has(r.key)&&nativeRoomHasCompletedActors(r)).map(r=>[r.id,r]));
  for(const a of s.actors)if(!rooms.has(a.room))tower.releaseParking(a);
  s.actors=s.actors.filter(a=>rooms.has(a.room));
  const existing=new Set(s.actors.map(a=>`${a.room}:${a.resident}`));
  for(const r of rooms.values()) {
    if(COMMERCIAL_TYPES.has(r.key))registerCommercialRoom(s,r);
    if(SHOW_TYPES.has(r.key))r.show??=newShowState();
    for(let i=0;i<(r.key==='metro'?METRO_ACTORS:SHOW_TYPES.has(r.key)?showActorCount(r.key):r.key==='cathedral'?CATHEDRAL_VISITORS:COMMERCIAL_TYPES.has(r.key)?COMMERCIAL_ACTORS:CATALOG[r.key].capacity);i++)if(!existing.has(`${r.id}:${i}`)&&(!r.nativeConstructionParts||nativeActorSlotForResident(r,i)>=0)) {
      // Hotels reserve native child 0; guest children are 1/2 (0x41544).
      const tenant=['office','condo'].includes(r.key)?initialTenantActor(r):null;
      s.actors.push({id:tower.id(),slot:nativeActorSlotForResident(r,i)>=0?nativeActorSlotForResident(r,i):s.nextActorSlot++,room:r.id,resident:i,index:HOTELS.has(r.key)?i+1:i,
        state:tenant?.state??(r.key==='metro'?1:SHOW_TYPES.has(r.key)?39:HOTELS.has(r.key)||COMMERCIAL_TYPES.has(r.key)||r.key==='cathedral'?32:0),floor:tenant?.floor??(SHOW_TYPES.has(r.key)?0:HOTELS.has(r.key)||COMMERCIAL_TYPES.has(r.key)||r.key==='cathedral'?0:r.floor),
        //40E11/41090 initialize actor records without RNG. Native portraits
        //are role/child based; keep the legacy five-frame walker field stable
        //without consuming simulation randomness for an invented appearance.
        appearance:nativePersonKind({index:HOTELS.has(r.key)?i+1:i},r)%5,delay:0,trips:0,parking:null,trip:null});
    }
    for(const actor of s.actors.filter(a=>a.room===r.id)){const slot=nativeActorSlotForResident(r,actor.resident);if(slot>=0)actor.slot=slot;s.nextActorSlot=Math.max(s.nextActorSlot,actor.slot+1);}
    if(['office','condo'].includes(r.key)&&(r.tenantState===undefined||r.occupied&&r.tenantState>=(r.key==='office'?16:24)))r.tenantState=synchronizeTenantRoomState(r,s.actors,s.tick);
  }
}
export function beginActorTrip(tower,a,r,from,to,purpose) {
  if(a.trip!==null)return false;
  if(['lunch-return','show-meal-departure','metro-return'].includes(purpose)) {const selected=commercialActorVenue(tower.state,a);if(selected.index!==undefined)from=a.floor=selected.floor;}
  if(purpose==='clinic-return'){const selected=resolveMedicalSlot(tower.state,a);if(selected)from=a.floor=selected.record?.floor?? -11;changeMedicalPatients(tower.state,a,-1);}
  if(['office','condo'].includes(r.key)&&a.state<=16&&['outing','departure','lunch-arrival','clinic-arrival'].includes(purpose)){r.tenantState=tenantRoomExit(r,tower.state.tick);markInteriorDirty(r);}
  if(HOTELS.has(r.key)&&a.state<=16&&['departure','lunch-arrival'].includes(purpose)) {
    r.hotelState=hotelRoomExit(r,tower.state.tick);
    markInteriorDirty(r);
    // 0x438B5: checkout receipt occurs when the final guest begins leaving,
    // including initial route failure, rather than at arrival outside.
    if(purpose==='departure'&&(r.hotelState&7)===0)tower.checkOut(r,true);
  }
  const venue=tower.state.rooms.find(r=>r.id===a.job);
  const fromX=['show-meal-departure','metro-return'].includes(purpose)&&venue?venue.x+venue.width/2:purpose==='worship-return'?r.x+14:purpose==='clean-return'?(venue?venue.x+2:a.x):['lunch-return','clinic-return'].includes(purpose)&&venue?venue.x+venue.width/2:undefined;
  if(purpose==='lunch-return'&&venue?.commercial&&![-1,3].includes(venue.commercial.state)){venue.commercial=leaveCommercialVisit(venue.commercial,venue);a.commercialInside=false;}
  const p=tower.spawn(r,from,to,a,fromX);
  if(!p){
    // 0x3E330 adds word5D004 then 0x36B20 commits the failed journey
    // before callers apply their purpose-specific recovery/reset states.
    const stress=tower.data.transport.noRouteStress,stat=r.trips?.[a.resident];
    if(stat&&nativeJourneyStressEnabled(r.key))Object.assign(stat,recordJourneyStress(stat,stress));
    // 0x43008: failed clinic routing falls back to food outside the tower;
    // clinic existence has already been checked, so readiness stays latched.
    if(purpose==='clinic-arrival'){Object.assign(a,recordJourneyStress(a,stress));a.state=65;a.floor=r.floor;a.job=null;a.commercialSlot=-1;delete a.medicalSlot;return false;}
    if(purpose==='arrival'&&['office','condo'].includes(r.key)&&!nativeLeaseOccupied(r,tower.state.tick)){a.state=32;a.floor=0;a.delay=0;a.trips=0;if(stat){stat.delay=0;stat.trips=0;}tower.releaseParking(a);return false;}
    finishActorTrip(tower,a,r,{tripDelay:stress,initialRouteFailure:a.state===1},false,purpose);return false;
  }
  if(purpose==='arrival'&&['office','condo'].includes(r.key))tower.admitTenant(r);
  if(purpose==='arrival'&&HOTELS.has(r.key))tower.checkInHotel(r);
  if(purpose==='clean-arrival'&&venue)p.destX=venue.x+2;
  if(purpose==='clean-return'){if(fromX!==undefined)p.x=fromX;p.destX=r.x+2;}
  if(['lunch-arrival','clinic-arrival','show-meal-arrival','metro-arrival'].includes(purpose)&&venue)p.destX=venue.x+venue.width/2;
  if(['lunch-return','clinic-return'].includes(purpose)&&venue)p.x=venue.x+venue.width/2;
  if(purpose==='metro-return')p.destX=r.x+r.width/2;
  if(purpose==='worship-arrival')p.destX=r.x+14;
  p.purpose=purpose;a.trip=p.id;
  a.state=64+({arrival:32,departure:5,outing:0,'business-return':33,home:33,'lunch-arrival':1,'lunch-return':34,'clinic-arrival':2,'clinic-return':35,'commercial-arrival':32,'commercial-departure':5,'worship-arrival':32,'worship-return':5,'show-arrival':32,'show-departure':5,'show-meal-arrival':1,'show-meal-departure':34,'metro-arrival':1,'metro-return':34}[purpose]??5);tower.updatePeople(0,p.id);return true;
}
export function finishActorTrip(tower,a,r,p,success,purpose=p?.purpose) {
  a.trip=null;a.admissionTick=0;a.currentStress=0;if(nativeJourneyStressEnabled(r.key))Object.assign(a,recordJourneyStress(a,p?.tripDelay||0));
  if(r.key==='metro'&&purpose?.startsWith('metro-')){finishMetroActorTrip(tower,a,r,success,purpose,p);return;}
  if(SHOW_TYPES.has(r.key)&&purpose?.startsWith('show-')){finishShowActorTrip(tower,a,r,success,purpose,p);return;}
  if(r.key==='cathedral'){finishCathedralTrip(tower.state,a,r,purpose,success,tower.population,tower.data.populationThresholds,tower.eventHooks());return;}
  if(COMMERCIAL_TYPES.has(r.key)&&purpose?.startsWith('commercial-')) {finishCommercialActorTrip(tower,a,r,success,purpose);return;}
  if(!success){
    // 0x445F5: an occupied condo's failed outing/return restores its home
    // count through474C4 and settles the resident in state4.
    if(r.key==='condo'&&nativeLeaseOccupied(r,tower.state.tick)){a.state=4;a.floor=r.floor;r.tenantState=tenantRoomEntry(r,tower.state.tick);markInteriorDirty(r);return;}
    if(HOTELS.has(r.key)) {
      //43A71/43B63: a partner or earlier leg has already accepted this room;
      // failed admission restores its home counter rather than evicting guest.
      a.state=purpose==='departure'||purpose==='arrival'&&nativeHotelState(r,tower.state.tick)>=24?32:4;
      if(a.state===4){r.hotelState=hotelRoomEntry(r,tower.state.tick);markInteriorDirty(r);}
      else {a.floor=0;tower.releaseParking(a);tower.failVIP(a);if(purpose==='arrival'){
        if(tower.state.vipContinuation){tower.state.vipActorContinuation={actor:a.id,action:'failed-arrival'};return;}
        resetFailedHotelArrival(a,r);
      }}
      a.job=null;return;
    }
    a.state=r.key==='housekeeping'?(purpose==='clean-return'?4:0):r.key==='office'&&purpose==='arrival'?37:38;a.job=null;tower.releaseParking(a);tower.failVIP(a);return;
  }
  a.floor=p?.to??a.floor;if(r.key==='housekeeping'&&p)a.x=p.destX??p.x;
  if(purpose==='arrival'&&['office','condo'].includes(r.key)&&!nativeLeaseOccupied(r,tower.state.tick))tower.admitTenant(r,true); //42B50/44511 allow an existing96arrival to re-admit aftereviction.
  if(['office','condo'].includes(r.key)&&['arrival','home','business-return','lunch-return','clinic-return'].includes(purpose)){r.tenantState=tenantRoomEntry(r,tower.state.tick);markInteriorDirty(r);}
  //43C65 rechecks the facade when an existing96 applicant finally arrives;
  // a condition overwrite during travel can post another acceptance.
  if(HOTELS.has(r.key)&&purpose==='arrival')tower.checkInHotel(r);
  if(HOTELS.has(r.key)&&['arrival','lunch-return'].includes(purpose)){r.hotelState=hotelRoomEntry(r,tower.state.tick);markInteriorDirty(r);}
  if(purpose==='clean-arrival'){const hotel=tower.state.rooms.find(room=>room.id===a.job),arrival=housekeepingArrival(hotel,tower.state.tick);Object.assign(a,arrival.worker);if(hotel&&arrival.hotel){Object.assign(hotel,arrival.hotel);markInteriorDirty(hotel);}return;}
  if(purpose==='clean-return'){a.state=0;a.job=null;return;}
  if(['lunch-arrival','clinic-arrival'].includes(purpose)) {
    a.state=purpose==='clinic-arrival'?66:65;enterVenue(tower,a);return;
  }
  if(['lunch-return','clinic-return'].includes(purpose)){a.state=r.key==='condo'||HOTELS.has(r.key)?4:a.index===1?0:5;a.job=null;return;}
  if(purpose==='business-return'){a.state=5;return;}
  if(purpose==='home'){a.state=r.key==='condo'?4:0;return;}
  if(purpose==='arrival') {a.state=HOTELS.has(r.key)?hotelPostArrivalState(nativeTenantSlot(tower.state.rooms,r)):r.key==='office'?officeActivity(tower,a):r.key==='condo'?4:0;}
  else if(purpose==='departure') {
    a.state=r.key==='office'?39:32;
    if(HOTELS.has(r.key)){finishHotelDeparture(tower,a,r);return;}
    tower.releaseParking(a);
  } else a.state=purpose==='outing'?33:0;
}
function resetFailedHotelArrival(actor,room) {
  actor.delay=0;actor.trips=0;actor.job=null;
  const stat=room.trips?.[actor.resident];if(stat){stat.delay=0;stat.trips=0;}
}
function finishHotelDeparture(tower,actor,room,phase='checkout') {
  if(phase==='checkout'){
    tower.checkoutVIP(actor);
    if(tower.state.vipContinuation){tower.state.vipActorContinuation={actor:actor.id,action:'reserve'};return;}
  }
  if(phase!=='release'){
    tower.reserveVIP(actor,room);
    if(tower.state.vipContinuation){tower.state.vipActorContinuation={actor:actor.id,action:'release'};return;}
  }
  tower.releaseParking(actor);
}
export function resumeVIPActor(tower) {
  const pending=tower.state.vipActorContinuation;if(!pending||tower.state.vipContinuation)return;
  delete tower.state.vipActorContinuation;
  const actor=tower.state.actors.find(a=>a.id===pending.actor),room=tower.state.rooms.find(r=>r.id===actor?.room);if(!actor||!room)return;
  if(pending.action==='arrival')beginActorTrip(tower,actor,room,tower.parkingFloor(actor),room.floor,'arrival');
  else if(pending.action==='failed-arrival')resetFailedHotelArrival(actor,room);
  else finishHotelDeparture(tower,actor,room,pending.action);
}
export function updateActors(tower) {
  syncActors(tower);
  const s=tower.state,phase=Math.trunc(s.tick/400),rooms=new Map(s.rooms.map(r=>[r.id,r]));
  const orderedActors=[...s.actors].sort((a,b)=>a.slot-b.slot); //41544 scans global actor records.
  for(let position=s.actorCohortResume??0;position<orderedActors.length;position++) {
    if(s.dialogs.length)return;
    s.actorCohortResume=position+1;const a=orderedActors[position];
    // 0x41544 updates one of sixteen persistent actor cohorts per tick.
    if(a.slot%16!==s.tick%16||a.trip!==null)continue;
    const r=rooms.get(a.room);if(!r)continue;
    if(r.key==='metro'){updateMetroActor(tower,a,r,beginActorTrip,chooseVenue);continue;}
    if(SHOW_TYPES.has(r.key)){updateShowActor(tower,a,r,beginActorTrip,chooseVenue);continue;}
    if(r.key==='cathedral') {const action=cathedralActorAction(s,a,max=>tower.randomInt(max));if(action)beginActorTrip(tower,a,r,action==='worship-arrival'?0:cathedralEntrance(r),action==='worship-arrival'?cathedralEntrance(r):0,action);continue;}
    if(COMMERCIAL_TYPES.has(r.key)){updateCommercialActor(tower,a,r,beginActorTrip);r.visitors=r.commercial?.visitors??0;continue;}
    if(r.key==='security')continue; // 0x416CE dispatches these separately during emergencies.
    if([37,38,39].includes(a.state)){if(s.tick>2300)a.state=32;continue;}
    if(r.key==='housekeeping') {
      if(a.state===2){const hotel=rooms.get(a.job),change=housekeepingCleaningTick(a);Object.assign(a,change.worker);if(hotel&&change.hotel){Object.assign(hotel,change.hotel);markInteriorDirty(hotel);}}
      else if([1,4].includes(a.state))beginActorTrip(tower,a,r,a.floor,r.floor,'clean-return'); //46ACC retries home even after the work deadline.
      else if(a.state===0&&housekeepingCanStart(s)){
        const hotel=housekeepingTarget(s.rooms,a,s.tick);
        if(hotel){a.job=hotel.id;beginActorTrip(tower,a,r,a.floor,hotel.floor,'clean-arrival');}
        else if(a.floor!==r.floor){a.state=1;beginActorTrip(tower,a,r,a.floor,r.floor,'clean-return');}
      }
      continue;
    }
    if(a.state===32&&!canSeekTenant(r))continue; //native acceptance gate belongs only to applicants.
    if(a.state===65){retryCommercialAdmission(tower,a,r,beginActorTrip,'lunch-arrival',()=>enterVenue(tower,a));continue;}
    if(a.state===66){Object.assign(a,nativeAdmissionRetryStats(a,s.tick));const stats=r.trips[a.resident];if(stats)Object.assign(stats,nativeAdmissionRetryStats(stats,s.tick));enterVenue(tower,a);continue;}
    if(HOTELS.has(r.key)) {
      if(a.state===34)commercialActorVenue(s,a);
      const venue=rooms.get(a.job),action=hotelActorAction(a,r,s.tick,max=>tower.randomInt(max),Boolean(venue?.commercial&&![-1,3].includes(venue.commercial.state)),tower.data.visits[venue?.key]??0);
      if(action==='wake'){if(nativeHotelState(r,s.tick)===16)markInteriorDirty(r);r.hotelState=hotelRoomWake(r,s.tick);a.state=5;}
      else if(action==='arrival') {
        tower.bookParking(a,r);
        if(r.key==='suite'&&!hasParkingReservation(a)){a.state=38;tower.failVIP(a);continue;}
        //439EA/2D862 preserve historical totals across ordinary stays.
        tower.arriveVIP(a);
        if(s.vipContinuation){s.vipActorContinuation={actor:a.id,action:'arrival'};return;}
        beginActorTrip(tower,a,r,tower.parkingFloor(a),r.floor,'arrival');
      } else if(action==='departure') {
        beginActorTrip(tower,a,r,r.floor,tower.parkingFloor(a),'departure');
      } else if(action==='dinner')beginVisit(tower,a,r,'restaurant');
      else if(action==='home')a.state=4;
      else if(action==='dinner-return')beginActorTrip(tower,a,r,a.floor,r.floor,'lunch-return');
      else if(action==='sleep'){a.state=16;if(r.key==='single'||(nativeHotelState(r,s.tick)&7)===1||s.actors.some(other=>other.room===r.id&&other.id!==a.id&&other.state===16))markInteriorDirty(r);r.hotelState=hotelRoomSleep(r,a,s.actors,s.tick);}
    } else if(r.key==='office') {
      // 0x42495 / 0x42811: morning, business, lunch/medical, return,
      // and evening departure are separate states, with native child roles.
      if(a.state===32 && !tower.calendar.weekend && (phase===0?tower.randomInt(12)===0:phase>0&&phase<3)) {
        tower.bookParking(a,r);
        beginActorTrip(tower,a,r,tower.parkingFloor(a),r.floor,'arrival');
      } else if(a.state===0) {
        if(phase>=4){a.state=5;continue;}
        const start=a.index===0?0:3;
        if(phase===start?tower.randomInt(12)===0:phase>start)beginActorTrip(tower,a,r,r.floor,0,'outing');
      } else if([1,2].includes(a.state)) {
        if(phase>=4){a.state=5;continue;}
        if(phase===1?tower.randomInt(12)===0:phase>1)beginVisit(tower,a,r,a.state===2?'medical':'fastfood');
      } else if(a.state===33 && (phase===3?tower.randomInt(12)===0:phase>3)) {
        beginActorTrip(tower,a,r,0,r.floor,'business-return');
      } else if([34,35].includes(a.state)) {
        if(a.state===35)resolveMedicalSlot(s,a);
        else commercialActorVenue(s,a);
        // 0x42742..4278A caller gates BOTH food34 and clinic35. Late
        // abandonment releases parking but leaves the clinic BYTE to dawn.
        // 0x42742..42783 abandons the visit without32E4E/2C6B4's venue
        // decrement. The selected venue stays in+6; its counter clears daily.
        if(phase>=4){if(a.state===34)a.commercialInside=false;a.state=39;tower.releaseParking(a);continue;}
        const selectedVenue=rooms.get(a.job),duration=a.state===35?(selectedVenue?16:0):selectedVenue?.commercial&&![-1,3].includes(selectedVenue.commercial.state)?tower.data.visits[selectedVenue.key]:0;
        if(phase>=2&&(a.state===35?medicalTreatmentComplete(s.tick,a.visitTick,rooms.has(a.job)):s.tick-a.visitTick>=duration))beginActorTrip(tower,a,r,a.floor,r.floor,a.state===35?'clinic-return':'lunch-return');
      } else if(a.state===5 && (phase===4?tower.randomInt(6)===0:phase>4)) {
        beginActorTrip(tower,a,r,r.floor,tower.parkingFloor(a),'departure');
      }
    } else {
      // 0x43D28 / 0x44050: child two returns a phase earlier; child one
      // visits a shop/food venue. Returned residents sleep in state 16.
      const tenant=nativeTenantSlot(s.rooms,r);
      if(a.state===32 && phase<5)beginActorTrip(tower,a,r,0,r.floor,'arrival');
      else if(a.state===16 && (phase<5 || s.tick>2566&&tower.randomInt(12)===0)){if(r.tenantState===16)markInteriorDirty(r);r.tenantState=tenantRoomWake(r,s.tick);a.state=tower.calendar.weekend&&tenant%2?4:a.index===1?1:0;}
      else if(a.state===0 && (phase===0?tower.randomInt(12)===0:phase<6))beginActorTrip(tower,a,r,r.floor,0,'outing');
      else if(a.state===1) {
        const special=tower.calendar.weekend&&tenant%4===0;
        if(special&&phase>4){a.state=4;continue;}
        const due=special ? phase===4&&tower.randomInt(6)===0 : phase===0?s.tick>240&&tower.randomInt(12)===0:phase<6;
        if(due)beginVisit(tower,a,r,tower.calendar.weekend?(special?'shop':'fastfood'):'restaurant');
      } else if(a.state===33) {
        const start=a.index===2?3:4;
        if(phase===start?tower.randomInt(12)===0:phase>start)beginActorTrip(tower,a,r,0,r.floor,'home');
      } else if(a.state===34 && phase>=3) {
        commercialActorVenue(s,a);
        const venue=rooms.get(a.job),duration=venue?.commercial&&![-1,3].includes(venue.commercial.state)?tower.data.visits[venue.key]:0;
        if(s.tick-a.visitTick>=duration)beginActorTrip(tower,a,r,a.floor,r.floor,'lunch-return');
      } else if(a.state===4 && phase>=5 && (a.index===2 || s.tick>2400 || tower.randomInt(12)===0)){a.state=16;if((r.tenantState&7)===1||s.actors.filter(other=>other.room===r.id&&other.id!==a.id).every(other=>other.state===16))markInteriorDirty(r);r.tenantState=tenantRoomSleep(r,a,s.actors,s.tick);}
    }
  }
  if(!s.dialogs.length)delete s.actorCohortResume;
}
