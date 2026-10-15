# Manual-based SimTower coverage and implementation queue

Baseline and updated status are based on the supplied 68-page OCR manual, the current JavaScript source/tests and directly inspected Win16 executable routines. Printed manual page numbers are used below; add 5 for the PDF page number. The manual index (printed 61-62) was cross-checked against this inventory. OS-specific window behavior and disputed numeric examples are recorded separately.

## How coverage is counted

Each feature is split into explicit behavioral checks. **C** = implemented for the stated behavior with source/test evidence; **P** = usable but approximate or incomplete; **M** = missing; **D** = intentionally deferred. The fraction is fully covered checks / all checks, not a guess at percentage of code ported. Partial checks receive no invented half-credit. A covered check does not establish pixel-identical output or identical random call order.

Priority: **P0** foundational transport, occupancy, economy and progression; **P1** ordinary gameplay and management UI; **P2** rare events, victory and audiovisual fidelity; **P3** application integration/help and deferred saves. Dependencies break ties. Work proceeds in the table order.

## Feature list in priority order

| Order / ID | Feature | Manual pages | Priority | Fully covered | Partial / missing / deferred | Source evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | Journey routing and transport choice | 46,48,54-56 | P0 | 8/8 | 0 P / 0 M / 0 D | simulation.route; IDA 34C04,34A52,34B12,34E0E,346B3 |
| F02 | Occupancy, stress and tenant retention | 23,48,56-60 | P0 | 8/8 | 0 P / 0 M / 0 D | simulation.tenantStress/settleQuarter; original-people; IDA 28B7B,28F04,29200,293AD |
| F03 | Sales, rents and tenancy contracts | 40,48-49,59-60 | P0 | 7/7 | 0 P / 0 M / 0 D | simulation.updateRooms/settleQuarter/demolish; original-economy; IDA 2D71E,2DA4D,28C0F |
| F04 | Star progression and facility unlocks | 16,22,24-26,33-34,53 | P0 | 7/7 | 0 P / 0 M / 0 D | catalog; checkRating; original-toolbar; IDA 29B9D,29F8D,2A0FE |
| F05 | Lobby, floors and structural support | 10,15,24,30,43,45-46 | P0 | 8/8 | 0 P / 0 M / 0 D | simulation.plan/build/resizeShaft; renderer.lobby; IDA 3B91B,274D7 |
| F06 | Elevator construction and limits | 13,15,37,44,47-48 | P0 | 8/8 | 0 P / 0 M / 0 D | simulation.plan/addCar/resizeShaft; original-shaft-placement; IDA39904,15988,150B9,15427,390FC |
| F07 | Directional elevator dispatch and programs | 16,34-38,54-56 | P0 | 8/8 | 0 P / 0 M / 0 D | original-elevators; elevator-dispatch tests; IDA 103EC,1079C,10EF3,1009B |
| F08 | Stairs | 10-11,44,46,56 | P0 | 4/4 | 0 P / 0 M / 0 D | simulation.plan/route/updatePeople; renderer; IDA 3E2A0,34B12,35128 |
| F09 | Escalators | 46,54-56 | P0 | 4/4 | 0 P / 0 M / 0 D | simulation.plan/route; IDA 34A52,3507B,3E2A0 |
| F10 | Office daily lifecycle | 12,14,48,58 | P1 | 5/5 | 0 P / 0 M / 0 D | original-people; IDA 42495,42811 |
| F11 | Condo family lifecycle | 49,60 | P1 | 5/5 | 0 P / 0 M / 0 D | original-people; IDA 43D28,44050 |
| F12 | Hotel singles, twins and suites | 18-20,48-49 | P1 | 6/6 | 0 P / 0 M / 0 D | catalog; original-people; IDA 432CC,4358E,2D914 |
| F13 | Food businesses and daily patron demand | 12,49,54-55,58-59 | P1 | 7/7 | 0 P / 0 M / 0 D | original-people/ original-economy; IDA 44E4D,45031,32024,320F0 |
| F14 | Retail shops | 49,55,59 | P1 | 5/5 | 0 P / 0 M / 0 D | simulation.updateRooms/settleQuarter; IDA 446B9,448A0,32192 |
| F15 | Housekeeping and dirty rooms | 19-20,32,51 | P1 | 6/6 | 0 P / 0 M / 0 D | original-people; simulation.status; IDA 46719,4680B,2A410 |
| F16 | Parking spaces | 49-50,53 | P1 | 7/7 | 0 P / 0 M / 0 D | simulation.parkingSpaces/bookParking/releaseParking; IDA 300BB,30162,3022A,305F7 |
| F17 | Parking ramps | 50 | P1 | 5/5 | 0 P / 0 M / 0 D | simulation.plan/rampConnected; catalog; IDA 390FC,3B91B |
| F18 | Medical service and demand | 52 | P1 | 6/6 | 0 P / 0 M / 0 D | original-people; checkRating; IDA 2C3BF,2C531,2C6B4,2C80F,4553B |
| F19 | Recycling | 51 | P1 | 6/6 | 0 P / 0 M / 0 D | simulation.updateGarbage; original-systems; IDA F530,F60E,F701,F780 |
| F20 | Movie theatre gameplay | 42,50,60 | P1 | 8/8 | 0 P / 0 M / 0 D | simulation.startShows/finishShows/changeMovie; IDA 2E95E,2E9ED,45B8D |
| F21 | Party halls | 50 | P1 | 4/4 | 0 P / 0 M / 0 D | simulation.startShows/finishShows; IDA 2E3CF,45A11,45B8D |
| F22 | Metro/tube station | 51 | P1 | 5/5 | 0 P / 0 M / 0 D | simulation.plan/tick; IDA 384F3,390FC |
| F23 | Facility inspection | 11-12,17,39-40,45 | P1 | 6/6 | 0 P / 0 M / 0 D | main.roomDialog; original-dialogs; IDA 1FD89,204E8 |
| F24 | Person/tenant inspection | 17-18,40-41 | P1 | 5/5 | 0 P / 0 M / 0 D | main.personDialog/actorPortrait; IDA 1FA10,1FAF3 |
| F25 | Elevator/stair passenger inspection | 40,43-45 | P1 | 3/3 | 0 P / 0 M / 0 D | main.inspect; IDA 20B9D,20ED5; DTMP 761/762 |
| F26 | Names and Find Person tracking | 18,40-42 | P1 | 6/6 | 0 P / 0 M / 0 D | main.renameDialog/findPersonDialog; IDA 236E9,1C680,1C6EF |
| F27 | Pricing and evaluation map modes | 17,31-32,56 | P1 | 5/5 | 0 P / 0 M / 0 D | renderer.map/render; main set map mode; IDA 36570,367C4,368D3 |
| F28 | Hotel diagnostic map mode | 32,51 | P1 | 4/4 | 0 P / 0 M / 0 D | renderer.map; main; IDA 368D3 |
| F29 | Elevator stop and waiting-floor controls | 15,36-37 | P1 | 7/7 | 0 P / 0 M / 0 D | main.elevatorDialog; original-elevators; IDA 14ED6,20B9D |
| F30 | Elevator live schedule display | 34,37-38 | P1 | 4/4 | 0 P / 0 M / 0 D | main.elevatorDialog; DTMP 400; IDA 20B9D |
| F31 | Elevator Show toggle | 38 | P1 | 3/3 | 0 P / 0 M / 0 D | main.elevatorDialog; renderer shaft loop; IDA 20B9D |
| F32 | Elevator Simulate preview | 38 | P1 | 3/3 | 0 P / 0 M / 0 D | original-elevator-preview; main.elevatorDialog; native Simulate1E1C1/1E3B8/3F412 |
| F33 | Pause, scrolling and tool availability | 24,30,43-44 | P1 | 5/5 | 0 P / 0 M / 0 D | main.attachEvents/frame/setSpeed; IDA C6E1,EDF9,CB0D |
| F34 | Construction gestures and placement feedback | 10,15,43-46,50 | P1 | 6/6 | 0 P / 0 M / 0 D | main.attachEvents/updatePreview; simulation.plan |
| F35 | Bulldozer and protected structure | 44-46,50 | P1 | 5/5 | 0 P / 0 M / 0 D | simulation.demolish; IDA 3BD44,3BF6D |
| F36 | People colors and animation | 15,18,27,47,57 | P1 | 6/6 | 0 P / 0 M / 0 D | people-sprites; renderer; IDA 163BA,1699C |
| F37 | Finance window | 13,29,38-39 | P1 | 5/5 | 0 P / 0 M / 0 D | main finance dialog; original-economy; IDA CD73,D119,CCDA |
| F38 | Toolbar growth and grouped catalog | 10,18-19,29,43,45 | P1 | 4/4 | 0 P / 0 M / 0 D | original-toolbar; main.renderCatalog; IDA 29DA8,29F74,CAA2 |
| F39 | Info Bar, clock and calendar | 8-10,24,29-30,33-34 | P1 | 5/5 | 0 P / 0 M / 0 D | original-clock; main.updateUI; IDA 3D2ED,263C6,26872 |
| F40 | Map navigation and overview | 9,30-31 | P1 | 5/5 | 0 P / 0 M / 0 D | renderer.map; main minimap handlers; IDA 2BEC0,2C17E |
| F41 | Security staff and emergency movement | 24,28,51-53 | P2 | 4/4 | 0 P / 0 M / 0 D | original-people security identities; IDA 416CE,46BEC,46C60 |
| F42 | Fire and helicopter rescue | 28-29,53 | P2 | 6/6 | 0 P / 0 M / 0 D | IDA 1D819-1DFC8,1F493; original-events; main Call Fire Rescue state gate |
| F43 | Terrorist bomb event | 52-53 | P2 | 5/5 | 0 P / 0 M / 0 D | IDA 1983E,197D0,19994,199C7,19A24,1EFC1 |
| F44 | VIP visit | 53 | P2 | 6/6 | 0 P / 0 M / 0 D | simulation reserveVIP/arriveVIP/checkoutVIP; IDA 48E00-48FC3 |
| F45 | Cockroach infestation | 32,51,56 | P2 | 4/4 | 0 P / 0 M / 0 D | room dirt approximation; IDA 2A6F2,2A8F2,hotel condition handlers |
| F46 | Cathedral, worship and Tower milestone | 26,52 | P2 | 5/5 | 0 P / 0 M / 0 D | simulation.plan; IDA AB30-AEEB,4633A,464B2,29C1F |
| F47 | Hidden treasure | 38,54 | P2 | 3/3 | 0 P / 0 M / 0 D | simulation.checkTreasure; IDA 2A1E7,2A22C,2A293 |
| F48 | Scene, facilities and original artwork | 8-10,24,30,45-52 | P2 | 4/5 | 0 P / 0 M / 1 D | extraction tools; renderer; CGPk/CLUT/BITMAP assets |
| F49 | Effects and facility animation | 27-28,42 | P2 | 4/4 | 0 P / 0 M / 0 D | main options; renderer; IDA 56CB,63CD,640D |
| F50 | Sound options and ambient audio | 14,27-28,39 | P2 | 5/5 | 0 P / 0 M / 0 D | main.playSound/options; original WAV; IDA 35BB7-36042 |
| F51 | Edit window and scrolling UI | 9,24,30 | P2 | 4/4 | 0 P / 0 M / 0 D | main pan/wheel/arrows; renderer camera; index.html |
| F52 | Fast Mode | 28 | P2 | 3/3 | 0 P / 0 M / 0 D | main.setSpeed/frame; IDA 3CEF6,4A256 |
| F53 | File/startup/new/open/save/quit | 7-8,27 | P3 | 4/5 | 0 P / 0 M / 1 D | main titleDialog/newTowerDialog/downloadSave; native file handlers |
| F54 | Menus, shortcuts and window visibility | 26-30 | P3 | 4/4 | 0 P / 0 M / 0 D | index.html; main.attachEvents; IDA 2B13A |
| F55 | Help and manual access | reference/index | P3 | 3/3 | 0 P / 0 M / 0 D | main help overlay; original SIMTOWER.HLP |

