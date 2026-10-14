import {HOTELS} from './catalog.js';
import {signedByte} from './original-actor-stats.js';
import {markInteriorDirty} from './original-interiors.js';
import {newParkingQuotas} from './original-parking-quotas.js';
import {elevatorProgram} from './original-systems.js';
import {calendar} from './original-clock.js';

export function evacuateNativeFacilities(state) {
  //18052 changes facade/metadata directly: no rent, checkout, refund,
  //population update or clinic patient release is called along this chain.
  for(const room of state.rooms){
    let changed=false;
    if(HOTELS.has(room.key))room.housekeepingOverlay=false; //182FA resets reserved child0 as well as hotel guests.
    if(room.key==='office'&&signedByte(room.tenantState??(room.occupied?0:16))<16){room.tenantState=0;changed=true;}
    else if(room.key==='condo'&&signedByte(room.tenantState??(room.occupied?0:24))<24){room.tenantState=0;changed=true;}
    else if(HOTELS.has(room.key)&&signedByte(room.hotelState??(room.occupied?0:24))<24){room.hotelState=40;room.occupied=false;changed=true;}
    else if(['fastfood','restaurant'].includes(room.key)||room.key==='shop'&&room.commercial?.state!==-1){
      if(room.commercial){room.commercial.state=3;room.commercial.inside=0;}changed=true;
    }else if(room.key==='parking'){room.nativeParkingFrame=0;room.carVariant=0;room.occupied=false;changed=true;}
    else if(['cinema','partyhall'].includes(room.key)){
      if(room.show){room.show.stage=0;room.show.remaining=[0,0];room.show.inside=0;}
      if(room.movie)room.movie.active=false;room.occupied=false;changed=true;
    }else if(room.key==='metro'){room.metroTrain=false;changed=true;}
    else if(room.key==='cathedral'){room.worshipState=0;changed=true;}
    if(changed)for(let level=0;level<(room.height||1);level++)markInteriorDirty(room,room.floor-level);
  }
}
export function resetNativeEmergencyActors(state) {
  //182FA resets by actor+4 type. Ordinary residential histories+9/+0E
  //survive; the shared tail clears those fields only for other patron/staff
  //types. Packed current-travel/parking+0C is cleared for every reset type.
  const rooms=new Map(state.rooms.map(room=>[room.id,room]));
  for(const actor of state.actors||[]){
    const room=rooms.get(actor.room);if(!room||room.key==='security')continue;
    const residential=['office','condo',...HOTELS].includes(room.key);
    const housekeeping=room.key==='housekeeping';
    const supported=residential||housekeeping||['fastfood','restaurant','shop','cinema','partyhall','metro','cathedral'].includes(room.key);
    if(!supported)continue;
    actor.state=housekeeping?0:HOTELS.has(room.key)?38:room.key==='condo'?33:39;
    actor.trip=null;actor.admissionTick=0;actor.visitTick=0;actor.currentStress=0;actor.parking=null;actor.parkingFloor=0;
    actor.commercialInside=false;actor.commercialBooked=false;actor.showBooked=false;delete actor.nativeParkingBorrow;
    if(housekeeping){actor.job=null;actor.cleanTicks=0;}
    if(!residential){actor.delay=0;actor.trips=0;}
  }
}
export function resetNativeEmergencyTransport(state) {
  //FA79(-1)→FB32 keeps active car slots, puts each car at its configured
  //parking floor and empties passengers/calls.18960 clears both link counts.
  state.people=[];
  for(const shaft of state.shafts){shaft.calls={};for(const car of shaft.cars){
    const floor=car.parkingFloor??shaft.low;
    Object.assign(car,{floor,target:floor,departureFloor:floor,turnFloor:floor,direction:1,
      doors:0,motionCooldown:0,visitArmed:false,visitTick:0,people:[],
      expressMode:shaft.key==='express'&&shaft.programs?elevatorProgram(shaft,state.tick,calendar(state.calendarDay).weekend).departure:0});
  }}
}
export function initializeNativeEmergency(state) {
  //17FE0's remaining chain after385F6 drains the native construction ring.
  evacuateNativeFacilities(state);
  state.nativeParkingQuotas=newParkingQuotas(); //2FF10 clears used AND limits, including total LONGs.
  state.commercialLists=Object.fromEntries(['fastfood','restaurant','shop'].map(key=>[key,Array.from({length:7},()=>[])])); //333EE, registry metadata retained.
  resetNativeEmergencyTransport(state);
  resetNativeEmergencyActors(state);
}
