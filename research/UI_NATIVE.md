# Native map, finance, and Info Bar evidence

Addresses below are linear addresses in the open Win16 EXE IDA database.

## Map and diagnostics

`0x2BA5C` fills the floor silhouette solid RGB204/204/204. Express shafts
are blue, standard shafts black, and service shafts red, including machinery
storeys and regardless of the shaft's Show option. `0xED00` projects by signed
integer division by fifteen into the original 200×288 site map. Browser
ground surface y=0 corresponds to native y=3960.

`0xC506` / `0xC5B4` invoke `0xC958` for click and continuous held-pointer
navigation. The highlighted rectangle is centered under each pointer location
and clamped wholly within the map; no drag grab-offset is retained.

`0x368D3` maps evaluation to cyan/yellow/red and four eligible price tiers
to red/yellow/green/cyan. Unsupported types use tier four and receive no
pricing overlay. Dirty hotel states at least40 receive red. Map RGB values
are cyan0/255/255, yellow204/204/0, red230/0/0, green0/255/0.
`0x38176` tiles original bitmap1003's 8×36 hatch columns: cyan0, green1,
yellow2, red3. Palette index zero is transparent in these hatches.
These recovered adapters are in `src/original-map.js`.

## Finance

`0xD55E` / `0xD5F8` use ten income and maintenance categories. Composite
cinema floor types19/34/35 map to18; party hall30 maps to29. The numeric
fields in `0xD119` print internal currency integers. The original panel tells
the player to multiply all figures by100; browser dollar counters therefore
need division by100 here. Population and year/quarter fields remain unscaled.
`financeInfo` in `src/original-finance-info.js` provides those fields and rows.
Its caller must supply native population counters; capacity estimates cannot
establish exact population coverage.

## Info Bar

`0x263C6` concatenates original STR713 resources. The English branch prints
`1st WD/1Q/1st Year`, then `2nd WD/1Q/1st Year`, then `WE/1Q/1st Year`.
The weekend prefix is RGB179/0/0, the rest RGB38/38/38. `0x26E31`
selects ordinal suffixes, preserving exceptions11–19. `0x26093` and
`0x262D1` use plain `%ld` formatting: no digit grouping, and no population
suffix. Cash uses the original dollar-prefix string and actual dollars.
`0x25F94` switches five star icons to bitmap327 for the Tower rating6.

`0x2777B` creates original floating clients at desktop coordinates:
Info Bar(204,4),431×49; Map(2,4),200×314; Tool Bar(134,178),63×100.
External border metrics are added independently. Browser scaling and available
desktop dimensions must be handled by the UI caller.

## Facility and person graphs

`0x3738D` insets a graph control by two pixels, then fills the decreasing
width `trunc(innerWidth*(300-stress)/300)`. `0x37472` marks the two current
rating thresholds with vertical lines. `0x3750D` fills increasing commercial
visitors/maximum graphs instead, and `0x21C94` prints the numeric visitor count
inside them. Their colors are pure blue/yellow/red, differing from the map's
diagnostic colors. Palette1515 contains exact values for each graph color.
Facility and person inspection helpers belong to the tenancy workstream in
`src/original-inspection.js` and `src/original-person-info.js`.

## Elevator future preview and live grid

`0x1E0A0` snapshots the selected shaft's0x345A-byte block and the active flags
of other shafts, deactivating all but the selected shaft. `0x1E3B8` performs
twice the current bad-stress threshold iterations of movement, alighting and
boarding. Its global clock increments are subtracted again, while phase and
weekday bytes remain fixed. Actors, businesses and accounting are not stepped.
Original queue ring headers and car positions/load/dispatch are restored;
the overwritten queue entries retain forecast stress. Rendering `0x1710F` /
`0x173D9` takes identities from the snapshot and colors from forecast entries.
The result is static and the clock pauses. `0x1E7B9` preserves program and
Show edits before restoring the snapshot on Resume or OK. Stop/waiting-floor
editing is blocked during preview by `0x13EAE`.

`0x1E299` fills original facility records with pattern3 through `0x30B10`.
This is bitmap1000's fourth8×36 column atx24, not an invented solid background:
`0x31E5C` initializes scratch row17 and `0x38C0A` places bitmap1000 there.
Sky and soil remain outside the facility rectangles. Adapter code is in
`src/original-elevator-preview.js`. Direct `3F412` inspection corrected the
former horizon-saturation approximation. Each popped ring entry is replaced
with signed WORD(raw low10 stress + elapsed), applying tall-lobby forgiveness
to elapsed alone, without a300 cap or actor mutation. `1E3B8` restores ring
headers but leaves the entry DWORDs; an unserved entry still contains its
original actor-pool index. `1710F`/`173D9` interpret that index's signed low
WORD as forecast stress. Regression tests preserve that original behavior,
including clock wrap, timestamp zero, no-car queues and transfer reach.

`0x13914` chooses bitmap20256–20265, loaded through `0x375E5` after adding
20000 to its glyph ID. Current position precedes turnaround, passenger
destination, then assigned directional calls. Waiting floors have separate
black outlines (`0x13CEC`). `0x13494` defines twelve-pixel cells on a13-pixel
grid of fifteen rows. Stop numbers are white on black when enabled; disabled
stops are black on white with a redX from `0x14197`.