**Total:** 55 feature groups, 290 behavioral checks: 288 covered, 0 partial, 0 missing, 2 deferred. These totals are checklist counts, not an overall fidelity percentage.

## Behavioral checklist

### F01 - Journey routing and transport choice (P0)

Manual: printed 46,48,54-56; evidence: simulation.route; IDA 34C04,34A52,34B12,34E0E,346B3.

- **C** Reach destination through transport that actually serves each floor - Native strict candidate ordering, HOME-left lateral cost, directional ring costs, service-stair choice and transfer group suppression translated from 34C04/34F36/345C1. Production route and boarding reselect from original metadata; transport-choice-native/transport-components/packed-travel regressions.
- **C** Bound stairs passage to native reachable span - 34B12 allows three floor transitions in supplied executable; manual uses four sets.
- **C** Bound escalator passage to native reachable span - 34A52 allows six escalator transitions, falling to three when ordinary stairs are required.
- **C** Prefer usable escalators over waiting local lifts - 34C04 early escalator selection before lift requests; tested against local and express lifts.
- **C** Choose access near the traveller, using lateral distance - Native strict candidate ordering, HOME-left lateral cost, directional ring costs, service-stair choice and transfer group suppression translated from 34C04/34F36/345C1. Production route and boarding reselect from original metadata; transport-choice-native/transport-components/packed-travel regressions.
- **C** Reject unsupported transfers using native immediate connectivity masks - Source immediate component unions reject unsupported multi-relay paths; arbitrary two-car hard cap removed. Regression covers unsupported A→E→B arrangement.
- **C** Use designated lobby transfer connections - Original16-group compression, inclusive shaft/lobby bounds, first matching transfer floor and stair component anchors are translated and tested.
- **C** Consider directional congestion when selecting alternatives - Native strict candidate ordering, HOME-left lateral cost, directional ring costs, service-stair choice and transfer group suppression translated from 34C04/34F36/345C1. Production route and boarding reselect from original metadata; transport-choice-native/transport-components/packed-travel regressions.

### F02 - Occupancy, stress and tenant retention (P0)

Manual: printed 23,48,56-60; evidence: simulation.tenantStress/settleQuarter; original-people; IDA 28B7B,28F04,29200,293AD.

- **C** Apply native signed boarding delay and upper cap, including packed clock-wrap behavior - 36D11 caps only above300 before storing the packed WORD; signed clock wrap may borrow into parking bits and produce raw low10 greater than300. Regression covers borrow and unbounded inspector graph values.
- **C** Average inhabitants independently for room evaluation
- **C** Count walking, searching, travel and service waiting stress - Per-handler journey flags, immediate same-floor registration, ordinary/service stairs, admission retry histories and no-stress housekeeping translated and tested; ACTOR_HISTORY_NATIVE/TRANSPORT_CHOICE_NATIVE.
- **C** Apply price and noise to acceptance and retention - Native price/noise acceptance and persistent commercial recommendation feedback are integrated; original-tenancy/commercial tests.
- **C** Remove dissatisfied office and condo tenants at native evaluation boundaries - 28F04 daily evaluation at tick2533; 29200 eviction only on date%3=0, with stress retained for rejected vacancies and resets after accepted quarter contracts. Tower boundary tests.
- **C** Good inhabitants attract additional tenants into empty space - 29200 consumes one grade-2 same-type, same-floor neighbor per bad vacancy in horizontal order, reopens acceptance and resets target stress; no instant move-in.
- **C** Commercial patron recommendations and boycotts affect later demand - Native price/noise acceptance and persistent commercial recommendation feedback are integrated; original-tenancy/commercial tests.
- **C** Population reflects native resident/visitor acceptance rather than all occupied capacity - Explicit native category LONG counters, signed deltas and reset ordering govern headline population/progression/finance. Includes shop admission bonus and delayed commercial/show demolition reset; population-native integration regressions. Legacy JSON inference cannot reconstruct historical deleted-room contributions.

### F03 - Sales, rents and tenancy contracts (P0)

Manual: printed 40,48-49,59-60; evidence: simulation.updateRooms/settleQuarter/demolish; original-economy; IDA 2D71E,2DA4D,28C0F.

- **C** Charge offices and shops quarterly; hotels at checkout
- **C** Sell connected condos once rather than collecting condo rent
- **C** Return the recorded condo sale payment when residents leave - 29200 -> 2DAF2 -> 2D356; negative condo income, no duplicate refund, resale resets stress.
- **C** Return condo payment on demolition using the actual purchase price - New sales persist actual payment. Legacy browser saves infer current tier because historical price is absent.
- **C** Lock condo sale price while occupied - 204E8 disables control 13; matching model guard and browser dialog lock.
- **C** Respect office minimum lease, tenure and native re-letting state - Native tenure capped at 120 quarters; accepted applicant payment, four tiers and price/noise stress adjustment recovered and tested.
- **C** Apply four price tiers to income and stress - Native tenure capped at 120 quarters; accepted applicant payment, four tiers and price/noise stress adjustment recovered and tested.

### F04 - Star progression and facility unlocks (P0)

Manual: printed 16,22,24-26,33-34,53; evidence: catalog; checkRating; original-toolbar; IDA 29B9D,29F8D,2A0FE.

- **C** Start at one star and unlock native catalog groups by rating
- **C** Require 300 population for two stars
- **C** Apply higher-rating population/facility/time gates - Explicit native category LONG counters, signed deltas and reset ordering govern headline population/progression/finance. Includes shop admission bonus and delayed commercial/show demolition reset; population-native integration regressions. Legacy JSON inference cannot reconstruct historical deleted-room contributions.
- **C** Make VIP satisfaction a real progression gate - Original date gate, reserved parking, primary suite guest identity, signed mean<=150 and persistent passed latch are tested (original-vip.js).
- **C** Use actual clinic demand/satisfaction for medical progression gate - 2C3BF daily availability reset; 2C8BC clears only on missing clinic demand or removed selected clinic. Full40-patient clinic waits without failing latch. Tower integration tests.
- **C** Use native occupied/accepted population counters - Explicit native category LONG counters, signed deltas and reset ordering govern headline population/progression/finance. Includes shop admission bonus and delayed commercial/show demolition reset; population-native integration regressions. Legacy JSON inference cannot reconstruct historical deleted-room contributions.
- **C** Show promotion message and grow the construction toolbar

### F05 - Lobby, floors and structural support (P0)

Manual: printed 10,15,24,30,43,45-46; evidence: simulation.plan/build/resizeShaft; renderer.lobby; IDA 3B91B,274D7.

- **C** Require a ground lobby before other construction
- **C** Merge adjacent extensions and keep tower within lobby support width
- **C** Automatically charge/build supporting floor when placing a facility
- **C** Extend floor to clicked edge within supporting floor width
- **C** Create sky lobbies every fifteenth floor
- **C** Keep structure after facility demolition/elevator retraction
- **C** Assemble complete original lobby canopies/overhangs and double/triple lobbies - Original lobby strips/canopies, Control double and Control+Shift triple construction, tall transport CGPk4073/4074, and 100F cathedral footprint integrated.
- **C** Support documented 100 storeys/10 basements and multi-level cathedral exception - Original lobby strips/canopies, Control double and Control+Shift triple construction, tall transport CGPk4073/4074, and 100F cathedral footprint integrated.

