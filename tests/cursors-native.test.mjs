import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {nativeGameCursor} from '../src/original-cursors.js';
const cursorIds=[1002,1003,1004,1005],metadata=JSON.parse(readFileSync(new URL('../public/assets/cursors/manifest.json',import.meta.url)));
const originalInputs=cursorIds.flatMap(id=>[`12-${id}.bin`,`1-${metadata[id].resource}.bin`]);
const missingOriginalInputs=originalInputs.filter(name=>!existsSync(new URL(`../research/resources/${name}`,import.meta.url)));
test('published cursor files retain native dimensions, hotspots and complete DIB/PNG payloads',()=>{
 for(const id of cursorIds){
  const entry=metadata[id],cursor=readFileSync(new URL(`../public/assets/cursors/${id}.cur`,import.meta.url)),png=readFileSync(new URL(`../public/assets/cursors/${id}.png`,import.meta.url));
  assert.equal(cursor.readUInt16LE(0),0);assert.equal(cursor.readUInt16LE(2),2);assert.equal(cursor.readUInt16LE(4),1);
  assert.equal(cursor[6]||256,entry.width);assert.equal(cursor[7]||256,entry.height);
  assert.deepEqual([cursor.readUInt16LE(10),cursor.readUInt16LE(12)],entry.hotspot);
  assert.equal(cursor.readUInt32LE(18),22);assert.equal(cursor.readUInt32LE(14),cursor.length-22);
  assert.equal(cursor.readUInt32LE(22),40);assert.equal(cursor.readInt32LE(26),entry.width);assert.equal(cursor.readInt32LE(30),entry.height*2);
  assert.deepEqual(png.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
  assert.equal(png.readUInt32BE(16),entry.width);assert.equal(png.readUInt32BE(20),entry.height);
 }
});
test('browser cursors retain original DIB bytes and native hotspot from each cursor group',{
 skip:missingOriginalInputs.length?'Original resource dumps are optional; npm run extract restores research/resources from a local SimTowerDOS/SIMTOWER.EXE.':false,
},()=>{
 for(const id of cursorIds){
  const group=readFileSync(new URL(`../research/resources/12-${id}.bin`,import.meta.url)),rid=group.readUInt16LE(18),source=readFileSync(new URL(`../research/resources/1-${rid}.bin`,import.meta.url)),cursor=readFileSync(new URL(`../public/assets/cursors/${id}.cur`,import.meta.url));
  assert.equal(cursor.readUInt16LE(2),2);assert.equal(cursor.readUInt16LE(10),source.readUInt16LE(0));assert.equal(cursor.readUInt16LE(12),source.readUInt16LE(2));
  assert.deepEqual(cursor.subarray(22),source.subarray(4,group.readUInt32LE(14)));
 }
});
test('native modes use original cross, lens, finger and remove cursors; elevator capture uses stock vertical size',()=>{
 assert.match(nativeGameCursor('build'),/1002/);assert.match(nativeGameCursor('inspect',false),/1003/);
 assert.match(nativeGameCursor('finger'),/1004/);assert.match(nativeGameCursor('demolish'),/1005/);
 assert.equal(nativeGameCursor('build',false),'default');assert.equal(nativeGameCursor('finger',true,true),'ns-resize');
});
