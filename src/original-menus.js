// Native RT_MENU4/1 has these marked top-level names; RT_ACCELERATOR9/1
// still contains onlyF1. Alt/F10/arrows are USER menu-loop behavior.
export function nativeMenuActivation(event,phase='keydown') {
  if(event.ctrlKey||event.metaKey||event.shiftKey)return null;
  if(event.key==='Alt'&&!event.repeat)return phase==='keyup'?'bar':null;
  if(event.key==='F10'&&!event.altKey&&!event.repeat)return phase==='keyup'?'bar':null;
  if(phase!=='keydown')return null;
  if(!event.altKey)return null;
  if(event.key==='F4')return 'close';
  if(event.key===' ')return 'system';
  return {f:'file',o:'options',w:'windows',h:'help'}[event.key.toLowerCase()]??null;
}
//DefWindowProc activates the menu on bare ALT/F10 release. Chords consume
//that pending release; ALT+F must not close its just-opened menu on ALT-up.
export class NativeMenuKeyState {
  cancel(){this.pending=null;this.used=false;}
  activation(event,phase='keydown') {
    if(phase==='keydown') {
      if(['Alt','F10'].includes(event.key)&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&(event.key==='Alt'||!event.altKey)){this.pending=event.key;this.used=false;return null;}
      if(this.pending&&event.key!==this.pending)this.used=true;
      return nativeMenuActivation(event,phase);
    }
    if(event.key!==this.pending)return null;
    const used=this.used;this.cancel();return used?null:nativeMenuActivation(event,phase);
  }
}
export function nativeMenuStep(items,current,direction) {
  if(!items.some(item=>!item.disabled))return -1;
  let index=current<0&&direction<0?0:current;
  for(let count=0;count<items.length;count++){index=(index+direction+items.length)%items.length;if(!items[index].disabled)return index;}
  return -1;
}
export function nativeMenuMnemonic(items,key) {
  return items.findIndex(item=>!item.disabled&&item.mnemonic?.toLowerCase()===key.toLowerCase());
}
export const nativeDialogModeless=id=>Number(id)===400; //11E50 CREATEDIALOGPARAM.

//USER menu loops accept a selected command on primary-button release,
//including release after dragging from its menu name. Disabled commands
//and submenu parents keep the menu loop open.
export function nativeMenuPointerRelease({button,kind,disabled=false,sameOpenedName=false}) {
  if(button!==0)return 'keep';
  if(kind==='command')return disabled?'keep':'invoke';
  if(kind==='submenu')return disabled?'keep':'submenu';
  if(kind==='name')return sameOpenedName?'cancel':'keep';
  if(kind==='menu')return 'keep';
  return 'cancel';
}
