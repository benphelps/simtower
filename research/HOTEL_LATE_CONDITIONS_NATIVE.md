# Hotel guests after a condition overwrite

Direct IDA inspection of `SIMTOWER.EXE`, 2026-10-15:

- `289E2` writes room byte `+0B = 56/64` into an adjacent hotel even if guests are present. It clears evaluation/acceptance but does not cancel actor states, journeys, parking, or population.
- `47236` restores an arriving/returning guest with an actual `INC BYTE room+0B`; only sleeping16 is specially restored to1/9. `47457` uses `DEC BYTE room+0B`. Neither masks the condition bank or consults a lease Boolean.
- Consequently an occupied infested single can go64→65 on dinner return, then `4733C` sets16 when it sleeps. Waking `4369A` restores its ordinary capacity. Twins/suites can leave64→63→62 with no checkout: `438B5` tests the low three bits **after** decrement and invokes checkout only when they are zero. The persistent population is not repaired to match present guests.
- `43443` (hotel actor32) checks acceptance `+14` and evening timing only. There is no separate dirty/infested facade test at this call site. Normal checkout/dirty evaluation already clears acceptance.
- `43BEB` and `43C65` re-check the facade against24 on successful arrival (including an existing actor96). If the room was spoiled while its applicant was travelling, they invoke `2D862` again. This resets the facade to0/8 and neglect counter to0, adds the guest capacity to population again, and leaves acceptance unchanged. This original population overcount is preserved.
- `2D914` itself unconditionally replaces the room facade with40/48, clears acceptance and neglect, receives the **current** price, and subtracts its guest capacity from population. The native departure caller's low-bit test is the gate; a browser occupancy Boolean must not add a second gate.

The browser validation accepts the ordinary guest ranges, sleeping16, and each condition bank24/32/40/48/56/64 with offsets bounded by the original one/two guest capacity. It continues rejecting unrelated byte/atlas corruption. The INC/DEC helpers preserve BYTE wrapping; arbitrary wrapped atlas corruption is not represented as a supported save state.

`tests/hotels-native.test.mjs` verifies actual Tower infestation→dinner return→sleep→checkout and save/load, late applicant double population, and twin departure62 with no invented receipt. The hotel/people/lease/inspection focused run passes57 tests.

## Waking while another guest is still returning

`4733C` can replace a twin/suite facade with16 when the sole inside guest sleeps while its partner is still travelling in state98. `4369A` subsequently writes the full capacity2 when that sleeper wakes; it does not count the absent partner. The partner's later `47236` INC therefore produces daytime3. The accepted population remains2. This reachable overcount is now accepted by validation and covered by an actual queued-trip Tower save/load regression. The ordinary night bank remains8..10: this wake path does not prove night11, so that unrelated value remains rejected. A single hotel's daytime2 also remains rejected.
