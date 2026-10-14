# Removal of prototype generic room updates

Live IDA e36af917c304,2026-10-15: inspected complete3CEF6 calendar andFD4B
running call sequences.3CEF6 performs fixed calendar-triggered facility,
evaluation, recycling, train, rain and event work. FD4B performs construction,
rating, emergency, ordinary/emergency actor cohort, transport and drawing.
Neither has a generic per-room satisfaction interpolation or random move-in
step every four ticks.

The native ordinary41544 dispatch has no active simulation handlers for
completed medical13/recycling20/ramp44/SECOM45 records. Their state belongs
to dedicated clinic patient, recycling, ramp/parking or structural routines.
Metadata-only completed actor blocks are freed/inactive. There is no generic
10% acceptance draw that sets these facilities occupied. Native acceptance
for office/condo/hotel/shop belongs to their persistent actor callers and
native facade/evaluation gates.

Removed the prototype `Tower.updateRooms` and its every-four-ticks final
call. Its occupancy draw consumed invented shared RNG for connected service
rooms, its satisfaction smoothing had no native counterpart, and its INCOME
spawn branches were unreachable after the persistent actor implementation.
The old final `tickContinuation` rooms phase remains a no-op cleanup for
browser-save compatibility. Legacy satisfaction fields remain readable but
do not supply native tenant/shop/hotel evaluation.

`tests/rng-native.test.mjs` builds actual connected clinic/SECOM/recycling/
ramp/parking facilities and transport, acknowledges native construction
messages, then advances128 non-event simulation ticks. The shared seed,
occupancy and legacy satisfaction values remain unchanged; no actors or
transient passengers are invented. Source-specific periodic service counters
continue through their existing routines.
