import {CELL,FLOOR} from './catalog.js';
import {nativeShaftOrder} from './original-transport-slots.js';
//15057 uses3C742's original positive site coordinates before signed division.
//A boundary belongs to the next screen row; y=0 isB1, not groundfloor.
export function nativeElevatorPointerGrid(worldX,worldY) {
  return {x:Math.trunc(worldX/CELL),floor:109-Math.trunc((worldY+3960)/FLOOR)};
}
//C330 dispatches14DE4 only for Finger(mode1).14F07 scans physicalshaftslots,
//not the constructiontool's selected elevator category. Caps ignore Show.
export function nativeElevatorExtensionAt(state,mode,worldX,worldY) {
  if(mode!=='finger')return null;
  const point=nativeElevatorPointerGrid(worldX,worldY);
  for(const shaft of nativeShaftOrder(state)) {
    if(point.x<shaft.x||point.x>=shaft.x+shaft.width)continue;
    if(point.floor===shaft.high+1)return {shaft,end:'top',point};
    if(point.floor===shaft.low-1)return {shaft,end:'bottom',point};
  }
  return null;
}
//C330 calls148A0 before anyextensioncapture on Fingerbuttondown.
//An interior hit consumes the click even when stop validation prevents edits.
export function nativeFingerStopAt(state,worldX,worldY) {
  const point=nativeElevatorPointerGrid(worldX,worldY);
  const shaft=nativeFingerShaftAt(state,worldX,worldY);
  return shaft&&shaft.visible!==false&&point.floor>=shaft.low&&point.floor<=shaft.high?{shaft,floor:point.floor}:null;
}
//14DE4's WM_LBUTTONDBLCLK branch accepts15C37's body or machinery hit,
//regardless of Show, and opens the shaft's modeless controller.
export function nativeFingerShaftAt(state,worldX,worldY) {
  const point=nativeElevatorPointerGrid(worldX,worldY);
  return nativeShaftOrder(state).find(sh=>point.x>=sh.x&&point.x<sh.x+sh.width&&point.floor>=sh.low-1&&point.floor<=sh.high+1)??null;
}
export function nativeElevatorExtensionRange(shaft,end,worldX,worldY) {
  const point=nativeElevatorPointerGrid(worldX,worldY);
  const low=end==='bottom'?point.floor+1:shaft.low,high=end==='top'?point.floor-1:shaft.high;
  if(low>high)return null; //150B9/15427 ignore a drag beyond the other end.
  return {low,high};
}
//163BA draws endpointmachinery before testing Show for the servedbody.
//Its cap branch checks only express vsstandard width: service uses the
//standard1065 machinery, never1066frame4(which is the FIRE car indicator).
export function nativeShaftEndSprites(shaft) {
  const express=shaft.key==='express',sheet=express?1067:1065,width=shaft.width*CELL;
  return [{sheet,x:shaft.x*CELL,y:-(shaft.high+2)*FLOOR,width,height:FLOOR,sx:(express?5:4)*width,sy:0},
    {sheet,x:shaft.x*CELL,y:0-shaft.low*FLOOR,width,height:FLOOR,sx:(express?6:5)*width,sy:0}];
}
