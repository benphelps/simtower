# Commercial patrons and hotel acceptance

The supplied Win16 executable was inspected directly in IDA. Pure translations
are in `src/original-commercial.js` and `src/original-hotels.js`; the root
simulation and actor dispatcher integrate those adapters.

## Commercial counters and schedules

`0x47F0B` allocates **48 persistent actors** for each fast-food restaurant,
restaurant or shop. This allocation is independent of the **40 simultaneous
patrons** admitted by `0x32C32`. `0x32673` creates the facility record with three
recommendation buckets initialized to ten. `0x33710` selects weekday, weekend,
or rainy day (`0x63CD` sets that flag when date modulo eight is four and rating
is below five). The rainy-day latch persists all day, even after `0x640D`
clears the visual rain flag at tick1600. `0x33737` permits a newly created
fast-food facility/shop to start open only during phase zero after tick 240;
new restaurants start closed.

`0x32192` reopens fast-food facilities and shops at tick 240, restaurants at
tick 1600. It chooses weekday recommendations on weekdays, the larger of
weekday/weekend recommendations on weekends, and rainy-day recommendations
on rainy days. It caps the budget with `0x33673` and then applies a
minimum of ten. Only the active recommendation bucket is cleared. Limits
decoded from the original PART data are:

| Facility | Weekday | Weekend | Rainy day | PART offsets |
|---|---:|---:|---:|---|
| Fast food | 35 | 50 | 25 | `0x1e/0x20/0x22` |
| Restaurant | 35 | 50 | 25 | `0x2c/0x2e/0x30` |
| Shop | 25 | 30 | 18 | `0x38/0x3a/0x3c` |

The facility's previous generated-patron count becomes its population
allowance; current generated, inside and total visitors reset at opening.
`0x32FF0` reserves an own patron by decrementing remaining, incrementing
generated, and incrementing visitors. A failed initial route rolls all three
changes back with `0x3307E`. Outside visitors from other facilities increment
visitors only on admission (`0x32C32`), preventing double counting own patrons.

`0x446B9`/`0x44E4D` sample own patron arrivals per native cohort: fast food and
shops use one-in-36 attempts from tick 241 through phases zero to three,
one-in-six attempts in phase four; restaurants use one-in-twelve in phase
four and force remaining attempts in phase five before tick 2200. `0x32E4E`
keeps admitted patrons for the PART visit duration (60 ticks), then decrements
inside count. `0x32B45` changes occupancy state at one, ten, nine and zero
patrons. Closing bypasses further visit-duration waits. Fast food/shops close
at tick 2000, restaurants at tick 2200.

`0x330BC` adds **two** recommendations for own patrons whose actor mean is
below the current good threshold, **one** below the bad threshold, and **zero**
at/above the bad threshold, capped to the category/day limit. There is no
separate invented subtraction for a boycott; lack of recommendations sends
future daily budgets back toward the ten-patron minimum. The callers are own
commercial departure/failure routines `0x448A0`, `0x45031`, and `0x4204C`.
Office/condo dining returns (`0x48844`) do not add recommendations.

`0x28F04` evaluates food using actual visitor totals and the native 25/35/50
thresholds. Shops use **remaining daily patron budget plus actual visitors**,
with good/bad thresholds 25/20. `0x28EB9` shifts both shop thresholds by +5
for high rent, -5 for low rent, and -12 for very low rent. Shops receive their
rent on first successful applicant transportation (`0x2DBAB`), then quarterly;
tenure zero bypasses quarterly eviction/referral (`0x292B7`). Food receives
closing receipts from `0x32552`, including losses below minimum sales and
zero receipts on the native special event dates. Shops receive no daily rent.

## Hotel states, cleanliness and referrals

`0x432CC` gates outside hotel applicants on acceptance and evening timing;
`0x4358E` checks parking (required for suites) and transportation, then invokes
`0x2D862` on first successful transport. It does **not** require housekeeping
before an initial stay in a clean newly built hotel. `0x2D862` adds guest
population and collects no income. Checkout `0x2D914` collects the current
price and clears acceptance, leaving native room state 40/48 (dirty). Clean
vacancies use 24/32; occupied rooms use low state values, with phase flags.

At tick 1600, `0x289E2` first spreads state 56/64 from a neglected hotel into
physically adjacent hotel room records. A newly spoiled right neighbor is
skipped for the remainder of that scan; it can spread further the next day.
Gaps and nonhotel records block propagation. `0x28909` then evaluates all
hotel rooms, calls `0x29677`, and finally applies `0x29779` referrals.

