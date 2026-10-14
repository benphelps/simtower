// 0xC674 pauses and selects the magnifier. Resuming a diagnostic view first
// returns to Edit through36570, which selects the magnifier and runs again.
export function nativePauseToggle(controls) {
  if(controls.preview)return {...controls};
  if(!controls.running&&controls.view)return {...controls,running:true,view:0,mode:'inspect'};
  return {...controls,running:!controls.running,mode:controls.running?'inspect':controls.mode};
}
// 0x36570: all four map view buttons select the magnifier. Only Edit runs.
export function nativeViewSelection(controls,view) {
  if(controls.preview||!nativeViewEnabled(view,controls.star))return {...controls};
  return {...controls,view,running:view===0,mode:'inspect'};
}
// 0xC506 accepts only map buttons0..2 at one star; Hotel becomes clickable
// at two stars. Its original grey/selected artwork is still drawn byF192.
export function nativeViewEnabled(view,star) {return [0,1,2,3].includes(view)&&(view!==3||star!==1);}
// 0xC6E1 ignores tool selection while paused; C330 permits the already-
// selected magnifier. The modeless elevator schedule disables Edit inputs.
export function nativeToolAllowed(mode,controls) {
  if(controls.preview||controls.scheduleOpen||controls.scrolling)return false;
  return controls.running||mode==='inspect';
}
// Main loop4A0C3 advances only from its idle branch. A modeless elevator
// schedule stays in that loop; normal DialogBox dialogs block it. Browser
// wheel/scrollbar/pan capture needs the equivalent temporary gate, leaving
// the user's chosen running state and Fast Mode untouched.
export function nativeSimulationActive(controls) {
  return Boolean(controls.running&&!controls.preview&&!controls.scrolling&&!controls.modalOpen&&!controls.menuCapture);
}

// 0xC818/0xBE03 open the grouped palette immediately while held, in a
// modal DialogBox.0xBE77 uses32px rows and cancels on moving outside.
export function nativePopupChoice(point,width,rowHeight,count) {
  return point.x>=0&&point.x<width&&point.y>=0&&point.y<rowHeight*count?Math.trunc(point.y/rowHeight):null;
}

