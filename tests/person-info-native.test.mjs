import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nativePersonKind, nativePersonPortrait, nativePersonRole, nativePersonMean, nativeCurrentPersonStress, nativeQueueDisplayStress,nativeStressBand, nativePersonDialogId, nativeAdmissionRetryStats } from '../src/original-person-info.js';
test('same-floor retry commits raw low ten stress bits while an explicit missing penalty uses native capped addition',()=>{
  assert.equal(nativeAdmissionRetryStats({delay:0,trips:0,currentStress:502},16).delay,502);
  assert.equal(nativeAdmissionRetryStats({delay:0,trips:0,currentStress:502},16,0).delay,300);
});
test('current inspector graph follows selection context and signed clock wrap without clipping its numeric value',()=>{
  const actor={currentStress:502,admissionTick:2700,floor:1};
  assert.equal(nativeCurrentPersonStress(actor,null,{tick:2800,lobbyHeight:1},0),602);
  assert.equal(nativeCurrentPersonStress(actor,null,{tick:10,lobbyHeight:1},0),-2188);
  assert.equal(nativeCurrentPersonStress(actor,null,{tick:10,lobbyHeight:1},1),502);
  assert.equal(nativeCurrentPersonStress(actor,null,{tick:2800,lobbyHeight:1},2),0);
  assert.equal(nativeCurrentPersonStress({...actor,floor:0},null,{tick:10,lobbyHeight:2},0),502);
  assert.equal(nativeCurrentPersonStress(actor,{stage:'ride',tripDelay:502,floor:1},{tick:2800,lobbyHeight:1}),502);
});
test('normal queue stress includes timestamp zero and rawlow10, with only housekeeping excluded',()=>{
  const actor={currentStress:502},person={floor:1,queueTick:0},state={tick:100,lobbyHeight:1};
  assert.equal(nativeQueueDisplayStress(actor,person,state,{key:'office'}),602);
  assert.equal(nativeQueueDisplayStress(actor,{...person,floor:0},{...state,lobbyHeight:2},{key:'office'}),577);
  assert.equal(nativeQueueDisplayStress(actor,person,state,{key:'housekeeping'}),0);
});
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
test('native inspector portraits follow child roles rather than changing random walking identities', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => nativePersonKind({ index }, { key: 'office' })), [1, 1, 0, 0, 2, 4]);
  assert.deepEqual(Array.from({ length: 3 }, (_, index) => nativePersonKind({ index }, { key: 'condo' })), [0, 0, 3]);
  assert.equal(nativePersonKind({ index: 2 }, { key: 'twin' }), 4);
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => nativePersonKind({ index }, { key: 'shop' })), [0, 2, 0, 4, 0, 6, 0, 8]);
});
test('original normal, named-blue and VIP-red silhouettes use native variable portrait widths', () => {
  assert.deepEqual(nativePersonPortrait({ index: 0 }, { key: 'office' }), { sheet: 700, x: 8, y: 0, width: 8, height: 24 });
  assert.equal(nativePersonPortrait({ index: 0, name: 'Alice' }, { key: 'office' }).sheet, 702);
  assert.equal(nativePersonPortrait({ index: 0, name: 'VIP' }, { key: 'suite' }, true).sheet, 703);
  assert.deepEqual(nativePersonPortrait({ index: 0 }, { key: 'housekeeping' }), { sheet: 700, x: 80, y: 0, width: 16, height: 24 });
});
test('native occupation labels use original Pascal strings including housekeeping night duty', () => {
  assert.equal(nativePersonRole(data, { index: 0 }, { key: 'office' }, 400), 'Salesman');
  assert.equal(nativePersonRole(data, { index: 2 }, { key: 'condo' }, 400), 'Child');
  assert.equal(nativePersonRole(data, { index: 0 }, { key: 'security' }, 400), 'Security');
  assert.equal(nativePersonRole(data, { index: 0 }, { key: 'housekeeping' }, 1599), 'Housekeeper');
  assert.equal(nativePersonRole(data, { index: 0 }, { key: 'housekeeping' }, 1600), 'Janitor');
});
test('person inspector distinguishes historical mean from current queue stress and lobby wait allowance', () => {
  assert.equal(nativePersonMean({ delay: 111, trips: 2 }), 55);
  const actor = { delay: 111, trips: 2 }, person = { stage: 'queue', queueTick: 200, tripDelay: 20, floor: 0 };
  assert.equal(nativeCurrentPersonStress(actor, person, { tick: 230, lobbyHeight: 1 }), 50);
  assert.equal(nativeCurrentPersonStress(actor, person, { tick: 230, lobbyHeight: 2 }), 25);
  assert.equal(nativeCurrentPersonStress(actor, person, { tick: 230, lobbyHeight: 3 }), 20);
  assert.equal(nativeCurrentPersonStress(actor, { ...person, floor: 1 }, { tick: 230, lobbyHeight: 3 }), 50);
  assert.equal(nativeStressBand(data, 80, 1), 1); assert.equal(nativeStressBand(data, 150, 1), 2);
});
test('security and housekeeping use the shorter original person inspector without tenant stress bars', () => {
  assert.equal(nativePersonDialogId({ key: 'security' }), 764);
  assert.equal(nativePersonDialogId({ key: 'housekeeping' }), 764);
  assert.equal(nativePersonDialogId({ key: 'office' }), 763);
});
test('full venue retries record same-floor attempts and restart the latest admission stress clock', () => {
  const actor = { delay: 120, trips: 2, state: 65, floor: 1, admissionTick: 800 };
  assert.equal(nativeCurrentPersonStress(actor, null, { tick: 812, lobbyHeight: 1 }), 12);
  const retry = { ...actor, ...nativeAdmissionRetryStats(actor, 816) };
  assert.equal(retry.delay, 120); assert.equal(retry.trips, 3); assert.equal(nativePersonMean(retry), 40);
  assert.equal(nativeCurrentPersonStress(retry, null, { tick: 818, lobbyHeight: 1 }), 2);
  assert.equal(nativeCurrentPersonStress({ ...actor, admissionTick: 0 }, null, { tick: 818, lobbyHeight: 1 }), 0);
  assert.deepEqual(nativeAdmissionRetryStats({ delay: 65530, trips: 255, currentStress: 290 }, 840, 100),
    { delay: 294, trips: 0, currentStress: 0, admissionTick: 840 });
});
