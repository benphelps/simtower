const signedWord=value=>((value&65535)^32768)-32768;
export function nativeTravelWord(delay=0,parkingFloor=0) {
  //3022A stores (10-nativeFloor)<<10, i.e. basement depth in high6bits.
  return (((-parkingFloor&63)<<10)|(delay&1023))&65535;
}
export function nativeBoardingWord(packedWord,tick,queueTick,floor,lobbyHeight=1) {
  //36D11 adds low10stress to the signed WORD clock difference.36F43
  // forgives the TOTAL at ground in tall lobbies. Only the upper end is
  // capped; a negative value is added to high parking bits and may borrow.
  let total=signedWord((packedWord&1023)+tick-queueTick);
  if(floor===0&&lobbyHeight>1)total=total<=(lobbyHeight===2?25:50)?0:total-(lobbyHeight===2?25:50);
  const word=((packedWord&0xfc00)+Math.min(300,total))&65535;
  return {word,delay:word&1023,parkingFloor:-(word>>>10)||0};
}
