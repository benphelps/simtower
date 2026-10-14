# Native tenancy, acceptance and referrals

This pass directly inspected the supplied Win16 executable in IDA, including
`0x28C0F`, `0x28F04`, `0x29200`, `0x293AD`, `0x29507`, `0x3A117`,
`0x42811`, `0x44050` and `0x47843`. The exported assembly remains in
`research/ida/`. The pure browser adapters are in `src/original-tenancy.js`.

## Admission and occupancy

The native room record has separate occupancy/state (`+0x0B`), applicant
acceptance (`+0x14`), evaluation (`+0x15`) and quarter tenure (`+0x17`). These
are separate concepts; an accepting vacancy is not occupied and does not add
population or collect rent merely because time elapsed.

`0x3A7C4` initializes acceptance to 1 and `0x3A7D5` evaluation to -1.
`0x47740` allocates actors and initializes twelve construction updates.
`0x47843` completes construction with vacant offices in state 16/24 and vacant
condos in state 24/32, depending on whether the current clock phase is before
phase 4 (`0x3D48E`). `0x412BC` initializes office actors outside in state 32.
Condo applicants also begin outside; existing occupied condo residents begin
in sleeping state 16.

`0x42495` gates office state-32 arrivals on the acceptance byte. Morning
weekday arrival timing remains the native one-in-twelve phase-0 attempt,
forced during phases 1 and 2. `0x43D28` gates condo state-32 arrival on the
same byte and allows attempts before phase 5. Admission is tied to the first
successful transportation result from `0x3E2A0`: results 0, 1 or 2 start a
journey and result 3 is an immediate arrival. `0x42811` then invokes office
move-in payment `0x2D71E`; `0x44050` invokes condo purchase `0x2DA4D`.
Payment happens when transport is obtained, rather than after the passenger
finishes the trip. Only the first actor changes the unit to occupied, so later
actors do not pay again. An applicant with no route stays outside in state 32
and clears its trip totals; existing tenants have different failure handling.

## Stress, evaluation and quarter ordering

`0x28C0F` returns -1 for a vacant office/condo whose acceptance byte is already
set. A rejected vacancy uses the previous residents' actor statistics. The
mean is the truncated average of each resident's truncated trip mean, using
six office residents, three condo residents, and the guest children of hotels.

The office jump at `0x28CE9` and condo jump at `0x28E2E` both enter `0x28D93`.
After division, `0x28DA7` calls the price/noise adjustment `0x28E4B`. Thus this
adjustment applies to offices and condos as well as hotels: high adds 30,
average adds zero, low subtracts 30, very low sets transportation stress to
zero; noisy neighbors then add 60, and the result is clamped to at least zero.
The route graph itself is not an input to this mean calculation. Noise uses
the existing source-derived horizontal scans in `0x298C0` and its callees.

`0x28F04` maps means below the good threshold to grade 2, below the bad
threshold to grade 1, and at/above the bad threshold to grade 0. Negative
means produce evaluation -1. `0x29D19` chooses the 1/2-star, 3-star, or
4/5-star threshold pair. If acceptance was clear and the evaluation is
nonzero, `0x28F04` sets acceptance; this includes the native negative grade.

At tick 2533, `0x3CEF6` calls `0x28800`. For each native floor, it first
evaluates every room. On dates divisible by three it then runs `0x29200`
for every room, followed by `0x293AD` for every room. The native room table
is ordered by horizontal position by insertion routine `0x3A117`.

For a grade-0 occupied office or condo, `0x29200` vacates the unit; office
vacation clears acceptance and tenure, and condo vacation also refunds the
sale. A vacant grade-0 unit can then recover through a grade-2 room of the
same type on the same floor. The first matching donor is consumed: both
grades become 1, the target's acceptance becomes 1, and `0x29507` clears the
target's actor totals. One grade-A donor therefore enables one rejected unit,
and the target still needs an applicant journey before becoming occupied.
There is no unrestricted random re-letting in this routine. Shops with tenure
zero skip the grade-0 eviction/referral pass (`0x292B7`). Commercial evaluations
use native patron counters, rather than resident trip stress, so the browser
must keep that path partial until those counters are represented.

