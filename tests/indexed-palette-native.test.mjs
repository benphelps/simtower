import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeAnimatedPalette,nativeGameplayPalette,tintNativePersonPixels,tintNativeIndexPlane,collectIndexedPalettePixels,recolorIndexedPixels,recolorSelectedIndexedPixels,applyNativeIndexMask,applyUpscaledNativeAlpha,upscaledPaletteDetails,retainedPaletteDetails,retainPaletteDetailRect} from '../src/original-indexed-palette.js';
import {Renderer,loadAssets,loadTextureAssets} from '../src/renderer.js';
import {Tower} from '../src/simulation.js';
import {OriginalEffectsClock} from '../src/original-effects.js';
import {OriginalRainColors} from '../src/original-rain.js';
const plane=(indices,alpha=255)=>Uint8ClampedArray.from(indices.flatMap(index=>[index,index,index,alpha]));

test('retained equal RGB sky and rain banks retain distinct original palette byte identities',()=>{
  const indices=plane([188,207,213,194,0]),rgba=Uint8ClampedArray.from([10,20,30,255,10,20,30,255,10,20,30,255,243,255,255,255,255,255,255,255]);
  const palette=nativeAnimatedPalette(Array(6).fill([20,30,40]),Array.from({length:12},(_,i)=>i<6?[200,210,220]:[70,80,90]),Array(10).fill([150,160,170]));
  recolorIndexedPixels(rgba,indices,palette);
  assert.deepEqual([...rgba],[20,30,40,255,200,210,220,255,70,80,90,255,150,160,170,255,255,255,255,255]);
  assert.deepEqual(collectIndexedPalettePixels(indices),[[0,188],[4,207],[8,213],[12,194]]);
});

test('native sprite transparency uses byte0 while opaque equal-RGB bytes survive',()=>{
  const indices=plane([0,255,188]),rgba=new Uint8ClampedArray(12).fill(255);
  applyNativeIndexMask(rgba,indices,{transparent:true});
  assert.deepEqual([...rgba],[255,255,255,0,255,255,255,255,255,255,255,255]);assert.equal(indices[3],0);assert.equal(indices[7],255);
  const opaque=plane([0]);applyNativeIndexMask(opaque,plane([0]));assert.equal(opaque[3],255);
  assert.throws(()=>recolorIndexedPixels(new Uint8Array(1),indices,new Map()),/Mismatched/);
});

test('waifu masks replace legacy alpha with the exact current nearest2x original mask',()=>{
  const original=Uint8ClampedArray.from([255,255,255,0,10,20,30,255,40,50,60,255,255,0,255,0]);
  const rgba=new Uint8ClampedArray(4*4*4).fill(123);applyUpscaledNativeAlpha(rgba,original,2,2);
  assert.deepEqual(Array.from({length:16},(_,i)=>rgba[i*4+3]),[0,0,255,255,0,0,255,255,255,255,0,0,255,255,0,0]);
  assert.equal(rgba[0],123,'only alpha is replaced; smooth RGB is preserved');
});

test('waifu animated colors preserve signed source detail without corrupting static pixels or accumulating clamping drift',()=>{
  const original=Uint8ClampedArray.from([100,120,140,255,10,20,30,255]),indices=plane([194,1]);
  const generated=Uint8ClampedArray.from(Array.from({length:8},(_,i)=>i%4<2?[105,118,143,255]:[7,19,31,255]).flat());
  const {pixels,details}=upscaledPaletteDetails(generated,original,indices,2,1);
  assert.deepEqual(pixels.map(([offset])=>offset),[0,4,16,20]);assert.deepEqual([...details.slice(0,3)],[5,-2,3]);
  recolorSelectedIndexedPixels(generated,pixels,new Map([[194,[254,1,254]]]),{details});assert.deepEqual([...generated.slice(0,4)],[255,0,255,255]);
  recolorSelectedIndexedPixels(generated,pixels,new Map([[194,[100,120,140]]]),{details});assert.deepEqual([...generated.slice(0,4)],[105,118,143,255]);
  assert.deepEqual([...generated.slice(8,12)],[7,19,31,255]);
});

