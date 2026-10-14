import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { personFrame, nativeQueuePosition } from '../src/people-sprites.js';
import { CATALOG } from '../src/catalog.js';
import { Renderer } from '../src/renderer.js';
const manifest = JSON.parse(readFileSync(new URL('../public/assets/manifest.json', import.meta.url)));
const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url)));

test('walking distance never cycles between opposite facings or changes a resident identity', () => {
  const sheet = manifest.resources.find(r => r.id === 1515 && r.type === 2);
  assert.equal(sheet.width, 160);
  for (let appearance = 0; appearance < 15; appearance++) {
    const frames = new Set();
    for (let distance = 0; distance < 80; distance++) {
      const frame = personFrame({ appearance, walkDistance: distance, stage: 'walk', direction: 1 });
      assert.equal(frame.width, 16); assert.equal(frame.height, 24);
      assert.ok(frame.x + frame.width <= sheet.width); frames.add(frame.x);
    }
    assert.deepEqual([...frames], [(appearance % 5) * 32]);
  }
});
test('direction selects the original facing pose without mirroring it a second time', () => {
  for (let appearance = 0; appearance < 5; appearance++) {
    const right = personFrame({ appearance, direction: 1, stage: 'walk', walkDistance: 4 });
    const left = personFrame({ appearance, direction: -1, stage: 'walk', walkDistance: 4 });
    assert.equal(right.x, appearance * 32); assert.equal(left.x, appearance * 32 + 16);
    assert.equal(right.flip, false); assert.equal(left.flip, false);
    assert.equal(right.sheet, left.sheet);
  }
});
test('waiting and moving pedestrians preserve facing through repeated animation updates', () => {
  const waiting = { appearance: 4, walkDistance: 0, stage: 'queue', direction: -1 };
  assert.deepEqual(personFrame(waiting), personFrame({ ...waiting, walkDistance: 100 }));
  assert.equal(personFrame(waiting).x, 144); assert.equal(personFrame(waiting).flip, false);
  assert.deepEqual(personFrame({ ...waiting, stage: 'walk', walkDistance: 0 }), personFrame({ ...waiting, stage: 'walk', walkDistance: 4 }));
  assert.deepEqual(personFrame(waiting), personFrame({ ...waiting, stage: 'walk', walkDistance: 12 }));
});
test('native queue portraits choose role-specific directional poses and original one/two-cell widths', () => {
  const up = { stage: 'queue', floor: 1, path: [{ to: 3 }] }, down = { ...up, path: [{ to: 0 }] };
  const salesman = { index: 0, appearance: 4 }, office = { key: 'office' };
  assert.deepEqual(personFrame(up, salesman, office), { sheet: 1512, x: 152, y: 0, width: 8, height: 24, flip: false });
  assert.deepEqual(personFrame(down, salesman, office), { sheet: 1512, x: 80, y: 0, width: 8, height: 24, flip: false });
  const mom = { index: 5 }, shop = { key: 'shop' };
  assert.equal(personFrame(up, mom, shop).sheet, 1513); assert.equal(personFrame(up, mom, shop).x, 64);
  assert.equal(personFrame(up, mom, shop).width, 16);
  const janitor = personFrame(up, { index: 0 }, { key: 'housekeeping' });
  assert.equal(janitor.x, 464); assert.equal(janitor.width, 16);
});
test('native up and down queues occupy opposite sides and pack exact portrait widths', () => {
  const sh = { x: 40, width: 4 }, up = { floor: 1, path: [{ to: 3 }] }, down = { floor: 1, path: [{ to: 0 }] };
  const narrow = { width: 8 }, wide = { width: 16 };
  assert.equal(nativeQueuePosition(sh, up, [], narrow), 37);
  assert.equal(nativeQueuePosition(sh, up, [narrow], wide), 35);
  assert.equal(nativeQueuePosition(sh, down, [], narrow), 46);
  assert.equal(nativeQueuePosition(sh, down, [narrow], wide), 47);
});
test('native queue ink uses original palette pink/red stress, named blue and VIP priority', () => {
  const p = { stage: 'queue', floor: 1, path: [{ to: 3 }], queueTick: 10, tripDelay: 0 };
  const a = { id: 1, index: 0 }, room = { key: 'office' }, state = { tick: 100, star: 1, lobbyHeight: 1 };
  assert.deepEqual(personFrame(p, a, room, state, data).ink, { palette: 22, rgb: [255,127,127] });
  assert.equal(personFrame(p, a, room, { ...state, tick: 200 }, data).ink.palette, 26);
  assert.equal(personFrame(p, { ...a, name: 'Named' }, room, state, data).ink.palette, 45);
  assert.equal(personFrame(p, { ...a, name: 'Named' }, room, { ...state, vip: { actor: 1 } }, data).ink.palette, 125);
  assert.equal(personFrame(p, a, room, { ...state, tick: 11 }, data).ink, undefined);
});
test('native queue coloring uses zero timestamps and signed clock difference separately from inspector selection',()=>{
  const actor={id:1,index:0},room={key:'office'},person={id:10,stage:'queue',floor:1,path:[{to:3}],queueTick:0,tripDelay:0};
  const state={tick:200,star:1,lobbyHeight:1};
  assert.equal(personFrame(person,actor,room,state,data).ink.palette,26);
  assert.equal(personFrame({...person,queueTick:2700,tripDelay:502},actor,room,{...state,tick:10},data).ink,undefined);
  assert.equal(personFrame(person,actor,{key:'housekeeping'},state,data).ink,undefined);
  assert.equal(personFrame(person,actor,room,{...state,elevatorPreview:{stressByPerson:{10:0}}},data).ink,undefined);
});
test('ramp uses original type 44 artwork rather than a fire-damage sheet', () => {
  assert.equal(CATALOG.ramp.sprite, 1000 + 44 * 64);
  assert.equal(CATALOG.ramp.width, 16);
  for (const id of [3816,3817,3818]) assert.equal(manifest.resources.find(r=>r.type===2 && r.id===id).width, 128);
});
test('facility unlocks match decoded original toolbar menus', () => {
  for (const item of Object.values(CATALOG)) if (data.unlockRating[item.id]) assert.equal(item.star, data.unlockRating[item.id], item.key);
});
test('all lobby variants and construction graphics are decoded from original CGPk resources', () => {
  for (const id of [2536,2537,2538,2600]) {
    const resource = manifest.resources.find(r=>r.type===32514 && r.id===id);
    assert.equal(resource.format, 'CGPk'); assert.equal(resource.height, 36);
    assert.ok(resource.path.startsWith('public/assets/graphics/'));
  }
});

