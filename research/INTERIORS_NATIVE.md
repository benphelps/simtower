# Original interior occupants

Live IDA `0x6BC2` updates interior visual actor bytes immediately when a room
is marked changed, otherwise on `(tick+nativeTenantIndex)%16===0` while
animation is enabled. These are sampled visual poses, not new walking
identities. Source `0xA86D` invokes interior drawing for office, condominium,
hotel, food facilities and the bottom type40 cathedral record. Security and housekeeping
home rooms have no actor-overlay branch here.

`0x6F4F` office: styles0/1 place children0..2 at fixed desks
`style+child+1`, with original pose pairs14/16/12. Later styles place child0 at
cell7 with poses10/11, and children1/2 use pose groups6..9/2..5 with special
seated positions4/2. Other workers use groups0..1/20..23/18..19 at sampled
interior positions. Only actor states<=5 render, so absent workers and sleeping
actors do not leave animated silhouettes behind.

`0x7613` condos: child0 has weekday/day30, weekday/night32..33 or weekend34;
child1 uses41..49 (pose49 fixes position1); child2 uses50..53, or54..56 when
the Control mouse modifier is held (`word52412`, `C330` → `wParam&8`). `0x78EF` hotels: reserved child0
(cleaning state3) uses96..98, guest child1 daytime80..81/night82..90, guest
child2 uses91..94 or95 with the night Control modifier. These branches do
not test the separate Effects option (`word5D0B4`).

`0x7B62` fast food samples its first two own actors' poses63..64/65..66 over
cells0..2; `0x7CC8` restaurant uses73..75/76..79 over the same visual span.
The other46 allocated own patrons are not all drawn as interior occupants.

`0x6706`/`0x67FE`/`0x68FB`/`0x69F3` call `0x3160C` for the person's base
cell and the following cell, copying two independent8x24 pieces and clipping
against the room span. The original type8 atlas starts with bitmap1512's
60cells, followed by bitmap1513's54cells. `nativeInteriorFrame` preserves
this packing, including a split at pose59. Cleaning pose96 begins at1513
sourceX288, with its following piece at296. All pieces draw12px below floor
top, preserving the original24px occupant height.

`src/original-interiors.js` exports source pose sampling separately from
rendering. The browser adapter must cache poses per room, refresh only once
on a due update/change, and supply native RNG. Exact original renderer update
ordering versus simulation RNG remains partial until binary replay comparison.

## Visible redraw audit, 2026-10-15

Live IDA confirms `FD4B` invokes `A1EE` after actor and car updates. `A1EE`
scans visible native grid rows top to bottom and columns left to right. Its
first encountered cell of a facility calls `AA87→6BC2` once for that span.
The renderer now follows this ordering, including individual pending floor
records of multi-storey construction; horizontally or vertically offscreen
records consume no pose RNG. GUI menu/modal capture suspends this work;
ordinary pause is independent of that capture gate.

`387F1` decrements pending record+17, then unconditionally writes record+13=1
before testing completion. For a negative construction type, `6BC2` tests
only that dirty byte before resolving child0 through `46FB7` and calling
`6E8B`. It does not test People or the16-tick cohort. `6E8B` samples a cell
first, using `_rand % (type-table WORD width−1)`, then pose57..62 using the
next `_rand %6`. `6650` copies the two original8×24 type8 cells. Cinema's
width WORD is24 despite its248px/31cell construction RECT; its builder does
not roam the full31cell panel. The browser caches each visible construction
floor independently and updates on construction-countdown changes, including
with People disabled. Source original1512/1513 supplies every builder pixel.
Actual production build proof: `research/screenshots/native-builder.jpg`.