For dirty states at/above 40, `0x29677` clears any still-latched acceptance and
resets the neglect counter; otherwise it increments the counter. **Equality
with three** changes the room to state 56/64 (unusable). Routine housekeeping
`0x2A6F2` cleans only states 40/48, restoring 24/32; it does not clean 56/64.
The neglect counter is a byte, so the adapter preserves its wrap behavior.

For clean states below 40, `0x29779` accepts grade 1/2 and resets guest stress.
Grade zero needs one grade-A hotel of the same type on the same floor; both
grades become one, the target accepts applicants and resets guest stress.
Without a donor, acceptance clears. Referrals do not mix singles, twins and
suites. Dirty/unusable rooms are excluded from this acceptance step.

## Ordinary hotel guests and departure timing

Live IDA `0x4358E` successful arrival increments the room's inside counter,
then `0x43C75` assigns dinnerstate1 for even **per-floor tenant actor-pool
slots**, or homestate4 for odd slots. The slot is room `+12`, allocated first
free by `0x484E0`; it is not the room's horizontal table index or guest child.
`0x432CC` samples dinnerstate1 one-in-six in phase4, settling it tohome4 after
phase4. `0x48600` chooses category1 (restaurant), supports capacity40 admission
retry, and `0x48844` returns after its60tick visit. A returned hotel guest
becomesstate4, not the office return states.

State4 samples sleep one-in-twelve fromphase5, and forces sleep aftertick2400.
`0x4733C` sets facade sleep16 once the single/sole-inside guest sleeps, or both
twin/suite guests sleep. State16 wakes beforephase5 (includingphase4), or by a
one-in-twelve sample after2566; `0x4369A` resets a sleep facade to guest
capacity1/2 and actorstate5. State5 begins checkout one-in-twelve at dawn,
otherwise immediately in phases1..5; phase6 does not begin departure.

`0x47457` decrements the inside counter when dinner/departure starts. For a
departure, `0x438B5` collects checkout income immediately when the final low
counter reacheszero, including initial failed transport. VIP checkout is
separately assessed when the outside transport finishes. A second arriving
guest must not re-run first-room checkin `0x2D862` and erase the first guest's
counter. `original-people.js` now integrates ordinary guest evening states and
native room counters. Dedicated Tower tests cover dinner, return, sleep,
wake, income at departure start, and unreachable initial applicants.

## Remaining limits and checklist reconciliation

Native interior occupants are translated in `original-interiors.js`; exact
render/update ordering and native replay remain partial. Native saves and all
rain/disaster interactions remain separately tracked. These
adapters reproduce inspected counters and transitions; they do not establish
full replay equivalence for reconstructed routing and walking.

Update F11's stale missing referral item: condo same-floor referrals are now
implemented by `original-tenancy.js`. F02/F03 commercial referral/boycott and
shop quarter-evaluation checks can advance when the new commercial handlers
are integrated and integration-tested. F12/F15 hotel first admission,
acceptance/referrals and three-day neglect likewise depend on integration.
# Office afternoon visit abandonment

Additional live source check: `0x42742..0x42783` handles office actors in
food state34 or clinic state35 at phase4 or later. It sets actor state39 and
calls `0x30399` parking release only. It does not call the food-return
`0x32E4E`/commercial-state updater `0x32B45`, or medical return `0x2C6B4`.
The selected venue in actor+6 also remains. Thus abandoned office food visits
retain their venue capacity contribution until the next opening resets it.
The browser clears its own `commercialInside` ownership flag so later generic
cleanup cannot decrement that abandoned visit, preserves the selected job,
and leaves the original commercial `inside` counter untouched.

The Tower test fills a venue to40, abandons its office visitor at phase4,
confirms new visitors still wait, then confirms opening clears capacity.

# Hotel no-route arrival recovery

`0x43A71`'s arrival transport−1 branch tests the room-state byte against24.
Already accepted rooms below24 funnel to`0x43B63 → 0x47236`, restoring the
hotel home counter and placing the guest in state4. The branch does not
release parking or fail an active VIP. A room still at24 or higher instead
keeps the applicant outside32, releases parking, fails the reservation and
clears BYTE/WORD histories. The browser now preserves the two branches and
also clears its duplicate room history on that vacant reset. A Tower suite
test accepts one partner, fails the second guest's route, and verifies both
inside counter10 at night, population2, retained VIP/car and no early receipt.
