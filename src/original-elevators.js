import {nativeCarOrder,nativeShaftOrder} from './original-transport-slots.js';
import {nativeBoardingDestination,nativeQueuedTarget} from './original-transport-choice.js';
import {nativeTravelWord,nativeBoardingWord} from './original-packed-travel.js';
import {nativeJourneyStressEnabled} from './original-journeys.js';
import { elevatorCapacity, skyLobbyFloor } from './catalog.js';
import { carMotion, elevatorProgram } from './original-systems.js';

// The native floor number has an offset of ten. Distances/order are unchanged.
export const callKey=(floor,direction)=>`${floor}:${direction}`;
export function initializeDispatch(sh) {
  sh.calls??={};
  for(const c of nativeCarOrder(sh)) {
    c.direction??=1;c.turnFloor??=c.parkingFloor;c.departureFloor??=c.floor;
    c.motionCooldown??=0;c.visitArmed??=false;c.visitTick??=0;c.expressMode??=0;
    // Older browser saves used seconds for doors.
    c.doors=Math.min(5,Math.max(0,Math.ceil(c.doors)));
  }
}
const assigned=(sh,c)=>Object.values(sh.calls).filter(id=>id===c.id).length;
const owns=(sh,c,f,d)=>sh.calls[callKey(f,d)]===c.id;
const destinations=(c,people)=>new Set(c.people.map(id=>people.find(p=>p.id===id)?.path[0]?.to).filter(Number.isFinite));

// 0x1079C: strict comparisons preserve the first car on ties. Response is
// the distance advantage allowed to a busy car over a parked idle car.
export function selectHallCar(sh,floor,direction,people,response) {
  let onWay={distance:9999},idle={distance:9999},around={distance:9999};
  for(const c of nativeCarOrder(sh)) {
    if(c.floor===floor && !c.motionCooldown && (c.expressMode || c.direction===direction))return {car:c,immediate:true};
    if(!assigned(sh,c) && !destinations(c,people).size && c.parkingFloor===c.floor && !c.motionCooldown) {
      const distance=Math.abs(floor-c.floor);
      if(!distance)return {car:c,immediate:true};
      if(distance<idle.distance)idle={car:c,distance};
      continue;
    }
    if(c.direction===direction) {
      const ahead=direction ? floor-c.floor : c.floor-floor;
      if(ahead>=0) {if(ahead<onWay.distance)onWay={car:c,distance:ahead};continue;}
      const distance=direction ? c.turnFloor-c.floor+c.turnFloor-floor : c.floor-c.turnFloor+floor-c.turnFloor;
      if(distance<around.distance)around={car:c,distance};
    } else {
      const distance=direction ? (floor<=c.turnFloor ? c.floor-floor : c.floor-c.turnFloor+floor-c.turnFloor)
        : (floor>=c.turnFloor ? floor-c.floor : c.turnFloor-c.floor+c.turnFloor-floor);
      if(distance<around.distance)around={car:c,distance};
    }
  }
  const busy=onWay.car?onWay:around;
  return {car:busy.car && response>busy.distance-idle.distance ? busy.car : idle.car || nativeCarOrder(sh)[0],immediate:false};
}

