# Native population counter audit

Direct live IDA recovery, 2026-10-14. `0xD497` sign-extends its WORD delta
and adds it to a category LONG and global LONG (`dword_5AB4A`). `0xD453`
subtracts the whole category from the global counter and zeroes that category.
The original does not derive its headline population from current map objects.

`0xD55E` category order: office7, single3, twin4, suite5, shop10, fastfood12,
restaurant6, party29/30, cinema18/19/34/35, condo9. All service, parking, metro
and cathedral types have no population category, regardless of actor pool size.

All twelve `0xD497` call sites were inspected:

| Site | Population event |
| --- | --- |
| 2D78C | Office first accepted contract +6; quarterly rent's flag skips it |
| 2D854 | Office vacancy/eviction −6 |
| 2D906 | Hotel first check-in +1 single/+2 twin or suite |
| 2DA3F | Hotel checkout −1/−2 |
| 2DAD6 | Condo first sale +3 |
| 2DB9D | Condo vacancy −3 |
| 2DC28 | Shop first accepted tenancy **+10**, separately from patron allowance |
| 2E47C | Daily cinema allowance (both halves)/party50 |
| 32301 | Opening commercial category count from previous generated patrons |
| 3288F | New commercial metadata created during live opening window +10 |
| 3C0F2 | Demolition office/hotel: subtract only while native facade is occupied |
| 3C118 | Demolition condo: subtract only while facade<24 |

The shop's additional ten from first admission persist until the next shop
category reset. A room-derived commercial population getter misses them.

Category clear sites: `0x3203F/32047` fastfood12/shop10 at240;
`0x32101` restaurant6 at1600; `0x2E3E5/2E3ED` cinema18/party29 at240.
Each clear precedes repopulating from surviving registered metadata. A removed
business's previous daily population persists until that category reset.
`0x3C074` commercial removal invalidates the metadata slot, without a population
delta. `0x2ED05` removes show records and metadata without a population delta.
New show construction does not add population; first `0x2E3CF` at240 does.

Hotel infestation `0x289E2` changes neighbors' room state/evaluation/acceptance/
changed bytes only. `0x29677` increments neglect and changes its own facade.
Neither alters actor pools or accepted-population counters. Therefore changing
the browser ownership flag to false at infestation must not erase an already
accepted population contribution. Regular checkout remains the population event.
This is particularly relevant to abnormal delayed hotel departures and native
stale counters: the original retains its counter even if infestation makes the
room facade no longer fall in the occupied demolition range.

## Integration hooks

`src/original-population.js` implements native category/delta/clear arithmetic,
event values, reset categories and validation. Suggested state field:
`nativePopulation = newPopulationCounters()`, with headline/population gates
using `nativePopulation.total`.

- First `Tower.admitTenant`: `nativePopulationEvent(room,'admit')` (includes
  office/condo/shop). Quarterly rent never repeats admission.
- First hotel check-in: admission delta; checkout: checkout delta.
- Office/condo `vacateRoom`: vacancy delta (shop vacancy has no immediate delta).
- Demolition/disaster removal: apply remove event before modifying facade.
  Commercial/show removal retains the counter; no recomputation from rooms.
- Commercial construction completion: add new record's initial `population`
  (zero except live-window fastfood/shop bootstrap10).
- Opening12/10/6 categories: clear class once, then add each updated live
  commercial record's `population`. Clear even if no surviving rooms remain.
- Shows at240: clear18 and29 once, then add each prepared room's daily allowance.
- Infestation and ordinary room facade/inside-count transitions: no counter event.
- Save/load: persist and validate counters. Legacy inference helper reproduces
  surviving room contributions but cannot reconstruct removed-business counts
  or prior same-day shop admission bonuses; record this as partial migration.
- Demo setup: initialize/infer its explicitly seeded accepted residents once,
  rather than adding the capacity on every actor synchronization.

Four pure tests cover accepted capacities, shop extra ten, deferred commercial/
show deletion, occupied facade deletion boundaries, signed deltas and invariant
validation. Tower integration tests should cover first shop lease before the
next240 reset, deleting the final commercial room before that reset, and saved
population history across those transitions.
