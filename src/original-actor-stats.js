// 0x36B20 stores histories as WORD/BYTE. 0x28B7B later interprets BOTH
// as signed values (CWD and CBW before IDIV), even after their counters wrap.
export const signedByte = value => (value & 255) << 24 >> 24;
export const signedWord = value => (value & 65535) << 16 >> 16;
export function nativeActorMean(stats) {
  const trips = signedByte(stats.trips || 0);
  if (!trips) return 0;
  return Math.trunc(signedWord(stats.delay || 0) / trips) || 0;
}
export function nativeRoomMean(stats) {
  // 0x28C0F averages individual truncated means, rather than pooling trips.
  return stats.length ? Math.trunc(stats.reduce((sum, actor) => sum + nativeActorMean(actor), 0) / stats.length) || 0 : 0;
}
export function normalizeActorHistory(stats) {
  return { delay: (stats.delay || 0) & 65535, trips: (stats.trips || 0) & 255 };
}
export function validateActorHistory(stats) {
  if (!Number.isInteger(stats.delay) || stats.delay < 0 || stats.delay > 65535 ||
      !Number.isInteger(stats.trips) || stats.trips < 0 || stats.trips > 255) throw new Error('Invalid native actor history.');
  return true;
}