### F06 - Elevator construction and limits (P0)

Manual: printed 13,15,37,44,47-48; evidence: simulation.plan/addCar/resizeShaft; original-shaft-placement; IDA39904,15988,150B9,15427,390FC.

- **C** Create shaft with one car and add cars at a clicked waiting floor
- **C** Enforce 24 total shafts, eight-car maximum and standard 30-floor span
- **C** Enforce native machinery footprint, shaft separation and retained free-slot construction behavior - 15988 raw-range rectangles,64px separation, free-slot previous type, retained tombstones, pre-cap cash/collision ordering and exact shaft-left car-add targeting translated and integrated; shaft-placement/source and save regressions pass in694-test checkpoint.
- **C** Extend/retract independently at both machinery ends
- **C** Create structural floors while extending and retain them when retracting
- **C** Apply rating-dependent car/construction limits - 2A2FB/2A382 rating branches all use24 shafts/eight cars in this supplied executable; manual example recorded as discrepancy.
- **C** Handle occupied-car/queue capping and warnings exactly - Native end capping, car relocation, queue/rider replanning, warning codes and Finger end-control gestures integrated; construction tests.
- **C** Use the original Finger tool for end controls and construction hammer for new shafts - C330/14DE4 Finger-only extension;1004 idle cursor, captured SIZENS, no Finger ghost; source cap/body pointer geometry, on-press stop toggle and cap/body double-click programming translated and browser-verified.

### F07 - Directional elevator dispatch and programs (P0)

Manual: printed 16,34-38,54-56; evidence: original-elevators; elevator-dispatch tests; IDA 103EC,1079C,10EF3,1009B.

- **C** Assign up/down hall calls to individual cars
- **C** Apply Local, Express to Top and Express to Bottom sweeps
- **C** Keep weekday/weekend phase programs independent
- **C** Use native response-distance comparison and default five
- **C** Apply standard-floor departure wait and full-car bypass
- **C** Unload and board on the native door ticks
- **C** Keep directional queues at forty and cap boarding to native car capacities
- **C** Reproduce exact route-to-car destination handoff and clock-wrap delay accounting - Boarding re-reads category destination metadata and uses345C1 against current component/ring direction; signed WORD delay, ground forgiveness, packed parking borrow and raw history storage translated and tested.

### F08 - Stairs (P0)

Manual: printed 10-11,44,46,56; evidence: simulation.plan/route/updatePeople; renderer; IDA 3E2A0,34B12,35128.

- **C** Place two-level original stair artwork - 189DA uses original upper2408/lower2472 at12/36px offsets with synchronized frames; escalators use2728/2792. Static assembly and diagonal hit verified; occupancy animation remains pending.
- **C** Allow staircase placement over room interiors and forbid elevator overlap - 190D5/191DD/192E3 allow residential/service overlays without demolition, stacked opposite half footprints, strict upper landing edge and full machinery protection; browser QA and tests.
- **C** Apply bounded passage and native stair travel stress - 34B12 bounds passage to three transitions;3E2A0 applies PART35 stair stress per traversed level.
- **C** Maintain visible stair occupants and traversal timing - Native cohort link occupancy drives original busy art; stairs/escalator stress and direction counted. Pixel comparison remains separate.

### F09 - Escalators (P0)

Manual: printed 46,54-56; evidence: simulation.plan/route; IDA 34A52,3507B,3E2A0.

- **C** Unlock and place two-level original escalator artwork
- **C** Restrict placement to commercial/public areas - 191B5/192BB validate upper right and lower left endpoints against native public/commercial/empty type list; rooms survive overlay construction.
- **C** Apply native reach limit and transport preference - Native span validators and nearby-escalator preference translated; placement/traversal still incomplete.
- **C** Apply stress/travel timing and share customers across connected commercial areas - Native PART16 per-level stress and link release cohort timing; shared lobby destination lists admit external visitors without merging each business home demand allowance. No direct escalator adjacency multiplier in32192/330BC/33673.

### F10 - Office daily lifecycle (P1)

Manual: printed 12,14,48,58; evidence: original-people; IDA 42495,42811.

- **C** Keep six persistent identities and weekday morning arrivals
- **C** Run business outing, lunch/clinic, return and evening departure states
- **C** Use exact food/clinic admission and destination demand - Native category/lobby demand lists,40-person admission, full retries and ten-clinic registry/tombstones translated with source tests.
- **C** Render working/dark states from native occupancy/activity records - Source office activity counters/day-night facade and actual interior occupants integrated (original-tenancy/interiors.js).
- **C** Preserve original acceptance/lease fields and emergency actor gating - Acceptance/lease flags and emergency loop audited; actor byte4 is facility type, not an independent emergency flag. Office arrival/food/afternoon abandonment failure states and raw histories have source regressions.

### F11 - Condo family lifecycle (P1)

Manual: printed 49,60; evidence: original-people; IDA 43D28,44050.

- **C** Keep three persistent resident identities
- **C** Distinguish family outing, earlier child return, homebody and sleep roles
- **C** Visit native nearby shop/food lists and count all service waiting - Native signed commercial selection byte, stale/deleted/reused destination metadata, family outings and failed home-return phases translated; treatment/admission retry histories source tested.
- **C** Implement referrals, purchase acceptance and move-in transitions - Native applicant acceptance, same-floor referral evaluation, move-in sale, locked tier, eviction/refund and retained identity states integrated.
- **C** Maintain sale/eviction lifecycle and refund - Native applicant acceptance, same-floor referral evaluation, move-in sale, locked tier, eviction/refund and retained identity states integrated.

### F12 - Hotel singles, twins and suites (P1)

Manual: printed 18-20,48-49; evidence: catalog; original-people; IDA 432CC,4358E,2D914.

- **C** Use one/two/two guest capacities and original room art
- **C** Check in evenings, stay overnight, check out mornings and post income
- **C** Require suite guests to have an actual reserved parking space
- **C** Make noise, pricing and dirt affect acceptance exactly - Hotel nine-state evening acceptance, pricing/noise stress, adjacent neglect propagation and dirty refusal recovered in original-hotels.
- **C** Implement hotel evening dining/shopping states - Persistent dinner/return/sleep/wake/checkout states, native tenant-slot parity and last-guest departure receipt are translated and Tower-tested.
- **C** Render actual guest/housekeeper interior animations - Native guest states/poses, facade occupancy/dirt/dawn transitions and housekeeping overlay are rendered from source resources.

### F13 - Food businesses and daily patron demand (P1)

Manual: printed 12,49,54-55,58-59; evidence: original-people/ original-economy; IDA 44E4D,45031,32024,320F0.

- **C** Use original fast-food and restaurant artwork and receipts tables
- **C** Select resident visits by lobby band and native 60-tick service duration
- **C** Cap concurrent persistent venue admissions at forty
- **C** Distinguish snack/lunch and evening restaurant demand - 48 persistent outside patrons, 40-place admission, weekday/weekend/rain budgets, recommendation feedback, original opening/closing receipts and establishment styles integrated.
- **C** Implement persistent outside patrons, referrals and boycotts - 48 persistent outside patrons, 40-place admission, weekday/weekend/rain budgets, recommendation feedback, original opening/closing receipts and establishment styles integrated.
- **C** Apply native rolling daily demand and rating thresholds - 48 persistent outside patrons, 40-place admission, weekday/weekend/rain budgets, recommendation feedback, original opening/closing receipts and establishment styles integrated.
- **C** Display real patronage/profit instead of prototype random traffic - 48 persistent outside patrons, 40-place admission, weekday/weekend/rain budgets, recommendation feedback, original opening/closing receipts and establishment styles integrated.

### F14 - Retail shops (P1)

Manual: printed 49,55,59; evidence: simulation.updateRooms/settleQuarter; IDA 446B9,448A0,32192.

- **C** Construct native shop variants and charge quarterly rent
- **C** Provide rent tiers and shop inspection - Original daily visitor/remaining budget shop grades, price shifts, quarter lease/referral and persistent own patrons integrated.
- **C** Rate shop success by native daily patron totals - Original daily visitor/remaining budget shop grades, price shifts, quarter lease/referral and persistent own patrons integrated.
- **C** Implement rolling customers, referrals and tenant departure - Original daily visitor/remaining budget shop grades, price shifts, quarter lease/referral and persistent own patrons integrated.
- **C** Serve cinema/metro visitors and customers arriving through nearby transport - Cinema/metro patrons share original lobby destination registries. No direct adjacent-escalator multiplier exists; transport improves access and external admissions/receipts without spending home allowance.

### F15 - Housekeeping and dirty rooms (P1)

Manual: printed 19-20,32,51; evidence: original-people; simulation.status; IDA 46719,4680B,2A410.

- **C** Keep six persistent housekeepers and use service transport
- **C** Assign floors by native residue and scan above before below
- **C** Clean after native countdown and resume work from the current floor - Arrival clears dirt immediately; three countdown decrements plus fourth cleanup callback. Idle worker searches from current floor and returns home only when no job.
- **C** Mark dirty rooms after checkout and refuse unclean arrivals - Original checkout dirty states40/48 and three-day irreversible neglected states56/64; evening acceptance refuses dirty guests.
- **C** Allow untreated dirt to become irreversible cockroach infestation - Original checkout dirty states40/48 and three-day irreversible neglected states56/64; evening acceptance refuses dirty guests.
- **C** Draw dirty/cleaning room states and report housekeeping demand - Source hotel low counters/dirt banks and actual cleaning overlay, service readiness and original warning messages integrated.

