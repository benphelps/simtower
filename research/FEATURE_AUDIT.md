# SimTower feature audit

Current per-behavior status is maintained in [MANUAL_COVERAGE.md](MANUAL_COVERAGE.md)
and `manual/coverage.json`. The dated tables below preserve earlier recovery
checkpoints; several provisional gaps and assumptions have since been replaced
by native actor, transport, clinic, population, scene and UI implementations.
See the current checklist and dedicated `*_NATIVE.md` evidence before treating
an older table entry as the current port status.

Scope: direct inspection of every feature identified by the supplied Win16
MENU, Tabl/TabM construction catalogs, RT_DIALOG/DTMP resources, clock dispatcher
and actor dispatcher. This is a feature coverage audit, not proof of a completed
1:1 port. The original has nine actor state machines and shared transport,
parking, services and emergency pools; reading their entry points does not mean
all their transitions have been translated.

Addresses are IDA linear addresses, not EXE file offsets. Inspected assembly is
retained in `research/ida/`. The current IDA database also has recovered names.
No feature below is classified from its name alone: resource contents, the
corresponding handler, or an explicit native switch case was examined.

**Ported** refers to the stated recovered rule. **Partial** means the browser
implements part of the feature; the outstanding differences are listed.
**Inspected** means direct original evidence was read, but implementation remains.

Current priority: persistent people, parking/VIPs, and remaining gameplay/UI
fidelity. Native TDT interoperability is explicitly deferred as a future TODO /
nice-to-have at the user's request.

## Application, windows and controls

| Feature | Direct original evidence | Browser status / remaining differences |
| --- | --- | --- |
| Main menu | MENU 1; `2B13A`, 28 command cases | partial; original menu order, most commands; disabled controls identify unfinished systems |
| New/start/load prompt | RT_DIALOG/DTMP 10000; `5457`, `19BDD` | partial; browser welcome includes demo and Continue; original prompt, dirty-save guard and quit flow pending |
| Open, Save, Save As | `19CDC`, `19EC3`, `19F79`, `1A684`, `1B062`, `1C55A` | inspected native formats; browser JSON/autosave works; TDT import/export deferred / nice-to-have |
| Exit / system window controls | `1A151`, MAINWNDPROC `2AA30`; USER `DestroyWindow` / default window handling | partial; browser exit returns to title; system-menu, minimize/maximize integration pending |
| Play/pause artwork and pressed states | `C674`, `C6E1`, `EDF9`, `CB0D`; bitmaps 600–603 | ported full 64×32 toggle; original permits construction only while running, browser currently permits paused edits |
| Fast Mode | `2B13A`, `3CEF6`, `4A256` | partial; native flag skips the normal clock gate; browser uses fixed 8× speed |
| Growing construction palette | `29DA8`, `29F74`, `CAA2`; every Tabl/TabM group | ported 5/7/8 buttons, original ordering/submenus; native hold gesture geometry approximated |
| Bulldozer, hand, lens | `C6E1`, `CA29`, `3BD44`, `3BF6D`; 604/605 | partial; native icons, protected facilities and free removal; occupied condo sale repayment; floor removal and exact hit testing pending |
| Movable Info Bar | `2777B`, `27105`, `26C9C`–`26DF7`, `E5F6`; bitmap 320 | partial; original 431×49 content geometry, bitmap, 8px handle and clock; initial desktop positions, fonts and focus details need reference comparison |
| Clock / calendar | `3CEF6`, `3D2ED`, `3D2B8`, `263C6`, `26872`, `3CD97` | ported nonuniform 2600 ticks, day/quarter/year boundaries and integer hands; localized date presentation partial |
| Map and navigation | MAPWNDPROC `2BEC0`, `2C17E`, `2BA5C`, `ED00`, `CB66`, `C506`, `C5B4` | partial; native 200×314 window, full-site projection, colored shafts and original four buttons/legends; exact hatch/focus rendering pending |
| Edit / Eval / Pricing / Hotel views | `36570`, `367C4`, `368D3`; bitmaps 310–315 | partial; Edit resumes, other views pause; map colors/legends available; full-world replacement graphics, pricing clicks and dirty-room actors pending |
| Finance window | COUNTDLOGMAIN `CD73`, `D119`, `CCDA`, `D55E`, `D5F8`; bitmap/DTMP 500 | partial; original bitmap, ten category rows, signed income, maintenance, construction, other income and previous balance; populations inherit remaining actor approximations |
| Tenant inspection / price controls | `1FD89`, `200D3`, TENANTINFODLOGFILTER `204E8`, RT_DIALOG/DTMP 748–760 | partial; original facility-specific geometry, rent tiers, movie selector and naming; staff/occupant portraits and some condition text pending |
| Car / stairs information | ELVINFODLOGFILTER `20B9D`, ESCINFODLOGFILTER `20ED5`; 761/762 | inspected; native passenger portrait grids and clicks pending |
| Person information | `1FA10`, PEPLEINFODLOGFILTER `1FAF3`; 763/764 | partial; persistent identity, native 763 dialog, stress and destination, room occupant selection; portrait/type mapping and service-specific 764 pending |
| Rename / remove name | `236E9`, `23A78`, `2F3EC`, `2F4AC`, `2F563`, `2F654`; 730/732 | partial; tenant naming/deleting names, original dialogs, 15-character and 20-name limits; person naming implemented; exact native portrait map pending |
| Find Person / Find Tenant | `1C680`, FINDDIALOGFILTER `1C6EF`; bitmap 510, DTMP 510/520 | partial; both native search windows, naming/removal and navigation work; exact native car/queue selection pending |
| People animation option | `2B13A`, `163BA`, `1699C`, `189DA`; 1512–1518 | partial; whole 16×24 characters, stable walk pairs, native icons and show/hide; complete actor/queue pose mapping pending |
| Effects option | `56CB`, `2B13A` | inspected; native palette animation at a wall-clock gate; full palette cycling remains disabled |
| Sound categories / mixer | `35BB7`, `35B85`, `35E01`, `35E7C`, `36042`, clock call sites | partial; three toggles, native departure/day/rain/metro/message cues; sampled ambient locations and WAVMIX channel/loop scheduling pending |
| Help Contents | `2B13A` command 40021 invokes WinHelp on SIMTOWER.HLP | inspected OS delegation; original HLP topic decoder/viewer pending; browser help is a port-specific replacement |
| About / credits | ABOUTDLGPROC `4D9F`, `529B`, `51EF`, `5351`; bitmap 257, TEXT 128 | partial; original logo/art and credits, 240px pane, 16px lines and 55ms-per-pixel scroll; frame/font reference matching pending |

