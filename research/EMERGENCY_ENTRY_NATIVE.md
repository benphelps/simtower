# Native emergency entry and retained state

Live IDA e36af917c304,2026-10-15. `17FE0` is called after the fire3010/3011
announcement returns (`1D819→1D8E8`) or after bomb3021/3022 briefing and
`1EBFD(1)` staff reset return (`1983E→19969`). Fire refusal3014 and event
completion call only1EBFD security reset, not another whole-tower entry.
The argument to17FE0 controls its final immediate redraw, not which ordinary
population is evacuated. Existing browser dialog continuations defer this
work until acknowledgment; a saved announcement/briefing has not run it yet.

The complete entry chain is385F6 construction drain,18052 facility records,
2FF10 parking counters,333EE commercial lists,FA79(-1) all24 shafts,
18960 all64 links,182FA all global actor records. The simulation's released
activateEmergency hook now executes this after its native construction drain.
New pure helpers live in original-emergency-entry.js.

## Facility records18052

- Signed active office state<16 becomes0; active condo state<24 becomes0.
  Their ownership/acceptance and population counters are retained.
- Signed active hotel state<24 becomes40. No2D914 checkout receipt,
  population subtraction, neglect reset or acceptance mutation is called.
- Shop metadata−1 remains vacant; other shops and food become closed3 with
  inside BYTE0. Recommendations, generated demand and visitor WORD remain.
- All parking facade bytes become0, including inaccessible frame1. The
  separate cached accessibility and native global actor owner pointer survive.
- Both show allowances and inside BYTE become0, stage0; cumulative admissions
  remain. Metro and cathedral per-floor display state becomes0.
- Clinic13 and service/recycling records have no matching facade case, so
  clinic inside BYTE is retained even if its office patient is evacuated.
- A changed native record receives+13 dirty; no rent/refund/history commit is
  invoked by this scan.

## Counters, transport and actors

2FF10 clears two eleven-LONG arrays: all ten used parking categories and
their total, and all ten limits and their total. The selectable parking
index array is not rebuilt here. Browser load therefore permits all-zero
limits despite existing selectable parking until a native rebuild.300BB at
dawn recalculates limits without replacing a retained emergency-empty facade
with an invented redX. Topology updates still apply308AD's normal redX rule.

333EE clears all seven commercial bands for shop/restaurant/fastfood; it does
not delete metadata, free tombstones or recreate destination lists. They
rebuild only through subsequent native opening/construction calls.

FA79 clears hall assignments and directional ring entries, thenFB32 resets
each car's current/departure/turn position to its configured parking floor,
direction1, zero door/motion timers and no passengers. With argument−1 it
preserves every active native car slot. Its departure mode uses the current
weekday/weekend and clock-phase program.18960 clears both active link counts.
The browser clears its transient journey pool without ordinary interruption,
stress recording, parking-release or destination-departure callbacks.

182FA is an actor reset, not a car routine. Offices become39, condos33,
hotels38. For those residential categories it clears current travel clock and
packed travel/parking WORD+0C, while retaining trip BYTE+9 and accumulated
stress WORD+0E. BYTE+6 survives; its meaning depends on actor state (current
floor or selected service metadata). The browser retains both logical fields.
Food/shop/show/metro/cathedral become39 and clear their histories in the common
tail. Housekeeping becomes0, selected hotel FF/no job, zero cleaning timer
and history. Reserved hotel child0 is also reset38, ending its cleaning
overlay. Security14 is untouched by182FA and remains under separate1EBFD
initialization. No VIP/global progression flags are synthesized in this path.

## Verification

emergency-entry-native.test.mjs covers the complete pure reset table, exact
history retention distinction, retained population/cash/seed, parking pointer
versus display, preserved car slots and program mode. Actual Tower fire/bomb
tests save both pending announcements and activated states, verify no early
reset, retain clinic patients, accept cleared quota/inaccessible-empty saves,
and rebuild parking counters without topology repaint. A live Tower rider
and hall queue disappear at entry with no added stress or release receipts.
Existing event, construction-ring and parking suites cover continuation and
pool behavior alongside these tests. Native video replay remains necessary
to establish the precise visual transition, beyond state and original pixels.
