export function parkingSprite(space, reachable = true) {
  // 0xA67D takes the native parking +0B byte directly as its frame index:
  //0 empty1704;1 inaccessible(red X)first1705;2..14 original car variants.
  const mode = space.nativeParkingFrame??(!reachable ? 1 : Number.isInteger(space.parkingActorSlot)||space.parkingActor ? space.carVariant || 2 : 0);
  return { sheet: mode ? 1705 : 1704, sx: mode ? (mode - 1) * 32 : 0,
    sy: 0, width: 32, height: 24 };
}
export function parkingBookingPlan(spaces, required, used, quota, randomInt) {
  // 0x300BB/0x306A2 register ALL reachable parking records, including cars
  // already drawn there. 0x30531 chooses that index before2FF3F quota check.
  // The display slot is overwritten, while an earlier actor retains its
  // packed reservation FLOOR. It is not a one-car-per-spot reservation model.
  if (!required) return { status: 'not-required' };
  if (!spaces.length) return { status: 'unavailable' };
  const space = spaces[randomInt(spaces.length)];
  if (used >= quota) return { status: 'quota' };
  return { status: 'booked', spaceId: space.id, floor: space.floor,
    previousVisualOwner: space.parkingActor ?? null, carVariant: 2 + randomInt(13) };
}
export function parkingReleasePlan(space, actorId,actorSlot=undefined) {
  // 0x30399 finds an actor only if it remains this display slot's current
  // pointer; an overwritten older reservation must not erase the newer car.
  const matches=space&&Number.isInteger(space.parkingActorSlot)?space.parkingActorSlot===actorSlot:space?.parkingActor===actorId;
  if(!matches)return null;
  const patch={parkingActor:null,occupied:false,carVariant:0};
  if(space.nativeParkingFrame!==undefined)patch.nativeParkingFrame=space.nativeParkingFrame===1?1:0; //30399 preserves redX.
  return patch;
}
export function hasParkingReservation(actor) {
  // 0x305B6 tests actor+0D maskFC: reserved basement floor, independent of
  // whether any parking display still points to this actor.
  return Number.isInteger(actor.parkingFloor) ? actor.parkingFloor < 0 : actor.parking != null;
}
export function parkingDemolitionPlan(actor, space) {
  // 0x3C16B invalidates the display metadata only. It never calls30399.
  return actor.parking === space.id ? { parking: null, parkingFloor: actor.parkingFloor ?? space.floor } : null;
}