export const NATIVE_SITE_WIDTH=3000,NATIVE_SITE_HEIGHT=4320,NATIVE_GROUND_Y=3960;
export const NATIVE_SYSTEM_METRICS={frameX:4,frameY:4,borderX:1,borderY:1,scrollX:16,scrollY:16,caption:18,menu:18};
//274D7 establishes client limits;27A7E places the normal main window at
//(204,53).523A0.left/top100 are minimum client extents, not its position.
export function nativeMainWindowGeometry(desktopWidth,desktopHeight,metrics=NATIVE_SYSTEM_METRICS) {
  const clientMaxWidth=Math.min(816,desktopWidth-metrics.scrollX),clientMaxHeight=Math.min(576,desktopHeight-metrics.caption-metrics.scrollY-metrics.menu);
  const normal={x:204,y:53,width:Math.max(0,Math.min(desktopWidth-204,clientMaxWidth-1)),height:Math.max(0,Math.min(desktopHeight-53,clientMaxHeight-1))};
  //2ADA5 WM_GETMINMAXINFO supplies maximum size and tracking limits.
  const minimum={width:2*metrics.frameX+100+metrics.scrollX,height:2*metrics.frameY+100+metrics.scrollY+4*metrics.menu+metrics.caption};
  const maximum={width:2*metrics.frameX+clientMaxWidth+metrics.scrollX-metrics.borderX,height:2*metrics.frameY+clientMaxHeight+metrics.scrollY+metrics.menu+metrics.caption-metrics.borderY};
  return {normal,minimum,maximum,maximized:{x:-metrics.frameX,y:-metrics.frameY,...maximum}};
}
// 0x27BD4 initializes the Edit scroll offsets once. New19BDD leaves
// them intact; Open1A82E reads both offsets from the tower file.
export function nativeInitialCamera(width,height) {
  return nativeCameraFromScroll({x:Math.trunc((NATIVE_SITE_WIDTH-width)/2),y:NATIVE_SITE_HEIGHT-height-324},width,height);
}
export function nativeCameraFromScroll(scroll,width,height) {
  const x=nativeScrollPosition(0,'thumb',width,NATIVE_SITE_WIDTH,scroll.x);
  const y=nativeScrollPosition(0,'thumb',height,NATIVE_SITE_HEIGHT,scroll.y);
  return {x:x+width/2,y:y-NATIVE_GROUND_Y+height/2};
}
// Browser JSON predating editorScroll has no native view coordinates.
// Preserve an existing Edit view; on the first Open, bring its ground
// foundation into view once, then save normal pixel offsets thereafter.
export function nativeOpenedCamera(state,camera,width,height,existingView=false) {
  if(Number.isFinite(state.editorScroll?.x)&&Number.isFinite(state.editorScroll?.y))return nativeCameraFromScroll(state.editorScroll,width,height);
  if(existingView)return nativeScrollCamera(camera,width,height);
  const initial=nativeInitialCamera(width,height),ground=state.floors?.[0];
  return ground?nativeScrollCamera({x:(ground.x+ground.width/2)*8,y:initial.y},width,height):initial;
}
export function nativeCameraScroll(camera,width,height) {
  return {x:nativeScrollPosition(0,'thumb',width,NATIVE_SITE_WIDTH,camera.x-width/2),y:nativeScrollPosition(0,'thumb',height,NATIVE_SITE_HEIGHT,camera.y+NATIVE_GROUND_Y-height/2)};
}
// Win3.1 standard scroll bars use a fixed system-metric thumb rather than
// a proportional document-length thumb. Geometry is browser chrome only.
export function nativeScrollbarGeometry(extent,viewportExtent,siteExtent,position,metric=16) {
  const track=Math.max(0,extent-2*metric),thumb=Math.min(metric,track),travel=track-thumb,max=Math.max(0,siteExtent-viewportExtent);
  return {thumb,travel,max,offset:max?Math.round(Math.min(max,Math.max(0,position))*travel/max):0};
}
// 0x2AA30 WM_HSCROLL/WM_VSCROLL: sixteen pixels for line controls and
// viewport extent minus sixteen for page controls. Thumb tracking is absolute.
export function nativeScrollPosition(position,command,viewportExtent,siteExtent,thumb=position) {
  const change={lineBack:-16,lineForward:16,pageBack:-(viewportExtent-16),pageForward:viewportExtent-16}[command];
  const value=change===undefined?(command==='thumb'?thumb:position):position+change;
  return Math.max(0,Math.min(Math.max(0,siteExtent-viewportExtent),Math.trunc(value)));
}
export function nativeScrollCamera(camera,width,height,zoom=1) {
  const w=width/zoom,h=height/zoom;
  const x=nativeScrollPosition(camera.x-w/2,'thumb',w,NATIVE_SITE_WIDTH,camera.x-w/2);
  const y=nativeScrollPosition(camera.y+NATIVE_GROUND_Y-h/2,'thumb',h,NATIVE_SITE_HEIGHT,camera.y+NATIVE_GROUND_Y-h/2);
  return {x:x+w/2,y:y-NATIVE_GROUND_Y+h/2};
}

// 0xE8A4 runs after successful held construction: horizontal for floors,
// lobbies and parking; vertical for ramps and elevator end extension. It
// moves exactly the distance outside the client edge, thenE927 clamps it.
// The coordinate adapter accepts screen pixels and converts through zoom.
export function nativeConstructionAutoScroll(camera,point,width,height,axis,zoom=1) {
  const dx=axis==='x'?point.x<0?point.x:point.x>width?point.x-width:0:0;
  const dy=axis==='y'?point.y<0?point.y:point.y>height?point.y-height:0:0;
  if(!dx&&!dy)return {...camera};
  return nativeScrollCamera({x:camera.x+dx/zoom,y:camera.y+dy/zoom},width,height,zoom);
}

// 0x26EF0/0xBE77/0x2BEC0: floating windows have an eight-pixel caption.
// The six-pixel system box at(4,1) hides the window; the remainder drags it.
export function nativeFloatingWindowHit(point,width,height) {
  if(point.x<0||point.x>=width||point.y<0||point.y>=height)return null;
  if(point.y>=8)return 'client';
  return point.x>=4&&point.x<10&&point.y>=1&&point.y<7?'hide':'caption';
}
// 0xE530 hides floating windows while the main window is iconic, preserving
// their independent show flags for restore. This does not alter the clock's
// running bit;4A256 separately suspends background audio while inactive.
export function nativeFloatingVisibility(preferences,minimized=false) {
  return Object.fromEntries(Object.entries(preferences).map(([key,shown])=>[key,Boolean(shown&&!minimized)]));
}
// Win16 RT_ACCELERATOR9/1 is one five-byte entry:81 70 00 55 9C,
// FVIRTKEY|last, VK_F1, command40021. Other browser shortcuts are additions.
export function nativeAccelerator(event) {
  return event.key==='F1'&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&!event.metaKey?40021:null;
}
