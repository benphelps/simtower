# Native per-floor tenant registrations

Live IDA `0x484E0` scans every room record's `+12` registration byte, marks
its150-element local bitmap, and returns the first free index0..149 or255 if
full. `0x4858B` rebuilds the reverse mapping `floor+0xA92+slot*2 → room index`.
Therefore this tenant actor-pool index survives horizontal room-table movement;
it is neither the left-to-right room number nor a global actor identity.

`0x47843` allocates completed registration slots for native types3..7,
9..15,18/19,24,29/30,33..40. Ground/skylobby type24 has a registration, but
the extra upper tall-lobby strips25/26 do not. Parking11 consumes a slot
despite having no active people pool. Medical13 calls `0x484E0`/`0x4858B`
then `0x2C45F`, registering **clinic patient metadata**: this does not create
six clinic-owned autonomous employees. The fallback6 returned by `0x47F0B`
is an allocation-size default and must not be mistaken for active clinic staff.

Multi-storey browser objects combine native records. Movie theaters register
booth34 and auditorium18 above, booth35 and auditorium19 below. The booths
own the active visitor pools (`0x414A8`); auditorium `+0C` references the
preceding booth metadata. Party halls29/30 each register their40-person pool.
Metro upper31/middle32 do not register, while lower33 registers its240 actors.
Cathedral36..40 each registers eight visitors, totaling40. Recycling20/21
does not retain a completed tenant registration.

`0x47740` temporarily registers construction records before completion; even
types without a completed slot can occupy a temporary slot. The adapter
exposes construction parts and completion reallocation separately. Browser
legacy migration uses saved registrations when present, otherwise build-id
order, reserving lobby registrations first. Native constructor/update ordering
for every simultaneous multi-storey construction remains partial.

`original-tenant-slots.js` exports a pure allocation plan containing per-room
`nativeTenantSlots`, the primary active `nativeTenantIndex`, and floor lobby
slot fields. Shared Tower integration applies it at construction/load. Explicit
duplicate/out-of-range registrations are rejected; demolition leaves surviving
indices intact and the next registration consumes the first free hole.

F18 reconciliation: original clinic count40,16tick treatment, nearby-lobby
selection, missing-demand warning and readiness latch have been translated.
A dedicated six-person **clinic employee** pool is not a native requirement.
Metadata counters and native medical facade/selection behavior can be tracked
separately from autonomous hospital patrons (native type33 is the metro pool).
