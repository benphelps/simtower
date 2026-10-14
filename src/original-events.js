import { clockTime } from './original-clock.js';
import { lobbyHeight } from './original-lobbies.js';
import { CATALOG } from './catalog.js';

// PART 32517/1000 offsets 52..60, loaded by 0x2F955. Native clock ticks.
export const EVENT_TIMING = Object.freeze({ scan:1, stairs:3, spread:7,
  verticalSpread:80, helicopter:1, result:2, secomFire:80, extinguish:5 });
const bombDemand = (data, star) => data.events.bombDemand[star-2]*data.moneyScale;
const fireCrewCost = data => data.events.fireCrewCost*data.moneyScale;
const dialog = (hooks,id,value=0) => hooks.dialog?.(id,value);
const floorBounds = (state,floor) => state.floors[floor];
const isTallLobbyPart = (state,floor) => floor>0 && floor<lobbyHeight(state);

export function initializeEvents(state) { state.emergency ??= null; }
export function emergencyActive(state) {
  return Boolean(state.emergency && ['burning','searching','exploding','result'].includes(state.emergency.stage));
}
export function fireRescueAvailable(state) {
  const event=state.emergency;
  return event?.kind==='fire' && event.stage==='burning' && event.helicopter===null;
}
function deferEmergency(state,hooks,id,action,fields={}) {
  if(!hooks.deferDialogs)return false;
  state.emergencyContinuation={id,action,...fields};return true;
}

// 0x19B0E scans the contiguous native floor table and picks between the first
// ordinary floor above the ground lobby and the last floor before its first gap.
export function chooseDisasterFloor(state,randomInt) {
  const start=lobbyHeight(state);
  let first=null,last=null;
  for(let floor=-10;floor<=109;floor++) {
    if(floorBounds(state,floor)) {if(first===null)first=floor;}
    else if(first!==null && first>-10) {last=floor-1;break;}
  }
  if(last===null || last<start)return null;
  return start+randomInt(last-start+1);
}

function staffPool(state,event,kind,secom) {
  const rooms=new Map(state.rooms.filter(room=>room.key==='security').map(room=>[room.id,room]));
  event.searchRanges={};
  event.staff=(state.actors||[]).filter(actor=>rooms.has(actor.room)).sort((a,b)=>{
    const x=rooms.get(a.room),y=rooms.get(b.room);
    return x.floor-y.floor||(x.x||0)-(y.x||0)||a.index-b.index;
  }).map(actor=>{
    const home=rooms.get(actor.room).floor;
    const floor=kind==='bomb'?home-(!secom&&actor.index>=3?1:0):home;
    event.searchRanges[actor.room]={low:secom?event.floor:home,high:(secom?event.floor:home)-1};
    return {actor:actor.id,room:actor.room,index:actor.index,home,floor,
      state:kind==='bomb'&&secom&&actor.index!==0?1:0,x:0,travel:0,delay:0,mode:0};
  });
}

export function startScheduledEvent(state,data,randomInt,hooks={}) {
  initializeEvents(state);
  if(state.emergency || state.tick!==240 || !state.rooms.some(room=>room.key==='security'))return false;
  const fire=state.calendarDay%84===83;
  const bomb=state.calendarDay%60===59;
  if(!fire&&!bomb)return false;
  if(fire&&(state.star<3||!clockTime(state.tick).daylight||state.rooms.some(room=>room.key==='cathedral')))return false;
  if(!fire&&![2,3,4].includes(state.star))return false;
  const floor=chooseDisasterFloor(state,randomInt),bounds=floorBounds(state,floor);
  if(floor===null || bounds.width<(fire?32:4))return false;
  const secom=state.rooms.some(room=>room.key==='secom');
  if(fire) {
    const x=bounds.x+bounds.width-32;
    state.emergency={kind:'fire',stage:'burning',floor,x,startTick:state.tick,
      spreadDelay:secom?EVENT_TIMING.secomFire:0,frontiers:{[floor]:{left:x,right:x}},
      helicopter:null,rescueAsked:false,staff:[],searchRanges:{}};
    dialog(hooks,secom?3010:3011,floor+1);
    if(deferEmergency(state,hooks,secom?3010:3011,'start-fire')){state.emergency.stage='announcement';state.emergency.frontiers={};return true;}
    hooks.activate?.(0);hooks.focus?.(floor,x);
  } else {
    const x=bounds.x+randomInt(bounds.width-3);
    state.emergency={kind:'bomb',stage:'demand',floor,x,deadline:1200,
      demand:bombDemand(data,state.star),secom,staff:[],searchRanges:{}};
    dialog(hooks,3020,state.emergency.demand);
  }
  return true;
}

