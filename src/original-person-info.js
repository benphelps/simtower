import { HOTELS } from './catalog.js';
import { nativeActorMean } from './original-actor-stats.js';

export function nativePersonDialogId(room) {
  // 0x1FA10 picks2FC(764) for security/housekeeping,2FB(763) otherwise.
  // The staff template omits the Eval and Stress controls altogether.
  return ['security', 'housekeeping'].includes(room.key) ? 764 : 763;
}

export function nativePersonKind(actor, room) {
  // 0x2356B. Portrait/gender follows native child role, independently of the
  // reconstructed walking appearance. Categories are eight-pixel columns.
  const index = actor.index;
  if (room.key === 'office') return index === 4 ? 2 : index === 5 ? 4 : index <= 1 ? 1 : 0;
  if (HOTELS.has(room.key)) return index === 2 ? 4 : 0;
  if (room.key === 'condo') return index === 2 ? 3 : 0;
  if (room.key === 'security') return 5;
  if (room.key === 'housekeeping') return 10;
  const child = index & 7;
  return child === 1 ? 2 : child === 3 ? 4 : child === 5 ? 6 : child === 7 ? 8 : 0;
}
export function nativePersonPortrait(actor, room, vip = false) {
  // 0x2335F / 0x23504 / 0x285AD: normal700, named702, VIP703. The native
  // loader skips bitmap701 and stacks the two colored versions below700.
  const kind = nativePersonKind(actor, room);
  return { sheet: vip ? 703 : actor.name ? 702 : 700, x: kind * 8, y: 0,
    width: kind >= 6 ? 16 : 8, height: 24 };
}
export function nativePersonRole(data, actor, room, tick) {
  // 0x21DEA uses one-based Pascal resource string indices. Housekeeping
  // changes its label to Janitor from phase4 onwards (0x3D48E).
  const kind = nativePersonKind(actor, room);
  return data.strings[700][kind + 2 + Number(kind === 10 && tick >= 1600)];
}
export function nativePersonMean(actor) {
  // 0x28B7B, used by the upper mean-stress graph in0x21B91.
  return nativeActorMean(actor);
}
export function nativeCurrentPersonStress(actor, person, state, context=person?.stage==='ride'?1:0) {
  //21A2D's byte5A5A0 is selection context:0queue/find,1car,2facility.
  // Unlike boarding36D11, this graph applies ground forgiveness to elapsed
  // wait BEFORE adding rawlow10. It does not impose a300 numeric cap.
  const raw=(person?.tripDelay??actor.currentStress??0)&1023;
  if(context===1)return raw;
  if(context!==0)return 0;
  const timestamp=person?.stage==='queue'?person.queueTick:actor.admissionTick;
  if(!timestamp)return 0;
  const signedWord=value=>((value&65535)^32768)-32768;
  let wait=signedWord(state.tick-timestamp);
  if((person?.floor??actor.floor)===0&&state.lobbyHeight>1){const allowance=state.lobbyHeight===2?25:50;wait=wait<=allowance?0:wait-allowance;}
  return signedWord(raw+wait);
}
export function nativeQueueDisplayStress(actor,person,state,room) {
  //1710F/173D9 normal directional ring drawing differs from inspector21A2D:
  // no zero-timestamp guard, no300cap; housekeeping native type15 forces0.
  if(room?.key==='housekeeping')return 0;
  const signedWord=value=>((value&65535)^32768)-32768;
  let elapsed=signedWord(state.tick-(person.queueTick??0));
  if(person.floor===0&&state.lobbyHeight>1){const allowance=state.lobbyHeight===2?25:50;elapsed=elapsed<=allowance?0:elapsed-allowance;}
  return signedWord(((person.tripDelay??actor.currentStress??0)&1023)+elapsed);
}
export function nativeAdmissionRetryStats(actor, tick, extraStress = undefined) {
  // 0x3E2EE records a completed same-floor transport attempt via0x36B20
  // before each capacity retry. It counts even when admission remains full.
  //36B20 commits rawlow10. An explicitly supplied36E17 penalty invokes
  // its300 cap. Historical sums/counts wrap native WORD/BYTE widths.
  const current=(actor.currentStress||0)&1023;
  const stress = extraStress===undefined?current:Math.min(300,current+extraStress);
  return { delay: ((actor.delay || 0) + stress) & 0xffff,
    trips: ((actor.trips || 0) + 1) & 0xff, currentStress: 0, admissionTick: tick };
}
export function nativeStressBand(data, stress, star) {
  // 0x21A2D / 0x21B91 graph colors:0good,1intermediate,2bad; limits300.
  const tier = star < 3 ? 0 : star === 3 ? 1 : 2;
  return stress < data.tenantStress.good[tier] ? 0 : stress < data.tenantStress.bad[tier] ? 1 : 2;
}
