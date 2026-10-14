export const NATIVE_ANIMATED_INDICES=new Set([...Array.from({length:16},(_,i)=>188+i),...Array.from({length:12},(_,i)=>207+i)]);

export function nativeAnimatedPalette(sky,rain,effects) {
  const palette=new Map();
  for(const [first,colors] of [[188,sky],[194,effects],[207,rain]])if(colors)
    colors.forEach((rgb,index)=>palette.set(first+index,rgb));
  return palette;
}
export function nativeGameplayPalette(base,animated=new Map()) {
  const palette=new Map((base||[]).map((rgb,index)=>[index,rgb]));
  for(const [index,rgb] of animated)palette.set(index,rgb);
  return palette;
}

export function tintNativePersonPixels(rgba,plane,rgb,{scale=1,sourceRGBA,width,height}={}) {
  if(!width||!height||plane.length!==width*height*4||rgba.length!==plane.length*scale*scale)throw new Error('Mismatched native person tint plane.');
  for(let y=0;y<height*scale;y++)for(let x=0;x<width*scale;x++) {
    const source=(Math.floor(y/scale)*width+Math.floor(x/scale))*4,offset=(y*width*scale+x)*4;
    if(plane[source]!==255||plane[source+3]!==255)continue;
    for(let color=0;color<3;color++)rgba[offset+color]=channel(rgb[color]+(sourceRGBA?rgba[offset+color]-sourceRGBA[source+color]:0));
  }
  return rgba;
}
export function tintNativeIndexPlane(plane,index) {
  const tinted=new Uint8ClampedArray(plane);
  for(let offset=0;offset<tinted.length;offset+=4)if(plane[offset]===255&&plane[offset+3]===255)tinted[offset]=tinted[offset+1]=tinted[offset+2]=index;
  return tinted;
}

export function collectIndexedPalettePixels(plane) {
  const pixels=[];
  for(let offset=0;offset<plane.length;offset+=4)if(plane[offset+3]===255&&NATIVE_ANIMATED_INDICES.has(plane[offset]))pixels.push([offset,plane[offset]]);
  return pixels;
}

const channel=value=>Math.max(0,Math.min(255,value));
export function recolorIndexedPixels(rgba,plane,palette,{details}={}) {
  if(rgba.length!==plane.length)throw new Error('Mismatched native palette plane.');
  for(let offset=0;offset<plane.length;offset+=4) {
    if(plane[offset+3]!==255)continue;
    const rgb=palette.get(plane[offset]);
    if(rgb)for(let color=0;color<3;color++)rgba[offset+color]=channel(rgb[color]+(details?.[offset+color]||0));
  }
  return rgba;
}
export function recolorSelectedIndexedPixels(rgba,pixels,palette,{details}={}) {
  for(const [offset,index] of pixels){const rgb=palette.get(index);if(rgb)for(let color=0;color<3;color++)rgba[offset+color]=channel(rgb[color]+(details?.[offset+color]||0));}
  return rgba;
}

export function applyNativeIndexMask(rgba,indexPlane,{transparent=false}={}) {
  if(rgba.length!==indexPlane.length)throw new Error('Mismatched native sprite plane.');
  if(transparent)for(let offset=0;offset<rgba.length;offset+=4)if(indexPlane[offset]===0)rgba[offset+3]=indexPlane[offset+3]=0;
  return rgba;
}

export function applyUpscaledNativeAlpha(rgba,original,width,height,scale=2) {
  if(original.length!==width*height*4||rgba.length!==width*height*scale*scale*4)throw new Error('Mismatched upscaled native mask.');
  for(let y=0;y<height*scale;y++)for(let x=0;x<width*scale;x++)rgba[(y*width*scale+x)*4+3]=original[(Math.floor(y/scale)*width+Math.floor(x/scale))*4+3];
  return rgba;
}

export function upscaledPaletteDetails(rgba,original,plane,width,height,scale=2) {
  if(original.length!==plane.length||original.length!==width*height*4||rgba.length!==original.length*scale*scale)throw new Error('Mismatched upscaled palette plane.');
  const details=new Int16Array(rgba.length),pixels=[];
  for(let y=0;y<height*scale;y++)for(let x=0;x<width*scale;x++) {
    const source=(Math.floor(y/scale)*width+Math.floor(x/scale))*4,offset=(y*width*scale+x)*4,index=plane[source];
    if(plane[source+3]!==255||!NATIVE_ANIMATED_INDICES.has(index))continue;
    pixels.push([offset,index]);for(let color=0;color<3;color++)details[offset+color]=rgba[offset+color]-original[source+color];
  }
  return {pixels,details};
}

export function retainedPaletteDetails(rgba,plane,palette) {
  if(rgba.length!==plane.length)throw new Error('Mismatched retained palette plane.');
  const details=new Int16Array(rgba.length);
  for(let offset=0;offset<plane.length;offset+=4)if(plane[offset+3]===255){const rgb=palette.get(plane[offset]);if(rgb)
    for(let color=0;color<3;color++)details[offset+color]=rgba[offset+color]-rgb[color];}
  return details;
}

export function retainPaletteDetailRect(details,plane,previousDetails,previousPlane,width,rect) {
  const height=plane.length/4/width;
  for(let y=Math.max(0,Math.floor(rect.y));y<Math.min(height,Math.ceil(rect.y+rect.height));y++)
    for(let x=Math.max(0,Math.floor(rect.x));x<Math.min(width,Math.ceil(rect.x+rect.width));x++) {
      const offset=(y*width+x)*4;
      if(plane[offset+3]!==255||plane[offset]!==previousPlane[offset]||!NATIVE_ANIMATED_INDICES.has(plane[offset]))continue;
      for(let color=0;color<3;color++)details[offset+color]=previousDetails[offset+color];
    }
  return details;
}