// Dialog button IDs come from the original templates, not Yes/No labels:
// 3020/2 pays; 3012/2 hires fire rescue.
export function answerEmergencyDialog(state,data,id,control,hooks={}) {
  const event=state.emergency;
  if(!event || ![1,2].includes(control))return false;
  if(id===3020 && event.kind==='bomb' && event.stage==='demand') {
    if(control===2) {
      hooks.spend?.(event.demand,'Pay terrorist demand');hooks.sound?.(10015,2);
      state.emergency=null;return true;
    }
    dialog(hooks,event.secom?3021:3022,event.secom?event.floor+1:0);
    if(deferEmergency(state,hooks,event.secom?3021:3022,'start-bomb')){event.stage='briefing';return true;}
    event.stage='searching';staffPool(state,event,'bomb',event.secom);
    hooks.evacuate?.(1);hooks.activate?.(1);return true;
  }
  if(id===3012 && event.kind==='fire' && event.helicopter===null) {
    event.rescueAsked=true;
    if(control===2) {
      const bounds=floorBounds(state,event.floor);
      event.helicopter=bounds.x+bounds.width-12;
      hooks.spend?.(fireCrewCost(data),'Emergency fire crew');hooks.focus?.(event.floor,event.helicopter);
    } else {
      dialog(hooks,3014);
      if(deferEmergency(state,hooks,3014,'fire-staff'))return true;
      staffPool(state,event,'fire',false);hooks.evacuate?.(8);
    }
    return true;
  }
  return false;
}

export function requestFireRescue(state,data,hooks={}) {
  if(!fireRescueAvailable(state))return false;
  dialog(hooks,3012,fireCrewCost(data));return true;
}

// 0x19A8D destroys cells on six native levels, floor-2 through floor+3
// inclusive, and forty columns x-20 through x+19. Actual facility teardown
// belongs to the host so tenant refunds/pools follow its shared implementation.
export function bombDamageCells(state,event,hooks={}) {
  const resume=state.emergencyWorkContinuation?.kind==='bomb-damage'?state.emergencyWorkContinuation.nextCell:0;
  for(let floor=event.floor-2;floor<=event.floor+3;floor++) {
    if(floor<-10||floor>=110||!floorBounds(state,floor))continue;
    for(let x=event.x-20;x<event.x+20;x++){
      const index=(floor-event.floor+2)*40+x-event.x+20;if(index<resume)continue;
      hooks.damage?.(floor,x);
      if(hooks.isPaused?.()){state.emergencyWorkContinuation={kind:'bomb-damage',nextCell:index+1};return false;}
    }
  }
  delete state.emergencyWorkContinuation;return true;
}

function resolveBomb(state,event,found,hooks,finder=null) {
  if(event.stage!=='searching')return;
  event.stage=found?'result':'exploding';event.found=found;
  if(found)event.resultTick=state.tick+EVENT_TIMING.result;
  // 0x1EF16 leaves the finder active for its native100tick defusing pose;
  // the result dialog/reset two ticks later stops it with the rest.
  if(found)for(const staff of event.staff)if(staff!==finder)staff.state=1;
  if(!found){hooks.sound?.(10004,2);if(!bombDamageCells(state,event,hooks))return;finishBombDamage(state,event,hooks);return;}
  hooks.focus?.(event.floor,event.x); // 0x19A11 common success/explosion path.
}
function finishBombDamage(state,event,hooks) {
  for(const staff of event.staff)staff.state=1;
  hooks.evacuate?.();hooks.focus?.(event.floor,event.x);
  event.stage='result';event.resultTick=state.tick+EVENT_TIMING.result;
}

function exteriorTravel(state,event,staff,floor,instant=false) {
  const previous=staff.floor;
  staff.travel=instant?0:Math.abs(floor-previous)*EVENT_TIMING.stairs+(previous<staff.home?EVENT_TIMING.stairs:0);
  staff.floor=floor;staff.mode=0;
  const bounds=floorBounds(state,floor);staff.x=bounds.x+bounds.width-2;
}

