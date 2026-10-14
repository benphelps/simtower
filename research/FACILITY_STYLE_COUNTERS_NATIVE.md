# Native lifetime facility styles

Live IDA inspection 2026-10-14, Win16 executable. `original-facility-styles.js` supplies Tower's persisted `nativeFacilityStyles` and `facility-styles-native.test.mjs` verifies demolition, cancellation, completion and save boundaries.

**1A448..1A478** resets nine independent WORD counters to zero for a new tower. These are global build counters rather than counts of live rooms.

**39431..3952A**, construction dispatch cases3/4/5/7/9, passes the current counter to3A117 then increments it modulo the facility's style count: single2 (`56B46`), twin4 (`56B48`), suite2 (`56B4A`), office6 (`56B4E`), condo3 (`56B50`). The facade style is chosen when construction starts. Removing a room, even unfinished construction, does not rewind the counter.

**3292E..3299E**, inside commercial metadata allocation32673, assigns record+B from the corresponding global counter, then increments modulo restaurant5 (`56B4C`), fastfood5 (`56B54`), shop11 (`56B52`). This metadata allocation occurs on completion47843. Canceling an unfinished commercial room therefore spends no style; completing and then demolishing it spends its style permanently. Original establishment names24D9B use this same style index.

Native saves would preserve these globals. Browser JSON now does too. Legacy browser saves lack historical demolished buildings; migration resumes after each type's latest surviving recorded style and remains partial for lost build history. Construction's native counter advances even if a subsequent3A117 allocation fails inside the already validated placement path; out-of-memory allocator failure is not emulated.

The remaining `56B56` counter was directly audited on2026-10-15. It belongs to **medical type13**, not recycling. `39574..395A3` passes its modulo3 value as `3A117`'s **arg2**, which `3A727` stores in room **state+0B**; the style arg4 is zero. This is not a missing facade style cycle: completed clinic renderer `A63C` ignores that state byte and derives frame0 from metadata patient count, otherwise daytime1/nighttime2. `2C45F` registers that metadata with zero patients. Recycling construction case20 at `396BC` passes zero for both state/style to `3A8BF`. The original medical construction-state counter has no effect on the supported completed clinic art or patient simulation; exact native save-byte preservation remains deferred with native saves.