test('2x textures select the same last walker frame at the same world size and switch back losslessly', () => {
  const original = { width: 160, height: 24 }, enhanced = { width: 320, height: 48 }, draws = [];
  const renderer = { assets: new Map([[1515, original]]), textureAssets: new Map([[1515, enhanced]]), ctx: { drawImage: (...args) => draws.push(args) } };
  const frame = personFrame({ appearance: 4, stage: 'walk', walkDistance: 4, direction: -1 });
  Renderer.prototype.sprite.call(renderer, 1515, 9.4, -24, 16, 24, frame.x, frame.y, 16, 24);
  assert.deepEqual(draws[0], [enhanced, 288, 0, 32, 48, 9, -24, 16, 24]);
  renderer.textureAssets = null;
  Renderer.prototype.sprite.call(renderer, 1515, 9.4, -24, 16, 24, frame.x, frame.y, 16, 24);
  assert.deepEqual(draws[1], [original, 144, 0, 16, 24, 9, -24, 16, 24]);
  assert.equal(renderer.assets.get(1515), original);
});

test('enhanced sheet clipping uses original bounds and palette-cycled sky keeps its current colors', () => {
  const original = { width: 48, height: 36 }, enhanced = { width: 96, height: 72 }, draws = [];
  const renderer = { assets: new Map([[1069, original], [900, original]]), textureAssets: new Map([[1069, enhanced], [900, enhanced]]), ctx: { drawImage: (...args) => draws.push(args) } };
  Renderer.prototype.sprite.call(renderer, 1069, 0, 0, 32, 36, 24, 0, 32, 36);
  assert.deepEqual(draws[0], [enhanced, 48, 0, 48, 72, 0, 0, 32, 36]);
  Renderer.prototype.sprite.call(renderer, 900, 0, 0, 48, 36);
  assert.equal(draws[1][0], original);
  // An absent enhanced resource still draws the original correctly.
  renderer.textureAssets = new Map();
  Renderer.prototype.sprite.call(renderer, 1069, 0, 0, 24, 36, 24, 0, 24, 36);
  assert.deepEqual(draws[2], [original, 24, 0, 24, 36, 0, 0, 24, 36]);
});
