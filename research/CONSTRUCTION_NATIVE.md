# Construction validation recovered in the parallel manual pass

Source: supplied `SimTowerDOS/SIMTOWER.EXE`, inspected directly in IDA.
Implementation: `src/original-construction.js`. Fifteen focused tests in
`tests/construction-native.test.mjs` cover endpoint categories, links sharing
a floor, machinery overlap, limits, and waiting-floor stop protection.

| Native address | Recovered behavior |
| --- | --- |
| `0x2A2FB` | Counts the 24 active shaft records. All rating branches compare against 24. |
| `0x2A382` | Tests a shaft's car-count byte against eight. All rating branches compare against eight. |
| `0x39D6C` | Allocates stairs/escalators from one shared pool of 64 records. |
| `0x190D5` | Validates upper landing. Floor right boundary must be strictly greater than x + 8. Ordinary stairs skip room-type checks. Escalators select the horizontal run whose right end is at least x + 8. |
| `0x191DD` | Validates lower landing. Floor right boundary may equal x + 8. Ordinary stairs skip room-type checks. Escalators select the run whose right end is at least x + 1. |
| `0x191B5`, `0x192BB` | Allowed escalator endpoint types: 0, 6, 10, 12, 18, 19, 24, 29, 30, 31. Thus empty floor is accepted alongside restaurant, retail, fast food, cinema/its other floor, lobby, party hall/its other floor, and metro. |
| `0x192E3` | Normal links collide as two halves: left four cells on the lower storey and right four on the upper. Same-x links on adjacent storeys do not collide. Against shafts and tall links, use the full width. Elevator machinery is included. |
| `0x19666` | Tall links reserve their full width across the taller lobby span. |
| `0x3BDF8` | Automatic demolition bypasses stairs/escalators; underlying room records survive construction. |
| `0x14925` → `0x158CD` | Stop toggling first rejects any floor configured as an active car's waiting floor, independently of current car position. |
| `0x15B36` → `0x15B80`, `0x15BDB` | Express stops above ground are fifteenth floors. All elevator types exclude interior storeys of a double/triple ground lobby. |
| `0xC3B0` | Bulldozer tries elevator deletion (`0x14AA1`), then link deletion (`0x18E40`), then room deletion (`0x390B7`). |
| `0x18F66` | Ordinary link hit testing uses the visible diagonal: horizontal cell offset c selects a relative vertical band from 12 + (8-c)×6 inclusive to 36 + (8-c)×6 exclusive, clipped to its two storeys. Clicking outside that band falls through to the room. |
| `0x189DA` | Lower landing renders graphics type 23 (stairs bitmap 2472) or 28 (escalator 2792); upper landing renders type 22 (stairs 2408) or 27 (escalator 2728). Both use the same animation frame, zero when link usage is zero. |
| `0x38C0A` | Concatenates consecutive bitmap resources. Stairs combine seven frames from 2408/2472 and seven from 2409/2473, making fourteen frames. Escalators use eight frames from 2728/2792. Non-36-pixel-height bitmap content is bottom-aligned with twelve pixels of padding above it (0x38DF6 through 0x38E15). |

Ordinary two-storey stair assembly: draw upper bitmap 2408 at `(x, y + 12)`
as 64×24, then lower bitmap 2472 at `(x, y + 36)` as 64×36. Ordinary
escalator assembly: draw upper 2728 at `(x, y)` as 64×36, then lower 2792
at `(x, y + 36)` as 64×36. Here `y` is the upper floor's top. Do not use
two consecutive frames of the same bitmap for its two floors: those frames
depict different occupant animation moments, not the two landings.

When usage counters are nonzero, stairs use `tick % 13 + 1` and escalators
use `tick % 7 + 1`. For stairs frame seven and above, select the second
bitmap pair 2409/2473 and subtract seven from the frame before taking its
64-pixel horizontal crop. Traversal is still instant in the browser, so the
native active-link usage interval has not yet been reproduced.

The manual's example of rating-dependent elevator car limits is not present in
this executable: the duplicated native branches have identical constants.

The browser now implements `0x3481D` stop-isolation warnings, queue evacuation
after stop deactivation (`0x15D6C`), and shaft retraction/capping
(`0x150B9`/`0x15427`). Queued actors discard their current queue timestamp
without charging elapsed wait and call their normal category route handler
through `0x41DF4`; they are not sent through timeout failure `0x4204C`.
Removed destinations write each affected rider's floor to its former destination
before replanning, preserving the native `0x3EB23` behavior. Cars outside the
new range snap inside and reset movement/doors. Structural floors remain.
Stop warnings distinguish ordinary tenants, service staff, and lobby transfer
groups. Original `0x33C1F` membership uses inclusive horizontal overlap.
Full native compressed lobby transport components remain a routing limitation.
Tall-link hit testing now uses the lobby-body rectangle from `0x18F66`.

