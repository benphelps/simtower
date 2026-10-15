# Native person inspector

The inspector uses silhouettes distinct from the reconstructed tower walkers.
`0x2356B` chooses a portrait role from the native facility and actor child
index. `0x23504` assigns an eight-pixel width for categories zero through five
and sixteen pixels for larger categories. `0x2335F` draws that region at
category times eight pixels. `0x285AD` loads bitmap700 normally and stacks
bitmap702 and bitmap703 below it; bitmap701 is not part of this portrait stack.
Named people use the original blue702 art, VIPs the original red703 art.

| Facility | Actor child index | Portrait category |
|---|---|---|
| Office | 0/1 | 1, salesman |
| Office | 2/3 | 0, man |
| Office | 4 | 2, woman |
| Office | 5 | 4, woman |
| Hotel | 2 | 4, woman |
| Hotel | Other guest | 0, man |
| Condo | 2 | 3, child |
| Condo | 0/1 | 0, man |
| Security | All | 5, security |
| Housekeeping | All | 10, housekeeper/janitor |
| Other facilities | Child modulo8 is1/3/5/7 | 2/4/6/8 |
| Other facilities | Other children | 0 |

`0x21DEA` selects the occupation label from the original Pascal string700
table; the native one-based index becomes category plus two in the decoded
JavaScript array. Housekeeping changes from Housekeeper to Janitor at phase
four (tick1600), using `0x3D48E`.

`0x21B91` renders historical mean stress from `0x28B7B`: truncate accumulated
trip stress divided by number of completed trips. `0x21A2D` renders current
stress separately, including elapsed hall waiting. Ground-floor double/triple
lobbies deduct25/50 waiting ticks through `0x36F43` before current stress is
displayed. Both graphs use the current tower rating's good/bad thresholds and
a300-point graph extent. Housekeeping/security do not use tenant stress bars.

The pure adapter is `src/original-person-info.js`. Full actor-role mapping for
the colored tower walkers remains a separate task; changing the inspector
does not replace or invent walking sprites.

The original person dialog selector `0x1FA10` uses763 for tenant/patron
inspectors and764 for security/housekeeping. The shorter staff template has no
Eval or Stress controls. `0x16BBE` directly hit-tests the elevator queues,
checking the up ring on the left and down ring on the right and respecting
the one/two-cell identity widths from `0x17B41`.

## Queued tower sprites

`0x17A33` assigns the native role's ten-cell pose block. `0x1710F` uses pose9
for up queues on the shaft's left (poses8/9 for wide characters); `0x173D9`
uses pose0 for down queues on the right (poses0/1 for wide characters). The
original type8 strip is packed by `0x38C0A`: bitmap1512 is its first60cells,
bitmap1513 the next54cells. These queue drawings do not alternate poses as a
walking gait. `nativeQueuePosition` reproduces the shaft entry offsets and
packs following identities according to their actual widths.

### Queue visibility at floor edges (2026-10-15 follow-up)

Rechecked live IDA `16110`, `1699C`, `1710F`, `173D9`, `17857`,
`17E7B` and `17F01` after finding residents drawn over empty space beside
an edge shaft. Direction remains fixed: up on the left, down on the right.
There is no fallback that moves a ring onto the supported side. `17E7B` and
`17F01` stop rings at structural floor bounds, or split the space between
neighboring shaft **left** coordinates using the native four-cell midpoint
formula (also for express shafts). `16110` sorts shafts horizontally and
includes their end-machinery rows. `17857` rejects empty-grid cells (`F9`),
so unsupported silhouettes disappear without removing their actors from the
simulation or preventing boarding.

The loops check the primary, shaft-facing cell against the ring limit, then
draw each half of a wide portrait separately. Its second cell may cross a
neighbor midpoint, but an absent floor cell still rejects that half. The
renderer now preserves full FIFO portrait widths while cropping the actual
source frame to supported cells, including Original and waifu2x ink paths.
Queue inspection `16BBE` obeys the same ring limits. Find `16AF7` returns
failure for a hidden identity; `1D2D9` then calls `1D189` with native alert1003
(name and current floor), without placing an arrow or reporting Outside.

Regression: `tests/queue-boundaries-native.test.mjs` covers both edge sides,
shaft-only/missing floors, revealing unchanged identities after extension,
partial wide portraits, neighbor limits including machinery/express shafts,
inspection/Find, and real `Tower` FIFO boarding from either unsupported side.

`0x17995` and `0x319BF` recolor original paletteFF pixels only. The supplied
game palette gives pink22(255,127,127) for intermediate stress, red26(255,25,25)
for bad stress, blue45(25,25,255) for named people, and yellow125(255,255,0)
for VIPs; priority is VIP, named, then stress. Good people retain their normal
colors. The VIP's inspector portrait remains red bitmap703, which is distinct
from the queue tint. Other original pixels and transparency must be preserved.
## Admission clocks and same-floor capacity retries

Live IDA `0x32C32` (food/retail) and `0x2C531` (clinic) return2 when their
40-person capacity is full. Each attempt resets actor `+0A` to the current
native tick. Retrying at the same destination goes through `0x3E2A0`:
its same-floor branch `0x3E2EE` calls `0x36B20` before admission. That records
the current stress and increments the byte trip count, even if the establishment
remains full. It clears the low current-stress bits and timestamp, and the
admission attempt then sets the timestamp again. Native retries therefore
record zero-stress completed attempts once the initial travel has been recorded;
they do not accumulate a single growing whole-capacity-wait penalty.

`nativeAdmissionRetryStats` exports these completed-attempt changes, including
the native WORD history/BYTE trip-count wrapping and300 current-stress cap.
`nativeCurrentPersonStress` supports the actor admission clock even while
there is no active journey, with zero as the native sentinel. The inspector
shows elapsed time since the most recent admission attempt. Removed/closed
selected facilities also add PART1000 word4 via `0x36E17` then record `0x36B20`;
the shared dispatcher must supply that original constant when integrating.
