//CmdBtnWndProcB8D0: BB6C and BBC6 both call C6E1. The bitmap palette
//has no child button HWNDs or keyboard command handler.
export function nativeToolbarPointerAction(target,phase,button,controls) {
  if(button!==0||!['down','up'].includes(phase)||controls.preview||controls.scheduleOpen)return null;
  if(target.kind==='time')return phase==='down'?{kind:'press-time'}:{kind:'toggle-time'};
  if(!controls.running)return null; //C72D gates all three modes/catalog tools.
  if(target.kind==='mode')return {kind:'mode',mode:target.mode};
  if(target.kind==='build')return {kind:phase==='down'&&target.group?'popup':'build',key:target.key};
  return null;
}