## Construction and facilities (all catalog entries)

Shared direct evidence: `388D0` dimensions; `390FC` type dispatch; `3B91B`
placement validation; `3A117`, `3A8BF`, `3AA29`, `3AC17` multi-floor construction;
`2CDC5`, `2CFED` charges; `3BD44`/`3BF6D` removal. Original image IDs and all
26 toolbar icon types are decoded; no replacement scene artwork is generated.

| Native type(s) / facility | Additional evidence | Status / gaps |
| --- | --- | --- |
| 24 Lobby, 0 Floor | `274D7`, `2D4D4`, `B3A3`, CGPk 2536–2666 | partial; 375-cell site, support width, sky-lobby rules and native structural charges; complete lobby assembly/overhangs pending |
| 1 Standard elevator | `39904`, `150B9`, `15427`, `390FC`, `39F11`, `14ED6`–`15057` | partial; one-floor creation, add-car click, independent end controls, live drag with native vertical resize cursor, automatic structural floors retained on retraction, 30-floor limit, 24 shafts / 8 cars; exact capping/warning/queue-reset behavior pending |
| 42 Express elevator | `15B36`, `15B80`, `11A3F` | partial; 42 passengers, sky-lobby/basement stops, native acceleration/end frames; native directional dispatch and express departure sweeps translated; original journey routing remains partial |
| 43 Service elevator | `390FC`, `3E2A0`, `34C04` | partial; original construction/capacity and service routes used by housekeeping; shared native car dispatch translated; other staff actors pending |
| 22/23 Stairs, 27/28 Escalator | `3E2A0`, `103EC`, `1898E`, `20ED5` | partial; native 2-level footprints/art; simultaneous directional queues, traversal limits/delay pending |
| 7 Office | `42495`, `42811`, `2D71E`, `2D7A9`, `293AD` | partial; six residents, rent, tenure ceiling and evaluation; persistent identities and morning/evening commutes with parking; native business/lunch/clinic/return states translated; exact acceptance, trip bitfields and emergency resets pending |
| 9 Condo | `43D28`, `44050`, `2DA4D`, `28C0F` | partial; three residents, four sales tiers, trip-weighted stress; persistent family identities and native child/homebody/venue/return/sleep states; move-in/acceptance bitfields and complete visit accounting pending |
| 3 Single room, 4 Twin room, 5 Suite | `432CC`, `4358E`, `2D862`, `2D914`, `28909`, `289E2`, `29677`, `29779` | partial; 1/2/2 guests, checkout revenue and price stress modifiers; persistent evening check-in, overnight stay, dawn checkout and cleaning; full native acceptance/condition bitfields and evening outings pending |
| 10 Shop | `446B9`, `448A0`, `32192`, `28F04`, `2DBAB` | partial; ten base patrons and rent; native rolling patronage and demand caps pending |
| 12 Fast food, 6 Restaurant | `44E4D`, `45031`, `32024`, `320F0`, `32192`, `32552`, `335D1` | partial; close times, thresholds and signed receipts; native patron state/demand calculations pending |
| 18/19 Movie theater, 34/35 booth | `2DE93`, `2E172`, `2E3CF`, `2E4C8`, `2E646`, `2E72A`, `2E95E`, `2E9ED`, `23DEF` | partial; native 31-cell footprint, booth art, title cycling/costs, audience decay, two arrival batches, closing receipts; persistent half-audience actor states pending |
| 29/30 Party hall | same theater pool routines, `45A11`, `45B8D` | partial; 50 daily patrons, 13:00 arrivals / 17:00 closing; original booking/trip actor state pending |
| 15 Housekeeping | `46719`, `4680B`, `2A410`, `2A6F2`, `2A8F2` | partial; six persistent staff, native floor-modulo assignments, above-then-below search, service travel and three-cohort cleaning countdown; full room condition bitfields and staff poses pending |
| 14 Security office | `416CE`, `46BEC`, `46C60`, `1EFC1`, `1F493` | partial; six persistent staff per office and native limit ten; separate emergency travel/search/quenching dispatcher pending |
| 13 Medical center / actor type 33 | `4553B`, `45680`, `2C3BF`, `2C45F`, `2C531`, `2C6B4`, `2C80F`, `33590` | inspected; ten clinics, 40 patients per center, 16-tick service, nearby-lobby group selection with fallback; office request/service transitions implemented; native clinic demand counters, missing-clinic notice, dedicated medical actor types and promotion flag pending |
| 20/21 Recycling | `F530`, `F60E`, `F701`, `F780` | partial; native six stage times, fewer than 2500 people per center, working flag and original stage art; lower-section emptying animation pending |
| 17 SECOM | `1D819`, `1983E`, `1F493`, `388D0` | inspected; two-cell original sprite; early fire/bomb notice and 80-update fire delay require emergency model |
| 11 Parking | `300BB`, `30162`, `3022A`, `30399`, `305B6`, `305F7`, `2FF3F`, `2FFE9` | inspected; 512 parking slots, category quotas, 13 native car variants, suite/selected-worker requirement; actor-owned booking/release, category quotas, ramp connectivity, basement travel and 13 car variants implemented; exact native cell-map quotas/network and curb animations pending |
| 44 Ramp | `390FC`, `3B91B`, original 3816–3818 | partial; corrected original 128px asset, vertical connectivity; complete parking-network validation pending |
| 31/32 Metro (third level 33) | `390FC`, `3B91B`, `384F3` | partial; original three-level art, unique/bottom placement, native daytime 1/100 train-state switch and sound; full arrival/destination routing pending |
| 36–40 Cathedral / Tower ceremony | `AB30`, `AC20`, `ACA9`, `ADE5`, `AEEB`, `4633A`, `464B2`, `29C1F` | inspected; five levels at 100F, weekend visitors, forty simultaneous arrivals before tick 800 and 15000 population to trigger Tower; ceremony travel/graphics pending |

