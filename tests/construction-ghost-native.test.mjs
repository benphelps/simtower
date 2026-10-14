import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeConstructionGhost} from '../src/original-construction-ghost.js';
test('native construction uses a solid white hollow rectangle equally for valid and rejected placements',()=>{
  const preview={key:'office',x:10,width:9,low:2,high:2};
  assert.deepEqual(nativeConstructionGhost(preview),{x:80,y:-108,width:72,height:36,stroke:'#ffffff',lineWidth:1,fill:null});
  assert.deepEqual(nativeConstructionGhost({...preview,error:'Cannot build here'}),nativeConstructionGhost(preview));
});
test('selected multilevel rectangles use source heights and twelve-pixel vertical offset',()=>{
  for(const [key,height]of Object.entries({stairs:72,escalator:72,cinema:72,partyhall:72,recycling:72,metro:108,cathedral:180})){
    const ghost=nativeConstructionGhost({key,x:10,width:key==='cinema'?31:8,low:0,high:3});
    assert.equal(ghost.y,-132);assert.equal(ghost.height,height);
  }
});
test('native clips the rectangle before drawing its border and removes empty or canceled ghosts',()=>{
  const preview={key:'office',x:10,width:9,low:2,high:2};
  const viewport={left:100,right:200,top:-100,bottom:0};
  assert.deepEqual(nativeConstructionGhost(preview,viewport),{x:100,y:-100,width:52,height:28,stroke:'#ffffff',lineWidth:1,fill:null});
  assert.equal(nativeConstructionGhost(preview,{...viewport,left:160}),null);
  assert.equal(nativeConstructionGhost(null,viewport),null);
});
