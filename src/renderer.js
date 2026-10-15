import {nativeCarOrder} from './original-transport-slots.js';
import {OriginalFacadeGrid,nativeFacadeHeaderSprites,nativeRubbleSprites} from './original-facade-grid.js';
import {nativeAnimatedPalette,nativeGameplayPalette,tintNativePersonPixels,tintNativeIndexPlane,collectIndexedPalettePixels,recolorIndexedPixels,recolorSelectedIndexedPixels,applyNativeIndexMask,applyUpscaledNativeAlpha,upscaledPaletteDetails,retainedPaletteDetails,retainPaletteDetailRect} from './original-indexed-palette.js';
import {nativeConstructionSprites} from './original-startup.js';
import {parkingSprite} from './original-parking-state.js';
import {clinicSprite} from './original-clinics.js';
import {sceneBackgroundSprites,citySprites,OriginalCloudField,nativeBackgroundViewport,secomFacadeSprites} from './original-scene.js';
import {OriginalRainColors,nativeSkyResetDue,nativeFullSkyResetDue,collectScenePixels,applyScenePalette} from './original-rain.js';
import {findMarkerSprite} from './original-markers.js';
import {nativeConstructionGhost} from './original-construction-ghost.js';
import {nativeRedrawPlan} from './original-redraw-plan.js';
import {nativeShaftEndSprites,nativeElevatorPointerGrid} from './original-elevator-construction-ui.js';
import {metroSprites} from './original-metro.js';
import {recyclingSprites} from './original-recycling.js';
import {nativeTenantSlot} from './original-tenancy.js';
import {nativeScrollCamera} from './original-window-controls.js';
import {interiorUpdateDue,sampleRoomInteriors,roomInteriorSprites,nativeVisibleInteriorRooms,nativeBuilderPose,constructionInteriorSprites,nativeInteriorRecord,interiorSampleEpoch} from './original-interiors.js';
import {SHOW_TYPES,showSprites} from './original-shows.js';
import {tenantRoomSprite} from './original-tenancy.js';
import {OriginalEffectsClock,EFFECTS_BASE_PALETTE,collectEffectsPixels,applyEffectsPalette} from './original-effects.js';
import {diagnosticAppearance,mapFacilityRect,mapShaftLine,mapViewportRect,mapNavigation,MAP_COLORS} from './original-map.js';
import { CELL, FLOOR, CATALOG, TRANSPORT, LINKS, HOTELS } from './catalog.js';
import { personFrame,nativeQueuePosition,nativeQueueBounds,nativeQueueVisibleSpan } from './people-sprites.js';
import { skyPalette, clockTime } from './original-clock.js';
import { linkSprites,shaftNumberSlices,rampSprite,parkingReachable } from './original-construction.js';
import { activeLinkCounts, linkAnimationFrame } from './original-journeys.js';
import { lobbySlices, lobbyHeight,lobbyCanopies } from './original-lobbies.js';
import { commercialSprite,COMMERCIAL_TYPES } from './original-commercial.js';
import { hotelSprite } from './original-hotels.js';
import {emergencySprites} from './original-events.js';
import {cathedralSprites,cathedralCeremonySprites,OriginalCathedralRenderClock,cathedralEntrance} from './original-cathedral.js';

// These resources use the original six-color animated sky palette.
const SKY_ASSETS = new Set([352,850,851,852,853,854,855,856,857,900,901,902,903,905]);

