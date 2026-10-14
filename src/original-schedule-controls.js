// ELVDLOGMAIN 0x125F6: RT400 child7 is the only tab stop and is
// enabled only when more than fifteen inclusive floors are served.
// 0x13494 places row0 at the bottom; short shafts leave blank rows above.
export function nativeScheduleControls(shaft) {
  const span=shaft.high-shaft.low,scrollEnabled=span>14;
  return {scrollEnabled,initialFocus:scrollEnabled?7:null,bitmapTabIndex:-1,
    blankTopRows:Math.max(0,14-span),visibleRows:15};
}
// 0x125F6..1268F initializes rangeLOW..HIGH-14 at its maximum.
// 0x13914: displayed rowfloor=LOW+(MAX-POS)+row. ArrowUp decreasesPOS,
// showing higher floors; the initial page therefore shows the lowest15.
export function nativeScheduleScroll(shaft,position,command,value) {
  const min=shaft.low,max=Math.max(min,shaft.high-14);
  let next=position??max;
  if(command==='lineBack')next--;
  if(command==='lineForward')next++;
  if(command==='pageBack')next-=14;
  if(command==='pageForward')next+=14;
  if(command==='thumb')next=value;
  if(command==='home')next=min;
  if(command==='end')next=max;
  next=Math.max(min,Math.min(max,Math.round(next)));
  return {min,max,position:next,offset:(next-min)*13,topFloor:shaft.low+(max-next)+14};
}
