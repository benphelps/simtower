import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
import {newNativeApplicationTower} from '../src/original-app-random.js';
import {OriginalCloudField} from '../src/original-scene.js';
import {nativeInitialCamera} from '../src/original-window-controls.js';
import {createManualFixture} from '../src/manual-fixtures.js';

const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));
const initialDraws = [346,130,10982,1090,11656,7117,17595,6415,22948,31126,9004,14558];
function initialViewport() {
  const width = 791, height = 515, camera = nativeInitialCamera(width, height);
  return {left:camera.x-width/2, right:camera.x+width/2, top:camera.y-height/2, bottom:camera.y+height/2};
}

test('application initialization has CRT seed1 until the first native world refresh', () => {
  const application = newNativeApplicationTower(data);
  assert.equal(application.state.seed, 1);
  assert.equal(application.state.rooms.length, 0);
  const firstWorld = newNativeApplicationTower(data, application);
  assert.equal(firstWorld.state.seed, 1, 'New initialization has no hidden random draws');
  const clouds = new OriginalCloudField(), draws = [];
  clouds.update(initialViewport(), max => {
    const value = firstWorld.random() * 32768;
    draws.push(value);
    return value % max;
  });
  assert.deepEqual(draws, initialDraws);
  assert.equal(clouds.slots.filter(Boolean).length, 4);
  assert.equal(firstWorld.state.seed, 0xb8deb185);
  assert.equal(application.state.seed, 1);
});

test('New preserves the full application stream and retained cloud slots', () => {
  const original = newNativeApplicationTower(data), clouds = new OriginalCloudField();
  clouds.update(initialViewport(), max => original.randomInt(max));
  const seed = original.state.seed, retained = structuredClone(clouds.slots);
  original.state.cash = 123;
  original.state.nativeShaftSlotTypes[3] = 2;
  original.state.nativeShaftSlotTypes[8] = 1;
  const next = newNativeApplicationTower(data, original);
  assert.equal(next.state.seed, seed);
  assert.equal(next.state.cash, 2000000);
  assert.equal(next.state.shafts.length, 0);
  assert.deepEqual(next.state.nativeShaftSlotTypes, original.state.nativeShaftSlotTypes);
  assert.notEqual(next.state.nativeShaftSlotTypes, original.state.nativeShaftSlotTypes);
  clouds.update(initialViewport(), () => assert.fail('New does not recreate visible cloud slots'), {dirty:true});
  assert.deepEqual(clouds.slots, retained);
  assert.equal(next.state.seed, seed);
  assert.equal(next.random() * 32768, 3571);
  assert.equal(original.state.seed, seed, 'retiring the old world must not mutate it');
});

test('browser JSON Open restores its saved stream, which the following New inherits', () => {
  const saved = newNativeApplicationTower(data);
  for (let i = 0; i < 12; i++) saved.random();
  const opened = new Tower(data);
  opened.load(saved.save());
  assert.equal(opened.state.seed, 0xb8deb185);
  const next = newNativeApplicationTower(data, opened);
  assert.equal(next.state.seed, opened.state.seed);
  assert.equal(next.random(), opened.random());
});

test('explicit standalone and documentation seeds remain independent of the application', () => {
  const standalone = new Tower(data, {seed:1994});
  assert.equal(standalone.state.seed, 1994);
  assert.equal(new Tower(data).state.seed, 1994);
  assert.equal(createManualFixture(data, 'blank').state.seed, 1994);
  assert.equal(newNativeApplicationTower(data).state.seed, 1);
});