export class Renderer {
  constructor(canvas, minimap, assets) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.minimap = minimap; this.map = minimap.getContext('2d'); this.assets = assets;
    this.zoom = 1; this.camera = { x: 800, y: -190 }; this.preview = null; this.selected = null; this.evaluation = false;
    this.showPeople = true; this.textureAssets = null;
    this.cathedralRenderClock=new OriginalCathedralRenderClock();
    this.facadeGrid=new OriginalFacadeGrid();this.facadeCanvas=document.createElement('canvas');this.facadeContext=this.facadeCanvas.getContext('2d');this.backgroundCanvas=document.createElement('canvas');this.backgroundContext=this.backgroundCanvas.getContext('2d');
    this.indexFrameCanvas=document.createElement('canvas');this.indexContext=this.indexFrameCanvas.getContext('2d');
    this.facadeIndexCanvas=document.createElement('canvas');this.facadeIndexContext=this.facadeIndexCanvas.getContext('2d',{willReadFrequently:true});
    this.backgroundIndexCanvas=document.createElement('canvas');this.backgroundIndexContext=this.backgroundIndexCanvas.getContext('2d');
    this.indexedPaletteSources=new Map();
    this.peopleInk=new Map();this.effectsEnabled=true;this.effectsClock=new OriginalEffectsClock(performance.now());this.effectsSources=new Map();this.interiorPoses=new Map();this.clouds=new OriginalCloudField();this.rainColors=new OriginalRainColors();this.sceneIndices={};
    this.constructionTool = null; this.skySources = new Map(); this.paletteKey = '';
    this.width = 1; this.height = 1; this.clock = 0;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  resize() {
    const box = this.canvas.getBoundingClientRect(); this.width = box.width; this.height = box.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(box.width * dpr); this.canvas.height = Math.round(box.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.ctx.imageSmoothingEnabled = false;
  }
  home(tower) {
    const ground = tower.bounds(0);
    this.camera.x = ground ? (ground.x + ground.width / 2) * CELL : 800;
    // Ground remains visible with room for the first few floors and basements.
    this.camera.y = -Math.min(190, this.height / this.zoom / 2 - 65);
  }
  screenToWorld(x, y) { return { x: (x - this.width / 2) / this.zoom + this.camera.x, y: (y - this.height / 2) / this.zoom + this.camera.y }; }
  //39074/390B7→3C8BD uses the same signed site-coordinate division as
  //15057. Exact floor boundaries belong to the next row down the screen.
  grid(x, y) { const p = this.screenToWorld(x, y); return nativeElevatorPointerGrid(p.x,p.y); }
  setZoom(value, anchor) {
    const before = anchor && this.screenToWorld(anchor.x, anchor.y);
    this.zoom = Math.max(0.5, Math.min(4, value));
    if (before) { const after = this.screenToWorld(anchor.x, anchor.y); this.camera.x += before.x - after.x; this.camera.y += before.y - after.y; }
  }
  sprite(id, x, y, width, height, sx = 0, sy = 0, sw = width, sh = height) {
    const img = this.assets.get(id); if (!img) return;
    const enhanced = !SKY_ASSETS.has(id) && this.textureAssets?.get(id);
    const source = enhanced || (this.assets.nativeBasePalette?this.gameplaySprite(id):img), scale = enhanced ? source.width / img.width : 1;
    this.ctx.drawImage(source, sx * scale, sy * scale, Math.min(sw, img.width - sx) * scale, Math.min(sh, img.height - sy) * scale, Math.round(x), Math.round(y), width, height);
    if(this.indexCapture){const plane=this.assets.nativeIndices?.get(id);if(plane){this.indexContext.setTransform(this.ctx.getTransform());this.indexContext.drawImage(plane,sx,sy,Math.min(sw,img.width-sx),Math.min(sh,img.height-sy),Math.round(x),Math.round(y),width,height);}}
  }
  gameplaySprite(id){
    const image=this.assets.get(id),plane=this.assets.nativeIndices?.get(id);if(!image||!plane||!this.assets.nativeBasePalette)return image;
    if(this.indexedPaletteSources.has(id))return this.indexedPaletteSources.get(id).canvas;
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),indices=plane.getContext('2d').getImageData(0,0,plane.width,plane.height).data;
    recolorIndexedPixels(pixels.data,indices,nativeGameplayPalette(this.assets.nativeBasePalette,this.nativePalette));ctx.putImageData(pixels,0,0);
    this.indexedPaletteSources.set(id,{canvas,ctx,pixels,indices:this.assets.nativeIndexedPixels.get(id)||[]});return canvas;
  }
  sampleInteriors(tower,viewport={left:this.camera.x-this.width/this.zoom/2,right:this.camera.x+this.width/this.zoom/2,top:this.camera.y-this.height/this.zoom/2,bottom:this.camera.y+this.height/this.zoom/2}) {
    const s=tower.state;if(s.elevatorPreview||this.guiCapture)return;
    if(this.facadeGrid&&!this.facadeGrid.drawDue(interiorSampleEpoch(s)))return;
    //A9E1/A9EF scan56978/5697A, including the clipped extra buffer
    //column/row. The client canvas still clips all painting to its bounds.
    const sampleViewport=this.facadeGrid?nativeBackgroundViewport(viewport):viewport;
    for(const room of nativeVisibleInteriorRooms(s.rooms,sampleViewport)){
      const consumesDirty=!this.facadeGrid||this.facadeGrid.hasNormalCell(room);
      if(room.constructionRemaining>0){
        //387F1 marks each pending native floor record dirty after decrement;
        //6BC2 updates its child0 builder regardless of the People option.
        const record=nativeInteriorRecord(room.interiorOwner??room,room.floor),part=room.interiorConstructionPart;
        if(!record.sampled||record.dirty===1||(part?part.dirty===1:record.constructionRemaining!==room.constructionRemaining)){
          record.poses=[{...nativeBuilderPose(room,max=>tower.randomInt(max)),level:room.interiorLevel}];record.sampled=true;record.lastTick=s.tick;record.lastEpoch=interiorSampleEpoch(s);
        }
        if(consumesDirty){record.dirty=0;if(part)part.dirty=0;}record.constructionRemaining=room.constructionRemaining;
        this.interiorPoses.set(room.interiorKey,{remaining:room.constructionRemaining,poses:record.poses});
        continue;
      }
      //470A3/4716A and residential/food equivalents mark the facade record
      //dirty on home-counter changes. Remote travel retries do not: including
      //every actor state/trip here would consume extra shared RNG off cohort.
      const cacheKey=room.interiorKey??room.id,index=nativeTenantSlot(s.rooms,room),signature=[room.tenantState,room.hotelState,room.housekeepingOverlay,room.commercial?.state,room.occupied].join(':'),old=this.interiorPoses.get(cacheKey);
      const record=nativeInteriorRecord(room.interiorOwner??room,room.floor),changed=record.dirty===1||Boolean(old&&old.signature!==signature);
      if(record.sampled&&record.lastEpoch===undefined)record.lastEpoch=interiorSampleEpoch(s); //Older browser visual records had only native tick.
      if(room.key==='cathedral'&&room.floor===cathedralEntrance(room.interiorOwner??room))this.cathedralRenderClock?.update(s,room.interiorOwner??room,viewport,{peopleAnimations:this.showPeople,dirty:changed,nativeRedraw:Boolean(this.facadeGrid)});
      if(!record.sampled||changed||(this.facadeGrid||record.lastTick!==s.tick||record.lastEpoch!==interiorSampleEpoch(s))&&interiorUpdateDue(s.tick,index,false,this.showPeople)){
        record.poses=sampleRoomInteriors({...s,controlHeld:this.controlHeld},room,s.actors,max=>tower.randomInt(max));record.sampled=true;record.lastTick=s.tick;record.lastEpoch=interiorSampleEpoch(s);
      }
      if(consumesDirty)record.dirty=0;this.interiorPoses.set(cacheKey,{signature,tick:record.lastTick,poses:record.poses});
    }
  }
  facadeViewport(){return {left:this.camera.x-this.width/this.zoom/2,right:this.camera.x+this.width/this.zoom/2,top:this.camera.y-this.height/this.zoom/2,bottom:this.camera.y+this.height/this.zoom/2};}
  resetNativeGrid(){this.facadeGrid=new OriginalFacadeGrid();this.facadeViewKey=null;this.skyEpoch=null;this.sceneDirty=true;}
  sceneClouds(tower,viewport,{backgroundRefresh=true}={}) {
    if(tower.state.elevatorPreview&&!this.nativeGuiRedraw||this.guiCapture||!backgroundRefresh)return this.clouds.slots.filter(Boolean);
    const key=[viewport.left,viewport.right,viewport.top,viewport.bottom].join(':');
    const clouds=this.clouds.update(nativeBackgroundViewport(viewport),max=>tower.randomInt(max),{dirty:Boolean(this.sceneDirty)||key!==this.sceneViewportKey});
    this.sceneViewportKey=key;this.sceneDirty=false;return clouds;
  }
  bindNativeGrid(tower,event){
    this.facadeGrid.bind(tower.state,this.facadeViewport(),event,{paused:Boolean(this.nativePaused)});
    if(event.redraw)this.drawNativeGui(tower,{rebind:Boolean(event.rebind),...(event.backgroundRefresh!==undefined?{backgroundRefresh:event.backgroundRefresh}:{})});
    else if(event.rebind)this.refreshNativeGrid(tower,{rebind:true});
  }
  refreshNativeGrid(tower,{rebind=false}={}){this.facadeGrid.refresh(tower.state,this.facadeViewport(),{paused:Boolean(this.nativePaused),rebind});}
  drawNativeGui(tower,{rebind=false,backgroundRefresh=rebind}={}) {
    const previous=['guiCapture','nativeTickFrame','nativeGuiRedraw'].map(key=>({key,value:this[key],own:Object.hasOwn(this,key)}));
    try {
      this.guiCapture=false;this.nativeTickFrame=false;this.nativeGuiRedraw=true;
      if(backgroundRefresh)this.sceneDirty=true; //F296→F2B2(arg1) always reachesB5F0.
      this.refreshNativeGrid(tower,{rebind});
      this.render(tower,performance.now()/1000,{palette:false,sky:false,backgroundRefresh});
    } finally {for(const prop of previous)if(prop.own)this[prop.key]=prop.value;else delete this[prop.key];}
  }
  retainBackground(){
    if(this.backgroundCanvas.width!==this.canvas.width||this.backgroundCanvas.height!==this.canvas.height){this.backgroundCanvas.width=this.canvas.width;this.backgroundCanvas.height=this.canvas.height;}
    this.backgroundContext.drawImage(this.canvas,0,0);
    if(this.indexCapture){this.resizeIndexTarget(this.backgroundIndexCanvas);this.backgroundIndexContext.drawImage(this.indexFrameCanvas,0,0);}
  }
  resizeIndexTarget(canvas){if(canvas.width!==this.canvas.width||canvas.height!==this.canvas.height){canvas.width=this.canvas.width;canvas.height=this.canvas.height;}}
  beginIndexedFacade(){
    if(!this.assets.nativeIndices?.size)return;
    this.nativePalette??=nativeAnimatedPalette(this.currentSky,this.rainColors.palette,this.effectsClock.palette);
    this.resizeIndexTarget(this.indexFrameCanvas);this.indexContext.setTransform(1,0,0,1,0,0);this.indexContext.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.indexContext.imageSmoothingEnabled=false;this.indexContext.setTransform(this.ctx.getTransform());this.indexCapture=true;
  }
  recolorRetainedFacade(){
    if(this.retainedPaletteKey===this.indexPaletteKey)return;
    const pixels=this.facadeContext.getImageData(0,0,this.facadeCanvas.width,this.facadeCanvas.height),plane=this.facadeIndexContext.getImageData(0,0,this.facadeIndexCanvas.width,this.facadeIndexCanvas.height);
    recolorIndexedPixels(pixels.data,plane.data,this.nativePalette,{details:this.retainedDetail});this.facadeContext.putImageData(pixels,0,0);this.retainedPaletteKey=this.indexPaletteKey;
  }
  retainFacade(tower,viewport) {
    const viewKey=[this.camera.x,this.camera.y,this.zoom,this.canvas.width,this.canvas.height].join(':');
    this.facadeGrid.sync(tower.state,viewport,{paused:Boolean(this.nativePaused)});
    const overlays=this.facadeGrid.redraw(interiorSampleEpoch(tower.state),{paused:Boolean(this.nativePaused),capture:this.guiCapture||Boolean(tower.state.elevatorPreview)});
    const scale=this.canvas.width/this.width;
    if(this.indexCapture&&this.textureAssets&&overlays.length&&this.facadeViewKey===viewKey&&!this.retainedDetail){
      const pixels=this.facadeContext.getImageData(0,0,this.facadeCanvas.width,this.facadeCanvas.height),plane=this.facadeIndexContext.getImageData(0,0,this.facadeIndexCanvas.width,this.facadeIndexCanvas.height).data;
      this.retainedDetail=retainedPaletteDetails(pixels.data,plane,this.retainedPalette);
    }
    const previousDetail=this.retainedDetail,previousPlane=this.indexCapture&&previousDetail&&this.facadeViewKey===viewKey?this.facadeIndexContext.getImageData(0,0,this.facadeIndexCanvas.width,this.facadeIndexCanvas.height).data:null;
    if(this.indexCapture&&overlays.length&&this.facadeViewKey===viewKey)this.recolorRetainedFacade();
    for(const part of overlays) {
      const x=((part.x-this.camera.x)*this.zoom+this.width/2)*scale,y=((part.y-this.camera.y)*this.zoom+this.height/2)*scale;
      this.ctx.drawImage(this.facadeViewKey===viewKey?this.facadeCanvas:this.backgroundCanvas,x,y,8*this.zoom*scale,36*this.zoom*scale,part.x,part.y,8,36);
      if(this.indexCapture)this.indexContext.drawImage(this.facadeViewKey===viewKey?this.facadeIndexCanvas:this.backgroundIndexCanvas,x,y,8*this.zoom*scale,36*this.zoom*scale,part.x,part.y,8,36);
      if(part.ink)this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    }
    if(this.facadeCanvas.width!==this.canvas.width||this.facadeCanvas.height!==this.canvas.height){this.facadeCanvas.width=this.canvas.width;this.facadeCanvas.height=this.canvas.height;}
    this.facadeContext.drawImage(this.canvas,0,0);this.facadeViewKey=viewKey;
    if(this.indexCapture){this.resizeIndexTarget(this.facadeIndexCanvas);this.facadeIndexContext.drawImage(this.indexFrameCanvas,0,0);this.retainedPaletteKey=this.indexPaletteKey;
      this.retainedDetail=null;
      if(this.textureAssets&&overlays.length){const pixels=this.facadeContext.getImageData(0,0,this.facadeCanvas.width,this.facadeCanvas.height),plane=this.facadeIndexContext.getImageData(0,0,this.facadeIndexCanvas.width,this.facadeIndexCanvas.height).data;
        this.retainedDetail=retainedPaletteDetails(pixels.data,plane,this.nativePalette);
        if(previousPlane)for(const part of overlays)retainPaletteDetailRect(this.retainedDetail,plane,previousDetail,previousPlane,this.canvas.width,{x:((part.x-this.camera.x)*this.zoom+this.width/2)*scale,y:((part.y-this.camera.y)*this.zoom+this.height/2)*scale,width:8*this.zoom*scale,height:36*this.zoom*scale});
      }
      this.retainedPalette=this.nativePalette;
    }
  }
  render(tower, elapsed,{palette=true,sky=true,backgroundRefresh=true}={}) {
    this.camera=nativeScrollCamera(this.camera,this.width,this.height,this.zoom);
    if(palette)this.palettePhase(tower,elapsed*1000);
    if(this.textureAssets!==this.enhancedPaletteAssets){this.applyEnhancedIndexedColors();this.enhancedPaletteAssets=this.textureAssets;}
    const ctx = this.ctx, s = tower.state;
    this.clock = elapsed;
    const night = !clockTime(s.tick).daylight;
    if(!this.guiCapture){if(sky)this.updateSky(tower);if(palette&&this.nativeTickFrame!==false)this.palettePhase(tower);}
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save(); ctx.translate(this.width / 2, this.height / 2); ctx.scale(this.zoom, this.zoom); ctx.translate(-this.camera.x, -this.camera.y);
    this.beginIndexedFacade();
    const left = this.camera.x - this.width / this.zoom / 2, right = this.camera.x + this.width / this.zoom / 2;
    const top = this.camera.y - this.height / this.zoom / 2, bottom = this.camera.y + this.height / this.zoom / 2;
    const viewport={left,right,top,bottom};
    const redraw=nativeRedrawPlan(s,this.mapMode||(this.evaluation?1:0));
    if(!s.elevatorPreview)this.facadeGrid.sync(s,viewport,{paused:Boolean(this.nativePaused)});
    for(const part of sceneBackgroundSprites(viewport))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    const clouds=this.sceneClouds(tower,viewport,{backgroundRefresh});
    for(const cloud of clouds)this.sprite(cloud.sheet,cloud.x,cloud.y,cloud.width,cloud.height);
    for(const part of citySprites(viewport))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    // B3A3→35480 composites structural edges/canopies/crane into the
    // retained background.1E299 blanks floor records inside these edges.
    for(const [f,bounds]of Object.entries(s.floors))if(+f>=0){
      const y=-(+f+1)*FLOOR;if(y>bottom||y+FLOOR<top)continue;
      this.sprite(1069,bounds.x*CELL-24,y,24,36,0,0,24,36);
      this.sprite(1069,(bounds.x+bounds.width)*CELL,y,24,36,24,0,24,36);
    }
    for(const part of lobbyCanopies(s.floors[0]))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    if(redraw.crane&&s.crane)this.sprite(1002,s.crane.x*CELL,-(s.crane.floor+2)*FLOOR,36,36);
    this.retainBackground();
    if(!s.elevatorPreview){
    this.sampleInteriors(tower,viewport);
    const floors = Object.entries(s.floors).sort((a, b) => +a[0] - +b[0]);
    for (const [f, bounds] of floors) {
      const floor = +f, x = bounds.x * CELL, y = -(floor + 1) * FLOOR, w = bounds.width * CELL;
      if (y > bottom || y + FLOOR < top) continue;
      if (bounds.lobby) {
        for(const part of lobbySlices(bounds,floor,s.star,lobbyHeight(s)))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
      }
      else {
        for(let tx=0;tx<w;tx+=CELL)this.sprite(1000,x+tx,y,CELL,FLOOR,16,0,CELL,FLOOR);
      }

    }
    for(const debris of s.rubble??[])for(const part of nativeRubbleSprites(debris))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    for (const room of s.rooms) {
      const x = room.x * CELL, y = -(room.floor + 1) * FLOOR;
      if (y > bottom || y + (room.height || 1) * FLOOR < top) continue;
      this.room(room, tower, night);
      const poses=room.constructionRemaining>0?Array.from({length:room.height||1},(_,level)=>room.nativeConstructionParts?.find(part=>part.level===level)?.completed?[]:this.interiorPoses.get(`${room.id}:${level}`)?.poses||[]).flat():this.interiorPoses.get(room.id)?.poses||[];
      for(const part of room.constructionRemaining>0?constructionInteriorSprites(room,poses):roomInteriorSprites(room,poses))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
      const appearance=diagnosticAppearance(room,this.mapMode || (this.evaluation?1:0));
      if(appearance)for(let column=0;column<room.width;column++)for(let level=0;level<(room.height||1);level++) {
        const h=appearance.hatch;this.sprite(h.sheet,x+column*CELL,y+level*FLOOR,h.width,h.height,h.sx,h.sy,h.width,h.height);
      }
    }
    }else {for(const [floor,bounds] of Object.entries(s.floors))for(let cell=bounds.x;cell<bounds.x+bounds.width;cell++)this.sprite(1000,cell*CELL,-(+floor+1)*FLOOR,8,36,24,0,8,36);}
    if(!s.elevatorPreview)this.retainFacade(tower,viewport);
    if(redraw.links)for (const l of s.links) {
      const x = l.x * CELL, y = -(l.floor + 1) * FLOOR;
      const frame=linkAnimationFrame(l.key,s.tick,activeLinkCounts(s.people,l.id),l.span??1);
      for(const part of linkSprites(l,frame))this.sprite(part.id,x,y+part.dy,l.width*CELL,part.height,part.sx,0,64,part.height);
    }
    for (const sh of s.shafts) {
      const x = sh.x * CELL, y = -(sh.high + 1) * FLOOR, h = (sh.high - sh.low + 1) * FLOOR, w = sh.width * CELL;
      for (let f = sh.low; f <= sh.high; f++) {
        const sy = -(f + 1) * FLOOR;
        if(sh.visible!==false){for(let tx=0;tx<w;tx+=16)this.sprite(1068,x+tx,sy,16,36);for(const part of shaftNumberSlices(sh,f))this.sprite(part.sheet,x+part.dx,sy,part.width,part.height,part.sx,0,part.width,part.height);}
        else {ctx.fillStyle='#000';ctx.fillRect(x,sy,1,35);ctx.fillRect(x+w-1,sy,1,35);
          if(this.indexCapture){this.indexContext.setTransform(ctx.getTransform());this.indexContext.fillStyle='#fff';this.indexContext.fillRect(x,sy,1,35);this.indexContext.fillRect(x+w-1,sy,1,35);}}
      }
      if(redraw.cars)for (const car of nativeCarOrder(sh)) {
        const cy = -(car.floor + 1) * FLOOR;
        // Standard sheet frame 3 is the FIRE indicator, not a full car.
        const frame = car.people.length === 0 ? 0 : Math.min(sh.key === 'express' ? 3 : 2, 1 + Math.floor(car.people.length / (sh.key === 'express' ? 14 : 10)));
        const id = sh.key === 'express' ? 1067 : sh.key === 'service' ? 1066 : 1065;
        this.sprite(id, x, cy, w, 36, frame * w, 0, w, 36);
      }
      for(const part of nativeShaftEndSprites(sh))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    }
    const queues = new Map(),queueBounds=new Map(),actors=new Map(s.actors.map(a=>[a.id,a])),rooms=new Map(s.rooms.map(r=>[r.id,r]));
    if(redraw.queues)for (const p of [...s.people].sort((a,b)=>(a.queueOrder??a.id)-(b.queueOrder??b.id))) {
      if (p.stage === 'car'||p.stage==='link'||p.actor&&p.stage!=='queue') continue;
      let x=p.x*CELL;const y=-(p.floor+1)*FLOOR,a=actors.get(p.actor),r=rooms.get(p.room);
      let frame = personFrame(p,a,r,s,tower.data);
      let anchor=-8;
      if (p.stage === 'queue') {
        const key=`${p.path[0]?.id}:${p.floor}:${Number(p.path[0].to>p.floor)}`,earlier=queues.get(key)||[],sh=s.shafts.find(sh=>sh.id===p.path[0].id);
        if(sh){
          x=nativeQueuePosition(sh,p,earlier,frame)*CELL;anchor=0;
          const boundsKey=`${sh.id}:${p.floor}`;
          if(!queueBounds.has(boundsKey))queueBounds.set(boundsKey,nativeQueueBounds(s,sh,p.floor));
          const span=nativeQueueVisibleSpan(queueBounds.get(boundsKey),x/CELL,frame.width/CELL,p.path[0].to>p.floor);
          earlier.push(frame);queues.set(key,earlier);
          if(!span)continue;
          x=span.x*CELL;frame={...frame,x:frame.x+span.sourceX*CELL,width:span.width*CELL};
        }
        else {earlier.push(frame);queues.set(key,earlier);}
      }
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y + 12));
      if (frame.flip) ctx.scale(-1, 1);
      if(frame.ink){const image=this.personInk(frame);ctx.drawImage(image,anchor,0,frame.width,frame.height);
        if(this.indexCapture&&image.nativeIndices){this.indexContext.setTransform(ctx.getTransform());this.indexContext.drawImage(image.nativeIndices,anchor,0,frame.width,frame.height);}}
      else this.sprite(frame.sheet,anchor,0,frame.width,frame.height,frame.x,frame.y,frame.width,frame.height);
      ctx.restore();
    }
    const marker=redraw.findMarker&&findMarkerSprite(this.findMarker);if(marker)this.sprite(marker.sheet,marker.x,marker.y,marker.width,marker.height);
    if(redraw.santa&&s.santa)this.sprite(904,s.santa.x,s.santa.y,140,48,0,0,140,48);
    if(redraw.emergency)for(const part of emergencySprites(s,viewport))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    if(!s.elevatorPreview)for(const r of s.rooms.filter(r=>r.key==='cathedral')){
      if(!this.guiCapture)this.cathedralRenderClock.update(s,r,viewport,{peopleAnimations:this.showPeople});
      for(const part of cathedralCeremonySprites(s,r))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    }
    if (this.preview) {
      const ghost=nativeConstructionGhost(this.preview,viewport);
      if(ghost){ctx.strokeStyle=ghost.stroke;ctx.lineWidth=ghost.lineWidth;ctx.setLineDash([]);ctx.strokeRect(ghost.x+.5,ghost.y+.5,ghost.width-1,ghost.height-1);
        if(this.indexCapture){this.indexContext.setTransform(ctx.getTransform());this.indexContext.save();this.indexContext.globalCompositeOperation='destination-out';this.indexContext.lineWidth=ghost.lineWidth;this.indexContext.strokeRect(ghost.x+.5,ghost.y+.5,ghost.width-1,ghost.height-1);this.indexContext.restore();}}
    }
    this.finishIndexedFrame();
    ctx.restore();
    this.renderMap(tower);
  }
  personInk(frame) {
    const enhanced=this.textureAssets?.get(frame.sheet),scale=enhanced?enhanced.width/this.assets.get(frame.sheet).width:1;
    const key=`${frame.sheet}:${frame.x}:${frame.width}:${frame.ink.palette}:${enhanced?'waifu':'original'}`;
    if(this.peopleInk.has(key))return this.peopleInk.get(key);
    const canvas=document.createElement('canvas');canvas.width=frame.width*scale;canvas.height=frame.height*scale;
    const ctx=canvas.getContext('2d');ctx.drawImage(enhanced||this.gameplaySprite(frame.sheet),frame.x*scale,frame.y*scale,frame.width*scale,frame.height*scale,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),plane=this.assets.nativeIndices?.get(frame.sheet);
    if(plane){const indexData=plane.getContext('2d').getImageData(frame.x,frame.y,frame.width,frame.height),indices=indexData.data;
      let sourceRGBA;if(enhanced){const source=document.createElement('canvas');source.width=frame.width;source.height=frame.height;const sourceCtx=source.getContext('2d');sourceCtx.drawImage(this.assets.get(frame.sheet),frame.x,frame.y,frame.width,frame.height,0,0,frame.width,frame.height);sourceRGBA=sourceCtx.getImageData(0,0,frame.width,frame.height).data;}
      tintNativePersonPixels(pixels.data,indices,frame.ink.rgb,{width:frame.width,height:frame.height,scale,sourceRGBA});
      const tintCanvas=document.createElement('canvas');tintCanvas.width=frame.width;tintCanvas.height=frame.height;indexData.data.set(tintNativeIndexPlane(indices,frame.ink.palette));tintCanvas.getContext('2d').putImageData(indexData,0,0);canvas.nativeIndices=tintCanvas;
    }
    ctx.putImageData(pixels,0,0);this.peopleInk.set(key,canvas);return canvas;
  }
  room(r, tower, night) {
    const spec = CATALOG[r.key], x = r.x * CELL, y = -(r.floor + 1) * FLOOR, w = r.width * CELL;
    const ctx = this.ctx;
    if (r.constructionRemaining > 0) {
      if(r.nativeConstructionParts?.some(part=>part.completed))this.room({...r,constructionRemaining:0},tower,night);
      for(const part of nativeConstructionSprites(r)){
        const level=Math.floor((part.y-y)/FLOOR),record=r.nativeConstructionParts?.find(record=>record.level===level);
        if(record?.completed)continue;
        this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
      }
      return;
    }
    for(const part of nativeFacadeHeaderSprites(r,this.assets))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
    if(['metro','recycling'].includes(r.key)){for(const part of r.key==='metro'?metroSprites(r):recyclingSprites(r))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);return;}
    if(SHOW_TYPES.has(r.key)){for(const part of showSprites(r))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);return;}
    if(r.key==='cathedral') {for(const part of cathedralSprites(r,night))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);return;}
    if(r.key==='secom'){for(const part of secomFacadeSprites(r))this.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);return;}
    if ((r.height || 1) > 1) {
      if (r.key === 'recycling') this.sprite(2280 + (r.garbageStage || 0), x, y + 12, w, 60, 0, 0, w, 60);
      else if(r.key==='cinema') {
        // 0x2E172 inserts a 7-cell booth beside the 24-cell auditorium.
        const booth=r.width>=31?56:0; // Preserve legacy browser-save footprints.
        if(booth)[3176,3240].forEach((id,level)=>this.sprite(id,x,y+level*FLOOR,56,36,0,0,56,36));
        [2152,2216].forEach((id,level)=>this.sprite(id,x+booth,y+level*FLOOR,192,36,(r.movie?.active?2:night?3:0)*192,0,192,36));
      }
      else {
        const ids = r.key === 'cinema' ? [2152, 2216] : r.key === 'partyhall' ? [2856, 2920] : r.key === 'metro' ? [2984, 3048, 3112] : [3304, 3368, 3432, 3496, 3560];
        ids.forEach((id, level) => {
          const img = this.assets.get(id), sh = img.height;
          const frame = r.key === 'cinema' ? r.occupied ? 2 : 0 : r.key === 'partyhall' ? r.occupied ? 2 : 0 : r.key==='metro' && r.metroTrain ? 2 : night ? 1 : 0;
          this.sprite(id, x, y + level * FLOOR + (sh === 24 ? 12 : 0), w, sh, Math.min(frame * w, img.width - w), 0, w, sh);
        });
      }
      return;
    }
    let id = spec.sprite, sx = 0, sw = w;
    if(['office','condo'].includes(r.key)){const frame=tenantRoomSprite(r,tower.state.tick);this.sprite(frame.sheet,x,y+12,w,24,frame.x,frame.y,frame.width,frame.height);return;}
    else if (HOTELS.has(r.key)||COMMERCIAL_TYPES.has(r.key)) {
      const frame=HOTELS.has(r.key)?hotelSprite(r,tower.state.tick):commercialSprite(r);
      this.sprite(frame.sheet,x,y+12,w,24,frame.x,frame.y,frame.width,frame.height);return;
    }
    else if (r.key === 'parking'||r.key==='medical') {const frame=r.key==='parking'?parkingSprite(r,r.parkingAccessible??parkingReachable(tower.state,r)):clinicSprite(r,tower.state.actors,tower.state.tick);this.sprite(frame.sheet,x,y+12,w,24,frame.sx,frame.sy,frame.width,frame.height);return;}
    else if (r.key === 'ramp') { id = rampSprite(tower.state,r).sheet; sx = 0; }
    const img = this.assets.get(id);
    if (img) { sw = Math.min(w, img.width); if (sx + sw > img.width) sx = 0; this.sprite(id, x, y + (img.height === 36 || img.height === 60 ? 0 : 12), w, img.height === 36 || img.height === 60 ? 36 : 24, sx, 0, sw, Math.min(36, img.height)); }
  }
  renderMap(tower) {
    const ctx=this.map,s=tower.state;ctx.imageSmoothingEnabled=false;ctx.drawImage(this.gameplaySprite(352),0,0);
    const fill=rect=>ctx.fillRect(rect.x,rect.y,Math.max(1,rect.width),Math.max(1,rect.height));
    ctx.fillStyle=MAP_COLORS.structure;
    for(const [floor,b] of Object.entries(s.floors))fill(mapFacilityRect({...b,floor:+floor}));
    if(this.mapMode)for(const room of s.rooms){const appearance=diagnosticAppearance(room,this.mapMode);if(appearance){ctx.fillStyle=appearance.color;fill(mapFacilityRect(room));}}
    for(const shaft of s.shafts){const line=mapShaftLine(shaft);ctx.strokeStyle=line.color;ctx.beginPath();ctx.moveTo(line.x+.5,line.y);ctx.lineTo(line.x+.5,line.y+line.height);ctx.stroke();}
    if(this.mapMode){const legend=this.gameplaySprite(312+this.mapMode);ctx.drawImage(legend,200-legend.width,0);}
    this.mapProjection=mapViewportRect(this.camera,this.width,this.height,this.zoom);
    const v=this.mapProjection;ctx.strokeStyle='#000';ctx.setLineDash([1,1]);ctx.strokeRect(v.x+.5,v.y+.5,v.width,v.height);ctx.setLineDash([]);
  }
  mapNavigate(x,y) {const result=mapNavigation({x,y},this.mapProjection??mapViewportRect(this.camera,this.width,this.height,this.zoom));if(result)this.camera=result.camera;}
  updateEffects(now) {
    //USER menu/DialogBox loops suspend4A256's idle effects work. A paused
    //tower still reaches that work; only actual GUI capture freezes it.
    if(this.guiCapture||this.nativeGuiRedraw)return false;
    const palette=this.effectsClock.advance(now,this.effectsEnabled);if(!palette)return false;this.setEffectsPalette(palette);return true;
  }
  setEffectsPalette(palette){
    this.peopleInk.clear();
    if(this.assets.nativeIndices?.size){this.applyIndexedColors(this.currentSky,this.rainColors.palette);return true;}
    if(!this.effectsSources.size)for(const [id,image] of this.assets){if(SKY_ASSETS.has(id))continue;const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),indices=collectEffectsPixels(pixels.data);if(indices.length){this.effectsSources.set(id,{canvas,ctx,pixels,indices});this.assets.set(id,canvas);}}
    for(const source of this.effectsSources.values()){applyEffectsPalette(source.pixels.data,source.indices,palette);source.ctx.putImageData(source.pixels,0,0);}
  }
  palettePhase(tower,now=performance.now(),{present=false}={}) {
    if(!this.updateEffects(now))return false;
    this.rainColors.advanceEffects(this.effectsClock.counter,tower.state.tick,tower.state.rain);
    if(this.currentSky)this.applySceneColors(this.currentSky,this.rainColors.palette);
    if(present)this.presentIndexedPalette();
    return true;
  }
  finishIndexedFrame(){
    this.presentedFrame=Boolean(this.indexCapture);this.indexCapture=false;this.presentedPalette=this.nativePalette;this.presentedPaletteKey=this.indexPaletteKey;this.presentedDetail=null;
    this.presentedWidth=this.canvas.width;this.presentedHeight=this.canvas.height;
  }
  presentIndexedPalette(){
    if(!this.presentedFrame||this.presentedPaletteKey===this.indexPaletteKey||this.canvas.width!==this.presentedWidth||this.canvas.height!==this.presentedHeight)return false;
    const pixels=this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height),plane=this.indexContext.getImageData(0,0,this.canvas.width,this.canvas.height).data;
    if(this.textureAssets&&!this.presentedDetail)this.presentedDetail=retainedPaletteDetails(pixels.data,plane,this.presentedPalette);
    recolorIndexedPixels(pixels.data,plane,this.nativePalette,{details:this.presentedDetail});this.ctx.putImageData(pixels,0,0);this.presentedPaletteKey=this.indexPaletteKey;return true;
  }
  updateSky(tower) {
    //A native actor/car modal suspendsFD4B beforeFFAF. Do not write the
    //new tick's sky until that continuation returns to the late stage.
    if(this.nativeTickFrame===false&&this.currentSky&&this.skyEpoch!==null)return;
    const epoch=interiorSampleEpoch(tower.state),initialize=!this.currentSky||this.skyEpoch===null,force=initialize||epoch!==this.skyEpoch&&nativeSkyResetDue(tower.state.tick,tower.state.rain);
    //Outside5F8B's interpolation windows ARG0=0 makes no palette write.
    //Retain the last rounded transition colors, including2599→0 rollover.
    const sky=force?skyPalette(tower.data,tower.state.tick,tower.state.rain):this.currentSky;
    if(force&&nativeFullSkyResetDue(tower.state.tick,tower.state.rain,{initialize})){this.effectsClock.palette=EFFECTS_BASE_PALETTE;this.setEffectsPalette(EFFECTS_BASE_PALETTE);}
    this.rainColors.resetSky(sky,{force});this.skyEpoch=epoch;this.currentSky=sky;
    this.applySceneColors(sky,this.rainColors.palette);
  }
  applySceneColors(sky,rain) {
    const key=[...sky,...rain].flat().join(',');
    if(key===this.paletteKey)return;this.paletteKey=key;
    if(this.assets.nativeIndices?.size){this.applyIndexedColors(sky,rain);return;}
    for(const id of SKY_ASSETS){const record=this.sceneIndices[id];if(!record)continue;
      if(!this.skySources.has(id)){const image=this.assets.get(id),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),indices=collectScenePixels(Uint8Array.from(atob(record.indices),char=>char.charCodeAt(0)));this.skySources.set(id,{canvas,ctx,pixels,indices});this.assets.set(id,canvas);}
      const source=this.skySources.get(id);applyScenePalette(source.pixels.data,source.indices,sky,rain);source.ctx.putImageData(source.pixels,0,0);
    }
  }
  applyIndexedColors(sky,rain) {
    const palette=nativeAnimatedPalette(sky,rain,this.effectsClock.palette),key=JSON.stringify([...palette]);
    if(key===this.indexPaletteKey)return;this.nativePalette=palette;this.indexPaletteKey=key;
    this.peopleInk.clear();
    for(const source of this.indexedPaletteSources.values()){recolorSelectedIndexedPixels(source.pixels.data,source.indices,palette);source.ctx.putImageData(source.pixels,0,0);}
    this.applyEnhancedIndexedColors(palette);
  }
  applyEnhancedIndexedColors(palette=this.nativePalette){
    if(!palette||!this.textureAssets?.nativePaletteSources)return;
    for(const source of this.textureAssets.nativePaletteSources.values()){recolorSelectedIndexedPixels(source.pixels.data,source.indices,palette,{details:source.details});source.ctx.putImageData(source.pixels,0,0);}
  }

}

