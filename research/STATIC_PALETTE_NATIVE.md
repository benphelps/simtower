# Gameplay byte palette versus embedded DIB RGB

Source audit in IDA instance `e36af917c304`, supplied `SIMTOWER.EXE`,
2026-10-15. The renderer now implements the source distinction between
software-staged gameplay indices and literal-RGB startup/dialog DIBs.

## Gameplay staging copies bytes

`3D971` locks an RT_BITMAP DIB, advances past its header plus0x400-byte
color table to the pixel payload, and passes source/destination bitmap
headers and pixel pointers to software `49020`. It passes−1 for the copy
mode. `49020` computes DWORD-aligned scan strides and clipped byte addresses
and calls `4A044` for the negative mode. `4A044` copies scanline data with
`REP MOVSW`/`REP MOVSB`; it neither reads RGBQUAD entries nor maps colors.
Thus the source pixel BYTE is the eventual gameplay palette index.

Callers include `B000` (32×3240 background strip), `B0AD` (clouds, city and
Santa atlas), `38C0A` (ordinary gameplay facility/person/car sprites) and
`3C972` (the12px original5000 header). `3CA30` repacks the staged bitmap
into per-cell vertical byte strips consumed by `3111C/3139F/31521/317E9`.
The existing source index-plane export preserves those original bytes.

## Display palette is the supplied CLUT

`642B` decodes custom CLUT32515 resources into the application palette
buffer. Destination indices0..183 use source entryi; at destination184 it
skips one8-byte entry, so184..254 use source entryi+1. RGB values are low
bytes at entry offsets2,4,6. Destination255 is explicitly black. Its
per-entry flags control palette use rather than changing those RGB values.

All static indices are equal in CLUT1000..1003. Differences are limited to
sky188..193 and rain207..218;194..203 have the same base colors in all four.
The effects/rain routines subsequently animate those ranges. Resource DIB
embedded palettes are not a reliable substitute for static gameplay CLUT.

Examples, counted from the actual used pixels:

| Gameplay DIB | Index | Pixels | Embedded RGB | Global CLUT RGB |
| --- | --- | --- | --- | --- |
| Person1514 | 84 | 88 | 51,25,0 | 230,210,207 |
| Person1514 | 110 | 47 | 102,127,102 | 12,25,15 |
| Person1514 | 73 | 49 | 51,38,25 | 0,25,25 |
| Person1514 | 123 | 12 | 127,127,0 | 255,255,102 |
| Cathedral3369 | 80 | 58 | 204,115,102 | 204,116,102 |
| Cathedral3497 | 80 | 47 | 204,115,102 | 204,116,102 |
| Cathedral3560 | 80 | 35 | 204,115,102 | 204,116,102 |

1514 has nine materially different used static indices;3561/3562 also use
the cathedral index80 difference. These are source byte/color differences,
not visual guesses or generated replacement colors.

## Startup and dialog bitmap paths are different

`3D9FD` passes the DIB's own BITMAPINFO and payload to
`SETDIBITSTODEVICE` with ColorUse0. Native startup bitmap paint handlers
`049AC/04B64` use the same API with the embedded color table. Microsoft's
[ColorUsage definition](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-wmf/30403797-a408-40ca-b024-dd8a1acb39be)
defines0 as DIB_RGB_COLORS; its
[SetDIBitsToDevice documentation](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-setdibitstodevice)
explains that this color table holds literal RGB values. These calls do not
justify replacing startup/Maxis/dialog PNG colors with gameplay CLUT values.
Device-level nearest-color/dithering behavior depends on the Windows display
mode and is a separate fidelity question.

## Implementation boundary

Use a renderer-private gameplay cache for Original mode: reconstruct sprite
RGBA from the original index plane and full source CLUT, preserving native
transparency, then apply current animated palette entries. Shared UI assets
and DOM startup/Maxis artwork retain their embedded RGB. Existing waifu2x
static RGB remains the user-requested presentation; its animated signed
detail offsets already follow native palette updates. The choice must not
affect actor state, source draw cadence or the RNG stream.

## Queue tint must identify byte255, not black RGB

`17995→319BF` applies VIP/name/stress ink while drawing queued people.
At31AD8 it compares the source low byte with0xFF, substitutes the chosen
palette index only for that value, preserves destination for source0, and
otherwise copies the original index. The same byte test repeats for the
remaining three bytes of each DWORD. Index1 and index255 both decode as
black RGB in these extracted person sprites; RGB-black replacement therefore
changes extra pixels. Actual source1512 contains60 index1 pixels and136
index255 pixels;1513 contains1 and61 respectively. `Renderer.personInk` now replaces only source byte255, and mirrors the
chosen palette index into the presented index plane. Waifu tint uses the
nearest2× source255 mask with its signed generated detail offset; index1
remains untouched. This adds no animation or RNG.


## Implemented private cache and immediate palette presentation

The index exporter now includes the decoded256-color CLUT1000 and resource
provenance. `Renderer.gameplaySprite` creates a private Original-mode sprite
canvas from those bytes and the current animated palette. Shared `assets`
images are never replaced, preserving literal-RGB startup, Maxis, menus and
dialog artwork. Native map routine `2B880` also stages352 through49020 and
its legends through3D971; the browser map uses the same private cache.
Waifu static RGB remains unchanged as requested.

The index mirror now includes transport, queued people, events and ceremony
sprites, including their actual canvas transforms. The queue plane substitutes
the selected ink index only at source255. Unknown construction-ghost outline
pixels are excluded from palette updates rather than assigned a guessed index.

At post-Info source call1007C, `palettePhase(...,{present:true})` recolors the
already presented canvas using its retained index plane. This calls neither
room rendering nor actor/pose sampling and consumes no RNG. Waifu detail is
captured lazily on the first change and remains stable across saturation and
subsequent color cycles. Resizing invalidates the presented frame until a new
render supplies matching index dimensions.

Focused tests exercise the native reserved CLUT entry, static sprite colors,
shared-UI isolation, exact255 versus equal-RGB1 tinting, actual Tower state/RNG
invariance, resize rejection and saturated Waifu cycles. Browser proof files
`native-full-clut-original.jpg` and `native-full-clut-waifu.jpg` show the actual
VIP fixture; both modes boot all858 assets with no browser errors or warnings.
This source-backed implementation does not claim a native side-by-side pixel
comparison or recreate Windows device-dependent palette dithering.