### F16 - Parking spaces (P1)

Manual: printed 49-50,53; evidence: simulation.parkingSpaces/bookParking/releaseParking; IDA 300BB,30162,3022A,305F7.

- **C** Place only underground and enforce native pool limit
- **C** Reserve and release a space per persistent actor
- **C** Show thirteen original car variants - Held pointer builds independent fixed-width parking blocks on original floor; constructionDragBatch tested.
- **C** Apply category allowances and selected-worker/suite requirements
- **C** Drag horizontally to construct repeated parking spaces - Held parking placement builds repeated four-cell records using source gesture helper.
- **C** Require ramp plus pedestrian transit for usable spaces - Native cached ramp/pedestrian cell-map reachability, dawn-only available index, signed category quotas and overwriteable car display are explicit. Ramp/parking changes refresh topology; other construction retains cache until refresh. Original1704/1705 frames and redX; parking source/integration tests.
- **C** Match exact native cell-map quotas and car entry/exit animations - Native cached ramp/pedestrian cell-map reachability, dawn-only available index, signed category quotas and overwriteable car display are explicit. Ramp/parking changes refresh topology; other construction retains cache until refresh. Original1704/1705 frames and redX; parking source/integration tests.

### F17 - Parking ramps (P1)

Manual: printed 50; evidence: simulation.plan/rampConnected; catalog; IDA 390FC,3B91B.

- **C** Use original ramp texture and width
- **C** Connect underground ramps vertically to ground lobby
- **C** Drag down to construct a column across multiple floors - Held pointer extends original ramp x through consecutive floors; each independent placement charges only on success.
- **C** Enforce one ramp column/one ramp per floor - Native one-column/one-per-floor constraint and B1-start construction are translated; gap construction is permitted but unreachable.
- **C** Match native entire parking-network reach validation - Native cached ramp/pedestrian cell-map reachability, dawn-only available index, signed category quotas and overwriteable car display are explicit. Ramp/parking changes refresh topology; other construction retains cache until refresh. Original1704/1705 frames and redX; parking source/integration tests.

### F18 - Medical service and demand (P1)

Manual: printed 52; evidence: original-people; checkRating; IDA 2C3BF,2C531,2C6B4,2C80F,4553B.

- **C** Construct original clinics with native pool limits
- **C** Route office patients through nearby-lobby/fallback clinic lists
- **C** Use forty-patient admission and sixteen-tick treatment
- **C** Warn on missing clinic and maintain real clinic demand counters - Ten-slot registry preserves deleted same-day destinations/capacity; dawn rebuild, actual office/condo demand and missing-readiness latch are translated and tested.
- **C** Implement native clinic patient admission, treatment and facade states - Native per-clinic dawn reset, patient BYTE wrap, first-free registry reuse/tombstones, phase-gated16-tick treatment and actual patient-driven1832..1834 facades translated and tested; MEDICAL_NATIVE.
- **C** Feed actual service demand into progression - Actual persistent office medical demand clears medical readiness and blocks promotion; existing/full clinics retain readiness and treatment returns after16ticks.

### F19 - Recycling (P1)

Manual: printed 51; evidence: simulation.updateGarbage; original-systems; IDA F530,F60E,F701,F780.

- **C** Construct native two-level recycling artwork
- **C** Stage nightly processing and capacity per population/center
- **C** Use native processing capacity and adjacency constraints - Runtime recycling completion depends on population/center count, without service-elevator gate. Native adjacency is checked on construction.
- **C** Report refuse-service needs - Missing center and overflowing native states emit original service notice; completion/collection flags follow source stages.
- **C** Enforce adjacent-center operating rule from native layout logic - Original25-cell horizontal cluster and neighboring child-floor constraints are tested before construction.
- **C** Render truck collection, ventilation and lower emptying sequence - Source upper/lower banks2280..85/2344..50, dawn lower-emptying32 ticks and truck2280 sound are integrated.

### F20 - Movie theatre gameplay (P1)

Manual: printed 42,50,60; evidence: simulation.startShows/finishShows/changeMovie; IDA 2E95E,2E9ED,45B8D.

- **C** Use original two-level footprint, booth and movie titles
- **C** Charge/classify latest movies versus classics and age audience demand
- **C** Run two native arrival/show/receipt batches
- **C** Have audience enter upper level and leave lower level - Persistent112 identities enter upper auditorium and leave from lower floor; Tower journey regressions verify actual admissions.
- **C** Keep persistent audience identities and native after-show visits - Native two56-person pools, cohort booking, state3 attendance/meal/departure, actual receipts and refunds are translated.
- **C** Send departing audience to native eligible commercial venue lists - After first show, source category/lobby commercial lists choose food/shop; no additional arbitrary five-floor filter.
- **C** Follow supplied executable cinema demolition behavior - Supplied3BD44/3BF6D permits cinema demolition; protected list is source-based.
- **C** Render real projection and audience phases - Native movie-specific booth/projection banks and auditorium states use original upper24/lower36 layers.

### F21 - Party halls (P1)

Manual: printed 50; evidence: simulation.startShows/finishShows; IDA 2E3CF,45A11,45B8D.

- **C** Use original two-level facility and fifty-person daily allowance
- **C** Apply afternoon arrival/close/receipt times
- **C** Use native party demand quota and opening schedule - Native batch quota50 applies without a hotel-support gate (2E172/2F series).
- **C** Implement persistent booked guests and their trips - Two40-person pools, source booking/arrival/departure cohorts and actual receipts are integrated and tested.

### F22 - Metro/tube station (P1)

Manual: printed 51; evidence: simulation.plan/tick; IDA 384F3,390FC.

- **C** Limit to one underground three-level station with nothing below it
- **C** Show original trains/art and native train-state switching - Three native floor layers, source train banks2985/3049/3113,1/100 daytime/emergency-gated train clock and sound.
- **C** Create native persistent metro patron pool and trips - Native pool240 makes repeated daytime commercial visits; supplied code has no office/residence commute branch.
- **C** Select metro shopping/dining from native eligible commercial lists - Source ground-lobby commercial lists allow eligible above/below-ground establishments; no地下-only filter.
- **C** Render station passenger entry/exit - Actual metro actor states/cohorts and source station/entrance layers integrated; no fabricated opening burst.

### F23 - Facility inspection (P1)

Manual: printed 11-12,17,39-40,45; evidence: main.roomDialog; original-dialogs; IDA 1FD89,204E8.

- **C** Open category-specific original dialogs with facility snapshot
- **C** Show leasing state, tenure and exact condition messages - Original titles/status/three-line diagnostics, stress and sales gauges, actual occupant predicates and active facility sounds integrated; inspection tests.
- **C** Draw native Eval colored gauge and numeric patronage - Original titles/status/three-line diagnostics, stress and sales gauges, actual occupant predicates and active facility sounds integrated; inspection tests.
- **C** Offer four rent tiers and open persistent occupants
- **C** Show only actual occupants present rather than all identities - Original titles/status/three-line diagnostics, stress and sales gauges, actual occupant predicates and active facility sounds integrated; inspection tests.
- **C** Play appropriate facility background sounds during active business - Original titles/status/three-line diagnostics, stress and sales gauges, actual occupant predicates and active facility sounds integrated; inspection tests.

### F24 - Person/tenant inspection (P1)

Manual: printed 17-18,40-41; evidence: main.personDialog/actorPortrait; IDA 1FA10,1FAF3.

- **C** Show persistent home, destination and stress and allow rename
- **C** Use original gender/occupation portraits and labels - Original700/702/703 role portraits, separate historical/current stress gauges, staff764 template and native directional queue hit-testing integrated.
- **C** Show room Eval separately from individual Stress in native gauges - Original700/702/703 role portraits, separate historical/current stress gauges, staff764 template and native directional queue hit-testing integrated.
- **C** Open service-specific dialog 764 where required - Original700/702/703 role portraits, separate historical/current stress gauges, staff764 template and native directional queue hit-testing integrated.
- **C** Inspect walking/queued people directly in the tower - Original700/702/703 role portraits, separate historical/current stress gauges, staff764 template and native directional queue hit-testing integrated.

### F25 - Elevator/stair passenger inspection (P1)

Manual: printed 40,43-45; evidence: main.inspect; IDA 20B9D,20ED5; DTMP 761/762.

- **C** Click a moving car to show car occupants rather than schedule - Original761/762 panels, car body inset hit geometry, fixed8/16px portrait strips/two rows, actual car/link occupants and context1 person drill-down are translated and browser-verified; INSPECTION_CONTROLS_NATIVE.
- **C** Show native capacity/passenger grid and click through to people - Original761/762 panels, car body inset hit geometry, fixed8/16px portrait strips/two rows, actual car/link occupants and context1 person drill-down are translated and browser-verified; INSPECTION_CONTROLS_NATIVE.
- **C** Show stair/escalator occupants and click through to people - Original761/762 panels, car body inset hit geometry, fixed8/16px portrait strips/two rows, actual car/link occupants and context1 person drill-down are translated and browser-verified; INSPECTION_CONTROLS_NATIVE.

### F26 - Names and Find Person tracking (P1)

Manual: printed 18,40-42; evidence: main.renameDialog/findPersonDialog; IDA 236E9,1C680,1C6EF.

