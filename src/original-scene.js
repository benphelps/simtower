export const SCENE_GROUND = 3960; // Native120floors, ground record10.
export const CLOUD_ASSETS = [
  { sheet: 900, width: 96, height: 41 }, { sheet: 901, width: 192, height: 19 },
  { sheet: 902, width: 292, height: 38 }, { sheet: 903, width: 216, height: 43 },
];
export function secomFacadeSprites(room) {
  //9D89 type45 computes absolute tower x modulo4;A6E2 copies those
  //individual type45 columns through3139F. The32px3880 tile is not stretched.
  return Array.from({length:room.width},(_,offset)=>({sheet:3880,x:(room.x+offset)*8,
    y:-(room.floor+1)*36,sx:((room.x+offset)&3)*8,sy:0,width:8,height:36}));
}
export function sceneBackgroundSprites(viewport) {
  // 0xB000 assembles857..849;B3A3 repeats only top857three extra times.
  //B3A3 starts at retained-buffer x0, which E9CF aligns to8px. 2B571
  //then crops the scroll remainder; it does not restart at client x0.
  viewport=nativeBackgroundViewport(viewport);
  const rows = [857,857,857,857,856,855,854,853,852,851,850,849], result = [];
  for (const [row, sheet] of rows.entries()) {
    const y = row * 360 - SCENE_GROUND;
    if (y >= viewport.bottom || y + 360 <= viewport.top) continue;
    for (let x = viewport.left; x < viewport.right; x += 32) result.push({ sheet,
      x, y, width: 32, height: 360, sx: 0, sy: 0 });
  }
  return result;
}
export function citySprites(viewport) {
  // B3A3 repeats905at96pixels with world-scroll remainder, bottom atground.
  const result = [];
  if (viewport.top >= 0 || viewport.bottom <= -55) return result;
  for (let x = Math.floor(viewport.left / 96) * 96; x < viewport.right; x += 96)
    result.push({ sheet: 905, x, y: -55, width: 96, height: 55, sx: 0, sy: 0 });
  return result;
}
export function cloudArea(viewport) {
  // 0xB83F intersects viewport with whole-world[0,360,3000,3888].
  const rect = { left: Math.max(0, viewport.left), right: Math.min(3000, viewport.right),
    top: Math.max(-3600, viewport.top), bottom: Math.min(-72, viewport.bottom) };
  return rect.left >= rect.right || rect.top >= rect.bottom ? null : rect;
}
//E9CF rounds scroll to the retained8x36 grid. EA1B reserves one extra
//column/row after rounding the client dimensions upward. B83F uses THIS
//buffer rectangle for random cloud placement, including clipped margins.
export function nativeBackgroundViewport(viewport) {
  const left=Math.trunc(viewport.left/8)*8,top=Math.trunc((viewport.top+SCENE_GROUND)/36)*36-SCENE_GROUND;
  return {left,top,right:left+(Math.ceil((viewport.right-viewport.left)/8)+1)*8,
    bottom:top+(Math.ceil((viewport.bottom-viewport.top)/36)+1)*36};
}
//360CB converts sampled buffer row through56976, then the browser's
//ground-floor offset10. Width/height stay cell counts for36042's SARs.
export function nativeBufferGrid(viewport) {
  const buffer=nativeBackgroundViewport(viewport);
  return {x:buffer.left/8,topFloor:109-(buffer.top+SCENE_GROUND)/36,
    width:(buffer.right-buffer.left)/8,height:(buffer.bottom-buffer.top)/36};
}
function inside(cloud, area) {
  return cloud && cloud.x >= area.left && cloud.y >= area.top
    && cloud.x + cloud.width <= area.right && cloud.y + cloud.height <= area.bottom;
}
export class OriginalCloudField {
  constructor() { this.slots = [null, null, null, null]; this.viewportKey = ''; }
  update(viewport, randomInt, { dirty = false } = {}) {
    // B5F0/B6A5 retains fully visible clouds. B717 chooses shape FIRST,
    // then disables that slot when the viewport is too small for that shape.
    const area = cloudArea(viewport);
    const key = [viewport.left,viewport.right,viewport.top,viewport.bottom].join(',');
    const redraw = dirty || key !== this.viewportKey;
    this.viewportKey = key;
    if (!area) return [];
    if (!redraw) return this.slots.filter(Boolean).map(cloud => ({ ...cloud, sx: 0, sy: 0 }));
    for (let index = 0; index < 4; index++) if (!inside(this.slots[index], area)) {
      const shape = CLOUD_ASSETS[randomInt(CLOUD_ASSETS.length)];
      const dx = area.right - area.left - shape.width, dy = area.bottom - area.top - shape.height;
      this.slots[index] = dx <= 0 || dy <= 0 ? null : { ...shape,
        x: area.left + randomInt(dx), y: area.top + randomInt(dy) };
    }
    return this.slots.filter(Boolean).map(cloud => ({ ...cloud, sx: 0, sy: 0 }));
  }
}
