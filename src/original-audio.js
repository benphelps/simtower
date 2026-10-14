import { CATALOG, HOTELS } from './catalog.js';
import { clockTime } from './original-clock.js';
import {nativeTenantRoomState} from './original-tenancy.js';
import {nativeHotelState} from './original-hotels.js';

export const AUDIO_STARVATION_MS=600*16; // 0x35BB7: 600 GetTickCount>>4 units.
export const soundCategory=priority=>priority===0?0:priority===1?1:2;
export const dialogSound=id=>[3010,3011].includes(id)?10006:id===3020?10003:id===3040?10001:10000;

export function originalSoundRequest(id,category=0,options={}) {
  const timed={5000:[3,4],5001:[3,1],5002:[3,0],5003:[3,4],5004:[3,0],5005:[3,2],
    10008:[4,5],10009:[5,10],10014:[4,0],10015:[4,0]};
  const [priority,repeats]=timed[id]||[category===2?4:category,0];
  const resolvedPriority=options.priority??priority;
  return {id,category:soundCategory(resolvedPriority),priority:resolvedPriority,repeats,...options};
}
export const dialogSoundRequest=id=>originalSoundRequest(dialogSound(id),2,{stopAll:true});

// 0x35FF1 / 0x35BB7: two WAVMIX16 channels, first free otherwise first
// strictly lower priority. Priority5 always takes channel1. Starvation
// for600 native wall-clock units forces both channels to stop.
export function chooseAudioChannel(channels,priority) {
  if(priority===5)return 1;
  const free=channels.findIndex(channel=>channel===null);if(free>=0)return free;
  return channels.findIndex(channel=>channel.priority<priority);
}

export class OriginalAudioMixer {
  constructor(createAudio,{enabled=[true,true,true],now=()=>performance.now()}={}) {
    this.createAudio=createAudio;this.enabled=[...enabled];this.now=now;
    this.channels=[null,null];this.lastStart=0;
  }
  stopChannel(index) {
    const channel=this.channels[index];if(!channel)return;
    this.channels[index]=null;channel.audio.onended=null;channel.audio.pause();channel.audio.currentTime=0;
  }
  stopAll(){this.stopChannel(0);this.stopChannel(1);}
  setEnabled(category,enabled) {
    if(this.enabled[category]&&!enabled)this.stopAll();
    this.enabled[category]=Boolean(enabled);
  }
  play(request,{force=false,onBlocked=null}={}) {
    const priority=request.priority??request.category??0,category=request.category??soundCategory(priority);
    if(!force&&!this.enabled[category])return false;
    if(request.stopAll)this.stopAll();
    let index=chooseAudioChannel(this.channels,priority),now=Math.trunc(this.now()/16)*16;
    if(index<0) {
      if(now-this.lastStart<AUDIO_STARVATION_MS)return false;
      this.stopAll();index=chooseAudioChannel(this.channels,priority);
    }
    this.stopChannel(index);
    const audio=this.createAudio(request.id);
    const channel={audio,id:request.id,priority,category,remaining:Math.max(1,request.repeats||0)};
    this.channels[index]=channel;this.lastStart=now;
    audio.onended=()=>{
      if(this.channels[index]!==channel)return;
      if(--channel.remaining>0){audio.currentTime=0;Promise.resolve(audio.play()).catch(()=>{if(this.channels[index]===channel)this.stopChannel(index);});}
      else this.stopChannel(index);
    };
    Promise.resolve(audio.play()).catch(error=>{if(this.channels[index]===channel)this.stopChannel(index);onBlocked?.(error);});
    return true;
  }
}

export function validateSoundRequest(request) {
  if(!request||!Number.isInteger(request.id)||![0,1,2].includes(request.category)||
      request.priority!==undefined&&(!Number.isInteger(request.priority)||request.priority<0||request.priority>5)||
      request.repeats!==undefined&&(!Number.isInteger(request.repeats)||request.repeats<0||request.repeats>100)||
      request.stopAll!==undefined&&typeof request.stopAll!=='boolean')throw new Error('Invalid original sound request.');
}

// 0x36110 returns a native facility type only when it has actual activity;
// theatre returns a particular film sound instead. Its conditions use the
// native room counters, including sleeping16 and office final-worker lights.
export function facilitySoundToken(state,room) {
  if(!room||room.constructionRemaining)return -2;
  if(['fastfood','restaurant','shop'].includes(room.key)) {
    return room.commercial&&![-1,3].includes(room.commercial.state)&&room.commercial.inside>0?CATALOG[room.key].id:-2;
  }
  if(['office','condo',...HOTELS].includes(room.key)) {
    const mode=HOTELS.has(room.key)?nativeHotelState(room,state.tick):nativeTenantRoomState(room,state.tick);
    return mode<(room.key==='office'?8:16)&&(mode&7)!==0?CATALOG[room.key].id:-2;
  }
  if(room.key==='parking')return room.parkingActor?11:-2;
  if(room.key==='partyhall')return room.show?.stage>=2?29:-2;
  if(room.key==='cinema')return room.show?.stage===3?9001+room.movie.index:-2;
  return -2;
}

// 0x35E7C. The same native samples are shared by hotel/condo and shop/food.
export function facilitySample(token,randomInt) {
  if(token===6)return 1384+randomInt(2);
  if(token===7)return 1448;
  if(token===9)return randomInt(10)===0?1576:1577;
  if([3,4,5].includes(token))return 1577;
  if([10,12].includes(token))return randomInt(2)===0?1385:1640;
  if([29,30].includes(token))return 2856;
  if(token===11)return 1704+randomInt(2);
  return token>=0?token:null;
}

export function inspectionSound(state,room,randomInt) {
  const id=facilitySample(facilitySoundToken(state,room),randomInt);
  return id===null?null:originalSoundRequest(id,1);
}

// 0x36042 chooses one of six locations in the current edit viewport,
// not a uniform random room anywhere in the entire tower.
export function ambientSamplePoint(viewport,index) {
  const width=Math.trunc(viewport.width),height=Math.trunc(viewport.height)-1;
  const quarter=Math.trunc(width/4),xs=[quarter,Math.trunc(width/2),width-quarter];
  const ys=[Math.trunc(height/2),height-Math.trunc(height/4)];
  return {x:viewport.x+xs[index%3],floor:viewport.topFloor-ys[Math.trunc(index/3)]};
}

export function ambientSound(state,viewport,randomInt) {
  if(state.tick<=240||clockTime(state.tick).phase>=6||state.emergency||randomInt(16)!==0)return null;
  const point=ambientSamplePoint(viewport,randomInt(6));
  const room=state.rooms.find(room=>room.floor>=point.floor&&room.floor-(room.height||1)<point.floor&&
    room.x<=point.x&&room.x+room.width>point.x);
  if(room)return inspectionSound(state,room,randomInt);
  if(point.floor<0)return null;
  if(state.santa)return originalSoundRequest(10002,1);
  const quarter=Math.trunc(state.calendarDay/3)%4;
  const sample=quarter===2&&clockTime(state.tick).daylight?10012:quarter===3&&!clockTime(state.tick).daylight?10011:null;
  return sample===null?null:originalSoundRequest(sample,1);
}
