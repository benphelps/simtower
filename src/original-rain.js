export const SCENE_PALETTE_INDICES = [188,189,190,191,192,193,207,208,209,210,211,212,213,214,215,216,217,218];
// 0x5B3E (high bytes of its original constant words), two six-color banks.
const RAIN_LIGHT = [[206,239,255],[165,231,255],[140,214,255],[99,206,255],[66,198,255],[74,180,255]];
const RAIN_DARK = [[76,84,102],[87,102,127],[87,110,140],[97,102,153],[89,94,127],[74,76,102]];
export function originalRainPalette(skyPalette, counter, tick, rainy) {
  // 5EB4 normally copies sky188..193 into BOTH rain banks, concealing
  // original raindrop pixels. 56CB animates rain only80<tick<1490.
  const animated = rainy && tick > 80 && tick < 1490;
  return Array.from({ length: 12 }, (_, offset) => {
    const bank = Math.trunc(offset / 6), color = offset % 6;
    return [...(animated ? bank === (counter & 1) ? RAIN_LIGHT[color] : RAIN_DARK[color] : skyPalette[color])];
  });
}
export function nativeSkyResetDue(tick,rainy) {
  //5F8B→5EB4 runs on EVERY interpolation tick, even when integer RGB
  //rounding leaves all six colors unchanged. Rain tick1500 uses5E53.
  return rainy?tick<=80||tick>=1500&&tick<=1600:tick>=2533||tick>=1600&&tick<=1800;
}
export function nativeFullSkyResetDue(tick,rainy,{initialize=false}={}) {
  //5F8B's rain1500 jump and ARG0=1 outside interpolation call5E53,
  //which copies the complete CLUT through642B, including194..203.
  return rainy&&tick===1500||initialize&&!nativeSkyResetDue(tick,rainy);
}
export class OriginalRainColors {
  constructor() { this.skyKey = ''; this.counter = 0; this.palette = null; }
  resetSky(sky,{force=false}={}) {
    const key=sky.flat().join(',');
    if(!force&&key===this.skyKey)return false;
    this.palette=originalRainPalette(sky,0,0,false);this.skyKey=key;return true;
  }
  advanceEffects(effectsCounter,tick,rainy) {
    //56CB→5B3E writes the rain banks immediately, independently of5F8B.
    //A later5EB4 sky reset may overwrite this; another gated56CB may then
    //animate the banks again in the same slow native idle iteration.
    if(this.palette&&effectsCounter!==this.counter&&rainy&&tick>80&&tick<1490)
      this.palette=originalRainPalette([], (effectsCounter-1)&65535,tick,true);
    this.counter=effectsCounter;return this.palette;
  }
  update(sky, effectsCounter, tick, rainy) {
    // 4A256 updates effects BEFORE FD4B/5F8B updates the sky palette.
    // Outside the animation window banks freeze until5EB4 copies new sky
    // colors. Thus1490..1499 does not instantly remove the last rain frame.
    const changed=this.resetSky(sky);
    if(!changed)this.advanceEffects(effectsCounter,tick,rainy);
    else this.counter=effectsCounter;
    return this.palette;
  }
}
export function collectScenePixels(indices) {
  const known = new Set(SCENE_PALETTE_INDICES), result = [];
  for (let pixel = 0; pixel < indices.length; pixel++) if (known.has(indices[pixel])) result.push([pixel * 4, indices[pixel]]);
  return result;
}
export function applyScenePalette(rgba, pixels, sky, rain) {
  for (const [offset, index] of pixels) {
    const color = index < 194 ? sky[index - 188] : rain[index - 207];
    rgba[offset] = color[0]; rgba[offset + 1] = color[1]; rgba[offset + 2] = color[2];
  }
  return rgba;
}
