import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';

test('actual Renderer pointer assigns ground and storey pixel boundaries to the native next row',()=>{
  const renderer=Object.assign(Object.create(Renderer.prototype),{width:800,height:576,camera:{x:1500,y:-252},zoom:1});
  const point=(x,y)=>renderer.grid((x-renderer.camera.x)*renderer.zoom+renderer.width/2,(y-renderer.camera.y)*renderer.zoom+renderer.height/2);
  for(const [y,floor]of [[-73,2],[-72,1],[-71,1],[-37,1],[-36,0],[-35,0],[-1,0],[0,-1],[1,-1],[35,-1],[36,-2]])
    assert.deepEqual(point(800,y),{x:100,floor},String(y));
  assert.ok(point(-1,-1).x===0,'native signed IDIV truncates outside-site negative x toward zero');
  assert.equal(point(7,-1).x,0);assert.equal(point(8,-1).x,1);
});

test('Renderer pointer preserves source boundary behavior after browser zoom and scroll adapters',()=>{
  const renderer=Object.assign(Object.create(Renderer.prototype),{width:815,height:575,camera:{x:736,y:-190},zoom:2});
  for(const [worldY,floor]of [[-3600,99],[-3601,100],[-3960,109],[0,-1],[359,-10]]) {
    const x=renderer.width/2+(704-renderer.camera.x)*renderer.zoom,y=renderer.height/2+(worldY-renderer.camera.y)*renderer.zoom;
    assert.deepEqual(renderer.grid(x,y),{x:88,floor});
  }
});
