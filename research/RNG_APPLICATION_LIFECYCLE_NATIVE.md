# Application random stream: startup, New, Open

Live IDA audit of `SimTowerDOS/SIMTOWER.EXE`, continuing
`RNG_SEED_NATIVE.md`. The CRT seed DWORD at 4F9F0 initially contains 1.
`_rand` 324D uses `state * 015A4E35h + 1`, truncated to 32 bits, and
returns `(state >> 16) & 7FFFh`. `_srand` 3236 has no callers. All seed
references belong to these two CRT routines; ordinary world reset and
native file loading have no independent seed reads or writes.

## Before startup choices

WINMAIN 4A0C3 calls 4A5B2→27255 before entering its 4A256 idle loop.
27255 checks the environment (282E7), creates resources and windows
(274D7, 2777B, 27A7E), displays bitmap 128 and then bitmap 256, initializes
the empty world with 1A3B6→1A60C, and invokes startup dialog 53F0.
Floating windows use style 80800000h and the main window 00FF0000h;
neither includes WS_VISIBLE. The SHOWWINDOW calls occur at 27435..27475,
after New/Open or canceled Open has completed.

No random consumer occurs in these initialization chains. The complete
1A3B6 call graph reaches 46 functions and 1A60C reaches 53 without a
`_rand` caller. Resource cloud initialization B0AD only loads bitmaps
900..903 and marks four slots absent; it does not choose cloud positions.
The hidden aquarium dialog's 8CA2/94EC random consumers are separate
from startup and are not invoked by this chain.

Therefore the browser must not render the world behind startup dialog
10000, its Open chooser, or startup Quit. Doing so creates clouds early
even though the opaque title hides the difference. The main frame now
waits for `started` before world render and idle palette work.

## First New and later New

19BDD calls the save guard, 1A3B6→1A60C, and then F296. This first full
refresh reaches F2B2→B3A3→B5F0→B6A5→B717 and creates missing cloud
slots. B717 consumes shape `%4` first; if the bitmap fits, it also draws
horizontal and vertical offsets. An undersized viewport disables that
slot after only the shape draw.

At the ordinary 791×515 browser reference viewport all four shapes fit:
the first twelve return values are 346, 130, 10982, 1090, 11656, 7117,
17595, 6415, 22948, 31126, 9004, 14558, leaving seed B8DEB185h. The next
return value is 3571. These arithmetic reference values were independently
calculated with full integer multiplication against the live assembly.

New never invokes B0AD or `_srand`. B6A5 retains any cloud fully inside
the current cloud area, including during a forced full refresh. New also
preserves camera offsets. Consequently later New continues the full
32-bit stream and retains existing cloud slots; it must not create a new
seed-1994 or truncated 16-bit stream. Native New also leaves the 24 shaft
records' inactive type bytes intact, so the same application factory carries
those bytes while clearing active world objects.

## Open and browser save adaptation

Native Open 1A177 calls 1A3B6, reads tower records, calls 1A60C, and draws
through F296. Native TDT loading has no reference to the RNG DWORD and
continues the application stream. Drawing an opened occupied tower can
then consume randomness for visible interior poses and clipped clouds.

Native TDT support remains deferred. Browser JSON deliberately serializes
and restores its generator state for reproducible browser saves. This
adapter continues to honor that saved state; a following New inherits its
full 32 bits. Existing explicit Tower seeds, including the manual's 1994
fixtures, remain unchanged. The browser application alone starts at 1.

`newNativeApplicationTower(data, previousTower?)` is the narrow application
factory. It performs no random draws, starts the first application world
at 1, and carries the retiring world's stream and shaft type bytes. The
current Renderer already retains its four cloud slots across `begin`.
Actual random replay still depends on matching viewport, visibility and
GUI redraw order; seed continuity alone does not establish whole-session
replay or claim native-file compatibility.

Validation: `tests/app-random-native.test.mjs` exercises first-refresh
cloud draws, repeated New, full-width state retention, shaft type retention,
JSON Open→New, and explicit fixture-seed independence.

Fresh CUA startup→New verification used a disposable 127-origin tab with
no hidden model evaluation. At the observed horizontal scroll 1104 and
vertical scroll 3481, the first four cloud shapes and screen placements
match the seed-1 reference sequence: sheets 902/902/903/902 at world
positions (1234,-198), (1283,-373), (1194,-463), (1126,-312).
The startup click exercised the intro-sound unlock path; no console
warning/error appeared, without making an audibility claim. Proof images:
`research/screenshots/rng-current-startup.jpg` and
`research/screenshots/rng-current-first-new.jpg`. The focused 26-test
RNG/cloud/manual/shaft set and static build passed.