export async function defaultImageLoader(url){const image=new Image();image.src=url;await image.decode();return image;}
export async function defaultJSONLoader(url){const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url}`);return response.json();}

export async function loadAssets(manifest,{loadImage=defaultImageLoader,loadJSON=defaultJSONLoader}={}) {
  const assets = new Map(), keyed = new Set([900, 901, 902, 903, 904, 1001,1002,1003,21256,700,702,703, 1069, 1128, 1129, 1512, 1513, 1514, 1515, 1516, 1517, 1518, 2088, 2408, 2409, 2472, 2473, 2728, 2792,3944,3945,3946,3947,3948,3949,4073,4074]);
  const native=await loadJSON('/assets/native-indices.json');assets.nativeBasePalette=native.basePalette;assets.nativeIndices=new Map();assets.nativeAnimated=new Set();assets.nativeIndexedPixels=new Map();
  await Promise.all(manifest.resources.filter(r => r.path.endsWith('.png')).map(async r => {
    const imagePromise=loadImage(r.path.replace('public/', '/'));
    const record=native.resources[r.id];
    if(!record){assets.set(r.id,await imagePromise);return;}
    const [img,plane]=await Promise.all([imagePromise,loadImage(record.path)]);
    const indexCanvas=document.createElement('canvas');indexCanvas.width=img.width;indexCanvas.height=img.height;const indexCtx=indexCanvas.getContext('2d',{willReadFrequently:true});indexCtx.drawImage(plane,0,0);
    const indices=indexCtx.getImageData(0,0,img.width,img.height),transparent=keyed.has(r.id)||r.id===3624;
    if(transparent)applyNativeIndexMask(indices.data,indices.data,{transparent:true});indexCtx.putImageData(indices,0,0);assets.nativeIndices.set(r.id,indexCanvas);
    if(record.animated){assets.nativeAnimated.add(r.id);assets.nativeIndexedPixels.set(r.id,collectIndexedPalettePixels(indices.data));}
    if (!transparent) { assets.set(r.id, img); return; }
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, img.width, img.height);
    applyNativeIndexMask(image.data,indices.data,{transparent:true});
    ctx.putImageData(image, 0, 0); assets.set(r.id, canvas);
  }));
  return assets;
}

export async function loadTextureAssets(manifest, originals,{loadImage=defaultImageLoader}={}) {
  const assets = new Map();assets.nativePaletteSources=new Map();
  await Promise.all(manifest.resources.map(async r => {
    const original = originals.get(r.id);
    if (!original || r.scale !== 2 || r.width !== original.width || r.height !== original.height)
      throw new Error(`Invalid texture resource ${r.id}`);
    const img=await loadImage(`/${r.path}`);
    if (img.width !== original.width * 2 || img.height !== original.height * 2)
      throw new Error(`Wrong texture dimensions for resource ${r.id}`);
    //Always replace legacy generator masks with the current native mask.
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,img.width,img.height);
    const originalCanvas=document.createElement('canvas');originalCanvas.width=original.width;originalCanvas.height=original.height;const originalCtx=originalCanvas.getContext('2d');originalCtx.drawImage(original,0,0);const rgba=originalCtx.getImageData(0,0,original.width,original.height).data;
    applyUpscaledNativeAlpha(pixels.data,rgba,original.width,original.height,r.scale);
    ctx.putImageData(pixels,0,0);assets.set(r.id,canvas);
    if(originals.nativeAnimated?.has(r.id)){const plane=originals.nativeIndices.get(r.id),indexCanvas=document.createElement('canvas');indexCanvas.width=plane.width;indexCanvas.height=plane.height;const indexCtx=indexCanvas.getContext('2d');indexCtx.drawImage(plane,0,0);
      const detail=upscaledPaletteDetails(pixels.data,rgba,indexCtx.getImageData(0,0,plane.width,plane.height).data,original.width,original.height,r.scale);
      assets.nativePaletteSources.set(r.id,{canvas,ctx,pixels,indices:detail.pixels,details:detail.details});}
  }));
  return assets;
}