Native dirty writes track facility transitions, not every actor's remote
travel state. `470A3/4716A` mark+13 after home counter entry/exit;
residential sleep/wake and housekeeping likewise mutate facade/overlay state.
`32B45` marks the commercial record only when crossing its visible occupancy
thresholds. Removing actor state/trip IDs from the browser dirty signature
prevents unrelated away-route retries from resampling visible occupants and
perturbing the shared RNG. Facade, housekeeping and actual construction
changes still bypass People/cohort. Explicit persisted native dirty records
now cover repeated same-tick writes even when canonical facade bytes repeat.

Food pointer audit: `47843` cases6/12 calls `41407→41090`, initializing all48
ordinary home patrons in state32. `6BC2` resolves child0 and `7B62/7CC8`
samples it followed by the next physical actor record, checking signed
state<=5 for each. `69F3` draws exactly those same two records. They are the
first two ordinary patrons when present in state5, not an invented waiter
pool; children2..47 consume no interior RNG and have no interior overlay.
Both routines choose the cell0..2 before their respective pose RNG.

## Persisted dirty and pose replay

`room.nativeInteriors` holds each native floor's dirty BYTE, sampled pose
records and last sampled tick/elapsed epoch. The browser epoch distinguishes
new native iterations after clock-number rollover from duplicate repaints.
`markInteriorDirty` coalesces writes while
offscreen; `A1EE` consumption occurs only on a visible span. A second source
write after an earlier draw permits another same-tick sample. Completed
poses survive browser save/load, avoiding an extra RNG draw when the renderer
cache is recreated. Strict load validation checks floors, dirty values,
sample/tick consistency, original pose bounds and owning actor identity;
malformed saves reject before replacing live state. Legacy saves initialize
their missing visual records once; they cannot recover old unsaved poses.

Source home entry/exit writes are wired in `original-people`; sleep marks
dirty only when the native whole-room sleeping predicate succeeds, and wake
marks only the facade16 reset. Cleaning arrival/overlay completion mark the
hotel record. Food32B45 entry1/10 and departure0/9 thresholds are explicit,
including repeated frame bytes, and actual visiting/own-patron call sites
carry their room owner. Show opening/projection/closing and first admission
dirty both linked floors. Cathedral base40 consumes its explicit dirty flag
before ceremony animation; a new same-tick dirty write is distinct from an
ordinary duplicate browser repaint.

Full phase-loop audit corrected an earlier broad inference:480AE/4829F do
not mark every type unconditionally. Office dawn always dirties; evening
office changes only vacancy16 or empty0. Condo/hotel phase dirty writes are
limited to their supported vacancy/condition/sleep byte transitions. Type13
and native31..40 metadata phase writes are separate. The browser phase hooks
use these precise predicates, and interior signatures no longer treat the
clock crossing1600 alone as a dirty write. Canonical-value fallback remains
for legacy records/direct fixture mutations; explicit writes govern source
paths. Per-floor construction countdown/dirty state now comes from
`nativeConstructionParts`, preserving a completed sibling's actual facade
while only pending visible levels sample builder poses.

Native40E11/41090 actor initialization loops and their412E3/41407 wrappers
have no `_rand` calls. Removed the prior random five-character appearance
selection from `syncActors`: it perturbed shared gameplay RNG once per
person. Queue portraits already use original role/child selection. The
legacy five-frame horizontal-walker field is now deterministic compatibility
data; exact native approach/queue drawing still needs separate comparison.
Tests verify office initialization and56 actors after a partial cinema
completion preserve seed independently of actual2DE93 movie-title RNG.

Root integration (2026-10-15): strict persisted interior validation is now part
of Tower.load's atomic validation. Actual mutation calls mark native redraw
bytes, including repeated2D7A9/2DAF2 vacancy and2D914 checkout calls whose
facade byte remains unchanged.32192 opening and32552 closure mark explicitly.
Infestation propagation289E2 marks its affected records.480AE/4829F default
cases do NOT dirty every record: office dawn always writes; condo/hotel phase
branches dirty only when their source facade branch executes; type13 and
31-33/36-40 ancillary branches mark completed floor records. Real Tower tests
cover repeated writes, unchanged-office dawn and unchanged condo/hotel skips.