`0x16617` renders shaft numbers from graphics type16, whose consecutive
resources2024–2029 contain the original dark/red number pieces. Waiting-floor
numbers use the red half. Express numbers shift eight pixels right. Disabled
body stops show blank panels, separately from the schedule's crossed numbers.

## Pause, scrolling and floating windows

`0xC674` forces the magnifier when pausing. Resume from a diagnostic view
switches back to Edit, which runs again. `0x36570` selects the magnifier for
every view button and runs only Edit. `0xC6E1` ignores toolbar tool selection
while paused; `0xC330` still handles the selected magnifier. The modeless
elevator schedule disables main/floating input windows while clock updates
continue from `0x4A0C3` / `0x4A256`. Ordinary DialogBox windows block that main
idle loop. A browser scroll-capture gate preserves the running/Fast Mode
preferences instead of toggling the pause control itself.

The renderer's `guiCapture` gate preserves palette phase, cloud slots,
interior poses and ceremony updates during actual USER menu/DialogBox loops.
Ordinary pause and the modeless schedule do not freeze those idle effects.
`A1DD` scans visible grid rows top-to-bottom and columns left-to-right;
`AA87` invokes `6BC2` for encountered facility spans. Interior RNG sampling
now follows that visible order and excludes horizontally offscreen rooms.
Regression tests exercise modal capture, same-tick repaint deduplication and
visible-room ordering. Exact dirty-span replay remains a precision limit.

`0x2AA30` scroll messages move sixteen pixels per line, or viewport extent
minus sixteen per page. Thumb tracking is absolute and clamped to the site.
`0x26EF0` and related floating procedures use an eight-pixel caption with a
six-pixel hide box at(4,1). `0xE530` hides floating windows while the main
window is iconic, preserving their individual show flags for restoration.
`0x4A256` does not explicitly stop the clock on iconification/inactivity;
it separately gates background audio. The original RT_ACCELERATOR9/1
contains only F1→Help40021. The invented browser letter shortcuts were removed.
Pure adapters are in `src/original-window-controls.js`.

Held construction also scrolls after successful placements through0xE8A4:
Floor/Lobby/Parking horizontal, ramp/elevator endpoints vertical. It shifts
exactly the pointer's distance beyond the client edge and0xE927 clamps the
result to scrollbar ranges. Floor/Lobby are committed on button-down and
held motion, using0x3B09E's interval spanning original and current selected
rectangles; retracing never shrinks already constructed structure.
`nativeConstructionAutoScroll` and `constructionDragSpan` expose these rules.

## Startup, closing, Help and fonts

`0x53F0` opens original dialog10000: New Tower(id1), Quit(id2), Load Saved
Tower(id3). Its DTMP pixel size is260×118, already decoded in dialogs.json.
`0x5457` returns the selected command directly; no sandbox/demo submenu is
part of this native flow. `0x27255` tries Load on startup and creates an
empty tower if the chooser is cancelled or loading fails. Menu New calls
`0x19BDD` directly after the save guard and initializes an empty tower.

`0x1C5D5` guards New/Open/Close/Quit with ALRT1001 when523B2 is set and the
ground floor record count is nonzero. This is a valid/save-enabled flag,
not a dirty flag: successful saving/loading sets523B2 to1 too. The alert
has flags0x1033, title SimTower, and original text `Save the tower "^0"
before ^1?`, using STRL1001's one-based action labels. Yes saves first and
continues only if saving succeeds; No proceeds; Cancel stops. Named towers
use Save, untitled towers Save As. Native TDT I/O remains deferred; adapting
the browser JSON save flow does not implement the native serializer.

Help menu40021 and the sole F1 accelerator call
WINHELP(main,"SIMTOWER.HLP",HELP_CONTENTS=3,0) at0x2B3A7 (live IDA correction). The40021 branch contains no pause call; it launches the separate help application. No other WinHelp
calls or dialog context IDs were found in the decoded executable.
`src/original-startup.js` provides the command/guard/font adapters.

`0x3DF53` initializes GDI Arial, character pixel height9, DEFAULT_CHARSET1.
`0x3DFEA` clamps requested heights to9 and caches ten font sizes; additional
fonts use OUT_TT_ONLY_PRECIS7 and otherwise zero/default LOGFONT fields.
The floating windows/Info Bar use9px; ordinary dialog paint uses11px, child
controls receive13px in their CTLCOLOR path. Exact glyphs come from the
Windows TrueType font rasterizer. No RT_FONT or RT_FONTDIR resource is
embedded in this executable, so its assets alone cannot supply those glyphs.
Modern Arial CSS approximates the selection but needs original runtime
screenshots or original system-font rasterization for pixel verification.

## Floor and construction artwork

Normal empty Floor construction in0x3B09E passes variant2;0xA388 then draws
record+0B through0x30B10's state*8 source selection. Thus its original8×36
strip is bitmap1000 at sx16. The12-pixel top background above ordinary24px
facility artwork in0x3111C also uses source+16.

Unfinished negative facility types follow a different0xA69C branch: type41,
frame1, then0x3139F.0x38C0A assembles3624/3625 as two328px frames. The native
construction panel is therefore bitmap3625, cropped from sx0 to the current
room width and repeated on each storey. Resource3625 is24pixels high:
38DF6 offsets it down12pixels, and38E76→3C972 tiles original128×12
bitmap5000above it before caching the36pixel construction frame. The browser
now preserves this padding and copies the24pixel panel without vertical
stretching. Cinema's general width WORD is24,
but `388D0` case18 at`38A48` explicitly sets its selected RECT right to248px
(31cells). `3987D` copies that RECT to`56A3E`; `3C7C7` centers it and `390FC`
reserves its full31cells. When construction completes `2E172` splits the
existing31cell record into projection booth34/35(left7) and auditorium18/19
(right24). It does not expand the floor, charge again, or replace neighbours.
The construction pointer therefore centers31cells and returns booth-left.