- **C** Name/remove names with native fifteen-character/twenty-person limits
- **C** Keep names attached to persistent identities and search list
- **C** Center view on actual current person/room/car location - Find Person tracks actual car floor/shaft and preserves camera for outside identities.
- **C** Show native red location arrow - Original21256 red location arrow, blue702 named portraits/native queue ink, actual actor location and Outside700 feedback integrated.
- **C** Highlight named people blue in tower and occupant grids - Original21256 red location arrow, blue702 named portraits/native queue ink, actual actor location and Outside700 feedback integrated.
- **C** Report when a named person is outside the tower - Original21256 red location arrow, blue702 named portraits/native queue ink, actual actor location and Outside700 feedback integrated.

### F27 - Pricing and evaluation map modes (P1)

Manual: printed 17,31-32,56; evidence: renderer.map/render; main set map mode; IDA 36570,367C4,368D3.

- **C** Pause on Eval/Pricing modes and resume on Edit
- **C** Render native color-coded statuses in map with legends - Original1003 hatch patterns, native flat map palette, correct prices/evaluations including no-evaluation vacancies, legend assets integrated.
- **C** Replace full Edit-window appearance with matching evaluation/pricing colors - Original1003 hatch patterns, native flat map palette, correct prices/evaluations including no-evaluation vacancies, legend assets integrated.
- **C** Navigate to a selected map position
- **C** Apply exact native evaluation/price metrics to all facility types - Original1003 hatch patterns, native flat map palette, correct prices/evaluations including no-evaluation vacancies, legend assets integrated.

### F28 - Hotel diagnostic map mode (P1)

Manual: printed 32,51; evidence: renderer.map; main; IDA 368D3.

- **C** Unlock Hotel mode only when hotel placement is available - NativeC506 enables Hotel map at two stars and source grey/selected states are shown.
- **C** Pause and identify dirty hotels in the map
- **C** Show matching red dirty/infested areas in the Edit view - Hotel native40/48 versus56/64 distinguishes delayed dirt and irreversible infestation in original1003 red hatch mode.
- **C** Distinguish delayed cleaning from irreversible infestation - Hotel native40/48 versus56/64 distinguishes delayed dirt and irreversible infestation in original1003 red hatch mode.

### F29 - Elevator stop and waiting-floor controls (P1)

Manual: printed 15,36-37; evidence: main.elevatorDialog; original-elevators; IDA 14ED6,20B9D.

- **C** Set per-car waiting floor and return idle car there
- **C** Toggle shaft-wide floor service from schedule grid - Native parked-floor protection, express edit restriction, Finger stop toggle and connectivity warning/confirmed evacuation integrated.
- **C** Protect every car waiting floor from service deactivation - Native parked-floor protection, express edit restriction, Finger stop toggle and connectivity warning/confirmed evacuation integrated.
- **C** Disable express stop/waiting-floor edits according to original rules - Native parked-floor protection, express edit restriction, Finger stop toggle and connectivity warning/confirmed evacuation integrated.
- **C** Toggle stops with Finger on shaft floor numbers - Native parked-floor protection, express edit restriction, Finger stop toggle and connectivity warning/confirmed evacuation integrated.
- **C** Draw native red waiting-floor numbers and blank disabled stops - Original2024..2029 normal/red waiting numerals and blank disabled stops integrated.
- **C** Issue native connectivity warnings when changes isolate travellers - Native parked-floor protection, express edit restriction, Finger stop toggle and connectivity warning/confirmed evacuation integrated.

### F30 - Elevator live schedule display (P1)

Manual: printed 34,37-38; evidence: main.elevatorDialog; DTMP 400; IDA 20B9D.

- **C** Display original control artwork and weekday/weekend time buttons
- **C** Let simulation run while schedule dialog is open - Modeless400 schedule advances original simulation while250ms live UI refreshes; construction input remains gated.
- **C** Animate direction, full, destination, idle and turnaround grid symbols - Source1355D/13DFE displays dense active-car columns while dispatch retains physical slots. Shortshafts bottom-align within15rows; longshafts initially show lowest15floors, scrollUp revealshigher. Native20256..65 symbols and actual400 mouse/keyboard/scroll proofs.
- **C** Show original stop/waiting-floor symbols and machinery focus - Native floor labels, disabled/waiting symbols, machinery focus and eligible express stop edits integrated.

### F31 - Elevator Show toggle (P1)

Manual: printed 38; evidence: main.elevatorDialog; renderer shaft loop; IDA 20B9D.

- **C** Provide and preserve Show toggle
- **C** Hide shaft body but retain two boundary lines and moving cars - Hidden body retains native boundary lines, cars and machinery; underlying room artwork remains visible.
- **C** Reveal underlying facilities and retain clickable machinery - Hidden body retains native boundary lines, cars and machinery; underlying room artwork remains visible.

### F32 - Elevator Simulate preview (P1)

Manual: printed 38; evidence: original-elevator-preview; main.elevatorDialog; native Simulate1E1C1/1E3B8/3F412.

- **C** Snapshot and isolate selected shaft/people to preview near-future traffic - Native static warm-up twice bad threshold snapshots selected shaft/current queues only; restores visible original positions with projected stress.
- **C** Toggle Resume to restore untouched whole-tower state - Resume restores shaft/queue snapshot while retaining edited programs/Show; whole-tower actors/accounting remain frozen.
- **C** Show meaningful future behavior for selected programs - Exact static warm-up, frozen phase/current programs, retained C2 tables, restored ring headers/car geometry and source ring-entry values translated: popped signed raw+elapsed without300cap; unserved signed global slot lowWORD. Source3F412/1E3B8/1710F;7 meaningful preview regressions.

### F33 - Pause, scrolling and tool availability (P1)

Manual: printed 24,30,43-44; evidence: main.attachEvents/frame/setSpeed; IDA C6E1,EDF9,CB0D.

- **C** Use original full-width pause/resume artwork and freeze clock
- **C** Allow only magnifier while explicitly paused - Native pause chooses magnifier and disables all construction tools; diagnostic Edit resumes through native control state.
- **C** Pause during scrolling and restore prior running state - Wheel/pan/held construction capture gate simulation without changing explicit running/Fast preference.
- **C** Allow inspection and map diagnosis while paused
- **C** Restore correct prior speed/state after modal operations - Modeless schedule, static preview, normal modal dialogs and scrolling use distinct native simulation gates.

### F34 - Construction gestures and placement feedback (P1)

Manual: printed 10,15,43-46,50; evidence: main.attachEvents/updatePreview; simulation.plan.

- **C** Display footprint preview and reject unaffordable/overlapping placement - Original solid WHITE_PEN one-pixel ghost, native tall-tool offset/clipping. Recovered floor-record validation permits rooms behind shafts/links and shafts over occupied/incomplete rooms; dedicated transport conflicts remain.76 focused construction tests and live browser placement/inspection verified.
- **C** Drag lobby/floor and extend elevator ends
- **C** Shift-replace existing facilities in original demolition order before build validation - 390FC/3BDF8 deletes intersected ordinary rooms before validation, stopping at protection; native replacement is deliberately non-atomic. Held parking/ramp batches integrated.
- **C** Batch parking/ramp drag placement - 390FC/3BDF8 deletes intersected ordinary rooms before validation, stopping at protection; native replacement is deliberately non-atomic. Held parking/ramp batches integrated.
- **C** Distinguish insufficient facility budget from insufficient supporting floor budget
- **C** Show native construction item/price messages and gestures - Original cursor groups1002..1005/hotspots extracted; stock vertical resize on endpoint capture, native1009 selection/price and1003 construction errors, held gestures and capture scrolling integrated.

### F35 - Bulldozer and protected structure (P1)

Manual: printed 44-46,50; evidence: simulation.demolish; IDA 3BD44,3BF6D.

- **C** Demolish ordinary facilities free and retain floor support
- **C** Remove affected resident/passenger identities from active population
- **C** Preserve native protected facilities, using executable demolition rules - Native protected security/housekeeping/metro/cathedral/SECOM/construction; cinema removable in supplied executable. Condo recorded-sale refund tested.
- **C** Keep lobby non-removable
- **C** Repay occupied condominium at actual sale value - Native protected security/housekeeping/metro/cathedral/SECOM/construction; cinema removable in supplied executable. Condo recorded-sale refund tested.

### F36 - People colors and animation (P1)

Manual: printed 15,18,27,47,57; evidence: people-sprites; renderer; IDA 163BA,1699C.

- **C** Use original whole sprite frames, stable identity and directional poses - 1515 adjacent16px poses face opposite ways; distance cycling was removed. Direction chooses native facing without additional mirroring; repeated travel updates preserve pose. Full native actor-role portrait mapping remains partial.
- **C** Hide/show people through animation option
- **C** Put ascending queues left and descending queues right of shaft - Native1512/1513 variable-width directional poses, opposite-side FIFO queues and black-ink stress palette translation integrated.
- **C** Render current native stress pink/red rather than original appearance only - Native1512/1513 variable-width directional poses, opposite-side FIFO queues and black-ink stress palette translation integrated.
- **C** Render named people blue and location selection arrow - Original21256 red location arrow, blue702 named portraits/native queue ink, actual actor location and Outside700 feedback integrated.
- **C** Animate actual inhabitants inside hotels/offices/service rooms - Original office/condo/hotel/food poses and native occupancy state gates; removed fake horizontal actor walkers and opposing-facing gait cycle.

### F37 - Finance window (P1)

Manual: printed 13,29,38-39; evidence: main finance dialog; original-economy; IDA CD73,D119,CCDA.

