# Browser user manual and illustration provenance

Source: supplied 68-page `SimTower_-_Manual_-_PC_OCR.pdf`. Printed page
numbers are five below PDF page numbers. Read-only PDF skill workflow:
all68pages rendered with Poppler and visually inspected as six contact
sheets; extracted text cross-checked against layout, captions and tables.
The source PDF is unchanged. Intermediates are in `tmp/pdfs/manual`.

`research/manual/modern-manual.md` is the authored source. It reorganizes
introduction/tutorial/reference/strategies/simulation/index into10chapters,
53navigation entries and approximately7,500words. OCR artifacts are corrected,
prose is rewritten, and the original appendix's illustrative values are
distinguished from release behavior. `tools/build_manual.py` produces static,
fully readable/printable HTML at `/assets/manual/index.html`. The asset pipeline
copies HTML/CSS/JPEGs automatically. `tools/server.mjs` serves JPEG MIME.

At the user's later request, presentation was restyled from a modern book into
Win3.1 WinHelp: gray beveled frame, navy caption, compact toolbar, white topic
pane, Times body, bold Arial headings and green underlined links. Contents,
Index, full-text Search, Back, History, previous/next and Print are functional.
JS displays one topic; print/no-JS retains the entire book. Mobile layout uses
flex height, so wrapped toolbar buttons do not create a second outer scrollbar.

## Illustrations

All25JPEGs are actual CUA screenshots of the running browser game. None is a
PDF crop, generated picture, redrawn dialog, or replacement texture. Dialog
captures use live DOM bounds; broad scenes include current native-style chrome.
The 2026-10-15 refresh uses the current default waifu2x rendering of extracted
artwork, supplied System/Microsoft Sans Serif fonts, and latest menus/chrome.
Bitmap-backed dialogs and the title screen retain the original resources.
The final refresh also includes native elevator bank spacing and the full-CLUT
renderer. All25 images were recaptured after those changes. Five centered
modal dialogs used full CUA screenshots followed by a documented Pillow crop
because the browser's direct clip path intermittently omitted its modal layer.
Only cropping was applied: no scaling, recoloring, or redrawing of game pixels.
`research/manual/captures.json` records each live URL/fixture/action and crop;
the ordinary scene crop is1020×630, dialog crops follow their actual bounds,
parking is790×248 and startup is648×488 around its original640×480 art.
`src/manual-fixtures.js` builds deterministic documentation states through Tower
and calls actual main dialog handlers. It stages documented room counters and
identities for examples, not an original-binary replay. `?manual-scene` freezes
simulation separately from Pause and disables all local autosave writes. Normal
gameplay is unaffected. Fixtures are not displayed in the published manual.

| Current capture | Original illustration intent / printed pages |
| --- | --- |
| startup.jpg | Original title art and New/Load/Quit opening controls,8-9 |
| tutorial.jpg | First lobby/floors/offices/food/elevator,10-13 |
| desktop.jpg | Edit/Map/Info/Tool windows and developed tower,9,14-15,30 |
| info-bar.jpg | Clock/date/rating/fund/pop fields,9,24,29,33 |
| construction.jpg | Expanded construction tools/scaffolding,43-46 |
| office.jpg | Office preview/evaluation/rent/tenure,3,11-12,39-40,58 |
| condo.jpg | Condo evaluation and occupied price lock,49,60 |
| hotel.jpg | Guest facility preview/inspection,18-20,48-49 |
| food.jpg | Native patronage number/grade/profit,12,55,58-59 |
| cinema.jpg | Playing title/show days/audience/receipts,42,50,60 |
| movie-selection.jpg | New Movie versus Old Classic selection,42 |
| person.jpg | Persistent person's home/destination/history/currentstress,5,17-18,40-41,57 |
| find-person.jpg | Named identity list/tracking,41-42 |
| elevator.jpg | Native day programs/response/departure/stops/waiting grid,15-16,34-37,54 |
| elevator-preview.jpg | Selected shaft Simulate/Resume,38 |
| finance.jpg | Quarterly income/maintenance/construction/balances,13,38-39 |
| evaluation.jpg | Evaluated tower/legend/Map,17,31 |
| pricing.jpg | Four-tier pricing diagnostic,32 |
| hotel-map.jpg | Canonical hotelState dirty/neglected diagnostic,32 |
| parking.jpg | Original ramp and accessible reserved-car frames,50 |
| services.jpg | Station/recycling/parking context,51 |
| vip.jpg | Native VIP arrival alert and selected suite,53 |
| fire.jpg | Native fire/helicopter/exterior response,28-29,53 |
| bomb.jpg | Native demand/pay/search choices,52 |
| cathedral.jpg | Original five-level roof/ceremony artwork,26,52 |

