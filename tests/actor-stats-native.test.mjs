import test from 'node:test';
import assert from 'node:assert/strict';
import { signedByte, signedWord, nativeActorMean, nativeRoomMean, normalizeActorHistory, validateActorHistory } from '../src/original-actor-stats.js';
import { recordJourneyStress } from '../src/original-journeys.js';
import { nativeAdmissionRetryStats } from '../src/original-person-info.js';
test('native mean divisions sign-extend the packed byte count and word history', () => {
  assert.equal(signedByte(127),127); assert.equal(signedByte(128),-128); assert.equal(signedByte(255),-1);
  assert.equal(signedWord(32767),32767); assert.equal(signedWord(32768),-32768); assert.equal(signedWord(65535),-1);
  assert.equal(nativeActorMean({delay:1280,trips:128}),-10);
  assert.equal(nativeActorMean({delay:40000,trips:10}),-2553);
  assert.equal(nativeActorMean({delay:40000,trips:200}),456);
  assert.equal(nativeActorMean({delay:999,trips:0}),0);
  assert.equal(nativeActorMean({delay:1,trips:255}),-1);
});
test('recorded journeys and admission retries preserve native width before signed means', () => {
  const first=recordJourneyStress({delay:1270,trips:127},10);
  assert.deepEqual(first,{delay:1280,trips:128}); assert.equal(nativeActorMean(first),-10);
  const retry=nativeAdmissionRetryStats({delay:1280,trips:255},840);
  assert.equal(retry.trips,0); assert.equal(nativeActorMean(retry),0);
  assert.deepEqual(recordJourneyStress({delay:65530,trips:255},10),{delay:4,trips:0});
  //36B20 commits the low10bits; boarding clock underflow can exceed300.
  assert.deepEqual(recordJourneyStress({delay:0,trips:0},502),{delay:502,trips:1});
  assert.deepEqual(normalizeActorHistory({delay:65540,trips:257}),{delay:4,trips:1});
});
test('native room averages give equal weight to each resident signed mean', () => {
  assert.equal(nativeRoomMean([{delay:1280,trips:128},{delay:100,trips:1}]),45);
  assert.equal(nativeRoomMean([{delay:11,trips:2},{delay:9,trips:2}]),4);
  assert.equal(nativeRoomMean([]),0);
  assert.equal(validateActorHistory({delay:65535,trips:255}),true);
  assert.throws(()=>validateActorHistory({delay:65536,trips:1}));
  assert.throws(()=>validateActorHistory({delay:1,trips:256}));
});
