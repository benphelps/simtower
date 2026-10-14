# Native metro and refuse service

Recovered from supplied SIMTOWER.EXE in IDA e36af917c304.

## Metro

- `47843` initializes the bottom station record33 through4151D. `47F0B` reserves240 actors;4151D initializes state1, destination index−2. `41544` dispatches this pool to4553B.
- `4553B` state1 attempts a daytime trip after tick240 and before phase4(tick1600), with probability1/36 per eligible sixteen-cohort update. State39 resets to1 only after2300. `45680` selects a random food/shop category through33397, which calls33201's ground-lobby list. Missing or selected closed/unleased venues become39, with no alternate selection retry.
- `45680` starts at the actor's native homefloor+2: this is the station's upper floor. Actual destination entry is32C32, including full-capacity wait65. State34 waits through32E4E; departure98 returns to the upper station floor and resets1 for repeated visits. Initial routing failure becomes39 rather than food-offsite fallback.
- `3CEF6` calls384F3 each tick after240/before1600.384F3 suppresses trains when emergency mask9 is set, toggles all station levels0↔2 with probability1/100, and plays10010 at priority1 only when arriving. Native art resources have two frames in first bank2984/3048/3112, so train frame2 is second bank2985/3049/3113. Upper art is24pixels, lower levels36.

The manual describes underground-only commerce and outside office/resident arrivals. The supplied native metro actor path instead selects ground-lobby commercial lists, which include registered underground venues and floors up to five above ground;33397/33201/45680 have no separate underground restriction and do not select offices/residences. These differences should stay visible in manual coverage rather than inventing a gate or population model.

## Recycling

- `3A8BF` callsF7F8 before recycling construction. The first center is allowed. Subsequent centers need an existing native20/21 floor record within newTop−2..newTop+1 and with its whole inclusive horizontal extent inside newLeft−25..newRight+25. `word567A4` is type20's width, initialized by388D0 from original2280bitmap width200/8=25. Browser combined two-floor rooms therefore allow aligned/diagonal centers with topdifference≤2 and horizontal leftdifference≤25; geometry/overlap checks remain separate.
- `390FC` increments center count once after successful construction;F8BD removes both records and decrements once. `F780` divides population by center count and uses strict500/1000/1500/2000/2500 thresholds to return stage1..6.
- `F530` runs at1600(stage0),1800(1),2000(2),2200(3),2400(4),2566(5). Working readiness becomes true once required stage≤current stage. If still incomplete atstage5, native info4 is reported and readiness becomes false. When not ready, any record already showing5 remains5 while other records receive the current processing state. With no centers, native info3 is reported and readiness clears. These paths have no service-elevator reachability gate; the runtime decision is center count and population.
- At dawnF60E clears nonzero upper20 to0 and sets nonzero lower21 to6 only when readiness is true; it plays original truck sample2280(priority1) once if any record was collected. F701 at tick32 changes lower6→0. Overflowing state5 centers are not collected. Upper states1..5 are original24pixel resources2281..2285; lower states0..6 use2344..2350 at36pixels. Stage0's2280contains60pixels, from which browser draws upper24 before the separate lower record. Ventilation palette cycling uses the shared original-effects implementation.

Tests: metro-native.test.mjs and recycling-native.test.mjs cover native trigger bounds, pool counts, repeated admissions, failures, train banks, construction adjacency, strict processing capacity, dawn/lower emptying, overflow retention and malformed stages. Simulation/Tower integration is tracked separately when hooked into shared files; inherited routing behavior remains the principal fidelity limitation.
