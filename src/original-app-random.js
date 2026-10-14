import {Tower} from './simulation.js';

// CRT DATA 4F9F0 starts at 1. Native New 19BDD→1A3B6 and Open 1A177
// never call _srand. The active Tower represents the application stream.
export const NATIVE_APPLICATION_SEED = 1;
export function newNativeApplicationTower(data, previous = null) {
  const seed = previous?.state.seed ?? NATIVE_APPLICATION_SEED;
  const next = new Tower(data, {
    seed: NATIVE_APPLICATION_SEED,
    shaftSlotTypes: previous?.state.nativeShaftSlotTypes,
  });
  // Standalone constructor seeds follow 16-bit _srand semantics. Native
  // New preserves the full 32-bit state; construction makes no RNG draws.
  next.state.seed = seed >>> 0;
  return next;
}
