# Development and asset recovery

Earlier detailed setup and recovery notes are retained here. See the root README for the current entry points and the manual checklist for current fidelity status.

# SimTower JS

A native JavaScript / Canvas 2D port of the supplied Windows 3.x SimTower
executable. It uses the original pixel artwork and sound resources, with
Windows 3.1 style application chrome. The game defaults to waifu2x upscales of the supplied resources; original
pixels remain selectable.

## Play

Requires Node.js 22 or newer. No npm packages or network assets are required.

```sh
npm run dev
```

Open http://localhost:5173. The Maxis splash shows real asset-loading progress;
the original SimTower intro and opening sound follow when preloading completes. Choose **New Tower** or **Load Saved Tower** in the original startup panel. In a new tower, drag a lobby on the ground floor, build floors
above it, then place rooms. Click to create an elevator; select Finger and drag the original
machinery above/below its shaft to extend it.
Extension creates the structural floors it needs while you drag. Retraction
leaves those floors and their original edge scaffolding in place.

The original two-column palette starts with five buttons, grows to seven at
two stars and eight thereafter. Hold a grouped button to
choose a facility from its original TabM menu, then release to select it. Held
popup coordinates clamp to the popup's edge rows, reproducing the selection
effect of native ClipCursor even though the browser cannot warp the OS pointer.
A right-button press cancels the construction-group choice. Icons use the original sheets.
Click exactly at the existing shaft’s left edge to add a car. Use the lens to inspect facilities,
configure weekday/weekend elevator programs, stops and parking floors, or change rents.
Hold an elevator time-of-day control to select its departure mode; primary
release commits, and right-button release restores the previous mode.
Weekday/weekend response, waiting and departure settings use the native
directional dispatch and are retained in saves.
The Finger controls elevator endpoints/stops; the bulldozer removes facilities.
The modeless Elevator schedule disables input to the ordinary game windows
while its live simulation continues. Its caption is draggable, but RT400 has
no system menu. Close it through its bitmap OK button; Alt+Space/F10 do not
open a menu, and Escape/Alt+F4 do not close it. OK also restores an active
Simulate preview before returning to the tower.

- Use the original scrollbars, map, mouse wheel or right-drag to move the view.
- The time button pauses/resumes; paused construction tools are disabled.
- File > Save downloads browser JSON; File > Open loads it.
- Windows contains map, finance and person/tenant search controls.
  Click occupants in a facility panel to inspect or name them.
- Main menus open on primary press and accept held drag/release selection.
  Release outside ordinary menus cancels without forwarding construction input.
- Bare Alt/F10 activates the main menu on key release. Alt+F/O/W/H opens a
  named menu directly; arrows, Enter and Escape navigate it. Main Alt+Space
  opens the system menu, and Alt+F4 runs the same Exit/save guard as File > Exit.
- Floating Info, Map and Tools windows can be moved or hidden independently.
- Normal speed is the default: one simulation tick about every 96 ms. Options > Fast Mode permits at most one tick per paint with a minimum 16 ms pacing interval; actual acceleration depends on browser and display timing.
- F1 opens the illustrated WinHelp-style manual in a movable, resizable window.
- Tower view sizing is unrestricted above its minimum size; maximize fills the browser desktop.
- Captions and menus use the supplied Windows System font; Help uses Microsoft Sans Serif.

The game autosaves in browser storage. Test fixtures can create sandbox towers
with all tools available. Saves persist simulation state, passengers, elevator cars, and the
random seed. Version 1 browser saves migrate to the native clock automatically.
Original `.TDT` interoperability is a future TODO / nice-to-have. A quarter contains two
weekdays and one weekend; office/retail rent and maintenance post quarterly.
Fast food closes at 21:00, restaurants at 23:00. The native clock slows at lunch
and accelerates overnight.

## Build and verification

```sh
npm test
npm run build
```

`dist/` contains a standalone static app, suitable for any static HTTP server.
Development binds only to localhost. Browser ES modules need HTTP serving;
opening `index.html` through `file://` will not work.

Tests cover original resource values, placement constraints, transport routing,
elevator boarding, occupancy and housekeeping, accounting, deterministic
save/load, malformed saves, long simulations, people animation frames, original
ramp mapping, and tool unlocks.