function nextSearchFloor(state,event,staff) {
  const range=event.searchRanges[staff.room];
  const order=staff.floor>=staff.home?['high','low']:['low','high'];
  for(const direction of order) {
    const floor=direction==='high'?range.high+1:range.low-1;
    // 0x1F123/1F191/1F1FF: an unavailable/tall-lobby candidate falls
    // back to the other range end; it does not hop across excluded floors.
    if(floor>=-10&&floor<110&&floorBounds(state,floor)&&!isTallLobbyPart(state,floor)) {
      range[direction]=floor;return floor;
    }
  }
  return null;
}

// 0x416CE runs all six staff in every security office each native tick,
// independently of the ordinary one-in-sixteen actor update cohorts.
function stepBombStaff(state,event,staff,hooks) {
  if(staff.state!==0)return;
  if(staff.travel>0){staff.travel--;return;}
  if(staff.delay>0){staff.delay--;return;}
  const bounds=floorBounds(state,staff.floor);
  if(!bounds){staff.state=1;return;}
  if(staff.x<=bounds.x) {
    const floor=nextSearchFloor(state,event,staff);
    if(floor===null){staff.state=1;return;}
    exteriorTravel(state,event,staff,floor);return;
  }
  staff.x--;
  if(staff.floor===event.floor&&staff.x===event.x) {
    staff.mode=4;staff.delay=100;resolveBomb(state,event,true,hooks,staff);return;
  }
  staff.delay=EVENT_TIMING.scan;staff.mode=staff.mode===0?2:0;
}

function burning(frontier){return frontier&&(frontier.left>=0||frontier.right>=0);}
function extinguishAt(event,floor,x) {
  const frontier=event.frontiers[floor];if(!frontier)return;
  for(const side of ['left','right'])if(frontier[side]>=0&&frontier[side]<=x&&x<frontier[side]+12)frontier[side]=-1;
}

function stepFireStaff(state,event,staff) {
  if(staff.state!==0)return;
  if(staff.travel>0){staff.travel--;return;}
  if(staff.delay>0){staff.delay--;if(staff.delay===0&&staff.mode===4)extinguishAt(event,staff.floor,staff.x);return;}
  const bounds=floorBounds(state,staff.floor);
  const frontier=event.frontiers[staff.floor];
  if(!bounds){staff.state=1;return;}
  if(staff.x<=bounds.x||!burning(frontier)) {
    const floors=Object.entries(event.frontiers).filter(([floor,f])=>
      (Number(floor)+10)%6===staff.index&&burning(f)).map(([floor])=>Number(floor)).sort((a,b)=>a-b);
    const floor=staff.x<=bounds.x?floors.at(-1):floors[0];
    if(floor!==undefined)exteriorTravel(state,event,staff,floor);
    return;
  }
  staff.x--;
  const hot=frontier.left>=0&&frontier.left<=staff.x&&staff.x<frontier.left+6 ||
    frontier.right>=0&&frontier.right+6<=staff.x&&staff.x<frontier.right+12;
  staff.mode=hot?4:staff.mode===0?2:0;staff.delay=hot?EVENT_TIMING.extinguish:EVENT_TIMING.scan;
}

function stepFireSpread(state,event,hooks) {
  const resume=state.emergencyWorkContinuation?.kind==='fire-spread'?state.emergencyWorkContinuation:null;
  if(!resume&&event.spreadDelay>0){event.spreadDelay--;return true;}
  for(const [key,bounds] of Object.entries(state.floors).sort((a,b)=>Number(a[0])-Number(b[0]))) {
    const floor=Number(key),frontier=event.frontiers[floor]??={left:-1,right:-1};
    if(resume&&floor<resume.floor)continue;
    const saved=resume?.floor===floor?resume.side:null;
    if(saved!=='right-after'){
    if(frontier.left>=0) {
      if(saved!=='left-after'){
        hooks.damage?.(floor,frontier.left);
        if(hooks.isPaused?.()){state.emergencyWorkContinuation={kind:'fire-spread',floor,side:'left-after'};return false;}
      }
      if(state.tick%EVENT_TIMING.spread===0)frontier.left--;
      if(frontier.left<bounds.x)frontier.left=-1;
    } else if(event.startTick+(floor-event.floor)*EVENT_TIMING.verticalSpread===state.tick) {
      if(bounds.x<=event.x)frontier.left=event.x;
    }
    }
    if(frontier.right>0) {
      if(saved!=='right-after'){
        hooks.damage?.(floor,frontier.right+12);
        if(hooks.isPaused?.()){state.emergencyWorkContinuation={kind:'fire-spread',floor,side:'right-after'};return false;}
      }
      if(state.tick%EVENT_TIMING.spread===0)frontier.right++;
      if(frontier.right+12>bounds.x+bounds.width)frontier.right=-1;
    } else if(event.startTick+(floor-event.floor)*EVENT_TIMING.verticalSpread===state.tick) {
      if(bounds.x+bounds.width>=event.x+12)frontier.right=event.x;
    }
  }
  delete state.emergencyWorkContinuation;return true;
}