Native pooled limits checked directly in `390FC`: ten security offices, ten
medical centers, sixteen combined theaters/party halls, and 512 combined food /
restaurant / shop entries. These limits are now enforced on new construction.

## Shared simulation and events

| Feature | Direct evidence | Status / gaps |
| --- | --- | --- |
| Random generator | Borland `_srand` `3236`, `_rand` `324D`, inclusive helper `19B80` | ported recurrence `seed*0x015A4E35+1`, 15-bit output; call order remains approximate while actors are reconstructed |
| Actor update scheduling | `41544`, `416CE`, `46FB7`, `48A25` | partial; 16 cohorts for persistent office/condo/hotel/housekeeping identities; security identities reserved for separate emergency dispatch; active walking/queues retain reconstructed movement, other facility handlers pending |
| Native travel / congestion stress | `3E2A0`, `34C04`, `36E17`, `28B7B`, `28C0F`, `28E4B`, `28F04` | partial; mean-of-person means, thresholds and hotel price/noise adjustments; cumulative actor totals retained; exact native route failures, walk distance and delay accounting pending |
| Native noise rules | `298C0`, `29965`, `299E8`, `29A78`, `29B29` | partial; same-floor 10/20/30-cell proximity; exact cell-map scan/acceptance effects pending |
| Construction queue | `47740`, `3862B`, `387F1`, `38680`, `4A256`, `FD4B` | ported 12 updates / ten-entry FIFO; direct main-loop evidence shows FD4B(1) runs only on clock advance |
| Quarter economy | `CCDA`, `28800`, `29200`, `293AD`, `2D5AE` | partial; accounts reset, rent/maintenance, original tenure ceiling, bad office/condo eviction; complete retail/acceptance modifiers pending |
| Rating progression | `29B9D`, `29F8D`, `2A0FE`, `2A0BD` | partial; thresholds and built-security/suite, working-recycling, medical/VIP and weekday/night gates; VIP sequence implemented; medical demand and full actor/acceptance rules are still required for faithful high-rating progression |
| Rain / palettes | `63CD`, `640D`, `642B`, `5F8B`, `5E53`, CLUT 1000–1003 | partial; recovered rain day %8=4 below five stars, 7:00–17:00 trigger and palette windows; precise cloud placement/palette effects pending |
| Treasure | `2A1E7`, `2A22C`, `2A293`, `2A0BD`; dialog 3040 | ported B3/B4/B5 at stars 1/2/3, strict width >25/50/75, $200k/$300k/$500k, native dialog/art/sound; flag resets to eligibility on rating change |
| VIP reservation / arrival / checkout | `48E00`, `48EB6`, `48F15`, `48F7D`, `48FC3`, `4358E`; 3000–3003 | partial; native date/rating/guest/parking gates, reserve after return before parking release, same identity's arrival/name and <=150 delay checkout, native dialogs and pass flag; route/wait metrics still inherit transport approximations |
| Bomb demand, search or pay | `1983E`, `197D0`, `19994`, `199C7`, `19A24`, `19A8D`, `1EFC1`; 3020–3024 | inspected; day %60=59 at tick 240, ratings 2/3/4, $200k/$300k/$1m, 15:00 deadline; actual security search / damage / evacuation pending |
| Fire, security and rescue | `1D819`, `1D939`, `1D9D4`, `1DA4C`, `1DA91`, `1DAF6`, `1DC42`, `1DFC8`, `1F493`; 3010–3014 | inspected; day %84=83 at tick 240, daylight/rating/security/width checks, SECOM delay, $500k rescue, spread and firefighter sweep; emergency/damage/evacuation implementation pending |
| Emergency actor reset / evacuation | `1EBFD`, `416CE`, `1EF16`, `1F8A5`, `417F8`, `4204C` | inspected; separate security routes and native staff/person reset states; browser model pending |
| Santa | `351C0`, `351E8`, `35220`, `35249`, `3530B`, `353CB`; bitmap 904 | ported native annual tick-2000 trigger, sprite and -10/+1 pixel motion; correct map marker / ambient sample routing partial |
| Hidden AquaZone export | command 999, `8104`, `81E1`, `823F`, `8B2D`, `8C73`; 4000–4002 | inspected; original cross-game export/pattern selection and $5m payment; outside browser gameplay, pending format implementation |

