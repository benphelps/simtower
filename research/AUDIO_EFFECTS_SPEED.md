# Audio, Effects and Fast Mode: native source evidence

Direct IDA review of the supplied Win16 executable on2026-10-14. Modules:
`src/original-audio.js`, `src/original-effects.js`, `src/original-speed.js`.
Tests: `tests/audio-speed-native.test.mjs`.

## Audio channels and repeats

`35FF1` allocates two native WAVMIX16 channels. Priority5 takes channel1
unconditionally. Other priorities take the first free channel, otherwise
the first channel with **strictly lower** priority. Equal-priority sounds
do not replace one another. `35BB7` suppresses a blocked request until600
wall-clock units have elapsed since the last accepted sound; units are
GetTickCount>>4, nominally9.6seconds. It then stops both channels and retries.
`35D16` stops and releases a channel; shared WAV handles are retained while
the other channel still uses them.

Priorities0/1 use Elevators/Background options; priorities2..5 use Events.
`2B13A` stops both channels when an enabled category is switched off.
`3637A` plays once for repeat0. `363D2` passes repeat-1 to WAVMIX16, so a
positive repeat count is total plays. The browser mixer uses distinct
audio objects for simultaneous channels and repeats the original WAV.

`D73B` stops all audio and plays its modal cue at priority4. Fire warnings
3010/3011 use10006, bomb demand3020 uses10003, treasure3040 uses10001;
other current native message dialogs use10000. The earlier prototype
always used10000 for fire/bomb warnings and restarted a shared Audio
object when the same sample was requested twice.

The original clock requests5000(dawn) four times,5001(weekend dawn) once,
5003(rain) four times,5005(rain) twice,5002/5004 once; all are priority3.
Cathedral angel10008 is priority4 with five plays. Fire completion's10009
uses the special priority5 channel with ten plays. Metro10010 and Santa
10002 remain priority1, once.

## Facility inspection and viewport ambience

`1FD89` calls `35E51` before showing the tenant dialog. `36110` tests real
activity before returning a facility token: inside office/condo/hotel
counts, active commercial room with inside patrons, occupied parking,
party activity, or an active cinema's film sound9001+index.

`35E7C` maps restaurant to1384/1385; office1448; hotel1577; condo1576 on
one-in-ten otherwise1577; shops/fastfood1385/1640; party2856; parking
1704/1705. All use background priority1. Missing/inactive facilities do
not play a sample. The browser now uses translated native room counters:
office state<8 and low7bits nonzero, condo/hotel state<16 and low7bits nonzero,
party stage>=2, cinema stage3. This preserves audible offices after1600 until
their final worker leaves and suppresses sleeping16 bedrooms. Actor membership
and daylight approximations previously got those boundaries wrong.

`35E01` runs after tick240 and before phase6, outside bomb/fire, on a
one-in-sixteen roll. `36042` samples one of six fixed viewport points:
quarter/mid/three-quarter horizontal positions, at half or three-quarter
viewport depth. It does not select a random room from the entire tower.
`360CB` resolves the visible room under that point. Empty above-ground
space plays Santa10002 when present; otherwise quarterindex2 daytime
10012 or quarterindex3 nighttime10011. Empty basement gives no sample.

## Effects palette

`56CB` runs only with Effects enabled, at least15wall-clock units after
its last update (nominal240ms). It animates palette entries194..203, then
increments the16bit animation counter. This runs independently of the
simulation speed and uses signed16bit arithmetic for its modulo phases.

The original palette entries194..203 were extracted from RT_BITMAP1515
and checked against1065/2280. Each RGB triple is unique in the256-color
palette, so original PNG pixels retain their palette-index identity.
The helper caches those pixel locations once and writes only the precise
native replacement RGB values; alpha and other pixels remain unchanged.
Disabling Effects freezes its current native palette. This implements
the recovered machinery/ventilation cycling without replacement art.

Rain palette entries207..218 (`5B3E`) are now implemented from lossless native
bitmap indices; see `SCENE_RAIN_NATIVE.md`. The native renderer can refresh
effects while simulation time is paused, so this palette clock uses browser
wall time rather than `state.tick`.

An exhaustive IDA data-reference audit of Effects `word5D0B4` gives only five
sites: read `56D3`, initialization `276DB`, and toggle/menu `2B1E4/1EC/208`.
It gates only the `56CB` palette routine. It does not gate room actor poses,
show projection/train/fire animation, cathedral animation or sky updates.
People animation has its independent `word5D0B2` checks at six `6BC2` room
branches; dirty rooms refresh even when People is disabled.

The special condo poses54..56 (`7889`) and night hotel pose95 (`7AE9`)
test **Control modifier** `word52412`, not Effects. Mouse handler `C330`
sets it from `wParam & 8` (`C35E`); construction uses the same bit for the
initial lobby easter egg (`392B3`). Helpers now explicitly use `controlHeld`
for those special poses. The prior renderer incorrectly supplied Effects as
that condition. These poses retain the original graphics and RNG ranges.

Initialization `27646..2764F` seeds the palette gate from current application
uptime, rather than zero; `OriginalEffectsClock` accepts that timestamp. Tower
initialization `1A405` resets only the phase counter, leaving this gate intact.
The helper exposes `resetCounter` for host new/open-tower lifecycle wiring.

## Fast Mode

`3CEF6` gates ordinary updates on six GetTickCount>>4 units. Fast Mode's
flag bypasses this test. `4A256` performs one simulation update per idle
iteration and returns to the Windows message pump; speed depends on the
machine rather than a fixed multiplier.

The browser scheduler preserves normal quantized96ms gating and performs
ungated updates in an8ms work slice in Fast Mode, then returns to the
browser. A512tick per-frame ceiling protects responsiveness even when
tests use a clock that does not advance. This is a host scheduling limit,
not an8x gameplay speed. Normal mode performs at most one native update
per frame, matching the original gate's lack of accumulated catch-up.
Pause/hidden/modal states leave simulation untouched. A step callback can
return false to stop a Fast Mode slice immediately when a native dialog
or other user interaction becomes pending.