function finishFire(state,hooks) {
  dialog(hooks,3013);
  if(deferEmergency(state,hooks,3013,'finish-fire')){state.emergency.stage='finished';return;}
  state.emergency=null;hooks.evacuate?.();
  if(state.tick<1500)hooks.setTick?.(1500);
}

export function stepEmergency(state,data,hooks={}) {
  const event=state.emergency;if(!event)return;
  if(event.kind==='bomb') {
    if(event.stage==='searching' && state.tick===event.deadline)resolveBomb(state,event,false,hooks);
    if(event.stage==='result' && state.tick===event.resultTick) {
      dialog(hooks,event.found?3023:3024,event.floor+1);
      if(deferEmergency(state,hooks,event.found?3023:3024,'finish-bomb')){event.stage='reported';return;}
      state.emergency=null;hooks.evacuate?.();hooks.setTick?.(1500);return;
    }
    if(event.stage==='searching'||event.stage==='result'&&event.found)for(const staff of event.staff)stepBombStaff(state,event,staff,hooks);
    if(state.tick%16===0&&event.staff.some(staff=>staff.state===0))hooks.sound?.(10014,2);
    return;
  }
  if(state.tick===2000){finishFire(state,hooks);return;}
  if(event.stage!=='burning')return;
  if(!event.rescueAsked&&state.tick===event.startTick+EVENT_TIMING.result){
    requestFireRescue(state,data,hooks);
    if(deferEmergency(state,hooks,3012,'fire-tick'))return;
  }
  continueFireTick(state,event,hooks);
}
function continueFireTick(state,event,hooks) {
  if(!Object.values(event.frontiers).some(burning)){finishFire(state,hooks);return;}
  if(!stepFireSpread(state,event,hooks))return;
  if(event.helicopter!==null && event.helicopter!==0) {
    if(state.tick%EVENT_TIMING.helicopter===0)event.helicopter--;
    if(event.helicopter===floorBounds(state,event.floor).x){event.helicopter=0;hooks.sound?.(10009,2);}
    if(event.helicopter)for(const frontier of Object.values(event.frontiers))for(const side of ['left','right']) {
      if(frontier[side]>event.helicopter)frontier[side]=-1;
    }
  }
  for(const staff of event.staff)stepFireStaff(state,event,staff);
  if(state.tick%16===0&&event.staff.some(staff=>staff.state===0))hooks.sound?.(10014,2);
}
export function resumeEmergencyWork(state,data,hooks={}) {
  const pending=state.emergencyWorkContinuation,event=state.emergency;if(!pending||!event||hooks.isPaused?.())return;
  if(pending.kind==='fire-spread')continueFireTick(state,event,hooks);
  else if(bombDamageCells(state,event,hooks))finishBombDamage(state,event,hooks);
}

// Saved data replaces the Win16 call stack suspended inside DialogBox.
export function acknowledgeEmergencyDialog(state,data,id,control,hooks={}) {
  const pending=state.emergencyContinuation,event=state.emergency;
  if(!pending||pending.id!==id)return answerEmergencyDialog(state,data,id,control,hooks);
  if(!event||![1,2].includes(control))return false;
  delete state.emergencyContinuation;
  if(pending.action==='fire-tick') {
    answerEmergencyDialog(state,data,id,control,hooks);
    if(state.emergencyContinuation)state.emergencyContinuation.resumeFireTick=true;
    else continueFireTick(state,event,hooks);
  } else if(pending.action==='start-fire') {
    event.stage='burning';event.frontiers={[event.floor]:{left:event.x,right:event.x}};hooks.activate?.(0);hooks.focus?.(event.floor,event.x);
  } else if(pending.action==='start-bomb') {
    event.stage='searching';staffPool(state,event,'bomb',event.secom);hooks.evacuate?.(1);hooks.activate?.(1);
  } else if(pending.action==='fire-staff') {
    staffPool(state,event,'fire',false);hooks.evacuate?.(8);
    if(pending.resumeFireTick)continueFireTick(state,event,hooks);
  } else if(pending.action==='finish-bomb'||pending.action==='finish-fire') {
    state.emergency=null;hooks.evacuate?.();
    if(pending.action==='finish-bomb'||state.tick<1500)hooks.setTick?.(1500);
  }
  return true;
}