## Corrections established by following callers

- `1D819` is **fire**, not Santa; Santa is called through `351E8`.
- DTMP slots with `bottom=0` are bitmap IDs, not Windows RT_ICONs.
- Dialog mapping comes from `1FD89`, not guessed from control captions:
  housekeeping 754, security 755, generic 756, medical/cathedral 757,
  cinema 758, party hall 759, food 760.
- Treasure uses the floor-table pointer at BE66, two entries before BE6E:
  B3/B4/B5, not B1/B2/B3. Promotion recomputes its flag.
- Cinema arrival batches begin at ticks 1000 and 1400 (12:45 / 15:00).
  Its first half leaves at 1500 (16:00), the second at 1900 (20:00), when
  receipts post. Party arrivals are tick 1200 (13:00), closing tick 1600.
- The VIP parking requirement is `305B6` testing packed actor parking bits.
- Effects toggles native palette cycling, rather than an arbitrary visual filter.
- Finance fields are not drawn strictly inside DTMP: `3727F` adds 60 pixels
  to the year/quarter right edges and 64 to the five balance fields.
- Tenant tenure (`22127`) omits zero years, numbers quarters 1–4 and uses
  the original STRL 713 caption at the 120-quarter ceiling.

## Original save-format evidence

`1A684` is symmetric native `_lread` / `_lwrite` through `1C55A`. Its current
version word is 0x2400; accepted native versions include 0x1700–0x2400, with
separate endian conversion through `1B062`. Direct record sizes: 120 floor
headers (6 bytes), variable 18-byte floor records, 188-byte resident maps at
version 0x2400, 16-byte actors, 24 shaft headers (194 bytes), directional
waiting pools, eight car records per active shaft, category totals, event flags,
parking, clinics, cinema and names. It is not a JSON-like geometry-only format.

