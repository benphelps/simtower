# Emergency and cathedral implementation evidence

Reviewed directly with IDA on 2026-10-14 against the supplied Win16
`SimTowerDOS/SIMTOWER.EXE`. Modules: `src/original-events.js` and
`src/original-cathedral.js`; tests cover source boundaries and host hooks.

## Bomb

`3CEF6` invokes the bomb trigger at tick240 when date%60=59. `1983E`
requires a built security office, no bomb/fire already active, tick<=1200,
an eligible ordinary floor of at least4cells, and rating2/3/4. It chooses
the floor with `19B0E` and an inclusive x in [left,right-4] using `19B80`.
Demands come from PART: $200000/$300000/$1000000. Dialog3020 button2 pays,
button1 searches. Payment can reduce the cash balance below zero.

Without SECOM (`1EBFD`, confirmed1EC56..1ED5C) all six children are active:
children0/1/2 initialize on the office floor, children3/4/5 one floor below.
With SECOM only child0 is active, initially on its office floor. AccessX starts0
and the shared high/low range starts target−1/target (office or known bombfloor).
During the first dispatch children allocate separate unsearched floors in
native order: noSECOM office,office+1,office+2,office−1,office−2,office−3;
SECOM child0 travels directly to the known bombfloor. `1EFC1` scans from
right-2 towards the left, one cell with a
one-tick delay between moves, then selects the next unsearched existing
floor. `15BDB` excludes the upper floors belonging to a tall ground lobby.
`1F8A5` applies three ticks per exterior-stair floor traversed, plus three
when moving upwards from below the home office. It uses exterior stairs,
not elevator routes. `416CE` updates every security actor every tick.

`19994` tests exact floor/x equality. Success (`199C7` with arg1) schedules
the result two ticks later. Failure at tick1200 calls `19A8D` immediately:
six floors from bombfloor-2 through bombfloor+3, forty cells from x-20
through x+19. `19A24` shows original3023/3024, clears the event and moves
the native clock to1500. The manual's random-date/13:00 example differs
from this binary's date modulus/15:00 deadline.

## Fire

`3CEF6` calls `1D819` at tick240 on date%84=83. It requires security,
rating>=3, daytime, no bomb/fire, no cathedral, and a selected floor at
least32cells wide. Initial fire x=right-32. Two twelve-cell overlays track
leftward and rightward fronts. SECOM shows3010 and delays spread80ticks;
otherwise3011 and no spread delay. The rescue offer3012 is two ticks after
the fire start (`197D0`). Button2 pays $500000 and starts the helicopter at
right-12; button1 shows3014 and activates the six security actors.

`1DAF6` damages the whole facility intersecting each frontier cell, moves
fronts one cell at tick%7=0, and starts eligible upper-floor fronts when
tick==start+(floor-startfloor)*80. These are equality checks, not catch-up
timers. `1DC42` moves the helicopter one cell each tick; `1E048` clears
fronts to its right. `1F493` assigns security children floor residues mod6,
walks them towards the front, and waits5ticks while extinguishing; `1DFC8`
then clears any twelve-cell front containing their position. `1DA91`
shows3013, resets the security pool, and advances early finishes to1500.
Fire forcibly ends at2000.

During emergency phases `0FD4B` calls `416CE` instead of ordinary
`41544`. Ordinary actor-cohort walking/route-choice updates freeze. The
elevator update sequence follows this switch and continues physical car
motion, unloading and boarding; emergency mode does not freeze entire cars.
`1EBFD` resets **security actors only**; it does not globally discard
ordinary people. Damaged rooms release their own actors/parking through
`417F8` and the facility teardown routines.
On ending,1EBFD(0) puts staff in state1/nativefloor0(browser−10), clears
access/mode/delay/iteration fields, and leaves other actor pools intact.
Bomb resolution's19A11 common path focuses the bomb location for both
successful discovery and explosion, before the delayed result dialog.
On discovery the finder remains active in pose4 with delay100 (`1EF16`
stops all other staff). Mask1 remains active alongside result mask20,
so `416CE` still calls `1EFC1` and decrements the finder's delay on the
intervening tick. `197D0` resolves the dialog before actor dispatch two
ticks after discovery. The browser now preserves this result-phase update.

