//F2B2 tests preview5A632 before diagnostic56A3A, and each path has its
//own draw order. Anonymousfunctionroles verified from their resources.
const NORMAL={kind:'normal',shafts:true,cars:true,queues:true,links:true,findMarker:true,crane:true,santa:true,emergency:true,
  calls:['A1EE','1DC92','1E989','163BA','1699C','189DA','104B0','1DE85','1D00E']};
const DIAGNOSTIC={kind:'diagnostic',shafts:true,cars:false,queues:false,links:false,findMarker:true,crane:true,santa:false,emergency:false,
  calls:['A1EE','366B5','163BA','1D00E']};
const PREVIEW={kind:'elevatorPreview',shafts:true,cars:true,queues:true,links:false,findMarker:false,crane:true,santa:false,emergency:false,
  calls:['1E299','163BA','1699C','104B0']};
export function nativeRedrawPlan(state,diagnosticMode=0) {
  return state.elevatorPreview?PREVIEW:diagnosticMode?DIAGNOSTIC:NORMAL;
}