// 0x10EF3: four ordered scans. The opposite hall queue is collected at the
// far end of the sweep, rather than picking whichever floor is closest.
export function dispatchTarget(sh,c,people) {
  const dest=destinations(c,people),full=c.people.length>=elevatorCapacity(sh.key);
  if(!dest.size && !assigned(sh,c))return c.parkingFloor;
  const scan=(from,to,step,predicate)=>{for(let f=from;step>0?f<=to:f>=to;f+=step)if(predicate(f))return f;};
  const any=f=>dest.has(f)||!full&&(owns(sh,c,f,0)||owns(sh,c,f,1));
  if(c.expressMode===1) {
    if(c.direction===1 && (c.floor!==sh.high || c.motionCooldown))return sh.high;
    if(c.direction===0 && c.floor===sh.low && !c.motionCooldown)return sh.high;
    return scan(c.floor,sh.low,-1,any)??sh.low;
  }
  if(c.expressMode===2) {
    if(c.direction===0 && (c.floor!==sh.low || c.motionCooldown))return sh.low;
    if(c.direction===1 && c.floor===sh.high && !c.motionCooldown)return sh.low;
    return scan(c.floor,sh.high,1,any)??sh.high;
  }
  const d=c.direction,step=d?1:-1,end=d?sh.high:sh.low,other=d?sh.low:sh.high;
  const same=f=>dest.has(f)||!full&&owns(sh,c,f,d);
  return scan(c.floor,end,step,same)
    ?? (!full?scan(end,c.floor,-step,f=>owns(sh,c,f,1-d)):undefined)
    ?? scan(c.floor-step,other,-step,f=>dest.has(f)||!full&&owns(sh,c,f,1-d))
    ?? (!full?scan(other,c.floor-step,step,f=>owns(sh,c,f,d)):undefined)
    ?? c.parkingFloor;
}
export function recomputeDispatch(sh,c,people) {
  c.target=dispatchTarget(sh,c,people);
  if(c.target!==c.floor)c.direction=Number(c.target>c.floor);
  else if(c.visitArmed) {
    const old=c.direction;
    if(c.floor===sh.high && c.direction===1)c.direction=0;
    else if(c.floor===sh.low && c.direction===0)c.direction=1;
    else if(!c.expressMode && !sh.calls[callKey(c.floor,c.direction)] && sh.calls[callKey(c.floor,1-c.direction)])c.direction=1-c.direction;
    if(old!==c.direction)releaseHall(sh,c,people,false);
  }
  const dest=destinations(c,people),step=c.direction?-1:1;
  c.turnFloor=c.parkingFloor;
  for(let f=c.direction?sh.high:sh.low;c.direction?f>=c.floor:f<=c.floor;f+=step) {
    if(dest.has(f)||owns(sh,c,f,0)||owns(sh,c,f,1)){c.turnFloor=f;break;}
  }
}
export function assignHallCall(sh,floor,direction,people,response) {
  const key=callKey(floor,direction);
  if(sh.calls[key])return;
  const result=selectHallCar(sh,floor,direction,people,response);
  if(!result.immediate && result.car) {sh.calls[key]=result.car.id;recomputeDispatch(sh,result.car,people);}
}
// 0x10D6C releases even another car's claim on opening; 0x10C69 only
// releases this car's claim when passing/leaving the floor.
function releaseHall(sh,c,people,ownOnly) {
  for(const d of c.expressMode?[0,1]:[c.direction]) {
    const key=callKey(c.floor,d),owner=sh.calls[key];
    if(owner && (!ownOnly || owner===c.id)) {
      delete sh.calls[key];
      const other=sh.cars.find(car=>car.id===owner);
      if(other && other!==c)recomputeDispatch(sh,other,people);
    }
  }
}
export function canDepart(c,capacity,program,tick,lobby) {
  // 0x11D45 deliberately uses an absolute, unwrapped clock difference.
  return c.people.length>=capacity || !program.wait || c.floor!==c.parkingFloor&&!lobby || Math.abs(c.visitTick-tick)>program.wait*30;
}
export function boardingDelay(delay,waitTicks,floor,lobbyHeight) {
  // 0x36D11 / 0x36F43: a double/triple lobby forgives 25/50 ticks
  // at ground level. The packed per-journey delay saturates at 300.
  return nativeBoardingWord(nativeTravelWord(delay),waitTicks,0,floor,lobbyHeight).delay;
}
export function updateNativeElevators(tower) {
  const s=tower.state,resume=s.elevatorTickResume;
  if(s.dialogs?.length)return;
  let reached=!resume;
  for(const sh of nativeShaftOrder(s)) {
    if(!reached){if(sh.id!==resume.shaft)continue;reached=true;}
    const resumedShaft=resume?.shaft===sh.id;
    initializeDispatch(sh);
    const program=elevatorProgram(sh,s.tick,tower.calendar.weekend),capacity=elevatorCapacity(sh.key);
    const queue=(f,d)=>s.people.filter(p=>p.stage==='queue' && p.path[0]?.id===sh.id && p.floor===f && Number(p.path[0].to>f)===d).sort((a,b)=>(a.queueOrder??a.id)-(b.queueOrder??b.id));
    if(!resumedShaft)for(const p of s.people)if(p.stage==='queue' && p.path[0]?.id===sh.id && !p.hallRegistered) {
      const d=Number(p.path[0].to>p.floor),first=!queue(p.floor,d).some(other=>other!==p&&other.hallRegistered);
      p.hallRegistered=true;
      // 0x3F2A2: only an empty -> nonempty ring raises a new hall call.
      if(first)assignHallCall(sh,p.floor,d,s.people,program.response);
    }
    // 0xFD4B advances every car before unloading/boarding any car.
    if(!resumedShaft)for(const c of nativeCarOrder(sh)) {
      c.people=c.people.filter(id=>s.people.some(p=>p.id===id));
      if(c.motionCooldown>0) {
        const motion=carMotion(sh.key,Math.abs(c.target-c.floor),Math.abs(c.floor-c.departureFloor));
        c.motionCooldown=motion.delay===5?c.motionCooldown-1:0;continue;
      }
      if(c.doors>0) {
        if(--c.doors===0) {
          c.departureFloor=c.floor;recomputeDispatch(sh,c,s.people);
          const lobby=skyLobbyFloor(c.floor)||s.floors[c.floor]?.lobby;
          if(!canDepart(c,capacity,program,s.tick,lobby))c.doors=1;
        }
        continue;
      }
      if(c.target===c.floor && (destinations(c,s.people).has(c.floor)||c.people.length<capacity)) {
        if(c.floor===sh.low || c.floor===sh.high)c.expressMode=program.departure;
        releaseHall(sh,c,s.people,false);c.doors=5;
        if(!c.visitArmed)c.visitTick=s.tick;
        c.visitArmed=true;continue;
      }
      const previous=c.floor;
      releaseHall(sh,c,s.people,true);
      if(c.target===c.floor){c.departureFloor=c.floor;recomputeDispatch(sh,c,s.people);}
      if(c.target!==c.floor) {
        const motion=carMotion(sh.key,Math.abs(c.target-c.floor),Math.abs(c.floor-c.departureFloor));
        c.floor+=Math.sign(c.target-c.floor)*Math.min(motion.floors,Math.abs(c.target-c.floor));
        c.motionCooldown=motion.delay;
        if(c.visitArmed)tower.nativeSound(6002,0);
        c.visitArmed=false;
      }
      for(const d of [1,0])if(queue(previous,d).length)assignHallCall(sh,previous,d,s.people,program.response);
    }
    let reachedCar=!resumedShaft;
    for(const c of nativeCarOrder(sh)) {
      if(!reachedCar){if(c.id!==resume.car)continue;reachedCar=true;}
      if(!(resumedShaft&&c.id===resume.car)&&c.doors===5 && destinations(c,s.people).has(c.floor))tower.nativeSound(6001,0);
      if(c.doors===5)for(const id of [...c.people]) {
        const p=s.people.find(p=>p.id===id);
        if(p?.path[0]?.to===c.floor) {
          p.floor=c.floor;p.x=sh.x+sh.width/2;p.path.shift();p.stage='walk';p.wait=0;delete p.hallRegistered;
          c.people=c.people.filter(i=>i!==id);
          if(p.actor&&tower.selectNextActorLeg?.(p))tower.updatePeople(0,p.id);
          if(s.dialogs?.length){s.elevatorTickResume={shaft:sh.id,car:c.id};return;}
        }
      }
      if(!(c.doors&1) || c.people.length>=capacity)continue;
      if(!queue(c.floor,c.direction).length && !assigned(sh,c) && !destinations(c,s.people).size && queue(c.floor,1-c.direction).length)c.direction=1-c.direction;
      for(const d of c.expressMode?[c.direction,1-c.direction]:[c.direction]) {
        const passengers=queue(c.floor,d),count=c.doors===1?capacity-c.people.length:1;
        for(const p of passengers.slice(0,count)) {
          if(c.people.length>=capacity)break;
          const lobbyHeight=s.floors[2]?.lobby?3:s.floors[1]?.lobby?2:1;
          const actor=s.actors.find(a=>a.id===p.actor),stressEnabled=nativeJourneyStressEnabled(s.rooms.find(r=>r.id===p.room)?.key);
          if(tower.previewQueuePopped)tower.previewQueuePopped(p);
          else if(stressEnabled){
            const previousFloor=actor?.parkingFloor??0;
            const packed=nativeBoardingWord(nativeTravelWord(p.tripDelay,previousFloor),p.queueTick===undefined?p.wait*2:s.tick,p.queueTick??0,p.floor,lobbyHeight);
            p.tripDelay=packed.delay;
            if(actor&&packed.parkingFloor!==previousFloor){
              actor.parkingFloor=packed.parkingFloor;
              // Keep the display's original pointer. A packed clock borrow
              // changes reservation floor independently of that car image.
              actor.nativeParkingBorrow=true;
            }
          }else p.tripDelay=0;
          const home=s.rooms.find(r=>r.id===p.room),target=nativeQueuedTarget(s,actor,p,home);
          const destination=nativeBoardingDestination(s,sh,p.floor,target,d);
          p.to=target;p.wait=0;delete p.queueTick;
          if(destination===null){
            if(stressEnabled&&!tower.previewQueuePopped)p.tripDelay=Math.min(300,p.tripDelay+tower.data.transport.boardingFailureStress);
            p.stage='retry';p.retryTick=s.tick;delete p.hallRegistered;
          }else{p.path[0]={...p.path[0],to:destination};c.people.push(p.id);p.stage='car';}
        }
      }
    }
  }
  delete s.elevatorTickResume;
}
