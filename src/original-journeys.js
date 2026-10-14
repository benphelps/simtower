import { HOTELS } from './catalog.js';

// 0x46ACC → 0x3E2A0 passes zero for housekeeping's history/stress flag.
// Its service travel still registers queues and moves, without a36B20 commit.
export function nativeJourneyStressEnabled(key) { return key !== 'housekeeping'; }

// 0x41D80: the zero timestamp is a sentinel. This deliberately uses a
// signed, unwrapped native clock subtraction, not elapsed wall time.
export function queueTimeoutExpired(tick,queueTick,limit=300) {
  return Boolean(queueTick) && tick-queueTick>=limit;
}
export function actorCohortDue(state,person) {
  const actor=state.actors.find(a=>a.id===person.actor);
  return (actor?.slot??person.id)%16===state.tick%16;
}
// 0x3FC21 removes the directional FIFO prefix through the triggering actor.
export function queuePrefix(people,person) {
  const edge=person.path[0],direction=Number(edge.to>person.floor);
  const queue=people.filter(p=>p.stage==='queue'&&p.floor===person.floor&&p.path[0]?.id===edge.id&&Number(p.path[0].to>p.floor)===direction)
    .sort((a,b)=>(a.queueOrder??a.id)-(b.queueOrder??b.id));
  return queue.slice(0,queue.findIndex(p=>p.id===person.id)+1);
}

// 0x4204C. Failure after entering a directional ring has different recovery
// from an initial unreachable route, and must preserve these purpose branches.
export function interruptionState(key,purpose) {
  if(key==='housekeeping')return {state:0,releaseParking:false,failVIP:false,recordStress:false};
  if(key==='office')return ['outing','lunch-arrival','clinic-arrival'].includes(purpose)
    ? {state:5,releaseParking:false,failVIP:false,recordStress:true}
    : {state:38,releaseParking:true,failVIP:false,recordStress:true};
  if(key==='condo')return {state:4,releaseParking:false,failVIP:false,recordStress:true};
  if(HOTELS.has(key))return purpose==='departure'
    ? {state:38,releaseParking:true,failVIP:true,recordStress:true}
    : {state:4,releaseParking:false,failVIP:false,recordStress:true};
  return {state:39,releaseParking:false,failVIP:false,recordStress:true};
}

export function activeLinkCounts(people,id) {
  let up=0,down=0;
  for(const p of people)if(p.stage==='link'&&p.path[0]?.id===id){if(p.path[0].to>p.path[0].from)up++;else down++;}
  return {up,down};
}
// 0x189DA: embedded occupant frames animate only while link usage is nonzero.
export function linkAnimationFrame(key,tick,counts,span=1) {
  return counts.up||counts.down ? tick%(span>1?(key==='stairs'?10:11):(key==='stairs'?13:7))+1 : 0;
}

// 0x36B20 records packed BYTE trip counts and WORD accumulated stress.
export function recordJourneyStress(stats,stress=0) {
  return {delay:((stats.delay||0)+(stress&1023))&0xffff,trips:((stats.trips||0)+1)&0xff};
}
