import { updateNativeElevators } from './original-elevators.js';
import { elevatorProgram } from './original-systems.js';
import { calendar } from './original-clock.js';
import {retainPreviewTransportComponents} from './original-transport-components.js';

// 0x1E299 passes pattern3 to0x30B10.0x38C0A places bitmap1000 at
// scratch row17, so this is its fourth original eight-pixel column.
export const ELEVATOR_PREVIEW_TILE={sheet:1000,sx:24,sy:0,width:8,height:36};

const signedWord=value=>((value&65535)^32768)-32768;
export function nativePreviewQueueStress(person,actor,state) {
  //3F412 replaces the popped ring DWORD with signed(rawlow10 + elapsed),
  // forgiving ELAPSED at a tall ground lobby. It never applies36D11's cap
  // or changes the actor record during Simulate. Timestamp zero is valid.
  let elapsed=signedWord(state.tick-(person.queueTick??0));
  const height=state.floors[2]?.lobby?3:state.floors[1]?.lobby?2:state.lobbyHeight||1;
  if(person.floor===0&&height>1){const allowance=height===2?25:50;elapsed=elapsed<=allowance?0:elapsed-allowance;}
  return signedWord(((person.tripDelay??actor?.currentStress??0)&1023)+elapsed);
}

// 0x1E0A0/0x1E3B8: snapshot only the selected shaft and deactivate other
// shafts. Warm up movement/alighting/boarding for twice the rating's bad-
// stress threshold, without advancing the actor dispatcher or accounting.
// The native clock increments unwrapped during this pass, but its phase and
// weekday bytes are frozen. The game pauses after the pass, with original
// car positions and queues restored and predicted queue stress retained.
export function createElevatorPreview(data,state,shaftId) {
  const originalShaft=state.shafts.find(sh=>sh.id===shaftId);
  if(!originalShaft)return null;
  const tier=state.star<3?0:state.star===3?1:2,horizon=data.tenantStress.bad[tier]*2;
  const weekend=calendar(state.calendarDay).weekend;
  const forecast=structuredClone(state),shaft=forecast.shafts.find(sh=>sh.id===shaftId);
  retainPreviewTransportComponents(forecast);
  const carIds=new Set(shaft.cars.flatMap(car=>car.people));
  forecast.shafts=[shaft];
  forecast.people=forecast.people.filter(p=>carIds.has(p.id)||p.stage==='queue'&&p.path[0]?.id===shaftId);
  const originals=new Map(forecast.people.map(p=>[p.id,structuredClone(p)]));
  const program=structuredClone(elevatorProgram(shaft,state.tick,weekend));
  const phases=Math.trunc((state.tick+horizon)/400)+1;
  shaft.programs=Array.from({length:2},()=>Array.from({length:phases},()=>({...program})));
  const stressByPerson={};
  //1E3B8 restores ring headers, but not entry DWORDs. Entries never popped
  // still contain their original global actor index;1710F/173D9 interpret
  // its signed low WORD as the forecast stress, even if that looks odd.
  for(const person of forecast.people)if(person.stage==='queue') {
    const actor=forecast.actors.find(a=>a.id===person.actor);
    stressByPerson[person.id]=signedWord(actor?.slot??actor?.id??person.actor??0);
  }
  const adapter={data,state:forecast,calendar:{weekend},nativeSound:()=>{},
    previewQueuePopped:person=>{stressByPerson[person.id]=nativePreviewQueueStress(person,forecast.actors.find(a=>a.id===person.actor),forecast);}};
  for(let i=0;i<horizon;i++){forecast.tick++;updateNativeElevators(adapter);}
  const displayState=structuredClone(state);
  displayState.shafts=displayState.shafts.filter(sh=>sh.id===shaftId);
  displayState.people=displayState.people.filter(p=>originals.has(p.id));
  displayState.links=[];
  for(const person of displayState.people)if(stressByPerson[person.id]!==undefined) {
    person.tripDelay=stressByPerson[person.id];person.queueTick=state.tick;
  }
  displayState.elevatorPreview={shaftId,horizon,stressByPerson};
  return {shaftId,originalShaft:structuredClone(originalShaft),displayState,horizon,stressByPerson};
}

// 0x1E7B9 copies all four schedule arrays and Show into the snapshot before
// restoring it. Programs changed while examining the preview are retained;
// car positions, loads, calls, stop configuration and waiting floors restore.
export function restoreElevatorPreview(state,preview,editedShaft=preview.displayState.shafts[0]) {
  const index=state.shafts.findIndex(sh=>sh.id===preview.shaftId);
  if(index<0)return null;
  const restored=structuredClone(preview.originalShaft);
  restored.programs=structuredClone(editedShaft.programs);restored.visible=editedShaft.visible;
  state.shafts[index]=restored;
  return restored;
}