## Edit view and menus (live audit 2026-10-14)

27BD4 initializes scrollX=(3000-clientWidth)/2 and scrollY=4320-clientHeight-324: original 1:1 Edit pixels and ground at clientHeight-36. New19BDD calls1A3B6 which leaves dword5A674 untouched, then1A60C→E927 clamps it. Open1A82E reads four bytes for the two saved pixel positions. Browser saves now carry editorScroll for the corresponding behavior; legacy JSON keeps its current view. The scene has no zoom command in RT_MENU or sole F1 RT_ACCELERATOR. Removed modern zoom/Home/Eval chrome, added texture menu/previous enhanced-asset preference, and invented global shortcuts. Standard scrollbar arrow/page/thumb controls adapt WM_HSCROLL/WM_VSCROLL (2AA30,16-pixel line,page=extent-16,absolute thumb), with simulation idle gated during capture. Win3.1 nonclient OS scrollbar raster/font pixel matching remains subject to reference screenshot comparison.

Inspection22A40→4071A selects clinic patients by office/condo actor.job matching the clinic, state35, with travel excluded; generic security/HK/clinic templates756/757 contain no state text field5. Transport templates761/762 distinguish express versus standard/service/stairs titles and exact load field6. Car hit rectangle15C37 excludes two horizontal border pixels and uses a five-pixel top inset and31-pixel height; last overlapping car wins. The facility preview249D4 uses whole-percent scaling (including larger ratio when both dimensions shrink), crops the top12-pixel facade header, and paints original indoor sprites. Finance27304 draws raw scaled monetary units, original font anchors, and explicit retained native category counters. Info message posting26A68/26AF3/26B7E/26C0A establishes priorities2/2/0/1 with300units of GetTickCount>>4 expiry and no inherent audio; the actual browser notice integration remains partial.

Native construction39904 allocates the first inactive shaft slot0..23;39D6C allocates the first inactive shared stair/escalator slot0..63. Transport group masks33C1F use physical shaft slots and MSB-first bits; compressed stair-group indices still follow24, not physical link indices. Browser construction/save migration now preserves nativeTransportSlot and reused holes, including sparse component masks and chooser tie order. Car-slot reuse is separately present in39904 but not part of this shaft/link patch.


### Independent desktop window geometry

Full27A7E chain corrects the earlier interpretation of523A0.left/top: those100-pixel values are minimum client extents for2ADA5 WM_GETMINMAXINFO. The Edit main window starts at desktop(204,53); normal outer dimensions are capped at815×575. With classic Win3.1 metrics(frame4,border1,caption18,menu18,scrollbar16), the source maximum/tracking dimensions are839×635 with maximized default position(-4,-4), rather than a full large desktop. Floating Info(204,4), Map(2,4), and Tools(134,178) are independent desktop positions. Browser now implements those placements, native normal/maximize/restore/minimize, title movement, tracking-limited border sizing, and system menu Move/Size/Minimize/Maximize/Restore/Close. Main view resize preserves scroll offsets. E530 hides shown floating windows when main becomes iconic without changing their own show flags;4A256 suspends background sound but continues simulation from the idle branch according to56A38. Minimized application icon is decoded losslessly from original group14/1, RT_ICON3/1 (RT_NAMETABLE15/1 alias TOWER_APPICON); file icon is14/2. tools/decode_icons.py recreates these from group-authoritative byte lengths, retaining the original AND transparency masks. No replacement art is drawn.


### Physical car slots and Remove

399A59 allocates first inactive car record0..7;1079C hall selection andFD4B movement/boarding scan native slot order with strict ties.14AA1 uses15C37's continuous-coordinate, last-overlap car hit: when a car is hit and the shaft has more than one active car,14BE1 calls14C0E to remove only that car. The final car falls through whole-shaft removal.14C0E iterates every served floor15DEA: unload that car's riders at their native destination via3EB23, clear only hall assignments owned by it, deactivate byte2999, and redispatch nonempty waiting rings via103EC. Waiting people's timestamps are retained; car deletion does not flush their queues. Browser now preserves nativeCarSlot on build/load/retraction, reuses physical holes, orders dispatch/draw hits, and reserves eight schedule columns with inactive holes. Tower.removeCar and precise-car bulldozer branching retain surviving shafts/stops and replan riders at the destination while preserving queued wait.27 car/dispatch/preview tests pass; a missing data field on the preview Tower adapter exposed by updated packed boarding was corrected.


Simulate transfer-table correction: live1E0A0 only saves other shaft active bytes, toggles them, and invokes1E3B8; neither wrapper nor warm-up calls33C1F/33872. Original C2 connectivity therefore remains available to345C1 at boarding even while other shafts are inactive. Browser disposable forecast now pins the complete original component snapshot before isolating the selected shaft. A queued office journey2→lobby14→destination20 now boards its selected car and records ordinary projected wait instead of losing the indirect destination and saturating in retry. The live state and ordinary cache invalidation remain independent; the forecast override is a WeakMap entry, excluded from saves.16 focused component/preview/car-slot tests pass.

