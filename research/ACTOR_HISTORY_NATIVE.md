# Packed actor histories and admission retry means

`0x36B20` increments an actor's byte trip count and adds its low10bit
current stress to the accumulated WORD. Both storage fields wrap at their
native width. It clears the timestamp and current low stress, while `0x36EE4`
resets only historical count/sum (not an ongoing trip).

Live IDA `0x28B7B` loads the accumulated WORD intoAX, executesCWD, loads the
trip BYTE intoAL and executesCBW, then signedIDIV. This is signed interpretation
after wrapping, not unsigned JavaScript division. Examples: history1280 with
count128 yields−10; history40000 with count10 yields−2553; history40000 and
count200 yields456. Zero count returnszero. Resident means average these
individual truncated means rather than pooling history/trips.

`0x330BC` explicitly ignores negative person means before adding commercial
recommendations. VIP evaluation `0x48F15` also calls `0x28B7B`. The implementation
therefore preserves signed mean results instead of clamping them tozero.
The rare native signed-IDIV overflow fault is not intentionally emulated.

Capacity waits reuse the latest admission clock. `0x32C32` food/shop and
`0x2C531` clinics reset actor+0A each attempt. Own commercial state96 and
external resident65/66 route another same-floor attempt via `0x3E2A0`:
`0x3E2EE` calls `0x36B20` before retrying admission. They record additional
zero-stress completed attempts, even when the venue staysfull. Selected
closed/removed destinations additionally record a PART missing-service penalty
(zero in this executable) via `0x36E17` then `0x36B20`; an absent destination
that was originally−1 follows the separate outside-service path.

Pure signed means/normalization/validation live in `original-actor-stats.js`.
`nativePersonMean` and commercial feedback use them; shared room/VIP hooks must
use the same interpretation. Own commercial admission retries now record their
completed attempts as external resident retries already do.
# Inspector current stress and admission retry follow-up

Live21A2D inspected2026-10-15: byte5A5A0 is selection context, not time-control speed. Facility grids22561/22A40 set2 (currentgraphzero); car22F89 sets1 (raw actor+C&1023); queue/find16BBE sets0. In context0 a zero actor+A timestamp draws no current value, otherwise signedWORD `tick-timestamp` passes36F43 ground forgiveness, then adds rawlow10 with signedWORD wrap. There is no300 cap in the inspector calculation; the graph itself clips its fill. `nativeCurrentPersonStress` exposes optional context0/1/2 and defaults to car1 for a riding traveller, otherwise0. UI callers must pass2 for a person chosen from a facility grid.

Same-floor admission retry3E2EE→36B20 commits rawlow10 including values above300 after boarding-clock borrow. `nativeAdmissionRetryStats` now preserves those values by default; an explicitly provided missing penalty invokes36E17's300 cap. The distinction is tested at502 raw versus300 after an explicitzero addition.
