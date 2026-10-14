// Browser adaptation requested by the user: keep the original initial size,
// but let desktop windows grow beyond Win16's maximum tracking rectangle.
export function resizeDesktopRect(rect,edge,dx,dy,minimum) {
  const next={...rect};
  if(/[ew]/.test(edge)) {
    next.width=Math.max(minimum.width,rect.width+(edge.includes('w')?-dx:dx));
    if(edge.includes('w'))next.x=rect.x+rect.width-next.width;
  }
  if(/[ns]/.test(edge)) {
    next.height=Math.max(minimum.height,rect.height+(edge.includes('n')?-dy:dy));
    if(edge.includes('n'))next.y=rect.y+rect.height-next.height;
  }
  return next;
}
export function browserMaximizedRect(width,height,frame=4) {
  return {x:-frame,y:-frame,width:width+2*frame,height:height+2*frame};
}
