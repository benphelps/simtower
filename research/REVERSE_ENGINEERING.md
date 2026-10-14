> Current status: [FEATURE_AUDIT.md](FEATURE_AUDIT.md) supersedes the provisional
> boundaries below. The newer pass adds native dialog layouts, finance categories,
> Borland RNG, cinema sessions, stress/tenure rules, recycling/rain/treasure/Santa,
> car movement and complete menu/catalog feature coverage. The full actor and
> disaster models are still pending.

# Binary analysis ledger

## Input

`SimTowerDOS/SIMTOWER.EXE` is a Win16 NE executable, not a DOS game executable.
The NE header is at file offset `0x250`; resource payload alignment is `2^9`
bytes. IDA recognized 1,359 functions. The supplied `START.BAT` starts Setup.
The executable imports USER, GDI, KERNEL, WinG and sound functionality.

IDA's installed decompiler cannot decompile these 16-bit functions. Disassembly
was exported through the IDA API to `research/ida/*.asm`; addresses below are
IDA linear addresses, **not offsets in the executable**.

## Recovered resources

| NE type | Original type name | Use |
| --- | --- | --- |
| 2 | RT_BITMAP | 250 DIB images, original palettes preserved |
| 4 | RT_MENU | `File`, `Options`, `Windows`, `Help` and their commands |
| 32514 | CGPk | Custom strip-ordered indexed graphics |
| 32516 | DTMP | Native pixel-coordinate dialogs and bitmap references |
| 32517 | PART | Shared simulation parameters |
| 32518 | STRL | Big-endian count followed by Pascal strings |
| 32519 | Tabl | Tool index mapping and rating-dependent tool lists |
| 32520 | TabM | Tool group submenus |
| 32521 | TEXT | Original credits |
| 32522 | sound resources | 58 embedded RIFF/WAVE clips |
| 32523 | YEN | Construction prices, rents, and maintenance |