- **C** Display original window bitmap and ten income/maintenance categories
- **C** Show net, other income, construction, prior quarter and total balance
- **C** Use native monetary scaling and quarterly boundaries
- **C** Show correct population and receipts from all actor/demand systems - Explicit native category LONG counters, signed deltas and reset ordering govern headline population/progression/finance. Includes shop admission bonus and delayed commercial/show demolition reset; population-native integration regressions. Legacy JSON inference cannot reconstruct historical deleted-room contributions.
- **C** Match native fonts/gauges and dialog focus - Source field anchors/fonts/gauges are implemented. Running-original Finance Return-key-up close and dialog-HWND focus verified. Exact WinGDI glyph raster remains open. Source-driven acceptance: implemented binary behavior is required; exact platform glyph/frame raster comparison was explicitly waived by the user.

### F38 - Toolbar growth and grouped catalog (P1)

Manual: printed 10,18-19,29,43,45; evidence: original-toolbar; main.renderCatalog; IDA 29DA8,29F74,CAA2.

- **C** Grow toolbar at native rating boundaries
- **C** Use original icons, ordering and grouped submenus
- **C** Match exact hold/release menu selection and cursor states - Native down/up target selection, immediate groups, release-only Time, arrow cursor states and hide-on-press behavior are recovered and implemented. Logical pointer coordinates are clamped to native ClipCursor bounds for construction and departure popups, retaining edge-row selection and native cancellation phases. Physical OS pointer warping is unavailable in ordinary browser APIs; that presentation difference is outside the waived visual comparison gate.
- **C** Move/hide/restore toolbar through window controls

### F39 - Info Bar, clock and calendar (P1)

Manual: printed 8-10,24,29-30,33-34; evidence: original-clock; main.updateUI; IDA 3D2ED,263C6,26872.

- **C** Use recovered nonuniform clock periods and hand endpoints
- **C** Use two weekdays/one weekend per quarter and four quarters/year
- **C** Update cash, rating, messages and population display
- **C** Move/hide/restore floating bar
- **C** Match initial positions, native date strings and exact fonts - Native desktop coordinates/date strings and Info text baselines159/28,423/26,423/43,43/43 are recovered; canvas text and unconditional source cash color implemented. Exact WinGDI raster still requires comparison. Source-driven acceptance: implemented binary behavior is required; exact platform glyph/frame raster comparison was explicitly waived by the user.

### F40 - Map navigation and overview (P1)

Manual: printed 9,30-31; evidence: renderer.map; main minimap handlers; IDA 2BEC0,2C17E.

- **C** Show full-world tower silhouette, shaft types and viewport rectangle
- **C** Click map to navigate Edit view
- **C** Drag highlighted viewport rectangle to navigate continuously - Held minimap pointer continuously centers/clamps native viewport rectangle; mapNavigation tested.
- **C** Move/hide/restore map window
- **C** Match native shaft colors, hatch patterns and initial placement - Original map352, local black/express blue/service red lines,1003 diagnosis hatches and native initial panel placement integrated.

### F41 - Security staff and emergency movement (P2)

Manual: printed 24,28,51-53; evidence: original-people security identities; IDA 416CE,46BEC,46C60.

- **C** Build native security offices and keep six staff identities
- **C** Dispatch through exterior emergency stairs, independent of lifts - Native six staff security dispatch in floor/x order, exterior stairs and search/fire timers, original emergency sprite overlays integrated and tested.
- **C** Search bombs and fight fires by location/travel time - Native six staff security dispatch in floor/x order, exterior stairs and search/fire timers, original emergency sprite overlays integrated and tested.
- **C** Render native security/firefighter movement and service states - Native six staff security dispatch in floor/x order, exterior stairs and search/fire timers, original emergency sprite overlays integrated and tested.

### F42 - Fire and helicopter rescue (P2)

Manual: printed 28-29,53; evidence: IDA 1D819-1DFC8,1F493; original-events; main Call Fire Rescue state gate.

- **C** Trigger original event under native date/security/rating checks - Original day84 fire gates, SECOM80-tick notice, rescue menu/$500k demand, seven-tick spreads, staff extinguisher and helicopter sequence integrated.
- **C** Warn and offer $500k rescue; activate menu only during fire - Original day84 fire gates, SECOM80-tick notice, rescue menu/$500k demand, seven-tick spreads, staff extinguisher and helicopter sequence integrated.
- **C** Spread fire and damage facilities/occupants - Original day84 fire gates, SECOM80-tick notice, rescue menu/$500k demand, seven-tick spreads, staff extinguisher and helicopter sequence integrated.
- **C** Let security reach and extinguish fire through exterior stairs - Original day84 fire gates, SECOM80-tick notice, rescue menu/$500k demand, seven-tick spreads, staff extinguisher and helicopter sequence integrated.
- **C** Render helicopter and extinguishing sequence - Original day84 fire gates, SECOM80-tick notice, rescue menu/$500k demand, seven-tick spreads, staff extinguisher and helicopter sequence integrated.
- **C** Freeze ordinary traffic during emergency, remove damaged identities and allow rebuilding rubble - Ordinary actor decisions freeze while cars retain their idle chain.17FE0 activation drains builders then resets ordinary facades/cohorts, queues/cars/links, parking quotas and destination lists without synthetic interruption stress/refunds. Strict damage/VIP continuations preserve source before/after dialog effects; exact-source integration tests.

### F43 - Terrorist bomb event (P2)

Manual: printed 52-53; evidence: IDA 1983E,197D0,19994,199C7,19A24,1EFC1.

- **C** Trigger native demand with rating-dependent ransom - Original60-day/rating bomb gates, ransom/pay/search choices, exterior stairs, tick1200 deadline, six-floor40-cell blast and native notices integrated.
- **C** Allow pay/refuse and deduct authorized in-game payment - DAD1 negative-LONG affordability gate accepts exact cash, otherwise nests original ALRT1004 Not enough money before returning refusal1. Typed nested decision survives save/load. Source37,856ms timed default2 is being integrated; insufficient timed payment silently returns1.
- **C** Run security search using exterior stairs and native deadline - Original60-day/rating bomb gates, ransom/pay/search choices, exterior stairs, tick1200 deadline, six-floor40-cell blast and native notices integrated.
- **C** Explode unresolved bomb and apply damage/evacuation - Original60-day/rating bomb gates, ransom/pay/search choices, exterior stairs, tick1200 deadline, six-floor40-cell blast and native notices integrated.
- **C** Render original notices, search and aftermath - Original60-day/rating bomb gates, ransom/pay/search choices, exterior stairs, tick1200 deadline, six-floor40-cell blast and native notices integrated.

### F44 - VIP visit (P2)

Manual: printed 53; evidence: simulation reserveVIP/arriveVIP/checkoutVIP; IDA 48E00-48FC3.

- **C** Reserve native eligible suite guest/date/rating with parking
- **C** Announce/name same persistent VIP on arrival
- **C** Pass/fail checkout at recovered average delay boundary
- **C** Evaluate VIP success using original journey-history condition - Checkout evaluates source active VIP identity signed journey mean<=150; no additional invented price/noise/dirt penalty found in handler.
- **C** Use native VIP yellow person highlighting and event tracking - Original VIP person/queue/portrait palette and event identity tracking integrated; no whole-suite yellow fill in supplied facility renderer.
- **C** Use actual success flag in rating progression

### F45 - Cockroach infestation (P2)

Manual: printed 32,51,56; evidence: room dirt approximation; IDA 2A6F2,2A8F2,hotel condition handlers.

- **C** Trigger native infestation after untreated dirty-room duration - Original hotel dirty-day byte, three-day neglect and adjacent propagation;56/64 art/diagnostics; cleaning refuses infestation and demolition permits rebuild.
- **C** Prevent normal cleaning/reletting from curing infestation - Original hotel dirty-day byte, three-day neglect and adjacent propagation;56/64 art/diagnostics; cleaning refuses infestation and demolition permits rebuild.
- **C** Render original cockroaches and diagnostic states - Original hotel dirty-day byte, three-day neglect and adjacent propagation;56/64 art/diagnostics; cleaning refuses infestation and demolition permits rebuild.
- **C** Require demolition/rebuild to restore usable room - Original hotel dirty-day byte, three-day neglect and adjacent propagation;56/64 art/diagnostics; cleaning refuses infestation and demolition permits rebuild.

### F46 - Cathedral, worship and Tower milestone (P2)

Manual: printed 26,52; evidence: simulation.plan; IDA AB30-AEEB,4633A,464B2,29C1F.

- **C** Place native five-level cathedral at 100F only after five stars
- **C** Run weekend worshipper arrivals through appropriate local transfer - 40 persistent weekend worshippers enter100F, actual fortieth arrival+15000 gate promotes Tower, original five-layer wedding/angel cue and noonday departure integrated.
- **C** Apply native congregation/population gate to Tower promotion - 40 persistent weekend worshippers enter100F, actual fortieth arrival+15000 gate promotes Tower, original five-layer wedding/angel cue and noonday departure integrated.
- **C** Run original wedding/ceremony and angel sound - 40 persistent weekend worshippers enter100F, actual fortieth arrival+15000 gate promotes Tower, original five-layer wedding/angel cue and noonday departure integrated.
- **C** Display original state-dependent cathedral artwork - 40 persistent weekend worshippers enter100F, actual fortieth arrival+15000 gate promotes Tower, original five-layer wedding/angel cue and noonday departure integrated.

### F47 - Hidden treasure (P2)

Manual: printed 38,54; evidence: simulation.checkTreasure; IDA 2A1E7,2A22C,2A293.

