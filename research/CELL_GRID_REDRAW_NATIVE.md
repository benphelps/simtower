# Visible indexed cell redraw

Live IDA audit,2026-10-15, `SIMTOWER.EXE`:

- `9D89` binds the visible grid row. The table has103 columns (`0x19C` bytes of4-byte records) and17 visible rows. Every covered cell stores native facility-record index, source column, and redraw BYTE. Empty/uncovered cells receive−7. Covered cells receive7, except while paused (`52410!=0`), when an existing3..6 is preserved.
- `3C3F2` performs facility-record merging/registration then invokes `9D89` only for a currently visible floor. `38680` construction completion independently invokes `9D89` after native registration. These forced row rebuilds can cancel an earlier scaffold transition on that row while unpaused.
- `9D0F` takes a native floor and half-open horizontal range, clips against the visible left/width, and sets grid redraw3 and overlay table7. Its only call sites are `3A880` ordinary floor-record construction and `3B7C2/3B7DB` lobby/floor range changes. In `3A117`, range locals start equal0 and become different only when structural bounds are added; construction inside existing bounds does not receive this effect.
- `A1EE` scans rows top-to-bottom and cells left-to-right. Flags3..6 draw type41/frame0 through `31521`, incrementing the flag only when Pause is clear. Thus four native redraw iterations retain the original destination underneath scaffolding, followed by flag7 rebuilding the actual facade. This is neither a translucent fade nor a four-frame bitmap animation: all four passes use the same original3624 source.
- `31521→317E9` processes two8-bit-index LONGs per scanline. A zero source **index** keeps the old destination index; nonzero source indices replace it exactly. Bitmap3624 is already328×36 and therefore needs a source-index transparency mask across its full height. `38C0A` places36px assets at the row top and skips its header branch; only24px3625 receives the12px5000 header. RGB brightness/alpha interpolation cannot reproduce the source operation.
- Flag7 forces a facility draw. Flag−1 draws when `AA87` reports the record's dirty/interior update; afterward flags become−1 and facility dirty+13 is consumed. Flags0..2 and cells below−1 skip the normal draw path.
- `9D89` source columns retain absolute32-cell floor/lobby phase and its initial misalignment strip. Native type45 SECOM retains absolute four-cell phase; ordinary records use relative source columns. These phase rules already agree with the existing lobby and SECOM helpers.

`src/original-cell-grid.js` supplies binding, clipping, draw transitions and exact indexed-overlay merge. Its seven source-focused tests cover four-pass retention, pause/rebind, offscreen clipping, source-column phases and zero-index preservation. Renderer integration is coordinated separately: this table is GUI viewport state, so no native save format or persistent world countdown should stand in for it.

## Slow-iteration servicing

`A1EE` invokes `380FF` on visible row15 and `FD4B` repeatedly calls the same helper between simulation/render sections. This helper only dispatches USER sound message0x3BD and services WAVMIX16 after a48ms wall-clock gate; it does not animate a palette. Palette effects are the distinct `56CB` calls at `FDE8`, `FE05`, `FFB5`, `1007C`, plus idle `4A30A`. `56CB` checks the actual 16ms wall-clock unit difference against15, animates194..203, optionally advances rain, then records the current wall time. Fast source work reaches at most one palette update; slow work can cross that wall gate at a later call within the same simulation iteration. Progression agent owns palette/render integration and its timing verification.

## Explicit GUI redraws

There are four direct `A1EE` call sites: `F324` in the explicit `F296/F2B2` refresh, `FF07` in successful native-tick `FD4B`, `1FE8E` immediately before the facility inspector's DialogBox, and `36601` in diagnostic redraw `365E2`. Ordinary idle with a failed clock gate invokes `FD4B` with ARG4=0, which commits the retained screen and returns without `A1EE`. Browser repaint count must therefore not drive scaffold progression. Elevator Simulate is the distinct `1E1C1` path: `1E299` blanks floor records, then `163BA/1699C/104B0` draw shafts, queues and selected-shaft cars; it retains background edges, canopies and crane.

