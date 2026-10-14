# Native cinema and party hall actors

Recovered from SIMTOWER.EXE using IDA instance e36af917c304. Source behavior takes priority over manual descriptions.

- `47F0B` reserves56 actors for each cinema floor record and40 for each party floor record. `47843` initializes the booth records34/35 via414A8 and party29/30 via414CF;41090 normalizes the actor kind and initializes state39. The browser keeps112 cinema and80 party identities. Main auditorium records18/19 share the venue index with the booth and have no separately initialized active pool.
- `2E3CF` at tick240 sets both cinema admission allowances using2E95E, advances age up to127, and clears inside/total-admission counts. Each quality stage lasts three days. Party allowance is always[0,50]. No hotel-count gate appears in these booking/admission paths. Allowances count as daily population independently of actual arrivals and finite actor pool size.
- `3CEF6` opens cinema half0 at1000, projects at1200, opens half1 at1400, closes half0 at1500 and half1 at1900. Party half1 opens1200 and closes1600. `2E4C8` resets just the selected floor's existing actors to32 and changes stage0→1. `2E646` changes stage2→3 only when patrons have arrived.
- `45A11` lets state32 attempt arrivals on each native cohort update with probability1/6 after240 and before daylight phase4(tick1600). Unstarted evening patrons become39. `2EB09` consumes the exact half's allowance. Initial route failure refunds it through2EB6B and resets delay/trip statistics; subsequent interrupted routing ends39 without a refund. `2EA4B` actual arrival increments inside and total visitors, and stage1→2. There is no invented show capacity admission wait.
- `2EBB8` enters cinema on the upper floor and party on the lower floor;2EBEE always exits from the lower floor. `2E72A` changes only actors actually present in state3: first cinema close in daylight becomes1, other closes become5. It decrements inside and does not cancel late journeys. Final close posts revenue from actual cumulative admissions through2DCD7/2E9ED. Both native disaster dates suppress this revenue.
- `45B8D` state1 selects a random commercial category through333BD:334BB maps categories0/1/2 to fastfood/restaurant/shop. Selection uses the show lower floor's registered lobby list, with native ground-list fallback. Full admission retries in65; absent/closed/offsite admission becomes34;32E4E waits the PART duration only for a live venue, then routes directly outside in98. An initial failed food route becomes65 with destination index−1 and lower-floor origin; an interrupted continuation ends39.
- `A5A4..A625` rendering uses show stage independently of daylight. Auditorium bitmap frames0..3, party0..2, booth0..2 then3+movie index. Booth frames span3176/3177 and3240/3241 (ten frames in first bank). Upper bitmap layers retain their24pixel height at floorTop+12; lower layers are36pixels.

## Removed external service destinations

`3BF6D` destroys its own actor pool through417F8 and tears down shared show levels through2ED05. It does not cancel foreign visitors' journeys. Clinic2C531 and commercial32C32 discover missing destinations when the visitor arrives. Clinic66 must clear readiness once on arrival; already-inside35 returns immediately without clearing readiness. A food visitor already in34 similarly leaves immediately. `missingVenueRecovery` documents these distinctions for integration; persistence of the destination-missing marker still needs an end-to-end browser-save test once wired.

## Verification and remaining fidelity

`tests/shows-native.test.mjs` covers pool sizes, openings, bookings, route failure, projection, actual admissions and receipts, post-show meals, missing venues, sprites and save validation, plus real Tower integration. Route timing and congestion remain inherited from the transport model. Original movie selection cycles each venue's movie byte in23DEF, matching browser selection.
## Construction footprint, slots and title initialization

Full cursor-to-build source chain rules out the former24→31expansion theory:
`388D0` stores cinema's general width WORD24, but case18 (`38A48..38A5A`)
sets its selected RECT to248pixels×72pixels. `3987D` copies that RECT to
`56A3E`; `3C7C7` centers this31cell rectangle, and `390FC` derives both
construction edges using its actual RECT width. Thus collision checks,
floor creation and initial construction charge already reserve31cells.

Initial pending cinema comprises one31cell negative18/19record per floor,
with one temporary tenant slot per floor (`47740`→`484E0`). `2E172` completion
changes that record to booth34/35 with width7, inserts the auditorium18/19
with width24 immediately to its right, and registers both. Total footprint
stays31. It calls no new payment/floor creation/neighbour deletion routine.
Existing actor blocks retain their bases as the booth's112person pool.
Tenant slot completion now preserves adjacent records' original indices:
an office constructed next to a pending cinema can retain slot1 while
the completed booth reuses0 and its new auditorium receives2.

Native booth registration (`47843`→`2DFCD/2E0A2`→`2DE93`) chooses one title
with `rand()%14` at completion, not construction start. New browser cinemas
now keep `pendingTitle` until completion. This corrects the macro RNG timing;
full per-actor appearance RNG ordering remains part of the global actor
initializer replay audit. Pending and completed browser saves roundtrip,
and a completed cinema with a pending title is rejected atomically.

Tests include the explicit248pixel pointer override, collision of the reserved
last seven cells, untouched neighbours/floors/cash at completion, exact new
booth/auditorium tenant slots, preserved actor block bases and title RNG timing.