## Recover assets again

Requires Python 3 and Pillow:

```sh
npm run extract
```

`tools/extract_assets.py` parses the executable's NE resource table. It extracts
250 DIBs losslessly as PNG, 58 RIFF/WAVE clips, and nine custom CGPk graphics
strips. The manifest records original byte offsets, lengths, resource IDs,
dimensions, and the executable SHA-256.

CGPk lobby graphics are indexed pixels arranged in vertical 8 × 36 strips.
They are decoded with the original game palette; no pixels are painted or
generated. Original mode uses atlas cropping, nearest-neighbor scaling,
source indexed transparency masks, and the recovered CLUT palette with its
original sky, rain and machinery animation cycles.

`tools/decode_tables.py` reads the original Pascal strings, big-endian economic
tables, population thresholds, toolbar/submenu tables, business receipts,
lobby maintenance rates, tenant stress, theater audience/receipts, event values,
original credits, and day/sunset/night/rain palettes.
`tools/decode_dialogs.py` decodes all 51 Win16 dialog templates and their DTMP
pixel-coordinate control/bitmap tables into assets/dialogs.json.

## Texture options

Gameplay defaults to the local waifu2x CUnet 2× textures, with denoising disabled.
**Options → Textures** switches between **Upscaled (waifu2x)** and **Original**.
World dimensions, frame coordinates and original transparency masks stay unchanged.
Palette-cycled sky and the minimap retain their indexed original artwork.
The original Windows chrome/fonts and bitmap dialog layouts remain native-sized.

[The texture comparison](http://localhost:5173/assets/upscaled/index.html) shows
original and waifu2x artwork at the same size, including every resource.
Only these two asset sets are retained; the Real-ESRGAN variants were removed.
The waifu2x batch contains259 resources (12.99MiB), generated locally in11.87s.
No assets were uploaded. Its manifest records hashes, dimensions and commands.

Reproduce on macOS with Python3 and Pillow:

```sh
python3 tools/fetch_upscalers.py
python3 tools/upscale_assets.py
```

The downloader pins the official waifu2x universal macOS archive and verifies
SHA-256. Inference requires Metal GPU access. Originals are never overwritten.

## Fidelity status

This is a playable port in progress. The current source-backed checklist is
[MANUAL_COVERAGE.md](MANUAL_COVERAGE.md), generated from
[coverage.json](manual/coverage.json). It tracks55 feature groups and
290 behavioral checks, including original-executable discrepancies with the
manual. The original inventory is retained in coverage-baseline.json.

The port includes persistent office/condo/hotel/business/show/metro actors,
first-fit native actor allocation, signed wrapped journey histories, native
commercial demand and accepted-population counters, housekeeping, clinic
registry/admission/treatment, parking reservation/display rules, VIP progression,
recycling collection, security/fire/bomb events and cathedral worship/ceremony.
All scene art, people poses, facade banks, sounds and palette animation use
extracted original resources.

Transport uses the recovered first-access candidate scans, lobby/stair component
masks, directional FIFO rings and car dispatch. Actors register transport
immediately, reselect at car/link handoff and complete same-floor visits without
an invented horizontal walking delay. Slot reuse, per-handler edge cases and
source replay remain under comparison.

The original startup, growing palette, held construction, elevator programming,
live schedule/static stress preview, inspectors, finance/map windows, names and
Find Person are implemented. Browser help uses the supplied OCR manual; exact
WinHelp rendering, OS file dialogs, original font rasterization and final window
geometry remain adaptations or outstanding comparisons. Native TDT saves are
explicitly deferred.

Run `npm test` and `npm run build` for recovered-rule, lifecycle, save/load and
boundary verification. The current integrated checkpoint passes694 tests; further
source integrations continue to add checks. Tests establish covered behavior,
not an original-executable replay match. Detailed source evidence is kept under
research/, including TRANSPORT_CHOICE_NATIVE.md, ACTOR_POOL_NATIVE.md,
POPULATION_COUNTERS_NATIVE.md and the feature audit.

Original SimTower assets and credits remain those of Yoot Saito, OPeNBooK,
and Maxis. This repository includes the assets supplied for this port.