Construction's caller `397B9` invokes `356CA`. A changed crane/highest eligible floor returns1, then `397C6` calls `9CE0` to rebind all17 rows BEFORE `F296` draws. This can replace new3..6 flags with7 while unpaused, bypassing the four-pass transition. While paused, row binding retains3..6. Same-highest construction follows `35480` and marks general redraw523B4 without an immediate `A1EE`. The source crane helper returns0 when no crane exists and the newly highest floor remains six cells wide or less; mere highest-number changes are not a sufficient refresh test.

Tower now emits a runtime-only `nativeGridHook({floor,spans})` after row-record mutations. The renderer binds that row before marking any newly added half-open structural spans. Hook tests verify existing-floor office placement, per-floor completion/demolition and shaft extension/retraction. Calls are not stored in Tower JSON: native grid state is tied to a GUI viewport, and an offscreen structural addition must not replay a transition on a later camera visit.

## Browser retained-facade integration

`OriginalFacadeGrid` combines the source row table with the browser's
per-floor/combined room records. It preserves complete cinema booth/main
records and native floor/lobby and SECOM column phases. The browser viewport
may exceed103 columns/17 rows; its grid grows to fit this authorized larger
window rather than clipping the game to Win16's original maximum.

`Renderer.retainFacade` snapshots the facade/background layer before links,
cars and queued people. Pending structural cells restore the prior8×36 cell
and overlay the source3624 column. `tools/extract_scaffold_indices.py` exports
the source DIB indices with source SHA256; asset loading makes **index0**
transparent, preserving all other original ink. Every scaffold stage copies
the same source art. Repainting the browser does not advance its stage: a
native simulation epoch or explicit `refreshNativeGrid` does. Row mutation
alone retains the old cell until that next source draw. A full native9CE0
refresh rebinds before drawing; paused rebinding keeps3..6, unpaused cancels.

AA87/6BC2 precedes the cell flag switch. Sampling can therefore consume the
shared RNG even while scaffold conceals all the room's people. Room dirty
+13 survives if no normal facility cell draws; A933 clears it when any normal
cell draws. Renderer sampling now checks source redraw eligibility first,
retains dirty on entirely scaffold-covered records, and allows explicit
same-tick GUI redraws to repeat a clean16-tick cohort. Cathedral ceremony
uses this same eligibility instead of deduplicating real A1EE calls.

`Renderer.drawNativeGui` performs the synchronous source GUI redraw before
returning to its caller, temporarily releasing browser GUI capture and
restoring every phase flag in a finally block. It skips both56CB and5F8B,
which are absent from these GUI source paths. An inspector redraw retains
cloud slots; a9CE0/F296 full rebind enables the native background/cloud
refresh before facility sampling. A structural callback with `redraw:true`
invokes this immediately so its shared RNG consumption precedes later
simulation work instead of being deferred to requestAnimationFrame.

`facade-grid-native.test.mjs` exercises real Tower construction callbacks,
four native passes, same-tick paused refresh, ordinary row rebind cancellation,
offscreen additions, dirty-byte/RNG replay, unchanged cohort replay, and the
renderer pre-transport retention order. Pure grid tests cover indexed merge.

## Retained palette indices, 2026-10-15

The former retained-RGBA palette identity gap is closed for animated colors.
`extract_native_indices.py` losslessly exports261 native bitmap/CGPk index
planes, including tall-lobby4073/4074 and their verified zero padding. These
are gray encodings of the original byte values, not replacement artwork.
Manifest entries retain binary SHA256, resource offset, dimensions and the
SHA256 of decoded index bytes. `loadAssets` loads these through injectable
decoded-image/JSON loaders and applies source index0 transparency. Missing
future metadata cannot block startup, but is not treated as an indexed asset.