Additional first-lobby evidence for a later visual pass: `0xC358` stores
Windows mouse wParam bit 8 (Control) at `word_52412`, and bit 4 (Shift) at
`word_52414`. At the initial lobby construction, `0x392B3` chooses height two
for Control, height three for Control+Shift, and height one otherwise.
`0x3B09E` creates the extra lobby records on floors one/two.
`0x38F50` loads original CGPk 4073/4074 for tall-lobby transportation, not
lobby interiors. `tools/decode_lobbies.py` decodes their original indexed
8×36 column strips with palette-index-zero transparency. Each storey has
11 stairs frames and 12 escalator frames. The three/four-storey decoded
resources are now in `public/assets/graphics/4073.png` and `4074.png`.
Lobby interiors use graphics strips 2536–2666 with source-column blocks
selected by rating, fixed ground-lobby height, and floor; `original-lobbies.js`
preserves the native column cadence, canopy halves, and crane placement.

## Shift replacement and construction drags

`0x390FC` calls `0x3BDF8` on button-down before construction validation.
When Shift is held, room records across the replacement footprint are visited
from bottom to top and left to right, and each touched room is removed in full
through `0x3BEE9` / `0x3BF6D`. Floor, lobby, elevator, stairs and escalator
tools bypass this. Protected or unfinished rooms abort the scan; earlier
demolitions remain. Failed new construction also leaves earlier removals in
place. The checklist's initially assumed atomic replacement is therefore not
the executable's behavior.

`0x3ADCE` constructs parking spaces in four-cell blocks anchored at the
original pointer column and floor. `0x3AF63` builds ramp storeys vertically
at the original column. Both keep the attempted frontier, including failed
attempts, and continue through later candidates instead of rolling back a
batch. `constructionDragBatch` exposes this frontier; browser pointer event
integration is handled separately from the helper.

## Parking ramp and horizontal access

`0x390FC` permits the initial ramp only on native floor9, the first basement
(browser floor−1). Every ramp thereafter shares global column`word_5A672`.
`0x3B91B` rejects ramp construction above ground. Placement can skip a basement,
but `0x306C5` marks only the uninterrupted column fromB1 accessible. `0x30ACA`
requires a ramp record on the floor before parking construction. Both ramp and
parking use immediate initialization `0x47843`, bypassing `0x47740`'s twelve-
update construction pool. `rampPlacementError`, `parkingPlacementError` and
`immediateConstruction` expose these rules.

`0x306C5` derives ramp art from continuation: bottom/single bitmap3816,
intermediate3817, B1 with lower continuation3818. Build order does not select
the ramp variant. `0x308AD` walks horizontally from each connected ramp to
parking records. An empty type0 run at least four cells wide blocks subsequent
spaces on that side; smaller gaps and nonparking records do not stop the scan.
`parkingReachable` reproduces that floor-run rule.

Browser QA additionally recovered normal link assembly at189DA: upper2408 at+12/lower2472 at+36 for stairs; upper2728/lower2792 for escalators. Both use synchronized64px frame indices. Busy stairs use tick%13+1 across2408/2409 and2472/2473; busy escalators use tick%7+1; idle uses frame0. The browser renders correct idle pieces; native usage counters and visible traversal remain pending. Native bulldozer dispatchC3B0 prioritizes elevator then link then room;18F66 selects only the diagonal pixel band. Browser diagonal removal was verified with underlying occupancy unchanged.

## Building facilities behind existing elevators

Live IDA `0x3A117` first checks affordability (`0x2CAE0`), supporting floor
bounds (`0x3B825`) and facility/floor restrictions (`0x3B91B`). Its collision
test at `0x3A439`–`0x3A53E` scans only the floor-record table `BE6E`, accepting
an empty type-zero run and rejecting an occupied facility run. It never scans
the separate elevator table `C05A`. Therefore an existing standard, service or
express elevator does not prevent placing a room behind its columns.

The two-storey constructor `0x3A8BF` checks both rows with `0x3BBDF` before
calling `0x3A117` for each record. `0x3BBDF` likewise tests `BE6E` empty runs;
unfinished and occupied room records remain genuine obstructions. Parking
`0x3ADCE` and ramps `0x3AF63` also call `0x3A117`. The port's blanket ordinary
construction-versus-shaft rejection was removed. Dedicated shaft and link
placement checks remain independent and continue rejecting transport clashes.
Integrated tests preserve existing shaft cars, stops and onboard journeys,
exercise one- and two-storey facilities and immediate basement facilities,
and check that failed room/transport collisions leave the tower unchanged.