The supplied SAVE.TDT was examined against these reads: 69734 bytes, version
0x2400, one star, $1,430,000, tick 557, native day counter 1. Floor records begin
at byte 560; occupied floor headers are native levels 10–12. Actor count at byte
24002 is 512. Full actor/queue/name import and exact native roundtrip are pending.

## Verification and remaining fidelity work

84 Node tests cover old and new rule boundaries, deterministic browser saves,
atomic failure paths and sustained simulation. Browser checks cover the full
play/pause icon, elevator schedule dialog, window chrome, native room dialogs,
finance and tenant naming/search. No running-original screenshot or replay
comparison has been completed, so **pixel-identical and simulation-identical
claims are not justified**.

Browser proof: `screenshots/original-controls-and-dialogs.png`. The restored
weekday/weekend wait settings were checked independently and returned to zero;
a temporary tenant name was created, found, then removed. No browser console
errors were observed during these checks. `npm run build` succeeds.

The largest remaining implementation is the rest of the native actor/route
model. It unlocks faithful retail/hotel evening trips, full clinic demand, disasters,
and exact journey routing. TDT interoperability is deferred. The ledger above gives direct original
entry points for each; none should be replaced by invented probabilities.

## Persistent people / parking pass

- `original-people.js` retains resident/staff identities separately from active
  journeys. Office, condo and hotel people keep their names, appearance and
  cumulative delay/trip totals. Each office has six residents, each condo three,
  hotels one/two/two guest children, housekeeping/security six staff each.
- `41544` selects `tick % 16` and steps through the actor pool by sixteen.
  Native hotel child zero is reserved; guest children start at one. Hotel
  evening check-in, overnight stay and morning checkout are translated as the
  current core lifecycle. Native evening shopping, office lunches, individual
  family roles and complete acceptance/condition bitfields remain partial.
- `305F7` distinguishes *required* parking (suite child zero, selected office
  child two at native `(floor + tenant) % 4 == 1` and rating >=3) from the
  general booking path. Native floors include the +10 basement offset. Suite
  guest arrival also explicitly refuses to proceed without parking in `4358E`.
- `30162` allocates 512 six-byte space records. `30531` chooses one available
  index, `3022A` books it for an actor and chooses car state `2 + rand()%13`.
  The thirteen displayed cars use BITMAP 1705 frames 1–13. `30399` releases the
  actor's reservation. Category allowances from `2FFE9` are physical-space
  count times `[2,1,1,2,1,1,1,1,1,1]` in finance-category order. The current
  ramp network and tenant ordinal are reconstructed from browser geometry;
  full original floor/cell-map indexing remains a gap.
- `48E00` reserves the next stay after the primary suite guest's return, before
  `30399` releases parking. The date must be `%9 == 3`, rating exactly three,
  no previous pass and no active reservation. `48EB6` announces/names the same
  actor on its later arrival. `48F15` accepts mean actor delay <=150 at checkout;
  `48F7D` fails an aborted visit. `48FC3` clears stale reservation state at 17:00
  when the date is no longer eligible. Original dialogs 3000–3003 are used.