test('retained detail planes survive scaffold restoration and palette saturation without changing overwritten ink',()=>{
  const previousPlane=plane([194,207,213]),base=Uint8ClampedArray.from([105,118,143,255,50,70,90,255,60,80,100,255]);
  const palette=new Map([[194,[100,120,140]],[207,[50,70,90]],[213,[60,80,100]]]);
  const previousDetails=retainedPaletteDetails(base,previousPlane,palette);recolorIndexedPixels(base,previousPlane,new Map([[194,[254,1,254]]]),{details:previousDetails});
  const currentPlane=plane([194,1,213]),currentDetails=retainedPaletteDetails(base,currentPlane,new Map([[194,[254,1,254]],[213,[60,80,100]]]));
  retainPaletteDetailRect(currentDetails,currentPlane,previousDetails,previousPlane,3,{x:0,y:0,width:3,height:1});
  recolorIndexedPixels(base,currentPlane,palette,{details:currentDetails});assert.deepEqual([...base.slice(0,4)],[105,118,143,255]);
  assert.deepEqual([...currentDetails.slice(4,7)],[0,0,0],'new static scaffold ink never inherits a rain offset');
});

test('native plane export covers ordinary and tall-lobby source sprite metadata',()=>{
  const source=JSON.parse(readFileSync(new URL('../public/assets/native-indices.json',import.meta.url)));
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url))),tall=JSON.parse(readFileSync(new URL('../public/assets/lobby-transports.json',import.meta.url)));
  for(const entry of [...manifest.resources,...tall].filter(entry=>entry.path.endsWith('.png'))){const record=source.resources[entry.id];assert.ok(record,String(entry.id));assert.equal(record.width,entry.width);assert.equal(record.height,entry.height);assert.equal(record.offset,entry.offset);assert.match(record.indicesSha256,/^[a-f0-9]{64}$/);}
  assert.equal(source.resources[3624].animated,false);assert.equal(source.resources[850].animated,true);assert.equal(source.resources[4073].width,4416);
});

test('renderer recolors retained cells from their original index plane instead of recovering indices from RGB',()=>{
  const pixels={data:Uint8ClampedArray.from([10,20,30,255,10,20,30,255])},indexData={data:plane([207,213])},writes=[];
  const renderer={retainedPaletteKey:'old',indexPaletteKey:'new',nativePalette:new Map([[207,[200,210,220]],[213,[50,60,70]]]),
    facadeCanvas:{width:2,height:1},facadeIndexCanvas:{width:2,height:1},facadeContext:{getImageData:()=>pixels,putImageData:actual=>writes.push(actual)},facadeIndexContext:{getImageData:()=>indexData}};
  Renderer.prototype.recolorRetainedFacade.call(renderer);assert.deepEqual([...pixels.data],[200,210,220,255,50,60,70,255]);assert.equal(writes.length,1);
  Renderer.prototype.recolorRetainedFacade.call(renderer);assert.equal(writes.length,1,'unchanged palette does not rerender or consume RNG');
});

