# Commercial demand and escalator customer sharing

Direct IDA audit of supplied SIMTOWER.EXE, instance e36af917c304. Native
budget math is isolated in `src/original-demand.js`, called by the existing
commercial opening/feedback helpers. Tests: `tests/demand-native.test.mjs`.

The OCR manual's printed p55 says commercial areas connected by escalators
share customers and revenue. This binary has no separate escalator-neighbour
multiplier, transfer of recommendation buckets, or merged own-customer budget
in its demand/list paths. This conclusion is based on the full following
source branches, rather than adding a speculative proximity bonus:

- `32192` opening calls only `33710` for the day category, `33673` for the
  fixed PART cap, `D497` for its previous generated-population allowance,
  and `334BB` for destination-list registration. It chooses that venue's
  recommendation byte3/4/5 (weekend takes the greater of3/4), caps it by
  category/day, applies minimum10, clears only that bucket and resets that
  venue's generated/inside/visitor counters.
- `33673` caps fast food/restaurant35/50/25 and shop25/30/18. Its only
  environment input is `33710`: rainy-day latch takes precedence, then
  weekday/weekend. It does not read any stairs/escalator metadata.
- `330BC` reads `28B7B`'s own actor mean, applies good/bad thresholds to
  add2/1/0 recommendations to that facility only, and applies the same cap.
  No link or neighbouring-room lookup appears. Negative signed means skip
  recommendations. External office/condo dining does not call this helper.
- `334BB` registers fast food/restaurant/shop indices by `33590`'s lobby
  band. `333BD` derives the visitor's home lobby; `33201` chooses one uniform
  category-list index, with ground-list fallback only when the local list
  is empty. It rejects the selected closed/unleased record once. Link
  adjacency does not change list membership or merge lists.
- `32FF0` spends a venue's own remaining allowance and increments generated
  and visitors; `3307E` restores these on initial route failure. `32C32`
  external admission increments destination visitors and inside only. It
  does not spend the destination's own allowance or charge a source venue.

The implemented customer sharing is therefore actual visitors selecting a
commercial destination through these lists and reaching it through transport.
An available escalator can make that trip possible, contributes PART16 rather
than stair35 stress, and avoids elevator waiting. Destination visitor totals
raise that facility's shop grade/closing receipts. Returning own patrons can
improve that venue's next opening through lower travel stress. This is an
inference about the manual's phrasing from the source paths above; no direct
adjacency bonus is claimed.

Tower regressions verify a two-floor commercial chain becomes accessible
after adding escalators without changing its independent budgets; an office
visitor uses the third escalator, enters the fast-food destination, increments
its visitors without consuming its own allowance or increasing the linked
shop's totals, and crosses a real closing-receipt threshold. The external
visitor adds no recommendations; a returning own patron adds2 only to its
facility. Native destination registry/tombstone lifecycle is owned separately
by `original-commercial-registry.js` and its integration tests. Complete
interactive transport/pixel replay remains distinct from these budget checks.

## Capacity byte edge

`32C32` compares byte9 with40 using signed `JGE` before incrementing the
BYTE. `32E4E` decrements the same BYTE on departure; `32B45` updates facade
state only at exact occupancy thresholds. Dawn opening resets occupancy to0,
so a previous-day patron leaving can underflow to255. This is signed-1 and
admits another visitor, wrapping back to0, rather than treating the venue as
full. Pure regressions cover this valid state,127/128 signed boundary and
16-bit visitor overflow; the registry delegates to the same admission helper.