- `2A410` assigns each housekeeping child a native-floor residue modulo six,
  scans above before below, travels through the service network, then cleans
  after the three actor updates in `4680B`. Browser proximity-only cleaning
  has been removed.
- `39F11` creates/expands floor bounds under a shaft. `150B9` / `15427` charge
  only newly added structural cells through `2CCD5`, clear stops/queues on
  retraction and do not erase floor bounds. The browser retains those bounds,
  draws the original 1069 scaffold halves (24×36, white transparency), and
  applies changes as the pointer crosses floors. `37FFB` mode 1000 loads native
  `IDC_SIZENS`; browser end controls use the equivalent vertical resize cursor.
- The construction FIFO bug found during integration was in a JavaScript
  `find` predicate calling `shift()` repeatedly. It now pops one job once;
  ramps/parking and later queued facilities complete without being discarded.

Verification includes a complete automated guest → VIP reservation → check-in
→ overnight stay → checkout/pass cycle, the exact 150/151 delay boundary,
parking release, disconnected ramps, persistent save roundtrip, six housekeeping
and security staff, atomic extension failure and retained structural floors.
Browser checks cover resident inspection/naming/search and elevator drag up/down.
Current proof: `screenshots/persistent-people-and-scaffolding.png`.


## Directional dispatch / office and family states pass

Direct IDA inspection followed both the native car loop (`FD4B`, `1009B`)
and passenger boarding/unloading callers (`3E5F1`, `3EA46`, `3EFEE`, `3EB23`).
`src/original-elevators.js` translates the recovered dispatch rules:

- `103EC` assigns each directional hall call to one car. `1079C` compares
  on-the-way, around-the-turn and parked idle distances. Stable first-car ties
  and the strict response comparison are preserved. On-the-way candidates
  take precedence over around-the-turn candidates. A car already at the
  floor and in the right direction leaves the call unassigned.
- `10EF3` performs four ordered scans for local service. Full cars ignore
  hall calls while keeping passenger destinations. Express-to-top sends the
  car to the top without intermediate stops, then scans down; express-to-bottom
  mirrors this. Both endpoint/cooldown conditions were read directly. These
  programs apply to standard/service cars too; speed still depends on car type.
- `116CF` updates direction and handles endpoint/opposite-queue reversal;
  `118EC` records the farthest outstanding stop in the sweep direction.
  `10D6C` releases a served hall claim even when another car owns it;
  `10C69` releases only the departing car's own claim. `3F2A2` raises a call
  only on an empty-to-nonempty directional ring; a remaining queue is called
  again when a car leaves. Each directional ring admits at most 40 people.
- `1009B` advances all cars before passengers are processed. Doors count
  5/4/3/2/1/0. `3EA46` unloads only at five; `3E5F1` boards one person
  per eligible direction at five and three, then fills remaining seats at one.
  Local service boards one direction; express departure programs can board both.
- `11D45` waits only at parking/lobby floors, bypasses the wait when full,
  and departs when absolute native clock distance is strictly greater than
  `wait * 30`. The unwrapped midnight difference is preserved. `36D11` caps
  accumulated queue delay at 300; `36F43` forgives 25/50 ticks at the ground
  floor of a double/triple lobby. The invented 90-second abandonment is removed.

`42495` / `42811` now drive office states 0/1/2/5/32/33/34/35/39 and their
64-offset travelling forms. Child zero makes a morning business trip through
the ground lobby. Other children lunch or, at three stars and above, request
medical service with the original one-in-ten test (`2C8D5`). Child one can make
an afternoon business trip; other returning workers wait for evening departure.
Daytime trips keep their parking reservation; evening departure releases it.

`43D28` / `44050` now distinguish condo child one venue trips, child two's earlier
return, odd-tenant weekend homebodies, state 4 at home and state 16 sleeping.
Food/shop selection follows `333BD` / `33201`: native home-lobby group first,
ground-lobby fallback, uniform random selection. `33590` preserves signed
basement division and the ten-floor venue bands. The durations from PART 1000
are decoded (shop/restaurant/fast food 60 ticks); `2C6B4` uses 16 ticks for
medical treatment. Venue admission (`32C32`, `2C531`) caps occupancy at 40.
Missing venues use the ground-lobby fallback and zero missing-service penalty.
The person dialog reports the actual service destination for these states.

