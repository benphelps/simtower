# Simulation pacing

`3CEF6` gates ordinary simulation on six units of `GetTickCount >> 4`:
nominally one tick every96ms. `4A256` performs one simulation/update/paint
pass from the original idle loop. The original Fast flag skips that gate.
Printed manual28 explicitly describes Fast as depending on the computer's
speed; the executable provides no fixed historical Fast multiplier.

The initial browser scheduler incorrectly batched up to512 invisible ticks
per animation frame and enabled Fast by default. On modern hardware this
could advance years per second. The user explicitly requested both ordinary
startup speed and useful original-era Fast pacing.

Normal is now the default. Browser Fast advances at most one tick per16ms
wall-clock unit and one per browser paint callback, nominally six times the
normal rate. Neither mode catches up with a burst after a delayed callback.
The Fast ceiling is an intentional browser pacing adaptation requested by
the user, not a recovered fixed number from the executable. The original
96ms normal gate,2600-tick day, phase/calendar transitions, pause/modal
gating and per-tick game rules retain their original units.

`3CD60` resets the simulation tick to2533 and stores the current
`GetTickCount >> 4` in the normal gate at56968 during New/Open initialization.
The browser resets its scheduler at that same boundary, so time spent loading
assets cannot cause an immediate simulation tick. The separate effects gate
at5696C is initialized by274D7 before resource loading and retains that lifetime;
the browser captures its start before preloading and does not reset it on New.

`274D7` initializes People, Effects and Fast to1. Its four Sound profile
reads default to1, and the supplied SIMTOWER.INI enables all sounds. The
browser now preserves the original sound defaults and menu checks. Normal
startup and bounded Fast remain explicit user-requested pacing exceptions.

`tests/audio-speed-native.test.mjs` verifies normal timing, the bounded
six-to-one cadence under frequent callbacks, no same-frame CPU batches,
no delayed-frame catch-up, and paused/hidden/modal suppression.
