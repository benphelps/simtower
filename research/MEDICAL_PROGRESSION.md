# Medical demand and promotion: original executable review

Reviewed directly in IDA on 2026-10-14 against `SimTowerDOS/SIMTOWER.EXE`.
Implementation: `src/original-progression.js`; validation:
`tests/progression-medical.test.mjs`.

## Daily medical availability

- `2C3BF`, called by the clock at tick 0 (`3D027`), rebuilds seven clinic
  destination lists, clears the ten clinic occupancy counters, and writes
  `5ABB1 = 1` if the rating is at least three stars.
- `2C890` selects the worker's lobby group; `2C80F` chooses a uniform clinic
  there, otherwise a uniform clinic from the ground-lobby list. No clinic
  yields `-1`.
- `42F86` calls `2C8BC` when clinic selection fails. `2C8BC` displays native
  info string 1010/6, "Medical Center demanded near Lobby", and clears
  `5ABB1`. This is a daily unmet-service latch. A tower need not have a
  clinic merely to set the latch at dawn: an actual unmet visit clears it.
- `2C531` admits patients when its signed-byte count is below 40. A full
  clinic returns 2 and the actor remains state 66, retrying admission.
  Full capacity does **not** clear `5ABB1`.
- If the selected clinic has been removed before admission, `2C531`
  applies the PART missing-service stress value and records a trip, then
  returns -1. `4312A` calls `2C8BC` and changes the actor to state 35.
- No selected clinic returns 3 from `2C531`, then becomes state 35 without
  treatment. `2C6B4` allows immediate return for this absent destination.
- A live clinic treats for 16 native ticks (`2C710..2C725`) and decrements
  its occupancy on completion. The executable uses a signed clock
  difference, with no wrap adjustment.
  Its inner state35/99 handler `42CCE..42D25` checks treatment, but caller
  `42495` gates BOTH food34 and clinic35 at `42742..4278A`: before phase2
  (tick800) it waits; phase>=4 (tick1600) changes39 and releases parking,
  without calling clinic completion or decrementing its patient BYTE.
  That byte therefore remains until dawn even when the actor is no longer
  in state35; native busy artwork cannot be inferred only from actors.
- A route failure to the clinic has a different fallback (`42FDF..43080`):
  state 65, destination index -1, current floor set to the office floor.
  This is a food-state fallback and does not call `2C8BC`.

The browser's office worker states already supply admission/return timing.
The medical helpers supply availability failure and capacity decisions;
integrate failures at destination selection and admission, not at every
route failure.

## Promotion gates

- `29F8D` converts the original population counter into a candidate rating
  using the four PART thresholds (300, 1000, 5000, 10000), then 15000.
  `29B9D` promotes only one level per check.
- `2A0FE` accepts one-to-two stars once population qualifies. Two-to-three
  requires `5ABAE`; three-to-four requires `5ABAF`, working garbage
  (`5ABB0`), passed VIP (`5ABA7`), clock phase >=4, weekday, and `5ABB1`.
  Four-to-five requires metro floor >=0, working garbage, phase >=4,
  weekday, and `5ABB1`. Five stars explicitly returns false: Tower status
  is a separate cathedral path.
- `2A1E7` sets `5ABAE` when security (type 14) is constructed and `5ABAF`
  when a suite (type 5) is constructed. These are construction latches:
  removing a facility does not clear them. Their only clear writes in
  IDA are the new-game initialization `2A080`.
- Missing security / suites displays info 1 / 2. Medical failure displays
  info 6 only after the other three/four-star gates pass. The common
  warning latch `5ABAD` suppresses repeated promotion warnings. Successful
  construction (`2A1E7`) and promotion (`2A0BD`) clear it. Routine medical
  failure (`2C8BC`) itself does not set this warning latch.
- Promotion `2A0BD` clears the VIP pass and warning latch; construction
  latches and medical availability remain.

## Clinic registry and deletion

`original-medical.js` now preserves ten native metadata slots and the seven
destination lists. Construction start reserves capacity (`390FC`), completion
registers the destination (`47843` → `2C45F`), and registration appends to each
list even when it reuses an earlier vacant slot. Removal (`3BF6D`, type13)
sets only the room index to FF: the saved floor and list position remain until
the next dawn (`2C3BF`). A worker can therefore choose a removed clinic despite
another live clinic, travel to the removed clinic's saved floor, and report the
missing service at admission. Deleted same-day slots also count toward the
ten-center limit. Dawn removes tombstones and rebuilds lists in slot order.

`2C56D` adds `word5D006` (PART missing-venue penalty: zero) and commits `36B20`
again before returning missing admission. Thus the arrival history plus the
missing-service record increment the trip count twice; the missing record does
not add stress. A full clinic waiter remains state66 even without an active
journey, and still reports missing service if that clinic is removed. Already
admitted state35 patients leave immediately on removal without clearing daily
medical readiness.

`3E330` adds `word5D004` (no-route stress: 300) and commits `36B20` before initial
route failure recovery, including clinic fallback to offsite food. That history
record is now preserved before caller-specific applicant/hotel history resets.

## Limits remaining

Population is still the browser's occupied-capacity counter, so passing the
gate helper does not establish exact native daily population fidelity.

Clinic slot identity now remains on the worker (`+6`, used again by `2C54F`
and `2C6D1`). If dawn releases a deleted clinic slot and construction reuses
it before that worker's admission, its transport still targets the originally
selected floor, but its admission/treatment resolves the replacement clinic.
`2C5A6` / `2C654` update the actor's floor to the registry floor at admission.
The native patient BYTE now lives in the registry and mirrors the room facade:
dawn resets it to zero even if a patient is still inside; later completion
decrements with BYTE wrapping (`2C725`). Admission uses signed CMP/JGE, while
busy artwork tests nonzero. Browser-save migration seeds absent counters from
existing patient actors; current saves preserve exact bytes and actor slots.

The function previously labeled `UpdateMedicalVisitorActor` (`4553B`) is
dispatched for actor type **33**, while clinic type **13** takes the default
actor dispatcher path (`415D0`). The type-33 routine goes to food venues
via `33397` and `32C32`, not clinic treatment. That routine has now been ported
as the metro's persistent 240 commercial visitors. Clinic metadata consumes a
native actor block but is not six fabricated clinic employees.
