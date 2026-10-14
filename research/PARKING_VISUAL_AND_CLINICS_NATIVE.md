# Parking display slots and clinic metadata facades

Parking draw `0xA67D` directly uses room+0B as its atlas frame:0 is empty
bitmap1704;1 is the red-X inaccessible firstframe of1705;2..14 are the13car
variants in the rest of1705. `0x308AD` sets inaccessible state1 outside the
connected ramp region, including a terminating type0 gap at least4cells wide.
Restoring access changes1 to0. The parking renderer must show the original
red-X frame rather than an apparently usable empty space.

`0x300BB` rebuilds the native available index from all registered parking
records whose state is not1. It includes already drawn car states2..14.
`0x30531` samples from this list; `0x3022A` does not test the existing actor
pointer and overwrites the selected display car. The previous actor retains
its packed parking FLOOR in actor+0C. This explains office/suite category
quotas twice the number of parking records: native capacity is not strict
one-person ownership of each visual spot. `0x30399` erases a car only if its
current display actor pointer matches the departing identity; an earlier
overwritten reservation does not erase a later displayed car. RNG samples
the space before quota checking, and samples the13car styles only on success.

`original-parking-state.js` exports these selection/display/release plans.
Shared integration must separate an actor's retained reservation floor from
the current parking record's displayed owner. The old physical free-slot
filter cannot reproduce native multipliers or source RNG order.

Clinics `0x2C45F` have ten metadata records, not independent staff/patron pools.
`0x2C531` caps admitted state35 patients at40; waiting66 does not increment
metadata. `0x2C6B4` decrements the counter when return travel begins after16
ticks, rather than waiting for the actor to arrive home. `0x2C3BF` rebuilds
the clinic lists and resets their counters at dawn, and restores the daily
medical-ready latch. `0x2C8BC` clears that latch only on a missing/removed
clinic demand.

Live draw branch `0xA63C` chooses busyframe0 whenever its clinic metadata
patient-count is nonzero, otherwise daytime idleframe1/night idleframe2.
These are individual original bitmap1832/1833/1834, each208x24.
`original-clinics.js` supplies patient counting/admission and exact facade
selection without adding fabricated six-person clinic employee identities.
# Parking demolition and retained floor reservations

Additional direct IDA recovery: `0x3C16B..0x3C188` marks parking metadata's
tenant-registration byte+1 asFF when a space is removed. `0x417F8` type11
skips resident cleanup entirely. No actor reservation or category quota is
released by deleting the display. `0x3022A` stores `(10-nativeFloor)<<10`
in actor+0C, equivalent to basement depth in its upper six bits. `0x305B6`
tests those bits without referring to a parking metadata/display record.

Normal `0x30399` release first decrements the actor's home-room category
quota, then masks actor+0C with03FF to clear the reserved floor. Only afterward
does it look for a surviving display whose current owner pointer matches the
actor. Missing/invalid display metadata therefore does not block eventual
quota release. It also does not immediately fail an active VIP: native parking
space removal has no `0x48F7D` call.

The browser detaches the deleted display ID (`actor.parking=null`) while
retaining `actor.parkingFloor`. `hasParkingReservation` drives booking/quota,
suite arrival and VIP eligibility. Room deletion/disaster destruction preserve
foreign parking reservations; own-room demolition still releases residents.
Browser saves support a retained floor with no display ID, validate an existing
display ID's floor, and migrate older live display references to a floor.
`tests/parking-state-native.test.mjs` covers two overwritten reservations,
removal, retained VIP, quota rejection, save/load and later normal release.

# Explicit parking category quotas

Live source `0x2FF3F` compares the home-room income category's used LONG to
its limit LONG, then increments both the used category and global used LONG.
`0x2FFB9` decrements both without a lower clamp. `0x30399` invokes this
decrement only if `0x305B6` sees nonzero actor+0D bitsFC, the six-bit reserved
basement depth, then clears those bits before looking for a visible car owner.

`0x2FFE9` recomputes limits from the connected selectable index count:
office2×, single1×, twin1×, suite2×, shop/fastfood/restaurant/party/cinema1×.
The condo limit index9 is not written; it stays at its startup zero. The
routine sums the ten limits for global capacity and never resets used counts.
`0x300BB` at dawn calls `0x30684`, which clears only the512-entry selectable
index array and count, rebuilds it, and recomputes limits. Used claims survive
all dawn, ramp connection and physical display changes until normal release.

This becomes observable with the original signed boarding-clock arithmetic:
a negative wait added into actor+0C can borrow from reserved-depth bits,
clearing a reservation without decrementing used quota, or create nonzero
depth bits on an unparked actor. Later30399 can therefore leave an old claim
behind or produce a negative used counter. Neither the native decrement nor
its global total clamps this case. A browser count derived from live actors
cannot reproduce the source: separate saved used/category LONGs are necessary.

`src/original-parking-quotas.js` implements the explicit counters, limits,
claim/release, recompute, validation and legacy inference. Its tests verify
independent categories, two office/suite claims per physical display, preserved
claims after dawn/limit changes, and signed negative releases. Legacy inference
cannot recover claims whose packed reservation has already been lost.

Refresh xrefs were inspected directly: `0x300BB` is called at dawn
`0x3D01F`, and from `0x306C5`'s final call at`0x308A1`. The ramp/topology
routine `0x306C5` is called only after parking/ramp construction (`0x3A894`)
and demolition (`0x3C24E`). Ordinary room/floor edits do not recompute the
parking accessibility byte. Dawn rebuilds indices from the existing byte and
does not itself rerun topology. Native metadata slots are first-free reused;
the selectable list is scanned in that slot order, so a new space replacing
slot0 can be sampled before older higher-slot spaces.

Tower now saves each space's `nativeParkingSlot`/`parkingAccessible`, the
`nativeParkingAvailable` list and `nativeParkingQuotas`. Build/remove parking
or ramp refreshes topology then indices/limits; dawn refreshes indices/limits
only. Book attempts clear reserved-depth bits first (3022A), claim a new used
counter only on success, and do not invent an idempotence guard. Normal actor
states prevent duplicate arrival calls. Release with zero reserved bits exits
without clearing the old visible car or decrementing quota. With nonzero bits,
release decrements quota and clears the first matching live visible pointer,
regardless of whether its floor matches the borrowed packed floor.

Tower tests cover actual packed helper underflow clearing B1 to0, borrowed
depth63 on an unparked actor, stale accessibility after ordinary restaurant
construction bridging an empty gap, metadata slot reuse, quota persistence
through dawn/save and strict malformed state rejection.

# Parking global actor pointers and facade-byte follow-up

Live302E0 stores the actor's global DWORD pool index in parking metadata+2. 30399 compares this index, so a car left after a lost packed floor can remain when its home is removed and later alias a different person allocated at the same native slot. `parkingActorSlot` now preserves the canonical pointer independently of the browser UI identity. Freed-slot pointers are valid; allocation capacity never shrinks. Save validation checks the slot against that capacity without requiring a currently active person.

Native308AD overwrites parking facade+0B with1 when inaccessible. Reconnection changes only1→0, preserving the metadata owner pointer but losing the original car frame. The browser now stores `nativeParkingFrame`0..14 rather than reconstructing a car from ownership after reconnecting. 30399 clears an ordinary car frame to0 but explicitly preserves an inaccessible frame1. Tower tests cover retained owner/reconnected-empty art, release while inaccessible, and freed global-slot alias release.
