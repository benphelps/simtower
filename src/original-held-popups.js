// BE77 grouped tool DialogBox aligns the active32px row over its icon.
export function nativeToolbarPopupRect(button,selection,count,desktopHeight) {
  const height=count*32;let top=Math.max(0,button.top-selection*32);
  if(top+height>desktopHeight)top=desktopHeight-height;
  return {left:button.left,top,width:32,height};
}
//14221 uses the current departure*floor(bitmap405.height/3) for placement.
export function nativeDeparturePopupRect(button,departure) {
  return {left:button.left,top:button.top-departure*22,width:82,height:67};
}
//1445D/1459E accept the original inclusive bounds and divide3*y byH+1.
// Cancelling/outside retains the old departure; selecting the phase still
// happens when that popup returns.
export function nativeDeparturePopupChoice(point,previous) {
  return point.x<0||point.x>82||point.y<0||point.y>67?previous:Math.trunc(point.y*3/68);
}
