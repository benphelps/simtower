import test from 'node:test';
import assert from 'node:assert/strict';
import {AssetPreloader} from '../src/asset-loading.js';

test('shared asset requests count unique completed files and include metadata loaded before inventory',async()=>{
  let requests=0;const reports=[];
  const loader=new AssetPreloader({fetch:async()=>{requests++;return new Response('{"ready":true}');},createObjectURL:()=>'/decoded-sound',onProgress:p=>reports.push(p)});
  await loader.loadJSON('/manifest');loader.register(['/manifest','/sound','/sound']);
  assert.deepEqual(reports.at(-1),{loaded:1,total:2,percent:50});
  assert.deepEqual(await loader.loadJSON('/manifest'),{ready:true});
  await Promise.all([loader.loadSound('/sound'),loader.loadSound('/sound')]);
  assert.equal(requests,2);assert.deepEqual(reports.at(-1),{loaded:2,total:2,percent:100});
});
test('image progress waits for successful decode, reuses the drawable and never completes failed requests',async()=>{
  let releaseDecode,requests=0;const reports=[],image={decode:()=>new Promise(resolve=>{releaseDecode=resolve;})};
  const loader=new AssetPreloader({fetch:async url=>{requests++;return new Response('image',{status:url==='/bad'?404:200});},createImage:()=>image,createObjectURL:()=>'/image-blob',onProgress:p=>reports.push(p)});
  loader.register(['/image','/bad']);const pending=loader.loadImage('/image');
  while(!releaseDecode)await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(reports.at(-1),{loaded:0,total:2,percent:0});
  releaseDecode();assert.equal(await pending,image);assert.equal(await loader.loadImage('/image'),image);
  await assert.rejects(loader.loadImage('/bad'),/Could not load \/bad \(404\)/);
  assert.equal(requests,2);assert.deepEqual(reports.at(-1),{loaded:1,total:2,percent:50});
});
