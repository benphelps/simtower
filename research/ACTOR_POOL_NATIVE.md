# Native global actor block allocator

Recovered directly with live IDA on `SimTowerDOS/SIMTOWER.EXE`, 2026-10-14.
This pool is separate from the per-floor 150-entry tenant registration table.

## Allocation and timing

- `0x48974` initially allocates 4096 bytes (256 sixteen-byte records). New
  tower reset `0x1A518 → 0x48A06` sets capacity to zero and grows twice, giving
  **512** zeroed records. `0x48BF7` clears every byte/word of each added record.
- `0x48A90` scans from index zero for the first contiguous run with actor
  **type byte +4 == 0**. An occupied record skips the candidate past that
  record. Free holes are reused; it does not append monotonically.
- If `capacity - (base + requestedCount) < 256`, `0x48B86` adds exactly256
  records after selecting the run. The largest native request is240. Normal
  callers preserve sufficient tail space for the next scan. Capacity does not
  shrink on demolition. Out-of-capacity search returns LONG −1.
- `0x47740` stores the LONG base in room record `+0E`, negates room type,
  and calls `0x40E11`. All requested records are occupied during construction:
  home floor+0, tenant index+1, WORD child+2, negative construction type+4.
  Remaining actor fields are cleared. Builders therefore affect subsequent
  resident cohort timing even before any resident moves in.
- Completion `0x38680 → 0x40C2F` clears types and simulation fields of that
  same block, preserving home/child fields. `0x47843 → 0x41090` initializes
  supported occupants at the stored base. Completion does **not** call the
  allocator again. Metadata-only rooms leave the cleared records reusable.
- `0x41544` starts at global index `tick % 16` and advances by16 over the
  global pool. A resident's cohort is `(base + nativeChild) % 16`, not its
  browser identity or visible-actor creation ordinal.
- Demolition `0x417F8` with its destructive flag nonzero clears each active
  actor type+4 and destination+6 (`0x41B70..0x41BC3`), after removing any
  named-person references. Metadata-only types11/13/24 explicitly skip this
  loop (`0x41C0C`), so their obsolete bases must never free a later occupant.

`0x47F0B` sizes: single2; twin/suite/condo3; cathedral8 per floor; commercial48;
party hall40 per floor; cinema56 per floor; bottom metro240; default6.
Hotel `0x412E3` initializes the entire block and puts child0 in state36.
Guests occupy base+1/+2, including the hidden child's offset.

## Multi-storey construction

Live IDA wrapper checks, also independently checked by the progression agent:

- `0x3A8BF` above-ground two-floor construction allocates bottom then top;
  below ground allocates top then bottom. This applies to party29/30,
  cinema18/19 and recycling20/21.
- Cinema `0x2E172` converts the **existing allocated** 18/19 records into
  booths34/35, shrinks each to seven cells, and inserts new auditorium18/19
  records to the right. The inserted records receive metadata/tenant slots
  through `0x47843`, but allocate no extra actor block. Booth initializer
  `0x414A8` normalizes actor type to18. Total cinema pool is112, with the lower
  booth's56 records allocated first above ground.
- Metro `0x3AA29` underground construction allocates31,32,33, consuming
  6+6+240 records. On completion only33 receives an actor initializer
  (`0x4151D`); the first twelve construction records become free.
- Cathedral `0x3AC17` always allocates bottom40,39,38,37,36. All five blocks
  stay occupied after completion; `0x414F6` normalizes actor type to36.
- Medical13, recycling20/21, SECOM17 and other metadata/structural rooms
  allocate default-six construction records but have no completion actor
  initializer; their old stored bases may subsequently point at other tenants.
- `0x3A82C..0x3A863` bypasses `0x47740` entirely for floor0, lobby24,
  parking11 and ramp44. Per-floor registration of lobby/parking consumes no
  global actor records.

## Browser integration

`src/original-actor-pool.js` exports:

- `newActorPool()` initializes the new-tower512-record capacity.
- `reserveRoomActorBlocks(pool, room)` returns `{pool, blocks}` at construction
  start. Store the returned blocks on `room.nativeActorBlocks` and the pool in
  state. Call even for rooms which have no persistent occupants after completion.
- `completeRoomActorBlocks(pool, room.nativeActorBlocks)` keeps bases, converts
  cinema record types, and releases metadata-only construction blocks. For a
  synchronously completed room, reserve then complete in that order.
- `releaseActorBlock(pool, block.owner)` releases on demolition. Release by
  owner, never by a stale metadata room's stored base.
- `nativeActorSlotForResident(room, resident)` returns the global index for
  browser guest/resident indices, including hotel child0 offsets, cinema/party
  halves, bottom metro and cathedral levels. Use this as persistent `actor.slot`
  and in cohort dispatch. `nativeActorCohort(slot,tick)` performs the check.
- `validateActorPool` rejects duplicate owners, overlap and invalid capacity.

Persist the pool and room blocks in browser saves. Existing browser saves
without construction/allocator history cannot recover exact old bases. Their
migration can replay current rooms in build-ID order, reserve/complete each,
but that is explicitly partial: deleted buildings and original completion
order are unavailable. Preserve saved explicit bases in new saves.

The compact pool stores occupied spans instead of all sixteen-byte records.
It preserves the allocation predicate and cohort indices; inactive zero-record
fields and native memory-allocation failure UI are outside this helper.
