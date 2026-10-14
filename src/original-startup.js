// 0x53F0 / NEWORLOADDLOGFILTER0x5457 and native DTMP10000.
export const NATIVE_STARTUP_DIALOG=10000;
export function nativeStartupAction(command) {
  return ({1:'new',2:'quit',3:'open'})[command]??null;
}

// 0x1C5D5 checks valid/save-enabled523B2 and the ground floor record count.
// Successful native saving keeps523B2 set: this is not a dirty-state guard.
export function nativeSaveGuardRequired({saveEnabled=true,groundRecords=0}={}) {
  return Boolean(saveEnabled&&groundRecords>0);
}
export function nativeSaveGuardText(data,name,action) {
  const index=({new:1,open:2,close:3,quit:4})[action];
  if(!index)return null;
  return `Save the tower "${name}" before ${data.strings['1001'][index-1]}?`;
}
// ALRT1001 flags3 +0x1030;3D83D translates IDCANCEL2 to result3.
// Yes must wait for a successful save; cancelled/failed saving aborts too.
export function nativeSaveGuardOutcome(button,saveSucceeded) {
  if(button==='no'||button===7)return 'continue';
  if(button==='yes'||button===6)return saveSucceeded===undefined?'save':saveSucceeded?'continue':'cancel';
  return 'cancel';
}
export const NATIVE_SAVE_GUARD_FLAGS=0x1033;

// Menu40021 / sole acceleratorF1: WINHELP,HELP_CONTENTS,ulData0.
export const NATIVE_HELP={command:40021,file:'SIMTOWER.HLP',winHelpCommand:3,context:0};

// 0x3DF53 initializes Arial at nine character pixels.0x3DFEA caches up to
// ten requested heights, clamps below9, and uses OUT_TT_ONLY_PRECIS(7).
// OS GDI provides glyphs; the executable contains no embedded RT_FONT.
export function nativeFont(pixelHeight=9) {
  return {family:'Arial',pixelHeight:Math.max(9,Math.trunc(pixelHeight)),weight:400,italic:false,charset:1,outPrecision:7};
}
// 0xA388 /3B09E creates normal Floor with state2;3111C also uses this strip
// for the12-pixel background above completed24-pixel ordinary-room art.
export const NATIVE_EMPTY_FLOOR_TILE={sheet:1000,sx:16,sy:0,width:8,height:36};

// Negative facility type at0xA69C selects type41/frame1, then3139F copies
// original3625.0x38C0A assembles3624+3625 as two328-pixel frames. The same
// 38C0A offsets24px artwork down12;3C972 tiles5000above it. The same
// crop repeats on each storey. Cinema reserves31 cells from38A48;2E172
// splits the existing record into booth7/auditorium24 on completion.
export function nativeConstructionSprites(room) {
  const width=room.width*8;
  return Array.from({length:room.height||1},(_,level)=>{
    const x=room.x*8,y=-(room.floor+1)*36+level*36,parts=[];
    for(let offset=0;offset<width;offset+=128)parts.push({sheet:5000,sx:0,sy:0,x:x+offset,y,width:Math.min(128,width-offset),height:12});
    parts.push({sheet:3625,sx:0,sy:0,x,y:y+12,width,height:24});return parts;
  }).flat();
}