// 0x1DC92 / 0x1DE85 / 0x1E989 use transparent original overlays. Fire
// type46 frame0..3 is3944..3947; frames4..7 are3948's four96px sections;
// frame8 is3949. Staff pose90+mode is1517 frame10+mode in the stitched
// native type8 people sheet (1512..1518).
export function emergencySprites(state,viewport=null) {
  const event=state.emergency;if(!emergencyActive(state)||state.elevatorPreview)return [];
  const sprites=[];
  if(event.kind==='fire') {
    const frame=state.tick%4;
    const sheet=event.spreadDelay?3948:3944+frame;
    const sx=event.spreadDelay?frame*96:0;
    for(const [floor,frontier] of Object.entries(event.frontiers)) {
      const bounds=floorBounds(state,Number(floor));if(!bounds)continue;
      for(const x of [frontier.left,frontier.right])if(x>=bounds.x&&x+12<=bounds.x+bounds.width) {
        sprites.push({sheet,sx,sy:0,x:x*8,y:-(Number(floor)+1)*36,width:96,height:36});
      }
    }
    if(event.helicopter>0)sprites.push({sheet:3949,sx:0,sy:0,x:event.helicopter*8,
      y:-(event.floor+1)*36,width:96,height:36});
  }
  for(const staff of event.staff)if(staff.state===0&&staff.travel===0) {
    const x=staff.x*8,top=-(staff.floor+1)*36;
    // 0x1EACF..1EAF4 draws only when actorX>=viewLeft and X+2<=
    // visible cell count, rather than clipping half a staff sprite.
    if(viewport&&(x<viewport.left||x+16>viewport.right||top<viewport.top||top>=viewport.bottom))continue;
    sprites.push({sheet:1517,sx:(10+staff.mode)*16,sy:0,x:staff.x*8,
      y:-(staff.floor+1)*36+12,width:16,height:24});
  }
  return sprites;
}