Renderer sprite draws mirror source indices through the whole presented
world frame. Background and pre-transport facade snapshots retain their
respective planes alongside RGBA.
Before a scaffold cell restores an earlier image, the cache recolors188..193,
194..203 and207..218 from those actual indices. Equal RGB values from sky
and either hidden rain bank remain distinguishable. Scaffold index0 copies
neither RGBA nor index bytes; its nonzero ink replaces both. Asset palette
animation now also uses exact index positions rather than guessing from RGB,
including animated indices in non-sky sprites such as rubble4008.

The user subsequently requested waifu2x as the default presentation. Original
mode applies exact native palette colors. Waifu mode retains generated static
RGBA and a signed per-pixel difference from the original source color for
animated pixels. That detail offset follows native palette changes; retained
cells preserve it through scaffold masking so repeated clipped color cycles
do not accumulate drift. Source index identity and alpha use nearest2× native
pixels; `loadTextureAssets` overrides every legacy alpha mask with the current
original mask. This is a presentation adaptation, not a claim that neural
upscaling reproduces the Win16 indexed display.

Index/detail planes are transient renderer state and do not consume the
game RNG or enter Tower saves. Expensive retained-facade detail extraction is limited to active scaffold
transitions. Presented-frame detail is extracted lazily only when a late
palette update changes an already painted Waifu frame.
Tests cover equal-RGB bank identity, zero-index masks, upscaled mask repair,
static-color preservation, saturation-cycle recovery, native/tall resource
coverage, injectable actual loader behavior and retained-cache recoloring.

The static DIB-versus-CLUT audit is now implemented through a private
Original gameplay cache, while shared startup/dialog assets retain their
literal embedded RGB. Queued-person tinting identifies exact source byte255
rather than all black RGB. Post-Info1007C updates the already presented
world frame from its index plane immediately, without a room redraw or RNG.
See `STATIC_PALETTE_NATIVE.md` for source calls, isolation and tests. These
checks do not replace a native side-by-side visual replay.

## Sampling before a retained scaffold draw

`AA87` calls `6BC2` before the cell switch. `6BC2` does not clear facility+13; only the normal-facade branch at `A933` clears it. A record wholly covered by3..6 therefore retains dirty1 and can sample new poses at another actual same-tick GUI refresh, although those poses remain hidden by the scaffold overlay. A mixed record consumes its dirty byte when any visible cell reaches the normal-facade branch. Unchanged animation-cohort records likewise sample on each actual `A1EE` invocation when `(tick+tenantIndex)%16==0`, including an explicit same-tick inspector refresh. Extra browser repaints must be excluded at the source-draw gate, rather than suppressing these legitimate source calls by last-sampled tick alone.

The default pure row capacity remains the native103 cells. The user explicitly requested unrestricted browser window sizing, so `bindNativeGridRow` accepts a larger `capacity` for modern full-screen viewports; rows follow the actual visible browser height in the renderer adapter. This is an authorized display-size adaptation, not a claim that the original table had dynamic capacity.

## Crane refresh integration

Tower build and shaft resize now compare the previous and source-derived current crane placement. After all affected row/span callbacks, a changed placement emits `nativeGridHook({rebind:true,redraw:true})`. Renderer performs the all-row rebind and synchronous explicit GUI draw. This preserves native order: `397B9→356CA→9CE0→F296`. Existing same-highest crane position remains unchanged even if the floor extends left; a narrow new highest floor with no earlier crane does not request a full refresh, while clearing an existing crane does.

Nine cell-grid tests now include actual Tower callback ordering and these crane cases. A grid integration regression checks that this full rebind cancels newly marked3..6 while unpaused, but preserves them while paused. The combined cell-grid/facade-grid/construction-ring/lobby focused run passes28 tests. Indexed retained-canvas palette replay is implemented separately in Renderer; the source hook and palette tests do not imply full pixel comparison is complete.
