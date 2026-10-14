// Native RT_MENU4/1 has these marked top-level names; RT_ACCELERATOR9/1
// still contains onlyF1. Alt/F10/arrows are USER menu-loop behavior.
export function nativeMenuActivation(event) {
  if(event.ctrlKey||event.metaKey||event.shiftKey)return null;
  if(event.key==='Alt'&&!event.repeat)return 'bar';
  if(event.key==='F10'&&!event.altKey&&!event.repeat)return 'bar';
  if(!event.altKey)return null;
  if(event.key===' ')return 'system';
  return {f:'file',o:'options',w:'windows',h:'help'}[event.key.toLowerCase()]??null;
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
