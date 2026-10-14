# Native application RNG seed lifecycle audit

Live IDA `_srand`3236 sets the lowWORD4F9F0 from its16-bit argument and
zeroes4F9F2. `_rand`324D multiplies the32-bit state by015A4E35h, adds1,
and returns the highWORD masked7FFFh. Initial executable data at4F9F0 is
`01 00 00 00`, hence startup state1.

The IDA database reports no call or data references to `_srand`3236. The
only writes to the seed words are `_srand` and `_rand`: low-word writes at
3245/326A and high-word writes at323F/3266. Ordinary New initialization
1A3B6 therefore does not reset the application's RNG through `_srand`.
A complete initialization and New/Open call-order audit is recorded in
`RNG_APPLICATION_LIFECYCLE_NATIVE.md`: startup makes no random draws;
the first world refresh creates the four cloud slots.

The standalone JavaScript Tower constructor still defaults to1994, preserving
explicit fixture behavior. The browser uses `newNativeApplicationTower`:
initial application seed1, full32-bit continuity across New. Documentation
fixtures use explicit1994 independently; browser JSON saves intentionally
retain and restore their RNG state. Matching this lifecycle is not proof
of identical replay across different viewports or GUI redraw order.