- **C** Trigger recovered basement/width/rating eligibility once
- **C** Credit original rating-dependent cash and show native dialog/sound
- **C** Recompute eligibility on rating change

### F48 - Scene, facilities and original artwork (P2)

Manual: printed 8-10,24,30,45-52; evidence: extraction tools; renderer; CGPk/CLUT/BITMAP assets.

- **C** Use supplied original scene/facility art without generated replacement textures
- **C** Assemble all original facade/roof/lobby variants exactly - Source native redraw lifetimes, full CLUT, byte255 queue ink, cloud aligned buffer, clipped-margin interior RNG, completed5000 ceilings and metro/SECOM/recycling physical facade parts implemented. All variants still require full running-original scene/pixel/RNG comparison. Source-driven acceptance: implemented binary behavior is required; exact platform glyph/frame raster comparison was explicitly waived by the user.
- **C** Render original left/right edge scaffolding
- **C** Render original sky/cloud palette and day/night appearance - Original857..849 indexed gradient assembly,905 city, four persistent900..903 cloud slots and rain207..218 palette banks translated and browser-verified.
- **D** Match original layout/fonts/pixel positions against running game reference - User explicitly waived further visual comparisons on2026-10-15. Binary behavior/resources and USER contracts remain the acceptance standard; screenshot/pixel replay is outside the requested completion gate.

### F49 - Effects and facility animation (P2)

Manual: printed 27-28,42; evidence: main options; renderer; IDA 56CB,63CD,640D.

- **C** Animate elevator machinery through original palette/state mechanism - Native unique palette194..203 recoloring on independent240ms clock; original machinery/ventilation pixels only, Effects freezes palette.
- **C** Animate recycling ventilation and collection stages - Original truck/lower-emptying banks and194..203 ventilation palette cycling integrated.
- **C** Animate active office/hotel/cinema/party interiors by actual state - Source actor/facade state gates and original show/room banks integrated; arbitrary gait switching removed.
- **C** Wire Effects toggle to all relevant native effects without changing simulation - Effects56CB gates only machinery/rain palette; People gates periodic interior/cathedral updates while preserving cached silhouettes, queues and links. ControlwParam8 gates special condo/hotel poses. Independent native effects clock and original resources are translated and tested.

### F50 - Sound options and ambient audio (P2)

Manual: printed 14,27-28,39; evidence: main.playSound/options; original WAV; IDA 35BB7-36042.

- **C** Provide independent Elevators/Background/Events toggles
- **C** Use original elevator departure/arrival and event cues
- **C** Play dawn/rain/metro/background samples at native times - Native original-sample cues/repeats, two channels with strict priority/preemption/starvation and location inspection/six-point viewport ambient scheduling integrated.
- **C** Play location-specific active facility audio on inspection - Native original-sample cues/repeats, two channels with strict priority/preemption/starvation and location inspection/six-point viewport ambient scheduling integrated.
- **C** Match original channel priority, looping and ambient scheduling - Native original-sample cues/repeats, two channels with strict priority/preemption/starvation and location inspection/six-point viewport ambient scheduling integrated.

### F51 - Edit window and scrolling UI (P2)

Manual: printed 9,24,30; evidence: main pan/wheel/arrows; renderer camera; index.html.

- **C** Present interactive tower cutaway with movable viewport
- **C** Provide native scrollbars/arrows, window zoom/maximize and sizing - Original initial815x575 desktop204,53, 1x renderer,16px scroll controls and capture gating retained. Per user request browser resizing has minimum-only tracking, maximize fills desktop, and menu stacking stays below independent palettes. Browser drag beyond1158x889 and1400x1000 maximize verified; camera scroll offsets preserved.
- **C** Pause correctly during scrolling and prevent unintended construction - Native desktop dimensions/limits,1x renderer,16px line/page scrolling, held thumb capture and time gating implemented; browser normal/maximized/move/resize/scrollbar proofs pass.
- **C** Retain native Win3.1 window chrome/focus behavior - Original geometry/chrome, window outline tracking,8px Move/Size edge/corner selection, Enter commit and Escape cancellation now compared with running Win3.1. Exact raster and remaining modeless/system focus details are under direct audit. Source-driven acceptance: implemented binary behavior is required; exact platform glyph/frame raster comparison was explicitly waived by the user.

### F52 - Fast Mode (P2)

Manual: printed 28; evidence: main.setSpeed/frame; IDA 3CEF6,4A256.

- **C** Provide selectable accelerated gameplay
- **C** Preserve native normal timing and provide the requested bounded browser Fast Mode - Native3CEF6 normal96ms gate is translated. Original Fast skips gating and is CPU-dependent. After runaway modern speed, the user requested playable historical pacing; browser Fast deliberately caps one tick/16ms and one tick/paint (nominal6xnormal). This is an explicitly documented browser adaptation, not a claim that the native executable has a fixed multiplier.
- **C** Keep responsiveness/rendering independent of simulation rate - Normal six16ms-unit clock, Fast bypasses gate within bounded browser frame work; pauses/modals stop updates.

### F53 - File/startup/new/open/save/quit (P3)

Manual: printed 7-8,27; evidence: main titleDialog/newTowerDialog/downloadSave; native file handlers.

- **C** Load original title artwork and create a new tower
- **C** Open/continue/export deterministic browser JSON save - Deterministic browser JSON preserves pending prompt/tick continuations and source metadata. Actual Open replay restored an unanswered bomb decision without advancing its clock. First Save/Save As request a filename; later Save reuses it; cancellation retains state and aborts guard-Yes New. Large10001-passenger export roundtrip regression passes. Native TDT/common-file-dialog behavior remains separately deferred.
- **C** Provide original New Tower/Open startup prompt and unsaved-change guard - Native10000 New/Quit/Load startup and original RT_BITMAP256 splash on black, native-size centered/clamped placement restored from27255/4878/SETUPSTARTUPDLGB/495D. New creates empty tower; cancelled/failed startup Load falls back to empty tower. Valid-ground Save Yes/No/Cancel guard integrated (53F0/5261); browser JSON remains adapter.
- **D** Import/export native TDT files and original file-dialog semantics
- **C** Save As and quit behavior suitable for browser with explicit state preservation - Deterministic browser JSON preserves pending prompt/tick continuations and source metadata. Actual Open replay restored an unanswered bomb decision without advancing its clock. First Save/Save As request a filename; later Save reuses it; cancellation retains state and aborts guard-Yes New. Large10001-passenger export roundtrip regression passes. Native TDT/common-file-dialog behavior remains separately deferred.

### F54 - Menus, shortcuts and window visibility (P3)

Manual: printed 26-30; evidence: index.html; main.attachEvents; IDA 2B13A.

- **C** Match original File/Options/Windows/Help menu content and disabled Edit commands - RT_MENU ampersand access keys and sourcecontent/disabled controls verified; Windows visibility toggles have no invented checkmarks (2B307–2B37A), Options native marks retained. Captions/menus use supplied System face13px by user sizing request, nowrap/max-content entries browserverified.
- **C** Provide original keyboard equivalents and mouse hold/release commands - Native F1 resource, bareALT/F10keyup activation, consumedchords, menu traversal, heldcommand selection and guardedmainAltF4 are implemented and tested. NativeDialogAltF4dispatchesIDCANCEL toexistinghandlers. LogicalClipCursorcoordinates retainnativepopupselection.
- **C** Hide/restore Info Bar, Tool Bar and Map through Windows menu
- **C** Match minimize/maximize/system-menu and native modal focus - Native sourcewindowflags, iconvisibility, whole-mixer activation, move/sizeoutline/8pxedge-cornersteps, modal/modelessfocusandFinancekeyupclose are recovered. RT400hasnocustomsystemmenu andignoresIDCANCEL;731hascaptiondrag. Nativeouter/clientdimensionsandinsidebevelsaretranslated; platformrastercomparisonwaswaived.

### F55 - Help and manual access (P3)

Manual: printed reference/index; evidence: main help overlay; original SIMTOWER.HLP.

- **C** Provide usable browser controls/help - Supplied original OCR manual exposed locally with feature topics, full-text search, page navigation, Back and browser control help.
- **C** Expose original help topics or equivalent manual lookup - Supplied original OCR manual exposed locally with feature topics, full-text search, page navigation, Back and browser control help.
- **C** Preserve original global Contents and provide feature navigation - F1 global Contents; structured WinHelp-style HTML has53 topics, keyword index, full-text search, Back/History/browse/Print and24 actual-port screenshots. Modeless Help is movable/resizable; user-supplied System and Microsoft Sans Serif fonts are local. Browser navigation/clock/resize proofs passed.

## Manual/executable discrepancies

