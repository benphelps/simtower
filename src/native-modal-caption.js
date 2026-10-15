//RT731 has WS_CAPTION without WS_SYSMENU. Its window procedure leaves
//nonclient movement to USER; the bitmap controls remain at DTMP coordinates.
export function attachNativeModalCaption(dialog) {
  let drag;
  const stop=()=>{drag=null;};
  const reset=()=>{stop();for(const property of ['left','top','margin'])dialog.style[property]='';};
  dialog.addEventListener('pointerdown',event=>{
    if(event.button!==0||dialog.dataset.template!=='731')return;
    const rect=dialog.getBoundingClientRect(),border=dialog.clientTop;
    if(event.clientY<rect.top+border||event.clientY>=rect.top+border+18)return;
    event.preventDefault();
    drag={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
    dialog.setPointerCapture(event.pointerId);
  });
  dialog.addEventListener('pointermove',event=>{
    if(!drag)return;
    dialog.style.margin='0';
    dialog.style.left=`${Math.max(36-dialog.offsetWidth,Math.min(document.body.clientWidth-36,drag.left+event.clientX-drag.x))}px`;
    dialog.style.top=`${Math.max(0,Math.min(document.body.clientHeight-18,drag.top+event.clientY-drag.y))}px`;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])dialog.addEventListener(type,stop);
  dialog.addEventListener('keydown',event=>{
    if(!drag||!['Escape','Enter'].includes(event.key))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.key==='Escape'){dialog.style.margin='0';dialog.style.left=`${drag.left}px`;dialog.style.top=`${drag.top}px`;}
    stop();
  },true);
  dialog.addEventListener('close',reset);
  return reset;
}
