export function actorRouteOrigin(room) {
  // 0x34BA2, called by3E2A0: actor+0/+1 identify its HOME record;
  // floor[+A92+slot*2] resolves that record, whose +6 is the LEFT edge.
  // Actor+7/+8 are interior visual cell/pose or travel floor/access bytes.
  return room.x;
}
export function nativeTransportPosition(room, edge, floor) {
  // A native route attempt has no horizontal walking clock. It registers
  // a directional elevator ring immediately, or changes floor/link usage
  // immediately. The next cohort releases link usage and chooses next leg.
  if (!edge) return { stage: 'done', floor, x: room.x };
  if (edge.kind === 'elevator') return { stage: 'queue', floor, x: edge.accessX ?? edge.x };
  return { stage: 'link', floor: edge.to, x: edge.accessX ?? edge.x };
}
export function actorInteriorPosition(room, pose) {
  // This is a DRAW position, not a route origin or an elapsed walk state.
  return room.x + pose.cell;
}
