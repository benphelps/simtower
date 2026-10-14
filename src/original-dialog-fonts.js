//3DFEA selects Arial with negative character-pixel height. Child CTLCOLOR
//uses13 for inspectors/startup; AHOTTADLOGFILTER atDA04 uses14 for alerts.
export const nativeDialogFontSize=id=>Number(id)>=3000&&Number(id)<=4001?14:13;
//146E6/147BC paint schedule response/wait with16px Arial, "%2d",
//at the original field's left+2/top+3.
export function nativeDialogField(id,cid,value) {
  if(Number(id)===400&&[41,42].includes(Number(cid)))return {text:String(value).padStart(2,' '),style:{font:'16px Arial,sans-serif',padding:'3px 2px',lineHeight:'18px',whiteSpace:'pre'}};
  return {text:String(value),style:{}};
}