**Still partial:** browser BFS journey routing, horizontal walking and transfer
retries; full actor packed-state/condition records; per-service queue delay and
native trip-counter boundaries; dedicated commercial/hotel evening/medical
actors and rolling demand; clinic notification/demand/promotion flags; original
floor cell-map tenant indexing; emergency reset/evacuation. No original executable
replay or screenshot comparison has established identical simulation output.
The car dispatcher is translated against the existing browser journey adapter;
it does not make the entire transport system exact.

Verification: 84 Node tests, including response/tie and turn distances, directional
scan order, full cars, express endpoint programs, door boarding/unloading,
independent directional ring limits, native waits/delay allowances, office visits,
family return/sleep states, venue bands and deterministic browser save/load.
Native TDT interoperability remains deferred as requested.

Browser verification for this pass continued the existing Metropolitan JSON
save, checked response adjustment (5 -> 6 -> 5) and the native directional
program menu, then ran through weekdays with moving cars, visible queues and
actor-owned parked vehicles. No console errors were captured. The car arrival
and departure sounds now fire once per stop/run, as in `3EA46` / `10A84`, rather
than once per passenger/floor. Final browser proof:
`screenshots/native-dispatch-and-people.png`. The tower is left paused.


## Manual coverage pass

The supplied OCR manual's tutorial, reference, strategy, simulation appendix and
index are cross-referenced in `MANUAL_COVERAGE.md`. This provides a prioritized
inventory of 55 feature groups / 289 behavioral checks, with an immutable baseline
and current structured statuses. Coverage counts fully implemented behaviors;
partial behaviors receive no assumed percentage credit. The manual's numerical
simulation examples explicitly disclaim release accuracy, and several transport
limits differ from the supplied executable. Those discrepancies are preserved.

Highest-priority F01 routing now uses the native 34A52/34B12 reach bounds,
34C04 early nearby-escalator preference, 3507B/35128/34E0E lateral/queue access
costs, actual lobby transfers from 33C1F, and at most one elevator change.
PART 1000 costs at 3E/40 add 16/35 per escalator/stair transition; 3E2A0 adds
30/60 for long initial access. This remains a browser graph adapter: the native
compressed transfer components, retries, actor traversal timing and complete
waiting/choice state machines are not yet exact. Arbitrary-floor/unlimited
BFS transfers have been removed. Existing journeys in older browser saves
continue as saved; newly planned trips follow these constraints.

F02/F03 native eviction calls 29200 -> 2DAF2 -> 2D356 repay condominium sale
as negative category-nine income. Sale values are now recorded, refunded once
on eviction/removal and cleared for resale. Active journey/car/parking references
are cleaned on departure. 204E8's occupied-condo price lock is applied to native
control 13 and the model. Legacy browser saves have no historical sale value;
migration infers their current tier. Native TDT work remains deferred.

100 Node tests pass. The manual checklist supersedes earlier prose about these
particular route/contract gaps; the broader audit above retains source coverage.

## Parallel priority pass: tenancy, medical demand and construction

The next manual pass replaces random office/condo move-in with native applicant
states and posts initial rent/sale when transport is obtained. Daily tick2533
evaluation is separate from quarterly eviction/referral/rent. Each good same-floor
neighbor sponsors at most one bad same-type vacancy. Price and noise adjustments
apply to every residential category, and accepted quarter contracts reset stress.
See `TENANCY_NATIVE.md` for source evidence and the remaining commercial pools.

Actual clinic demand now clears the daily medical availability latch when a
worker cannot find a clinic or its destination disappears; full clinics wait.
Construction latches, weekday evening gates and original warning strings feed
promotion. `MEDICAL_PROGRESSION.md` records unresolved dedicated clinic actors.

Full elevator rings preserve applicants for cohort retries and can select another
lift; express access is exempt from initial lateral stress. Native timed prefix
evacuation remains missing, as detailed in `TRANSPORT_RETRIES.md`.

Stairs overlay rooms and stack through opposite half footprints. Escalators check
native endpoint categories. Stop controls protect waiting floors instead of
blocking every edit while any passenger exists. The bulldozer selects transport
before rooms and follows stair diagonal pixels. `CONSTRUCTION_NATIVE.md` records
source/manual limit discrepancies and pending isolation/capping/tall-lobby work.

The current manual checklist records124 covered,78 partial,86 missing and one
deferred check. This remains an implementation checklist, not a1:1 replay claim.
