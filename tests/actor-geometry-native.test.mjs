import test from 'node:test';
import assert from 'node:assert/strict';
import { actorRouteOrigin, nativeTransportPosition, actorInteriorPosition } from '../src/original-actor-geometry.js';
test('native transport scoring uses home room left edge rather than center or visual interior activity', () => {
  const room={x:10,width:16};
  assert.equal(actorRouteOrigin(room),10);
  assert.equal(actorInteriorPosition(room,{cell:12}),22);
  assert.equal(actorRouteOrigin(room),10);
});
test('native transport positions enter queues and stair floors without an intermediate timed horizontal walk', () => {
  const room={x:10,width:16};
  assert.deepEqual(nativeTransportPosition(room,{kind:'elevator',x:80,accessX:78,to:5},1),{stage:'queue',floor:1,x:78});
  assert.deepEqual(nativeTransportPosition(room,{kind:'stairs',x:80,to:2},1),{stage:'link',floor:2,x:80});
  assert.deepEqual(nativeTransportPosition(room,null,2),{stage:'done',floor:2,x:10});
});