test('injectable production loaders use indexed original masks and repair an obsolete waifu mask',async()=>{
  const previousDocument=globalThis.document,calls=[];
  class Canvas {
    constructor(){this.width=0;this.height=0;this.data=new Uint8ClampedArray();this.ctx={drawImage:source=>{this.data=new Uint8ClampedArray(source.data);},getImageData:()=>({data:new Uint8ClampedArray(this.data)}),putImageData:image=>{this.data=new Uint8ClampedArray(image.data);}};}
    getContext(){return this.ctx;}
  }
  globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return new Canvas();}};
  const original={width:2,height:1,data:Uint8ClampedArray.from([255,255,255,255,100,120,140,255])},indices={width:2,height:1,data:plane([0,194])};
  try {
    const originals=await loadAssets({resources:[{id:1003,path:'public/assets/bitmaps/1003.png'}]},
      {loadJSON:async url=>{calls.push(url);return {resources:{1003:{path:'/assets/indices/1003.png',animated:true}}};},
      loadImage:async url=>{calls.push(url);return url.includes('/indices/')?indices:original;}});
    assert.deepEqual(calls,['/assets/native-indices.json','/assets/bitmaps/1003.png','/assets/indices/1003.png']);
    assert.equal(originals.get(1003).data[3],0);assert.equal(originals.get(1003).data[7],255);assert.deepEqual(originals.nativeIndexedPixels.get(1003),[[4,194]]);
    const enhanced={width:4,height:2,data:Uint8ClampedArray.from(Array(8).fill([105,118,143,123]).flat())};
    const textures=await loadTextureAssets({resources:[{id:1003,width:2,height:1,scale:2,path:'assets/upscaled/waifu2x/1003.png'}]},originals,{loadImage:async url=>{calls.push(url);return enhanced;}});
    assert.equal(calls.at(-1),'/assets/upscaled/waifu2x/1003.png');assert.deepEqual(Array.from({length:8},(_,index)=>textures.get(1003).data[index*4+3]),[0,0,255,255,0,0,255,255]);
    assert.deepEqual([...textures.nativePaletteSources.get(1003).details.slice(8,11)],[5,-2,3]);
    assert.equal(textures.get(1003).data[0],105,'mask repair must not replace generated smooth RGB');
  } finally {if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('original full CLUT decodes native reserved skip and preserves static colors across animated updates',()=>{
  const native=JSON.parse(readFileSync(new URL('../public/assets/native-indices.json',import.meta.url)));
  assert.equal(native.basePalette.length,256);assert.deepEqual(native.paletteSource.type,32515);
  assert.deepEqual(native.basePalette[84],[230,210,207]);assert.deepEqual(native.basePalette[110],[12,25,15]);assert.deepEqual(native.basePalette[255],[0,0,0]);
  const palette=nativeGameplayPalette(native.basePalette,new Map([[194,[50,60,70]]]));
  const rgba=Uint8ClampedArray.from([51,25,0,255,0,0,0,255]);recolorIndexedPixels(rgba,plane([84,194]),palette);
  assert.deepEqual([...rgba],[230,210,207,255,50,60,70,255]);
});

test('queued tint replaces exactly nativeFF and preserves equal-RGB black1 and transparent0 in Original and waifu',()=>{
  const indices=plane([1,255,0]);indices[11]=0;
  const original=Uint8ClampedArray.from([0,0,0,255,0,0,0,255,255,255,255,0]);
  const tinted=tintNativePersonPixels(new Uint8ClampedArray(original),indices,[255,25,25],{width:3,height:1});
  assert.deepEqual([...tinted],[0,0,0,255,255,25,25,255,255,255,255,0]);assert.deepEqual([...tintNativeIndexPlane(indices,26)], [...plane([1,26]),0,0,0,0]);
  const enhanced=Uint8ClampedArray.from(Array(12).fill([4,5,6,255]).flat());
  tintNativePersonPixels(enhanced,indices,[255,25,25],{width:3,height:1,scale:2,sourceRGBA:original});
  assert.deepEqual([...enhanced.slice(0,4)],[4,5,6,255]);assert.deepEqual([...enhanced.slice(8,12)],[255,30,31,255]);
});

test('Original gameplay cache corrects static byte colors without modifying shared literal-RGB dialog assets or waifu images',()=>{
  const previousDocument=globalThis.document;
  class Canvas{constructor(){this.width=0;this.height=0;this.data=new Uint8ClampedArray();this.ctx={drawImage:image=>{this.data=new Uint8ClampedArray(image.data);},getImageData:()=>({data:new Uint8ClampedArray(this.data)}),putImageData:image=>{this.data=new Uint8ClampedArray(image.data);}};}getContext(){return this.ctx;}}
  globalThis.document={createElement:()=>new Canvas()};
  try {
    const native=JSON.parse(readFileSync(new URL('../public/assets/native-indices.json',import.meta.url))),original={width:2,height:1,data:Uint8ClampedArray.from([51,25,0,255,243,255,255,255])},indices=new Canvas();indices.width=2;indices.height=1;indices.data=plane([84,194]);
    const assets=new Map([[1514,original]]);assets.nativeBasePalette=native.basePalette;assets.nativeIndices=new Map([[1514,indices]]);assets.nativeIndexedPixels=new Map([[1514,[[4,194]]]]);
    const renderer=Object.assign(Object.create(Renderer.prototype),{assets,indexedPaletteSources:new Map(),peopleInk:new Map(),nativePalette:new Map([[194,[50,60,70]]])});
    const corrected=renderer.gameplaySprite(1514);assert.deepEqual([...corrected.data],[230,210,207,255,50,60,70,255]);
    assert.equal(assets.get(1514),original);assert.deepEqual([...original.data],[51,25,0,255,243,255,255,255]);
    const calls=[],waifu={width:4,height:2};renderer.ctx={drawImage:source=>calls.push(source)};renderer.textureAssets=new Map([[1514,waifu]]);
    renderer.sprite(1514,0,0,2,1);assert.equal(calls[0],waifu);renderer.textureAssets=null;renderer.sprite(1514,0,0,2,1);assert.equal(calls[1],corrected);
  } finally {if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('post-Info palette presents native colors immediately without a room redraw, actor mutation or RNG call',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url))),tower=new Tower(data),before=tower.save(),pixels={data:Uint8ClampedArray.from([0,0,0,255])},writes=[];
  const assets=new Map();assets.nativeIndices=new Map([[1,{}]]);
  const sky=Array(6).fill([10,20,30]),rainColors=new OriginalRainColors();rainColors.resetSky(sky);
  const renderer=Object.assign(Object.create(Renderer.prototype),{assets,peopleInk:new Map(),indexedPaletteSources:new Map(),effectsClock:new OriginalEffectsClock(),effectsEnabled:true,currentSky:sky,rainColors,
    canvas:{width:1,height:1},ctx:{getImageData:()=>pixels,putImageData:actual=>writes.push(actual)},indexContext:{getImageData:()=>({data:plane([194])})},
    nativePalette:new Map([[194,[0,0,0]]]),indexPaletteKey:'old',presentedPaletteKey:'old',presentedPalette:new Map([[194,[0,0,0]]]),presentedFrame:true,presentedWidth:1,presentedHeight:1,
    render:()=>assert.fail('presentation must not redraw'),sampleInteriors:()=>assert.fail('presentation must not sample actors')});
  assert.equal(renderer.palettePhase(tower,240,{present:true}),true);assert.deepEqual([...pixels.data],[243,255,255,255]);assert.equal(writes.length,1);assert.equal(tower.save(),before);
  assert.equal(renderer.palettePhase(tower,250,{present:true}),false);assert.equal(writes.length,1);
});

test('presented waifu detail survives repeated palette clipping and resize invalidates the old plane',()=>{
  const pixels={data:Uint8ClampedArray.from([105,118,143,255])},renderer=Object.assign(Object.create(Renderer.prototype),{
    textureAssets:new Map(),canvas:{width:1,height:1},ctx:{getImageData:()=>pixels,putImageData:()=>{}},indexContext:{getImageData:()=>({data:plane([194])})},
    nativePalette:new Map([[194,[254,1,254]]]),indexPaletteKey:'b',presentedPaletteKey:'a',presentedPalette:new Map([[194,[100,120,140]]]),presentedFrame:true,presentedWidth:1,presentedHeight:1});
  assert.equal(renderer.presentIndexedPalette(),true);assert.deepEqual([...pixels.data],[255,0,255,255]);
  renderer.nativePalette=new Map([[194,[100,120,140]]]);renderer.indexPaletteKey='c';renderer.presentIndexedPalette();assert.deepEqual([...pixels.data],[105,118,143,255]);
  renderer.canvas.width=2;renderer.indexPaletteKey='d';assert.equal(renderer.presentIndexedPalette(),false);
});
