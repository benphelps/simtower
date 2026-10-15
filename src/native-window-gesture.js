import {resizeDesktopRect} from './browser-window-geometry.js';

//Observed in the running Win3.1 USER system menu: first Size arrow selects
//an edge, a perpendicular arrow adds its corner, subsequent arrows resize.
export function nativeWindowGesture(rect,kind='move',edge='') {
  return {initial:{...rect},rect:{...rect},kind,edge};
}
export function nativeWindowGestureKey(gesture,key,minimum,step=8) {
  const vector={ArrowLeft:[-step,0,'w'],ArrowRight:[step,0,'e'],ArrowUp:[0,-step,'n'],ArrowDown:[0,step,'s']}[key];
  if(!vector)return false;
  const [dx,dy,edge]=vector;
  if(gesture.kind==='move')gesture.rect={...gesture.rect,x:gesture.rect.x+dx,y:gesture.rect.y+dy};
  else {
    const axis=dx?/[ew]/:/[ns]/;
    if(!axis.test(gesture.edge)){gesture.edge+=edge;return true;}
    gesture.rect=resizeDesktopRect(gesture.rect,gesture.edge,dx,dy,minimum);
  }
  return true;
}

//USER's tracking frame inverts a checker brush over existing screen pixels.
//A difference-composited canvas preserves the live window until commit.
export function drawNativeWindowOutline(canvas,rect) {
  canvas.width=Math.max(1,Math.round(rect.width));canvas.height=Math.max(1,Math.round(rect.height));
  Object.assign(canvas.style,{left:`${rect.x}px`,top:`${rect.y}px`});
  const ctx=canvas.getContext('2d'),tile=document.createElement('canvas');tile.width=tile.height=2;
  const ink=tile.getContext('2d');ink.fillStyle='#fff';ink.fillRect(0,0,1,1);ink.fillRect(1,1,1,1);
  ctx.fillStyle=ctx.createPattern(tile,'repeat');
  ctx.fillRect(0,0,canvas.width,4);ctx.fillRect(0,canvas.height-4,canvas.width,4);
  ctx.fillRect(0,4,4,canvas.height-8);ctx.fillRect(canvas.width-4,4,4,canvas.height-8);
}