## Damage and original overlays

`3BEE9` finds the entire facility containing the damaged cell. `3BD44`
refuses under-construction records and protected types14,15,24-26,31-33,
36-40,45, including when called silently by a disaster. Security,
housekeeping, lobby, metro and cathedral therefore survive this path.
`3BF6D` releases actor/parking allocations, subtracts occupied population,
and refunds a sold condo through `2D356`. `2ED05` tears down both levels
of a cinema or party hall. `3C31A` writes damage type47 with state0 over
the whole footprint; it does not remove the underlying floor structure.
Type47 uses original rubble bitmap4008 (248x24).

`1DC92` draws fire type46 frames0..3, or4..7 during the SECOM delay:
3944..3947 and four96px sections of3948, respectively. `1DE85` draws
frame8=3949 for the helicopter. `1E989` draws security global people
pose90+mode, where mode0/2/4 yields1517 sx160/192/224 after concatenating
1512..1518. Exterior transit is hidden while its countdown is nonzero.
All overlay art was inspected directly; no replacements were generated.
Staff draw `1E989` requires its row in the visible native floor range and
both8pixel cells fully inside viewport (`1EACF..1EAF4`); partial-width staff
are omitted. The browser helper now enforces that rectangle condition rather
than relying only on canvas clipping. Fire/helicopter still draw per-cell
and can be partially clipped horizontally. Elevator preview takes `F2B2`'s
`1E1C1` branch, which blanks facility records (`1E299`) then draws the
selected shaft (`163BA`), queues (`1699C`) and cars (`104B0`). It does not
call link artwork (`189DA`), fire or security overlays; those are suppressed.
Structural edge scaffolding, canopies and crane remain retained background
from `B3A3→35480`, outside the blanked floor-record rectangles.

## Cathedral and Tower status

`3AC17` assembles five records: type36 at the top, type40 at the bottom.
`47F0B` allocates8actors for each record, forty total. `AB30` resets them
at tick0. `4633A` admits weekend worshippers only during phase0: one-in-
twelve after tick80, forcing arrival after240. `464B2` routes visitors
from the ground lobby to nativefloor109/browser99 (100F), then setsstate3.
Missing the morning changes outside visitors to39. At1200 `ACA9` changes
presentstate3 visitors to5, then `464B2` routes them back to the lobby.

On actual arrival before800, `AC20` invokes `AEEB`: exactly40state3 actors
and a candidate population rating above5 (15000) trigger `ADE5` and
`29C1F`. This sets rating6, shows3034, clears VIP/warning promotion latches,
changes all five cathedral graphics tostate2, and plays original10008.
Ordinary worship changes the bottom record alone tostate3.

Day/night graphics use base3304/3368/3432/3496/3560 sections0/1; ceremony
uses3305/3369/3433/3497/3561, and worship uses3562 at the base. `6BC2`
updates the ceremony at (tick+nativePoolIndex)%16 when People is enabled,
or immediately when the base room is dirty. `7E2E` writes two figures
approaching from columns0/27 to13/14, then columns13/13 with frames2..6,
finally frame7. The dedicated wedding bitmap2088 contains eight16px-wide
poses,36px tall. It is not SECOM artwork; SECOMtype45 uses3880.

## Remaining precision limits

The host still adapts native facility/pool records into browser room and
actor objects. Emergency staff positions are represented separately from
ordinary routes; shared office search ranges and fire residues are ported.
First-contiguous-floor scanning intentionally retains the source's unusual
behavior when construction reaches nativefloor0/browserB10.

Cathedral visitor routing inherits the port's remaining transport graph
differences. Its visual ceremony scheduling requires the original room's
native tenant slot: the helper resolves base40's actual index rather than
default0 or top36. Rendering now drives the ceremony only with the base40
visible, dirty OR People+cohort, with same-tick browser repaint dedupe.
Native repeated repaint/dirty record replay still needs visual validation.

Cockroach lifecycle is implemented by the separate tenancy agent in
`src/original-hotels.js`, following29677/289E2/28909/2A410/2A6F2.