`0x293AD` increments occupied office/shop tenure before collecting rent while
the old tenure is below 120. Condo tenure increments without rent. Occupied
units clear actor totals even when tenure has reached 120. Rejected vacancies
retain their totals unless a referral clears them. `0x36EE4` clears the actor
trip-count byte and accumulated mean numerator, not the ongoing trip's stress.

## Resident facade state byte and original atlas packing

Live IDA on `0xA406`/`0xA461` confirms that unit ownership is not sufficient
to select its facade. The native room `+0B` byte stores a home-person counter
and special empty/sleeping/vacant modes. `tenantRoomSprite` translates this
byte without changing the original artwork. Office styles have two frames
each: styles0/1 are in1448, styles2/3 in1449, styles4/5 in1450, and the two
shared vacant frames are in1451. The previous `1448+style` assumption selected
missing resources for later styles. Condominiums have five one-frame bitmaps
per style, selected by `(state>>3)+style*5`.

`0x470A3` increments office inside counts, changing empty-night8 to1.
`0x4716A` decrements them and changes a final zero to8 in phase4 or later.
Native departures decrement immediately at trip creation, including failed
initial routing; successful return increments at completion. `0x474C4`
increments condo counts, changing sleep16 to1/9 by time. `0x476C8` decrements
condos. `0x475CA` switches a condo to sleeping16 if the current resident is
the sole person inside, or the other two allocated actors are asleep16.
`0x4417B` changes a waking sleep16 condo counter to3.

`0x480AE` at dawn resets occupied offices to0 on weekdays or8 on weekends;
vacant24 becomes16. Condo vacant32 becomes24, while occupied condo modes
remain untouched. `0x4829F` at1600 changes office vacant16 to24 and empty0 to8,
but leaves a positive worker count illuminated. Condo vacant24 becomes32,
and awake daytime0..3 becomes night8..11; sleeping16 remains asleep.

Pure entry/exit/sleep/wake/clock helpers are implemented. Shared simulation
hooks integrate these counters separately from the room ownership flag.

## Remaining limitations

Interrupted transport restoration still requires pairing each native inside
counter update with the shared actor interruption dispatcher. Native save-file
compatibility remains deferred as requested. Numeric examples in the user manual are
illustrative; the supplied executable is the behavior source for thresholds.
# Follow-up noise and acceptance audit

`0x29965/299E8` compare the current scanned quiet record's boundary before
examining its next neighbor. In the original interval table, empty gaps are
quiet records. Consequently a source whose right edge equals
`targetLeft-radius`, or whose left edge equals `targetRight+radius`, still
counts. Radii remain office10/hotel20/condo30. `0x29A78` tests the signed room
type directly: negative construction types are excluded, regardless of the
future room category. Occupancy/opening state does not suppress noise from a
completed business. Source scans only occupied-category target types3/4/5/7/9;
commercial/service/construction targets have no noisy-neighbor result.

The browser helper now matches those inclusive boundaries and excludes
construction. Tests cover each exact edge, the cell beyond, an unfinished
source/target, and a completed empty shop still causing noise.

`0x445F5 → 0x474C4` restores the home counter and state4 after an occupied
condo's failed outing/return/food trip. Unaccepted initial condo arrivals
instead reset BYTE/WORD history and stay outside32 (`0x443C8`). The duplicate
browser room history now resets together with that actor history. Office
occupied arrival failures use state37 (`0x42A95`), whereas its ordinary
outing/return failures use38. New accepted office/condo/shop contracts call
`ResetFacilityActorStress` in `0x2D71E/2DA4D/2DBAB`, clearing all identities'
history before their new tenancy; the Tower admission hook now does this too.

`0x28F04` acceptance+14 is a latch. An already set latch is preserved even
when evaluation becomes0. A cleared latch may reopen for nonzero evaluation;
hotel types3..5 additionally require their native state below40. This confirms
`dailyTenancyPlan`'s existing latch expression. Eviction/referrals are still
the separate quarter-only `0x29200` pass, not daily acceptance evaluation.

# Eviction and late transport continuation follow-up

Live IDA audit2026-10-15 inspected the full28800 evaluation/quarter loop and29200,2D7A9,2DAF2,2DC45: eviction writes vacancy facade, clears acceptance+14/tenure+17, applies population loss and condo refund. It does **not** clear the persistent actors' state/history, trips, car/FIFO entries, parking or external venue counters. Browser `vacateRoom` now preserves these and new tests replace the old invented immediate cleanup behavior.