The reverse order is also native: `0x39904` chooses a free elevator slot and
calls `0x15988` at `0x39BC7` before writing the new shaft record. `0x15988`
scans only the 24 elevator pointers `C05A`–`C0BA` and 64 link records at
`C5E4`; it never consults room/floor occupancy. The port therefore also allows
new shafts through existing incomplete or occupied facilities without replacing
their records or actors. Ordinary `0x3A117`/`0x3BBDF` construction similarly
ignores the independent link pool, so rooms may be placed behind stairs and
escalators. The escalator public/commercial endpoint whitelist is a check on
**placing an escalator**, through `0x190D5`/`0x191DD`, not a later prohibition
on ordinary room construction. Post-construction `0x397A9` rebuilds transport
components only for transport/lobby tools, not ordinary facilities.

These corrections retain supporting floor bounds, ground/basement type
restrictions, ordinary room collisions and link landing footprints. The initial
overlap fix left exact shaft machinery/separation rectangles for a subsequent
pass; that pass is now implemented as described below.

## Exact elevator spacing, machinery and reused-slot type

Live `0x39216`–`0x3921F` divides centered world x by eight before storing
`51728`, passing it to `0x39904` and writing shaft `+3E`. Therefore the literal
eight added/subtracted by `0x15988` is **eight cells (64 pixels)**. Its rectangles
use mixed cell/floor coordinates solely for collision comparison; `0x3D5D2`
directly calls USER IntersectRect with no further scaling. All edges are
half-open: touching rectangles do not intersect.

Let `L/H` be the proposed browser low/high served floors, `x` its left cell,
and `W` the width read from the selected physical slot's type byte: six for
type zero (express), four for types one/two (standard/service). The constant
native floor offset cancels because all rectangle y coordinates use it.

| Comparison | Proposed rectangle | Existing rectangle |
| --- | --- | --- |
| Other elevator | `[x−8, L−2, x+W+8, H+1)` | `[other.x, other.low−2, other.x+other.W, other.high+1)` |
| Stair/escalator | `[x, L−2, x+W, H+1)` | `[link.x, link.floor−span−1, link.x+8, link.floor)` |

The current physical shaft slot is excluded from the elevator scan; Show and
stop flags do not disable its collision footprint. Machinery reserves the
floors beyond both served ends. For example, same-column shafts serving zero
and two collide, while zero and three merely touch these rectangles and fit.
No horizontal queue-space padding is added against a link.

`0xF9B4` allocates all 24 records with GLOBALALLOC `0x40` (zero initialization).
New-shaft `0x39BC7` validates before `0x39BF3` writes its chosen type, so fresh
slots use width six even for a new standard/service shaft. Deletion `0x14BCC`
only clears the active byte. `0xFA79`/`0xFB32` reset queues/cars without touching
the type, and New `0x1A527`–`0x1A590` also leaves the old type. Thus slot types
survive deletion and New within the application. `0x1AB15` serializes the first
`0xC2` bytes of **every** slot before its active check, preserving inactive
types in native saves too. Even the older format's first `0x2F` includes type.
The browser retains these 24 values in `nativeShaftSlotTypes`; a new Tower may
receive `shaftSlotTypes` from the previous tower. Legacy browser saves infer
active types and default unknown inactive slots to zero, since their deleted
records cannot be recovered.

Resize `0x15141`/`0x154BA` tests the **raw requested** range. Its affordability
check `0x2CB62` also covers the uncapped added floors before `0x151E0`/`0x15557`
caps standard/service spans to 30 floors. Only the capped structural work is
actually charged through `0x2CCD5`. Consequently a far drag can fail for a
collision or lack of cash even when the eventual capped range would fit.
Unchanged endpoints return before validation. `0x15920` adds a car only when
the selected tool type, exact shaft-left column and served floor match. The
browser's former interior-column shortcut and adjacent-shaft merge were
removed; Finger end controls extend the existing shaft instead.

`original-shaft-placement.js` and Tower integration preserve these checks.
Tests exercise precise boundaries, both machinery ends, hidden shafts,
unaltered stop flags, fresh/tombstone width changes, failed placement/load
atomicity, browser save migration, New type copying, raw cap preflights and
exact-left car insertion. Closely spaced old test banks were moved to valid
native positions while preserving the route/dispatch scenarios they exercise.