### USER menu loop and the independent elevator window

RT_MENU4/1 marks only &File/&Options/&Windows/&Help, File &New/&Open/&Save/&Exit, and Help &Contents/&About. Save As and Options/Windows child labels have no explicit access keys. The sole application accelerator is F1. Alt/F10, Alt+Space, arrows, Enter/Escape and ampersand access keys are USER menu behavior (Microsoft's primary reference: https://learn.microsoft.com/en-us/windows/win32/menurc/about-menus). Browser menus now use those actual markers, skip disabled items, pause the idle loop while captured, and consume the outside click that cancels a menu so it cannot construct or remove an item. System menus join the left/right menu-bar traversal.

A full-handler correction matters here:11E50 uses CreateDialogParam with owner0 for400, but ELVDLOGMAIN12478 at WM_INITDIALOG124D6 explicitly calls EnableWindow(FALSE) on main52452, Info52456, Tools52454 and Map52458.12D7F–12DA6 enables all four again. CmdBtnWndProcB8D0–BC44 and C6E1 have no5237C schedule guard; disabling the source windows makes their commands unreachable. Running56A38 is retained and the idle simulation continues, whereas Simulate5A632 pauses it. Therefore modeless400 does not permit scrolling or main menus while it is open. The browser adapts this using a separate modeless #schedule-dialog controller and inert native game windows, with its own movement/system menu, and retains a separate modal host for automatic emergency alerts. Closing during Simulate restores the disposable forecast before enabling inputs. Native Windows dialogs have no invented translucent dimming backdrop. Browser QA verified the nonmodal host, all four disabled windows, Simulate/Resume floor/car gating, own Alt+Space menu and closing restoration;30 focused menu/window/car/preview tests passed.

### Browser Save / Save As adaptation

Live2B13A menu40003 checks523B0; unnamed saves call19F79, and named saves call19EC3.19EC3 additionally sends empty/"untitled" s1 to Save As; otherwise it uses remembered path5167D.19F79 asks for a file using title "Save Tower data file", a128-byte path and15-byte file title buffer, and normalizes the extension to.TDT. Only successful1A2C1 writes both remembered path and title, then sets the main caption to "SimTower - " plus selected file title with its four extension bytes removed.19DDE applies the same file-title caption behavior after successful Open. Native523B0 is reset by New19BDD and enabled by successful loading/saving.1C5D5 Yes returns the save routine's success, so cancelled saving must abort New/Open/Quit.

The browser JSON adaptation now distinguishes first Save from subsequent Save and Save As. First/legacy Save and every Save As request a filename; successful download issuance remembers browserSaveFilename, derives the tower caption from that file stem, and includes both metadata and original editorScroll in JSON. Later Save reuses the selected name. Open uses its selected browser file title rather than an embedded old tower name. Cancelling a filename prompt does not rename or continue a pending destructive command. Browser QA inspected an actual Schedule QA.simtower.json download, verified name/path/scroll metadata and caption, verified a cancelled rename followed by Save without a prompt, and verified cancelling guard-Yes filename selection aborts New. Native TDT encoding, Win16 common-file-dialog layout and overwrite-in-place remain deferred; browser downloads cannot confirm the eventual disk write or overwrite a previous file.

### Immediate held construction/departure popups

Full ELVDLOGMAIN12478 handles WM_LBUTTONDOWN1283A and calls12AB8 for period hotspots23–28. GetAsyncKeyState tests the held primary mouse button and immediately opens custom DialogBox124 at12B1B; there is no delay. When the button is no longer held,12B42 selects the period directly. Tower_for_Windows14221 captures the mouse and clips it to original bitmap405/406 (82×67).14300 positions the popup at the pressed icon's left and top minus currentDeparture*floor(67/3), aligning its current row with the icon.1445D/1459E accepts x0..82/y0..67 inclusively and uses floor(3*y/68), so the hit bands are0..22,23..45,46..67. Hover paints the selected22px strip from406; release commits and selects the clicked period. Outside/right release restores the former departure but still selects that period. Browser replaced the invented250ms/right-click flow with immediate held capture, exact current-row alignment, original hover art and source hit bands; browser drags verified changing to403, retaining it on quick release/outside cancellation, and selecting another period. The original OS ClipCursor constraint itself cannot be imposed through ordinary browser pointer capture.

For grouped construction slots, C6E1/C818→BE03 immediately calls DialogBox124 while the primary button is held. BE77 places a32×(count*32) popup at the original icon's left, top adjusted by(currentChoice-1)*32 and desktop clamping, so the active row overlays that icon. It uses original301 selected artwork, captures the pointer, commits32px-row choices on left release, and cancels on leaving or right down. Cancellation leaves that group's previous choice, but C818 still selects the pressed group's existing construction type through3987D; it does not restore the previously active different tool. Browser now uses this overlay geometry, original hover sheet, capture/release rules and paused-tool gate. Removed invented right-click and Alt+Down construction popup activation. Browser drag selected Service Elevator and outside cancellation retained that group's choice.17 focused popup/menu/window tests passed.

### Source typography and running-reference audit (2026-10-15)

The supplied manual's complete printed9/PDF14 and printed37/PDF42 pages were rendered and visually inspected: these establish the opening desktop layout and15-row elevator-grid design, but scanned/resized grayscale illustrations cannot prove original glyph rasterization. The user-selected live reference https://playclassic.games/games/simulation-dos-games-online/play-simtower-online/play/ was opened in Chrome without resetting its session. It was at original New/Load/Quit; choosing New reached an empty tower. Captured reference startup/desktop/Windows menus show original System bold nonclient/menu text and regular game-drawn Arial fields. The temporary browser viewport override was restored. Original desktop images are captured at /private/tmp/simtower-original-startup-reference.png and /private/tmp/simtower-original-native-desktop-reference.png. Screenshot tooling supplies compressed/resized page imagery, so these are visual references, not proof of byte-identical framebuffer pixels. Native640×480 canvas backing dimensions and rendered rectangles were read as visible DOM; hidden emulator state was not accessed.

Live3DF53 sets Arial, lfWidth0/default, lfHeight-9 and charset1;3DFEA clamps requested character-pixel height to9, caches ten sizes and specifies OUT_TT_ONLY_PRECIS7. Most inspector CTLCOLOR paths select13 (person1FBED, tenant2063F, transport20C70/20FA8, movie23EFF); ordinary resource controls are likewise13 despite RT_DIALOG's10-point Arial declaration. Generic AHOTTADLOGFILTERDA04 explicitly selects14 for event alerts. Schedule146E6/147BC selects16, formats response/wait with%2d, and prints at field left+2/top+3.1374E floor-number paint selects13 below100; it switches to9 for100, with different centering offsets. Info date263C6 selects14; cash26093 and population262D1 select13, and messages261D3 select12. Browser corrected schedule16px numeric fields/leading width/insets, ordinary grid labels13px with100 reduced to9, event-alert controls14px and Info date14px. GDI and browser layout/antialiasing still differ even with the same nominal Arial family/height.

The running reference's Windows menu has no visibility checkmarks.2B307–2B37A confirms40014/15/16 toggle their native show flags and ShowWindow/SetWindowPos, then return without CheckMenuItem. Options uses CheckMenuItem at2B2FF. Removed invented checkmarks from Tool Bar/Info Bar/Map Window while preserving their source toggle behavior.

Read-only runtime inventory found UTM, Parallels and Whisky applications; no usable Win3.1 VM was located in the accessible known default VM directories. UTM's container Documents listing is denied by macOS access controls; no permission expansion/install was attempted. The live reference's observed downloadable game archive is pageAssets kind "other", which the supported bundle capability refuses; no archive, Arial file or emulator binary was extracted/uploaded. User-supplied System font integration is separate, source-aligned for OS chrome; Arial outline/hinting and exact font rasters remain an explicit comparison limit.


### User-requested desktop adaptations and supplied fonts (2026-10-15)

The original4px frame is now explicit black/two-gray/black pixel bands,
with centered caption and black-bordered arrow/system cells, compared directly
with the running original in Chrome. The user's [CodePen reference](https://codepen.io/matthijss/pen/wzYjJQ)
provided a useful visual example of crisp black frame outlines; the recovered
18px caption and menu geometry remains authoritative.

The supplied`vgasys.ttf` identifies its family as System and its face as Bold.
It is packaged locally for captions and menus at16px. The supplied
`microsoftsansserif.ttf` is packaged locally for Help text. Native game
resource dialogs retain their explicitly requested Arial metrics.

At the user's explicit request, browser tracking keeps the source minimum
but removes the839x635 maximum; maximize fills the current browser desktop.
This supersedes the tracking-limited runtime behavior described earlier.
A main-window stacking context contains its menu bar below independent
palettes. Help remains modeless and now supports caption movement and eight
border/corner resizing handles; pointer capture shields its iframe during a
window gesture. Actual browser drags reached1158x889 normal tower size, moved
Help85px/47px and resized it to814x630;1400x1000 maximize and palette hit-testing
passed with no console errors. Proof:`research/screenshots/window-fonts-resize.jpg`.

Direct running-original frame comparison subsequently confirmed centered title
text and four pixel bands (black/two gray/black). Main caption cells now have
black outlines and pixel arrow/system glyphs; the generic browser `ridge`
border is removed from Edit and Help. The original's Windows visibility menu
uses toggle handlers without CheckMenuItem, so invented checkmarks were
removed. Source dialog400 response/departure fields use Arial16 with`%2d`
and(+2,+3)insets; floor labels use Arial13 below100 and9 for100, date14,
and native alerts14. Browser proof:`research/screenshots/win31-window-border.jpg`.

### Native dialog focus, default buttons, and Escape (live IDA, 2026-10-15)

`0x236E9` / `0x23A78` explicitly enable and focus rename edit control 4 (`0x2392A` / `0x23CA5`). The RT_DIALOG default push button is Cancel 2, not Rename. Rename 1 is enabled iff edit text's first byte is nonzero (`0x240A4`); Delete 3 starts disabled for an unnamed person/tenant. `0x23944` reads and stores the untrimmed text, rejects empty, and rejects length >15. The browser now preserves those states, initial focus, default Return action, and spaces in names. Resource WS_TABSTOP and WS_DISABLED flags are honored, and a focused enabled push button becomes the effective default, as in USER dialog navigation.

`COUNTDLOGMAIN 0xCD73` sets focus to its dialog HWND at `0xCF20`. Its `WM_KEYUP` branch at `0xCF44` accepts only Return or Space. It has no Escape/IDCANCEL command branch. Finance's browser bitmap OK region is excluded from the tab sequence; Tab retains dialog focus, Return/Space close on release, and Escape is ignored. Browser verification used the actual public finance/manual fixtures; inspector Escape retained the Office dialog, rename edit4 had focus, Return from edit canceled, and explicit Rename preserved `  Tenant  ` including both spaces. Screenshot: `/private/tmp/simtower-rename-keyboard-qa.jpg`.

USER Escape/WM_CLOSE sends IDCANCEL command 2 rather than automatically ending the modal window. Native person `0x1FAF3`, tenant `0x204E8`, and transport inspectors ignore command 2; the browser now dispatches it and lets each callback decide, preserving these dialogs on Escape. Generic alerts `0xD7DC` handle command 2 even without a visible Cancel button. Their `0xDAD1` affordability branch is covered separately by the alert helper. The error is custom **ALRT 1004**, not STRL 1004: `0x37D07 → 0x3D64E → 0x3D600` loads ALRT, `0x3D748` substitutes it, `0x3D83D` displays MESSAGEBOX. Resource type32513/id1004 payload at506880 contains `Not enough money.` after its four-byte header. Insufficient cash produces this nested message box and then EndDialog1; equality is affordable.

Modeless elevator `0x13119` has no keyboard or WM_COMMAND handler; native RT400 has only scrollbar child7. Its existing HTML bitmap buttons remain keyboard-accessible as a browser adaptation, so native schedule tab focus and keyboard hit buttons are not claimed exact. Native inactive-caption colors remain unverified: a valid inactive reference frame is still needed before matching a specific Windows color scheme.


The user subsequently reported oversized System captions/menu entries. The
supplied face now renders at13px (native GDI16 and this TTF have different
metrics); nowrap/max-content submenu sizing keeps Background on one line.
Actual browser computed font13px and one-line entry verified. This supersedes
the earlier16px supplied-font trial. Proof:`research/screenshots/menu-font-size-fixed.jpg`.

### RT400 native focus, scroll origin, and dense car columns (2026-10-15)

`0x12478` (ELVDLOGMAIN) dispatches messages6/15/25/272/277/512/513/514, without WM_COMMAND or keyboard cases. RT400's only USER child is scrollbar7 (`WS_TABSTOP|SBS_VERT`). `0x125F6..1268F` enables it only if HIGH−LOW>14; disabled short shafts have no tab stop. The browser now excludes all bitmap day/period/response/wait/Show/grid hit buttons from Tab and Return/Space activation. Tab stays at child7 when enabled, otherwise at the modeless window; Return/Escape leave it open. Standard Alt+Space system-menu interaction is retained.

`0x13494` maps native row0 to gridTOP+(14−row)*13. The fifteen-row grid is therefore bottom aligned; short shafts leave unused rows above HIGH. `0x125F6` initializes scroll rangeLOW..HIGH−14 at maximum. In `0x13914` GETSCROLLRANGE arguments are pushed min* then max* in Pascal order (varC=MIN,varE=MAX), so the displayed floor is LOW+(MAX−POS)+row. Initial maximum position shows the LOWEST fifteen floors; Up decrements POS and shows higher floors. WM_VSCROLL line moves are ±1 and page moves ±14 (`0x12F5D..13058`), with range clamping. The browser now uses a separate scrollbar at originalRT400[135,195,16,196], preserves position across day/program edits, and draws the grid in its original[18,195,118,196] region. Original USER scrollbar arrow/track/thumb pixels are CSS representations and are not claimed pixel exact.

`0x1355D` scans physical car slots0..7 but increments display column only for active slots (`0x135B2..13602`). `0x13DFE` similarly increments displayindex only for active cars before calling `0x13CEC`. The native schedule therefore compacts its active visual car columns after removal. Dispatch/boarding/car construction still use stable physical slots and first-free reuse. The browser helper now compacts only schedule columns, preserving actual IDs and physicalslots for car actions. The deleted/reused-car integration test covers both dense visual ordering and stable dispatch slots.

Browser validation opened a real saved30-floor shaft through File/Open and Inspect: focus7, initialPOS15, Up→14, visible top15F→16F, Return/Escape retained editor, Tab retained7, and mouse Weekend edit retainedPOS14. No errors were reported. Proof `/private/tmp/simtower-elevator-scroll-keyboard-qa.jpg`. Two injected-clock alert tests and fifteen dialog/schedule/transport tests pass.

### AHOTTADLOGFILTER timed defaults (2026-10-15)

The generic dialog initializes SETTIMER(hwnd,10,0x93E0,0) unconditionally after formatting its text. WM_TIMER kills the timer, sets511E2=1, then dispatches command2. The timer is 37,856ms of wall-clock time, unaffected by simulation pause or UI activity. Native dispatcher2B41A..2B431 sends dialog3000..4001 through D73B/D7DC; inspectors, Finance, modeless400 and4002 use other procedures. `OriginalAlertTimer` implements this with cancellation on close/replacement and an automatic context for affordability normalization. Fake-clock tests cover the exact boundary, replacement, close and ID applicability without a long sleep. Root's alert-cost helper handles automatic insufficient funds silently as choice1 and manual failure with nestedALRT1004.

### Submenu parent selection (2026-10-15)

The original reference menu shows selected popup parents and selected child rows simultaneously. The browser now retains the blue/white selection on Sound while keyboard focus is on Elevators; moving back to the root menu and then to Fast Mode clears Sound's open state and blue selection. Pointer movement focuses the current enabled item, clearing previous peer focus, and opening a submenu keeps its parent selected. Browser computed styles verified both Sound/Elevators navy and Animation gray, then Sound gray after ArrowLeft/ArrowDown. Screenshot `/private/tmp/simtower-submenu-parent-focus-qa.jpg`. This follows Windows USER menu behavior and the supplied original screenshot; no custom game accelerator is inferred from it.

### Solid construction ghost (2026-10-15)

Live production repaint `0xFD7F` / `0xFF8E` invokes `0x3C5D4`. This is a normal GDI Rectangle with **WHITE_PEN(stock6)** selected at `0x3C69C..3C6A4` and **NULL_BRUSH(stock5)** selected at `0x3C6AD..3C6B5`, enclosed by SaveDC/RestoreDC. Its outline is solid white, one native pixel; the interior is unfilled and placement rejection does not select a different pen. The modern translucent green/red fill and yellow/orange outline were removed. The unused helper at `0x3C6EE` calls two DrawFocusRect operations but has no incoming code references and is not the production construction draw path.

`0x3C63B` copies the selected tool rectangle, offsets it to the snapped construction position, then `0x3C659..3C66C` intersects it with the viewport BEFORE outlining it. Clipped rectangles consequently acquire an outline along the viewport boundary. GDI Rectangle excludes right/bottom edges. `0x3C7C7` offsets non36px selected tool rectangles by12px vertically. The explicit selected heights from `0x38A48..38ADF` are72px for stairs/escalator/cinema/partyhall/recycling,108px for Metro,180px for Cathedral; normal rectangles are36px. Cinema retains its248px/31cell width. `nativeConstructionGhost` implements these heights/offsets, hollow white style, and pre-outline intersection. Invalid plan previews now carry their selected tool key so multi-floor geometry remains available.

`0x3C555` restores the old background from its saved bitmap and clears the previous rectangle before redrawing; construction cancellation is background restoration, not XOR. The browser clears its preview on cancel/tool change and redraws the scene, matching this visible behavior. Its broader dragged-floor/elevator resize preview extent retains the existing adapter geometry; the native selected-tool hover rectangle path is the directly verified source match. Three source-focused tests cover equal valid/invalid style, tall heights/offsets, clipped geometry, empty/canceled rectangles. Browser public construction on a disposable starter fixture showed white top/bottom borders while the interior retained its original colors; Inspect removed the outline without altering the underlying construction. Screenshots `/private/tmp/simtower-native-white-construction-ghost-qa.jpg` and `/private/tmp/simtower-native-construction-ghost-cancel-qa.jpg`. These browser screenshots are JPEG/compressed evidence, not lossless pixel-diff claims.

### Original startup artwork and flat menus (2026-10-15)

Live IDA `27255` calls `4878(0,0x80)`, then replaces the title image with
`4878(0,0x100)` before opening dialog10000 at53F0. `SETUPSTARTUPDLGB`
loads RT_BITMAP256, fills the desktop black, and calls SETDIBITSTODEVICE at
`max(0,(clientWidth-bitmapWidth)/2)`, likewise for y. There is no stretch.
The modeless TOWER_TITLE window remains behind10000, and495D destroys it
before New/Load/Quit. The existing extracted640x480 bitmap is now used in
`#native-startup-splash`; native-sized placement and New's empty tower
transition were browser-verified without console errors. A cancelled/failed
startup file chooser creates an empty tower, matching27419..27422.
Proof: research/screenshots/original-startup-splash.jpg.

User's Win3.1 menu screenshot is the styling reference for flat black1px
borders, gray195 background, blue124 selection, full-width rows, black1px
separators and unembossed disabled gray130 text. Checkmarks and arrows use
pixel masks; a permanent left gutter keeps checked/unchecked text aligned.
Browser checkbox toggling held submenu x377.984375 and width108.9609375
unchanged, with nowrap System13px text. Proof:
research/screenshots/win31-flat-menus.jpg. Exact native GDI text raster and
all per-menu dimensions still require direct comparison.

### Loading splash, intro sound and transition timing

`27255` starts modeless bitmap128 (Maxis Presents), samples3DABA, then
calls27D51 to load/decode resources.3DABA calls GETTICKCOUNT and shifts
right4. After decoding,272B4 compares absolute elapsed units with0xB4:
if less than180 it skips changing the bitmap; otherwise4878 selects256.
This is a2.88-second load-duration check, not a minimum display delay or
sleep. After initialization,27255 requests sound20000 with priority1,
repeat0, then opens dialog10000. The original WAV lasts4.520536 seconds.

The browser follows the user's requested loading transition: bitmap128
covers actual asset loading, then bitmap256 appears with10000 regardless
of modern decode speed. It does not invent a minimum Maxis hold time.
The original20000.wav plays once after loading; a browser autoplay denial
queues one retry on the first pointer/key gesture. Documentation fixtures
skip startup playback. Both title pictures retain native dimensions and
clamped centering on black, without stretching.

### Browser asset preloading progress

Per the user's request, a native-style gray panel and inset white/blue progress
bar now sit beneath the Maxis logo. AssetPreloader registers858 distinct
runtime URLs: manifests/data, original images, native index planes, waifu2x
images, both supplied fonts, cursor/icon assets and all original WAVs. JSON parse/image decode/
font readiness and downloaded sound blobs advance actual completed-file count;
failed files never advance to complete. Shared URLs are requested once.
Preloading uses eight concurrent jobs to keep the browser responsive, then
shows the intro/startup choices. Audio uses the preloaded Blob URLs thereafter.
This progress panel is an explicit browser UI addition, not original artwork.

### Distinct repaint paths and elevator construction controls (2026-10-15)

Correction: `365E2` is the diagnostic redraw path, not Simulate. `F2B2` first checks preview flag5A632 and dispatches `1E1C1`; only otherwise does diagnostic flag56A3A dispatch `365E2`. Its call table is `A1EE→366B5→163BA→1D00E`: ordinary floor facades, diagnostic hatches, shaft art, Find marker. It omits queue/cars/link/fire/security/Santa overlay calls. The browser gates those overlays accordingly. `1D00E` is the Find marker (RT_BITMAP21256), not crane.

Actual Simulate `1E1C1` calls `1E299→163BA→1699C→104B0`: blank facility records, selected shaft, elevator queues, selected cars. It does not call189DA links, event/security overlays, Santa or the Find marker. This supports the existing preview link removal. Structural background is separate: `B3A3→35480` draws edge scaffolding/canopies, with crane at `3562C..35698` via358A8/35998. These remain outside the floor-record rectangles blanked by1E299. No direct crane call in a repaint table does NOT mean the crane disappears. Renderer now composites1069 edge scaffolding, lobby canopies and1002 crane before retainBackground, so Simulate retains them; the old normal-only drawing branch incorrectly removed them. `nativeRedrawPlan` preserves this distinction.

`163BA` draws top machinery atHIGH+1 and bottom atLOW−1 before testing Show for the served body; controls are visible in every tool mode, including Show-off. The cap branch distinguishes only six-cell express vs four-cell standard/service. Service1066 has no machinery frames: its frame4 is the FIRE indicator. Both standard/service cap controls now use1065 frames4/5; express uses1067 frames5/6.

`C330` dispatches extension14DE4 only in Finger mode1, so the matching-elevator construction-tool shortcut was removed. `4A68D..4A6D2` chooses the original1004 Finger cursor when idle; Finger capture4F0D0 selects stock32645 SIZENS while pressed. Endpoint hover alone does not change the cursor. The native construction ghost3C5D4 requires toolmode>=3, so Finger extension has no construction rectangle. Native15057 computes the raw floor as109−trunc((worldY+3960)/36); this assigns exact36px boundaries to the next screen row (y=0 isB1, y=−36 is1F), unlike Math.floor(-worldY/36). New pointer/endpoint/range helpers retain this formula, half-open widths, first physical shaft-slot order and silent drags past the opposite end.

Finger buttondown first invokes148A0 (C40D), which consumes any shown served-floor hit and toggles its stop before extension capture. It consumes protected/no-change hits too. Source double-click is WM_LBUTTONDBLCLK rather than a second WM_LBUTTONDOWN. Browser stop changes therefore use compatibility MouseDown.detail1, avoiding an invented second toggle before dblclick opens the controller. `nativeFingerShaftAt` accepts body or top/bottom machinery for double-click regardless of Show. Root main extension handlers use the source helpers; this agent wired native press/second-click handling in the narrow pointer sections.

Browser proof: diagnostic view omitted cars, queues and link/event overlays while retaining shaft art/background (`/private/tmp/simtower-native-diagnostic-render-qa.jpg`). Actual Simulate retained edge scaffolds/canopies around original white floor tiles, with only the selected shaft/car (`/private/tmp/simtower-native-simulate-render-background-qa.jpg`). Finger idle used1004, the first stop change was retained on double-click (`/private/tmp/simtower-native-finger-double-click-qa.jpg`), and Show-off machinery double-click reopened the modeless controller (`/private/tmp/simtower-native-hidden-cap-double-click-qa.jpg`). Console errors were empty. Pure tests cover pointer boundaries, cap hit order, no-op crossing, Show behavior, machinery resource selection and redraw tables; fourteen cursor/UI/forecast tests pass. Native side-by-side indexed framebuffer comparison remains outstanding; screenshots are compressed browser proof.

### Persistent selection outlines removed (2026-10-15)

The full ordinary `F2B2` branch was rechecked live: `F30F..F389` draws normalfacades, fire/security, shafts, queues, links, active cars, Santa and the explicit Find marker. It has no selected-room/shaft outline call. GDI imports have only two Rectangle references (toolbar/info helper51EF and white constructionghost3C5D4); FrameRect references are GUI buttons and elevator schedule grid; DrawFocusRect references are the toolbar focusCC56 and unreferenced3C6EE helper. Persistent pale-yellow strokes were invented browser overlays and have been removed for both rooms and shafts, including the obsolete index-plane mask hole associated with the room stroke. Main inspection state and all native sprite borders remain untouched. Findbitmap21256 remains explicit1D00E output.

Browser public Inspect opened the Office, OK closed it without a persistent world outline (`/private/tmp/simtower-native-inspection-without-outline-qa.jpg`). Windows→Find Person→Alex→Find still displayed the original red arrow (`/private/tmp/simtower-native-find-arrow-preserved-qa.jpg`). Six existing marker/constructionghost tests pass, renderer syntax passes, console errors were empty. No implementation-mirroring test was added for deleting the two low-impact stroke blocks.
