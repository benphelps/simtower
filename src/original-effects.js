// Original shared RT_BITMAP palette1515 entries194..203. These ten colors
// are unique in its256-entry palette, so PNG RGB values preserve their index.
export const EFFECTS_BASE_PALETTE = Object.freeze([[243,255,255],[158,184,184],
  [163,184,184],[204,120,107],[207,194,156],[2,2,156],[181,181,130],
  [130,130,130],[79,79,79],[133,133,133]]);
export const EFFECTS_CLOCK_UNITS=15; // 0x56CB: nominal240ms; independent of simulation speed.
const signedWord=value=>((value&65535)^32768)-32768;

// 0x56CB updates elevator machinery / ventilation by animating palette
// indices194..203, not cycling fabricated replacement textures.
export function effectsPalette(counter) {
  const cyan=offset=>signedWord(counter+offset)%3===0?[158,184,184]:[243,255,255];
  const gray=offset=>signedWord(counter+offset)%3===0?[79,79,79]:[130,130,130];
  const odd=signedWord(counter)%2!==0;
  return [cyan(1),cyan(0),cyan(2),odd?[204,120,107]:[207,194,156],
    odd?[207,194,156]:[204,120,107],odd?[2,2,156]:[181,181,130],
    odd?[181,181,130]:[2,2,156],gray(1),gray(0),gray(2)];
}

export class OriginalEffectsClock {
  constructor(nowMs=0){this.counter=0;this.lastUnits=Math.trunc(nowMs/16);this.palette=EFFECTS_BASE_PALETTE;}
  resetCounter(){this.counter=0;} // 0x1A405 resets phase on tower initialization, not the wall-clock gate.
  advance(nowMs,enabled=true) {
    const units=Math.trunc(nowMs/16);
    if(!enabled||Math.abs(units-this.lastUnits)<EFFECTS_CLOCK_UNITS)return null;
    this.palette=effectsPalette(this.counter);this.counter=(this.counter+1)&65535;this.lastUnits=units;
    return this.palette;
  }
}

export function collectEffectsPixels(rgba) {
  const colors=new Map(EFFECTS_BASE_PALETTE.map((rgb,index)=>[rgb.join(','),index]));
  const pixels=[];
  for(let offset=0;offset<rgba.length;offset+=4) {
    const index=colors.get(`${rgba[offset]},${rgba[offset+1]},${rgba[offset+2]}`);
    if(index!==undefined)pixels.push([offset,index]);
  }
  return pixels;
}

export function applyEffectsPalette(rgba,pixels,palette) {
  for(const [offset,index] of pixels) {
    const rgb=palette[index];rgba[offset]=rgb[0];rgba[offset+1]=rgb[1];rgba[offset+2]=rgb[2];
  }
}
