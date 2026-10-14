//37F76 loads four32px CURSOR groups.4A670 picks these from the native
// mode/running/capture flags;37FFB selects stock IDC_SIZENS while extending.
const HOTSPOTS={1002:[7,7],1003:[6,6],1004:[6,0],1005:[6,6]};
export function nativeGameCursor(mode,running=true,extending=false) {
  if(mode==='finger'&&running&&extending)return 'ns-resize'; // Stock USER cursor32645 while Finger captures, not on hover.
  const id=mode==='inspect'?1003:!running?0:mode==='finger'?1004:mode==='demolish'?1005:mode==='build'?1002:0;
  if(!id)return 'default';
  const [x,y]=HOTSPOTS[id];return `url("/assets/cursors/${id}.cur") ${x} ${y}, url("/assets/cursors/${id}.png") ${x} ${y}, default`;
}