The NE bitmap container behavior is documented in Microsoft's
[Windows 3.1 Programmer's Reference, Volume 4](https://www.bitsavers.org/pdf/microsoft/windows_3.1/Windows_3.1_Programmers_Reference_Volume_4_Resources_1992.pdf).

## Verified routines and data

| IDA address | Identified behavior | Evidence |
| --- | --- | --- |
| `0x3D674` | ReadPascalStringResource | Loads `STRL`, swaps 16-bit count, walks length-prefixed strings |
| `0x2C9FC` | LoadEconomicTables | Loads `YEN` IDs 1000, 1001, 1002 into separate handles |
| `0x2CDC5` | GetConstructionCost | Type-indexed 32-bit table; lobby width charges use type 24 |
| `0x2CFED` | Structural extension cost | Charges only the new left/right extent, at floor or lobby rates |
| `0x2D2BE` | ReceiveRent | Index = room type × 16 + rent tier × 4 |
| `0x2D3E6` | PayMaintenance | Type-indexed 32-bit maintenance table |
| `0x2DDE2` | Cap financial receipts | Caps original internal balance at 99,999,999 |
| `0x29F8D` | GetPopulationRating | Four population cutoffs, then literal 15,000 for Tower rating |
| `0x2F955` | Load PART parameters | Thresholds are big-endian DWORDs at PART offsets 0x42–0x4E |
| `0x29DA8` | Resolve toolbar icon | High byte identifies a TabM group; low byte identifies submenu selection |
| `0x3987D` | Map icon to item | Tabl 1000 maps icon indices to native room/transport types |
| `0x388D0` | Facility dimensions | Explicit native widths and multi-floor RECT heights |
| `0x30F8C` | Draw CGPk 36px strip | Source advances 8 bytes per row, strips occupy 8 × 36 bytes |
| `0x317E9` | Transparent sprite overlay | Original indexed zero pixels leave destination unchanged |

The money multiplier is 100 dollars per YEN unit. This is independently
confirmed by STRL 1009's explicit construction costs: office 400 → $40,000,
condo 800 → $80,000, elevator shaft 2000 → $200,000, and lobby 50 → $5,000.
Rent and maintenance values and the main collection events are recovered
(see the later native-clock pass). Some conditional modifiers remain unverified.

PART 1000 population cutoffs are 300, 1,000, 5,000, and 10,000.
The additional original 15,000 Tower threshold has not been implemented.
The rating prerequisite flags at `0x2A0FE` still need complete semantic mapping.

## Sprite corrections

- Original walkers are **16 × 24**, not 8 × 24. Bitmap 1515 is five stable
  character identities with two frames each. Bitmap 1512 has separate people
  and poses and must not be cycled as a contiguous walking animation.
- Standard car frames are 32 pixels wide in 1065; service cars use 1066;
  express cars are 48 pixels wide in 1067. Empty shaft artwork is 1068.
- Native item 44 (parking ramp) uses `1000 + 44 × 64 = 3816`. Its original
  128-pixel-wide variants are 3816–3818. **3948 depicts fire**, and was an
  incorrect ramp mapping in the first prototype.
- Native lobby type 24 uses CGPk 2536–2538. The resources have 31 frames of
  32 × 36 pixels, stored as vertical 8px strips with NE alignment padding.
- CGPk 2600–2602 and 2664–2666 contain original construction/damage art.
- Office frames are 72px wide, condo 128px, restaurant 192px, shop 96px,
  fast food 128px, and hotel rooms 32/48/80px. These are native widths,
  not arbitrary crops inferred from a whole sheet's dimensions.

## Constraints recovered from STRL 1003

The original explicitly prohibits unsupported widths, overlaps, inappropriate
above/below-ground facilities, construction beyond the lobby width, lobbies
except each 15 floors, multiple metro/SECOM/cathedrals, items below a metro,
cathedrals except floor 100, disconnected parking ramps, and standard elevator
shafts spanning more than 30 floors. See `public/assets/game-data.json` for the
complete original strings; only the implemented subset is covered by tests.

## Reconstruction boundaries

`src/simulation.js` currently chooses its own deterministic schedules,
probabilities, routing and elevator dispatch. These are **not translations of
the entire original simulation**. The native-clock pass below replaces the
initial daily accounting, fixed condo price, long construction delay, and
rating-dependent height limits. Arrivals and several promotion prerequisites
still remain provisional.

All scene images are extracted original pixels; the sky color is sampled from
original image 352 and clouds are original 900–903. Their spatial layout and
layout requires reference comparison; the native-clock pass recovers the
day/night palette windows. CSS recreates native
Windows 3.1 chrome but is not yet a screenshot-verified pixel-identical UI.

## Native clock, economy, construction and elevator pass (2026-10-14)

The following replaces the earlier provisional daily-clock/accounting behavior.
These routines were examined in the supplied IDA database, named there, and
translated into `original-clock.js`, `original-economy.js`, `original-toolbar.js`
and the simulation dispatcher. The `.i64` database includes these names.

| Address | Recovered behavior |
| --- | --- |
| `0x3CEF6` | 2,600-tick daily cycle; midnight counter at 2,300; quarter event at 2,533 when day counter % 3 == 0 |
| `0x3D2ED` | Seven piecewise clock phases; noon gets 800 ticks for one hour; new game tick 2,533 displays 04:59 |
| `0x3D2B8`, `0x263C6` | Two weekdays and one weekend per quarter; four quarters per year; counter wraps at 11,988 |
| `0x3DABA`, `0x4A256` | Normal clock gate uses `GetTickCount >> 4`, six units, nominally 96 ms |
| `0x2D5AE`, `0x293AD` | Quarter-boundary maintenance and office/retail rent |
| `0x2D71E`, `0x2DBAB` | Office and shop rent also post on first move-in |
| `0x2D458`, `0x2D4D4` | Maintenance per elevator car / stair flight; lobby per-width charges with integer truncation |
| `0x2DA4D`, `0x2D914` | Condo sales use the native four price tiers; hotel revenue belongs to checkout |
| `0x323F4`, `0x324A3`, `0x32552` | Commercial closing at 21:00; restaurants at 23:00; receipts use accumulated visits |
| `0x335D1`, `0x2DCD7` | Food/restaurant thresholds 25, 35, 50; original positive/negative receipts; special-day exclusions |
| `0x47740`, `0x3862B`, `0x387F1`, `0x38680` | 12-update construction countdown; ten-entry FIFO; enqueue into a full queue finishes its oldest room |
| `0x29DA8`, `0x29F74` | Five toolbar slots at one star, seven at two, eight thereafter; one-based selection into each TabM submenu; height 61 + ceil(slots/2) * 32 |
| `0x39904` | Create a one-floor shaft and car; click inside an existing matching shaft to add a car; 24 shafts / 8 cars |
| `0x150B9`, `0x15427`, `0x14DE4` | Independently drag top/bottom machinery; change range; standard/service span capped at 30 floors |
| `0x15B36`, `0x15B80` | Express default stops at basement/ground and 15F, 30F, 45F…; above-ground construction begins at a sky lobby |
| `0x390FC`, `0x39904`, `0x11D45` | Capacity field is 21 for standard/service and 42 for express; fullness checks use that field |
| `0x274D7`, `0x3B91B` | 3,000px-wide world, 375 cells; B10; standard construction up to 100F; no prototype rating-dependent height caps |
| `0x388D0`, `0x3A8BF`, `0x3AA29`, `0x3AC17` | Two-floor cinema/party/recycling, three-floor metro, five-floor cathedral; click anchor is the top occupied floor; native type IDs increase downward |
| `0x3BD44` | Security, housekeeping, metro, cathedral and incomplete construction cannot be demolished |
| `0x642B`, `0x5F8B`, `0x5E53` | Sky animation changes only palette entries 188–193 using original CLUT 1000–1003, with native interpolation windows |
| `0x2D71E`, `0x2DA4D`, `0x2D862`, `0x2DBAB`, `0xD55E` | Office six, condo three, hotel one/two/two, retail ten; service buildings and metro/cathedral are excluded from the resident counter |

Source PART addressing is relative to `0x5CFFE`, **not** `0x5D000`.
Restaurant receipts therefore start at PART byte `0x62`; fast food at `0x6A`.
Negative low-traffic receipts are intentional: restaurant -$6,000 and fast food
-$3,000. Cinemas still require their native movie/session model and are not
assigned fabricated daily sales.

Construction updates run every native tick in this port. Further inspection of
`0x4A256` establishes that the original calls `0xFD4B(1)` only when `0x3CEF6`
advances the clock; `0x387F1` is inside that branch. `0xFD4B(0)` updates the
construction preview without advancing the queue. The nominal clock gate and phase
conversion are recovered, but Fast Mode's machine-dependent rate is not.

Saved towers now use version 2 with native tick/calendar state and construction
queue. Version 1 saves migrate their displayed time and existing footprints;
already-built multi-floor prototype rooms remain one floor until rebuilt to
avoid silently overlapping neighboring rooms. New facilities reserve their
native full height. The cathedral top anchor is 104F, placing its base at 100F.

Browser verification: existing autosave opened and migrated; grouped palette
selection worked; lower shaft machinery dragged from B2 to B1 and back to B2;
inspector stops and bounds reflected both changes with no money charge.

### Remaining boundaries after this pass

Arrivals, occupant acceptance, travel schedules, guest stays, visitor totals,
noise/satisfaction, cleaning and passenger dispatch still use reconstructed
behavior. Consequently, receipt **amounts and event timing** are native, while
traffic-dependent profits are not yet a faithful replay. Business populations
remain provisional even though resident capacities and excluded service types
are recovered. Native office/retail tenure modifiers are not yet implemented.

Promotion still lacks the full working-recycling, medical-readiness and VIP
state machines. The original requires built security for the next promotion,
suites for the following one, and weekday/night evaluations at higher ratings;
these mapped parts replace the prototype's occupied-security and 100F gates.

Elevator range changes currently require prebuilt supporting floor extents,
return an error instead of the original cap-and-warning behavior when spanning
more than 30 floors, and refuse shortening across active passenger routes.
Native machinery sprites are used, but the range dropdowns are a browser
convenience, not a recovered original dialog. Weekday/weekend dispatch-program
UI (original bitmaps 400/410/450/460), native car dispatch, and express visual
frame thresholds remain to be translated.

Multi-floor art uses original successive type resources; cinema screen/seat
variants, special construction support, exact side overhang and the complete
metro placement rules still need comparison. Sky/cloud placement, lobby
assembly, window positions/fonts and evaluation overlays also remain to be
matched against a running original. Rain palette data is decoded; rain/event
simulation is not wired in.

The analog info-bar clock also uses its original bitmap 321 and the native hand
formula from `0x3CD97` / `0x26872`: 60 offsets with angle `index * 314 / 3000`,
double intermediates, floor-rounded 15px/9px radii, centered at (15,15). Hands
are rendered as pixel lines over the original face, matching the GDI approach.