42495's outside applicant32 branch explicitly tests+14; other worker states continue despite eviction.43D28/44050 likewise dispatch existing family states independently of the lease. `updateActors` now restricts the acceptance gate to state32, including occupied rooms whose acceptance latch stayed false after a continuation.

470A3/474C4 increment the facade BYTE on ordinary returning-home/business/food/treatment completion. A late return to a vacancy may consequently yield office25 or condo33 at night, still rendering the same vacancy frame through nativeSAR3. Counter increments/decrements wrap BYTE width. The model no longer re-derives authoritative state from actors every sync; only legacy missing-state or old ownership fixtures migrate. Save validation admits source-reachable vacancy counter offsets within one allocated cohort's capacity rather than silently repairing them or accepting arbitrary invalid values.

42B50 and44511, successful initial-arrival96 continuations, check vacancy facade and call2D71E/2DA4D before entering. They can re-admit a room evicted while that arrival was already queued, without checking or reopening+14. Tower's continuation admission path bypasses only that acceptance guard and re-posts the accepted population/initial payment once. Ordinary home97/food98 returns only modify the facade, without new rent/sale or population. Tests cover both room types, an active car passenger save, resale at a new locked price, external food departure after eviction, and no history/identity reset at eviction.

The browser keeps an explicit accepted-contract boolean alongside native facade bytes, but the native lease classifier now controls evaluation, quarter contracts, price locking, eviction loss and repeated refunds independently of the accepted-population LONG. Arbitrary out-of-atlas state corruption remains outside validated one-cohort vacancy offsets.

## Repeated native vacancy/refund edge

Full293AD verifies that quarter eligibility compares the signed facade BYTE, not any separate ownership/population count. Office2D71E with ARG4=1 posts only rent and leaves facade/population unchanged; condos increment tenure and reset histories while their facade is<24, even when the independently maintained accepted-population counter is zero.28C0F likewise includes such facade-occupied rooms in stress evaluation rather than treating them as accepting vacancies.

A directly tested legitimate sequence is: an old condo family member already has a home97 trip; eviction sets vacancy32/refunds the original price; the user changes the now-vacant price tier; home completion474C4 increments32→33 without a sale; sleep475CA sees inside lowbits1 and sets16. That facade is occupied for the original's later checks despite accepted population0 and no new sale.

29200 subsequently sees a bad occupied condo16 and invokes2DAF2 with ARG4=1. **2DB78..2DB93 reads current BYTE price+16, CBW, pushes type9 and calls2D356; then2DB99 pushes signedWORD−3 intoD497.** There is no sold flag, historical payment guard or nonnegative population clamp. The subsequent eviction therefore repays the newly chosen tier a second time and makes the accepted condo LONG−3. Native demolition3C074 uses the same facade classification and condo refund path. Tower preserves this source bug explicitly for quarter eviction, bulldozing and disaster damage, with save roundtrips of the negative accepted counter. Ordinary first refunds continue using the recorded sale for old browser-edited saves; in current native-equivalent play the occupied tier is locked and equals that recorded price.

2D356's exact refund arithmetic: tier4 is zero; otherwise it locks the original RENT resource, indexes `type*16+tier*4`, calls3DB0E to swap the big-endian LONG, subtracts it from native cash5A652 and posts its negation throughD4D7. No rounding or population multiplier occurs. Browser `rentAmount` uses the same decoded table with the project's internal-to-display currency scale. Admission2D71E/2DA4D and shop2DBAB also use native facade eligibility rather than the accepted boolean, so a returned/sleeping ghost family cannot trigger another sale merely because the browser's accepted ownership remains false. Shop2DBAB sets commercial stateFF→0 as part of its first contract; Tower now performs this directly, preventing duplicate admission calls from posting its population bonus repeatedly.

## Waking and late family returns

`475CA` sets sleeping16 when a condo's sole inside family member sleeps, even if the other members are still travelling in state98. `4417B` restores the full family count3 on waking. Each later `474C4` home completion increments that BYTE, producing daytime4/5, and the native1600 phase shift can produce night12/13. Accepted population remains3; there is no new contract or sale. Validation now admits these source-reachable counts while retaining bounded vacancy offsets. A Tower regression stages two queued late returns, wakes the sole sleeper, completes those trips, applies the1600 shift and roundtrips native state13 through the save adapter.