Root captured preview/finance/diagnostic images; progression agent captured the
others. Final hotel/evaluation/food were refreshed after canonical state/numeric
graph fixes. Complete illustrations were reviewed as a contact sheet; emergency,
cathedral, services, diagnostic and patronage captures were inspected at size.
The tenancy agent subsequently refreshed every illustration and added startup
through isolated127.0.0.1 CUA fixtures. The user's open localhost tower/tabs were
preserved. Updated fire/VIP examples acknowledge the original staged dialogs
before proceeding. Contact-sheet proof is
`research/screenshots/manual-current-illustrations-contact.jpg` and menu proof
is `research/screenshots/manual-current-options-menu.jpg`.

## Browser and release adaptations

The manual labels source disagreements for link reach, car capacity, party
hotel-count gate, recycling runtime service gate, Metro passenger destinations,
Tower promotion and the bomb-dialog3o'clock text versus13:00 handler. Fast Mode
describes the user-requested bounded browser pacing, rather than claiming a fixed
native multiplier. The first Save/SaveAs filename workflow and JSON download
behavior are described; native TDT stays deferred.

Live IDA confirms Help command40021 at `2B39B..2B3AC` calls
`WINHELP(main,"SIMTOWER.HLP",3,0)` at `2B3A7`, then returns through2B44D.
There is no explicit pause in that branch. Prior notes'2B3E8 call address was
incorrect (it is another branch's jump). Browser Help opens a modeless local iframe pane outside the main modal
simulation gate. A separate-window prototype returned a window handle in the
in-app browser without exposing a visible registered help surface, so it was
replaced with the reliable local pane. CloseHelp closes that viewer;
standalone ReturnToGame navigates the same tab, avoiding another game copy.
Iframe close messages require the exact frame source and same origin.

Read-only cross-check: original SIMTOWER.HLP decoded in `/tmp` with winhlp0.4.2
to76topics/206keyword entries and zero reported parse errors. Helpdeco export
had browse/keyword reconstruction warnings, so it was not used as final content.
No third-party decoder implementation or dependency is bundled in the port.
Format reference: [WinHLP parser source](https://github.com/bitplane/winhlp),
[Helpdeco source and format documentation](https://github.com/pmachapman/helpdeco).

## Validation

`tests/manual-native.test.mjs` checks search ranking/cross-block terms and complete
published index destinations/unique anchors/all25JPEG files. All11fixtures build
with the actual Tower model. Browser QA verifies WinHelp topic/Contents/search/
index/history/back, responsive navigation and no horizontal overflow. Root's
desktop/mobile proof captures are in `research/screenshots/manual-winhelp-*.jpg`.
The final build includes `/assets/manual` and `src/manual-viewer.js`.


2026-10-15 user font/window update: locally bundled System Bold captions and
Microsoft Sans Serif Help text replace the prior Arial/Times presentation.
The embedded modeless Help pane supports caption drag and all eight resize
edges/corners, with iframe input shielded during capture. Clock/modal behavior,
manual navigation and standalone Print remain unchanged. Browser proof:
`research/screenshots/window-fonts-resize.jpg`.

Supplied System captions now use13px after user sizing feedback; HelpSans body sizes remain unchanged.