- **Car capacity** (manual 47-48): Manual states 17 standard/service and 36 express. Supplied executable initializes 21/42 (390FC/39904). Keep executable values; rendered manual page 47 confirms this is not an OCR error.
- **Stair/escalator limits** (manual 46): Manual says four/seven sets; native reach validators 34B12/34A52 allow three/six floor transitions. This could be inclusive floor counting or a release difference; it has not been reconciled. Preserve executable comparisons, with tests for both travel directions.
- **Bomb deadline and randomness** (manual 52-53): Manual says random day and 13:00 explosion; supplied binary uses recovered date moduli and 15:00 deadline. Implementation must follow the binary event dispatcher.
- **Stress, patron numbers and periods** (manual 57-60): Manual explicitly says its formulas/numbers are illustrative, not precise release formulas. Use PART resources and IDA callers for numeric rules; keep manual qualitative lifecycle requirements.
- **Noise and treasure wording** (manual 25,54): Manual describes radial noise and underground residences for treasure; supplied native caller scans horizontal cell distances and tests basement width/rating. Do not overwrite recovered checks with prose simplifications.
- **Window chrome and target platform** (manual 9,30,34-38): Manual illustrations show platform-specific window conventions. Target remains the supplied Win16 executable and original resources; browser/OS file dialogs are not exact Windows shells.
- **Rating elevator limits** (manual 47-48): Manual describes varying limits as an example. Direct IDA2A2FB/2A382 inspection finds identical24-shaft/eight-car constants in every rating branch; preserve supplied executable.
- **Shift replacement** (manual 44): Native390FC/3BDF8 removes old facilities before validation; failed replacement can leave removed rooms. Earlier checklist atomicity was a prototype assumption and has been corrected.
- **Protected cinema demolition** (manual 38,44): Supplied native3BD44/3BF6D allows cinema removal; security/housekeeping/metro/cathedral/SECOM remain protected.
- **Elevator Simulate** (manual 54-56): 1E0A0/1E3B8 performs a static future-stress warm-up, restores visible original queues/cars and pauses. It does not run ordinary tower actors/accounting.
- **Audience and metro demand** (manual reference/simulation appendix): Supplied cinema/party/metro handlers use fixed persistent pools, category/lobby destination lists and actual admissions. Party50 has no hotel support gate; metro240 does not commute to offices/residences and is not restricted to basement commerce.
- **Recycling service gate** (manual reference/simulation appendix): Supplied processing handler checks population per center; adjacency is a placement rule and no runtime service-elevator test appears.
- **Clinic actors** (manual reference/simulation appendix): Native clinic record reserves metadata, but active state35 patients are office/condo residents, not an independent clinic patron/staff generator.
- **VIP artwork and success** (manual reference/simulation appendix): Source VIP palette applies yellow to persons/portraits; no entire suite fill found. Checkout checks signed historical journey mean<=150, with no extra price/noise/dirt condition.

## Work log

- 2026-10-14: Inventory completed before implementation: manual tutorial, reference, strategy, simulation appendix and index were compared with source and prior IDA audit. Baseline is retained in coverage-baseline.json.
- 2026-10-14: Started F01, the highest-priority dependency. Added original-routes.js with native reach bounds, nearby-escalator preference, lateral/queue costs, real-lobby transfers and at most one elevator change. Replaced unlimited floor BFS. Route component compression and retry logic remain partial.
- 2026-10-14: Continued F02/F03 through native eviction accounting. Added recorded condo sale/refund/resale lifecycle, occupied price lock, resident travel/parking cleanup and legacy browser migration. Recorded sale values survive save/load; invalid values are rejected atomically.
- 2026-10-14: 100 tests pass, including eleven new route tests and five tenancy contract tests. No original executable replay comparison has been completed.
- 2026-10-14: Browser continued the legacy Metropolitan save and verified its occupied-condo price selector is disabled. A UI syntax error found during QA was corrected; build now checks every browser JavaScript module before replacing dist. Final reload had no console errors. Proof: research/screenshots/manual-coverage-condo-lock.png.
- 2026-10-14: Parallel IDA pass integrated full-ring cohort retry/reselection; native office/condo applicants, daily evaluations and quarter referrals; all residential price/noise stress; actual clinic availability and promotion latches; room-overlay/stacked stairs, escalator endpoint restrictions and waiting-floor stop protection. Native saves remain deferred. Source evidence: TENANCY_NATIVE.md, MEDICAL_PROGRESSION.md, CONSTRUCTION_NATIVE.md, TRANSPORT_RETRIES.md.
- 2026-10-14: Browser QA exposed old stair artwork assembly: both levels incorrectly drew lower-sheet frames. Corrected native upper/lower resource pairing and synchronized frame selection from189DA; native diagonal bulldozer hit now aligns with displayed stairs.
- 2026-10-14: User-reported resident turning was confirmed:1515 adjacent poses are opposite facings, not gait animation. Corrected direction selection and removed walk-distance cycling/double mirroring; source17A33/16EF6 and pixel comparison, with sprite stability tests.
- 2026-10-14: Final parallel pass validation:152 Node tests pass; npm run build succeeds. Browser loaded legacy Metropolitan save without console errors, verified stacked original stair assembly and diagonal removal, and reloaded corrected resident facing selection. Proof:research/screenshots/parallel-priority-pass.png. No original executable replay comparison yet.
- Parallel full-list pass: persistent food/shop budgets, hotel dirt/neglect, native lobby art/tall transports, emergency dispatch/damage, cathedral worship, directional queues/inspectors, map/finance scaling, sound channels/effects/Fast Mode integrated. Full suite reached282 passing before subsequent facade/preview integrations; targeted new suites continue. Coverage remains explicit about unresolved routing, shows, metro, recycling and application details.
- 2026-10-14: Continued parallel full-list recovery: persistent shows/metro, hotel dinner/countdown, recycling adjacency/truck, clinic tombstone registry, signed actor histories, first-fit actor allocation, native component tables, immediate transport/reselection, original scene/rain, startup and paused/window UI integrated. Browser loaded legacy Metropolitan and rendered native scene/parking frames. Full original replay remains outstanding; native TDT remains deferred.
- 2026-10-15: Native initial transport chooser/boarding target, packed clock wrap, accepted population, parking cache/quotas, commercial tombstones/signed destinations, lifetime style counters, tenant failure phases, exact inspector geometry and native desktop/scrollbars integrated. Latest full suite521 passing; focused cursors/person/inspection checks follow. Modern structured illustrated HTML manual delegated separately. No overall pixel-identical or RNG replay claim.
- 2026-10-15: Fixed reported runaway default speed: normal96ms native tick gate now default; Fast Mode explicitly selected. Browser Options proof normal-speed-options.jpg. Preview unserved ring-index and popped raw stress semantics recovered directly in IDA. Full534/534 suite passed after these changes.
- 2026-10-15: User requested correction of Fast Mode as well as default normal speed. Original Fast has no fixed rate (manual28,3CEF6); replaced browser512-tick CPU batches with one tick/16ms unit/paint, nominal6xnormal, no catch-up. This explicit pacing adaptation is recorded rather than claimed1:1.
- 2026-10-15: Eviction/late-return/ghost-facade contracts, price-lock UI, original current-tier repeated-refund/negative population behavior and source sound defaults integrated. Menu/modal capture now freezes visual RNG/effects, with visible interior sampling in native row/column order. Full545/545 tests pass and build succeeds. All24manualillustrations captured; WinHelp restyle/navigation verification in progress.
- 2026-10-15: removed invented ordinary-room elevator extension veto; source15988 only tests transport rectangles. Occupied-office upward drag and retraction/scaffolding regression verified. Installed supplied System Bold for captions/menus and Microsoft Sans Serif for Help. Help drag/resize, unlimited tower tracking/full-desktop maximize and palette/menu stacking browser-verified.574-test checkpoint before newest renderer/window work.
- 2026-10-15: per-floor native construction ring/drain, explicit persisted interior dirty poses, global physical actor cohort ordering, generic-room RNG removal, dialog keyboard and elevator schedule scroll/dense columns audited/implemented. OriginalALRT1004 affordability nested continuation and user13px System sizing verified. Emergency17FE0 full reset/timed alerts undergoing final integration checks.
- 2026-10-15: User reference menu styling restored flat black borders, solid selection, fixed check gutter and plain disabled gray. Original bitmap256 title splash recovered in IDA and browser-verified at640x480 behind10000. Crane placement changes now issue full rebind/synchronous redraw after structural row callbacks;28 focused tests pass. Finger extension cursor/ghost corrected to source capture-only SIZENS and no construction ghost.
- 2026-10-15: Integrated673/673 Node tests and static build checkpoint: native-index retained palette/RGBA detail, both construction overlap orders, source Finger/caps/programming, original intro/Maxis loading+20000 sound, real858-asset preload/progress, defaultwaifu/Original toggle and removal of other upscale sets. All25 manual figures refreshed. Added explicit partial native shaft-spacing/tombstone requirement from new15988 audit rather than hiding that uncovered constraint.
- 2026-10-15: Integrated694/694 tests: native shaft machinery/separation/tombstone persistence and raw resize ordering, exact shaft-left car addition, full Original global-CLUT and byte255-only queue tint, post-Info palette presentation, application seed1/New continuity and New/Open normal-clock reset. All25 manual figures refreshed from the current game. Repository prepared with runtime assets retained and original installation/raw inputs excluded. Clean-copy verification:693 tests pass, the optional private cursor-byte comparison skips, and the static build succeeds.
- 2026-10-15: User waived further screenshot/pixel comparisons and accepted binary-driven rendering. Recovered source behavior, original resources and USER API contracts now define acceptance. Closed remaining toolbar/menu/window/frame/controller gaps; exact visual comparison and native TDT remain documented deferred work. Final source-release and publication checks in progress.
- 2026-10-15: Final source checkpoint729/729 tests pass. Controller-specific redraw returns replace blanket cloud retries; nested inspector child returns do not resample world interiors. Find closes rebind, bomb activation refreshes while fire does not, and SECOM has no inspector. Source410/411 Resume crop restored; three affected manual illustrations refreshed,53topics/25figures retained. GitHub Pages project-path build boots858 assets plusHelp/textureviewer. All in-scope checks have source evidence; publishing and clean-copy gate follow.

## Next work

- Publish and verify the requested benphelps/simtower repository and playable GitHub Pages deployment.
- Native TDT interoperability remains deferred; further screenshot/pixel comparison was waived by the user.
