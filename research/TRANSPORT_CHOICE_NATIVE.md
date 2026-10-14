# Native first transport choice

The production route now calls `original-transport-choice.js`, translated from
live IDA `34C04`, `34362`, `34E0E`, `3507B`, `35128`, `346B3` and `345C1`.

The executable scans candidate slots with strict `<` comparisons. A usable
escalator closer than640 pixels wins before elevator scoring, including an
express elevator with an empty ring. Ordinary stairs cost lateral pixels+640.
If no direct pedestrian candidate exists, the first eligible compressed stair
component chooses a direction toward its first matching transfer lobby; the
routine then seeks an actual link in that direction. Direct local elevators
cost lateral pixels+640 (1000 for a full40-person ring); indirect local access
uses3000/6000. Express access costs only its directional ring count.

At a transfer lobby, `34F36` suppresses leaving on a local component when all
of its final-destination alternatives are already contained in the current
lobby's group. `345C1` chooses the final floor if served or the first matching
transfer group in the selected direction. The original component masks are
immediate unions, not a transitive graph closure.

Service selection takes `34D45`/`35128`: it permits ordinary stairs when the
ordinary transition flags connect the destination, or a service elevator.
Escalators and passenger elevators are excluded. The former browser rule
excluding all pedestrian links for housekeepers was incorrect.

`3E2A0` registers elevator queues or stair use immediately, and completes
same-floor trips immediately. `3EB23` invokes the category handler on car
alight, and link release does so at the next cohort: both choose the next leg
again from the HOME room's left edge returned by `34BA2`. The browser keeps
future edges only as a diagnostic view; actual handoff never trusts them.

The source scans fixed reusable64/24 transport slots. Slot reuse/bit index
integration is tracked separately. Tests cover escalator threshold, service
stairs, tie order, indirect pedestrian access, current-lobby suppression,
cohort link release and immediate car arrival.