export function validateEvents(state) {
  const event=state.emergency;
  if(event===null||event===undefined){if(state.emergencyContinuation!==undefined||state.emergencyWorkContinuation!==undefined)throw new Error('Invalid emergency continuation.');return;}
  const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
  if(!event||typeof event!=='object'||!['fire','bomb'].includes(event.kind)||
      !integer(event.floor,-10,109)||!floorBounds(state,event.floor)||!integer(event.x,0,374)||
      !Array.isArray(event.staff)||event.staff.length>60||!event.searchRanges||
      typeof event.searchRanges!=='object'||Array.isArray(event.searchRanges))throw new Error('Invalid emergency data.');
  if(event.staff.some(staff=>!staff||!integer(staff.actor,0,Number.MAX_SAFE_INTEGER)||
      !(state.actors||[]).some(actor=>actor.id===staff.actor&&actor.room===staff.room&&
        state.rooms.some(room=>room.id===staff.room&&room.key==='security'))||
      !integer(staff.index,0,5)||!integer(staff.home,-10,109)||!integer(staff.floor,-10,109)||
      !integer(staff.state,0,1)||!integer(staff.x,-2,375)||!integer(staff.travel,0,720)||
      !integer(staff.delay,0,100)||![0,2,4].includes(staff.mode))||
      new Set(event.staff.map(staff=>staff.actor)).size!==event.staff.length||
      Object.entries(event.searchRanges).some(([room,range])=>!state.rooms.some(item=>item.id===Number(room)&&item.key==='security')||
        !range||!integer(range.low,-11,110)||!integer(range.high,-11,110)||range.low>range.high+1))throw new Error('Invalid emergency staff data.');
  if(event.kind==='bomb') {
    if(!['demand','briefing','searching','exploding','result','reported'].includes(event.stage)||event.deadline!==1200||
        !Number.isFinite(event.demand)||event.demand<0||typeof event.secom!=='boolean'||
        ['result','reported'].includes(event.stage)&&(typeof event.found!=='boolean'||!integer(event.resultTick,0,2601)))throw new Error('Invalid bomb event data.');
  } else {
    if(!['burning','announcement','finished'].includes(event.stage)||!integer(event.startTick,0,2599)||!integer(event.spreadDelay,0,80)||
        typeof event.rescueAsked!=='boolean'||event.helicopter!==null&&!integer(event.helicopter,0,375)||
        !event.frontiers||typeof event.frontiers!=='object'||Array.isArray(event.frontiers)||
        Object.entries(event.frontiers).some(([floor,frontier])=>!integer(Number(floor),-10,109)||
          !floorBounds(state,Number(floor))||!frontier||!integer(frontier.left,-1,375)||!integer(frontier.right,-1,375)))throw new Error('Invalid fire event data.');
  }
  const work=state.emergencyWorkContinuation;
  if(work!==undefined&&(!work||!state.facilityContinuation||!state.vipContinuation||
    !(event.kind==='fire'&&event.stage==='burning'&&work.kind==='fire-spread'&&integer(work.floor,-10,109)&&['left-after','right-after'].includes(work.side)||event.kind==='bomb'&&event.stage==='exploding'&&work.kind==='bomb-damage'&&integer(work.nextCell,1,240))))throw new Error('Invalid emergency work continuation.');
  if(event.stage==='exploding'&&!work)throw new Error('Invalid emergency work continuation.');
  const pending=state.emergencyContinuation;
  if(['announcement','briefing','finished','reported'].includes(event.stage)&&pending===undefined)throw new Error('Invalid emergency continuation.');
  if(pending!==undefined){
    const actions={3010:'start-fire',3011:'start-fire',3021:'start-bomb',3022:'start-bomb',3012:'fire-tick',3014:'fire-staff',3023:'finish-bomb',3024:'finish-bomb',3013:'finish-fire'};
    if(!pending||actions[pending.id]!==pending.action||!(state.dialogs||[]).some(d=>d.id===pending.id)||pending.resumeFireTick!==undefined&&typeof pending.resumeFireTick!=='boolean')throw new Error('Invalid emergency continuation.');
    const expected={'start-fire':'announcement','start-bomb':'briefing','finish-fire':'finished','finish-bomb':'reported','fire-tick':'burning','fire-staff':'burning'};
    if(event.stage!==expected[pending.action]||event.kind!==(pending.action.includes('bomb')?'bomb':'fire'))throw new Error('Invalid emergency continuation.');
  }
}

export function resetEmergencySecurity(state, mode = 0) {
  // 0x1EBFD resets only security pools. Ordinary actor-cohort decisions
  // pause during mask9; elevator movement and passenger handling continue.
  const secom = state.rooms.some(room => room.key === 'secom');
  for (const actor of state.actors || []) {
    const room = state.rooms.find(room => room.id === actor.room);
    if (room?.key !== 'security') continue;
    const bomb = (mode & 1) !== 0, fire = (mode & 8) !== 0;
    const active = fire || bomb && (!secom || actor.index === 0);
    Object.assign(actor, { state: active ? 0 : 1,
      floor: active ? room.floor - Number(bomb && !secom && actor.index >= 3) : -10,
      job: null, trip: null, delay: 0, trips: 0 });
  }
}

// 0x3BD44 is shared by the bulldozer and disaster path; silent arg4=0
// still refuses protected types. 0x3BF6D tears down the whole intersected
// facility, including both cinema/party levels, and 0x3C31A writes type47.
export function disasterDamageDecision(room) {
  // Tool17 becomes constructed facility45 (0x390FC).
  const type=room.key==='secom'?45:CATALOG[room.key]?.id;
  const protectedTypes=new Set([14,15,24,25,26,31,32,33,36,37,38,39,40,45]);
  const damaged=Number.isInteger(type)&&!room.constructionRemaining&&!protectedTypes.has(type);
  return {damaged,refundCondo:damaged&&room.key==='condo'&&Boolean(room.occupied||room.sold),
    wholeFacility:damaged,nativeType:damaged?47:type,sheet:damaged?4008:null};
}
