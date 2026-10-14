// RT_DIALOG flags plus explicit focus/keyboard branches in 0x236E9,
// 0x23A78 and COUNTDLOGMAIN (0xCD73). IDCANCEL is dispatched to the
// application, which may deliberately ignore it; Escape never closes by itself.
export function nativeDialogControlState(id, control, fields={}) {
  let disabled=Boolean(control.style&0x08000000);
  if([730,732].includes(Number(id))) {
    if(control.id===1)disabled=!String(fields[4]??'').length;
    if(control.id===3)disabled=!String(fields[4]??'').length;
  }
  return {disabled,tabStop:Boolean(control.style&0x00010000),defaultButton:control.class==='button'&&(control.style&15)===1};
}
export function nativeDialogInitialFocus(id, controls) {
  if([730,732].includes(Number(id)))return 4;
  if(Number(id)===500)return null; // 0xCF20 sets focus to the dialog HWND.
  return controls.find(c=>c.tabStop&&!c.disabled)?.id??null;
}
export function nativeDialogKeyCommand(id, key, phase, controls, focusedId) {
  if(Number(id)===500)return phase==='keyup'&&['Enter',' '].includes(key)?1:null;
  if(Number(id)===400)return null; // 0x13119 has no WM_COMMAND/key handler.
  if(phase!=='keydown')return null;
  if(key==='Escape')return 2;
  if(key!=='Enter')return null;
  const focused=controls.find(c=>c.id===focusedId&&c.class==='button'&&!c.disabled);
  return focused?.id??controls.find(c=>c.defaultButton&&!c.disabled)?.id??null;
}
