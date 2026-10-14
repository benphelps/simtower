# Native Find arrow and VIP display audit

Recovered in IDA from supplied SIMTOWER.EXE, e36af917c304.

- `1C6EF` Find control4 resolves the selected named identity through1CB72. It records the identity, wall-clock start and inspection marker flags, closes the Find dialog, pauses through1D7AF and scrolls throughE850. It does not immediately open the person inspection dialog. Selecting outside identities instead uses the native information window and no marker.
- `1CB72` locates people by native state. At-home states point at actual facility center via1D252; food34 uses1D626's selected commercial facility; medical35 uses1D737's selected clinic. Show attendees use1D68B's combined venue footprint center. The browser helper's destination-aware calculation fixes the earlier home-room-X approximation for food/medical visits.
- Queue position is resolved through1D59D→16AF7→176A2/1777D and native identity packing, not the person's initial boarding X. Cars use1D493's shaft center/current floor; stairs use1D565. Browser movement remains mapped through existing transport objects.
- `1D00E` draws original RT_BITMAP0x5308(decimal21256),16×16. Horizontal origin is markerX*8−8, vertical origin is the target's floor row. The browser helper uses the existing renderer's floor-top coordinates; visual comparison remains necessary for subfloor moving-car/stair positions.
- `1CFD0` compares absolute elapsed `GetTickCount>>4` against300 with a strict greater-than test. Arrow expiry is therefore approximately4.8seconds in wall time, independent of simulation speed or pause. Expiry callsC674, clearing the query marker and resuming native simulation. Clicking the selected person can open inspection while the query marker is live;1FA10 sets marker-inspected flag when this is the same identity.

## VIP colors and naming

`48FF2` identifies the active reserved guest. Direct display callers are17857(queue color),2335F(portrait row) and211A8(person information caption), plus VIP lifecycle48EB6/48F15/48F7D. Queue color priority is VIP yellow(palette125), named blue(45), then stress colors. Portraits choose the original yellow row for VIP even when named. These display paths are already implemented by people-sprites/original-person-info.

No direct VIP test was found in main facility artwork drawing A1EE. The manual's phrase that the suite is illuminated yellow therefore needs original-game visual replay before adding a whole-suite recoloring overlay. Keep that checklist behavior partial rather than inventing art.

`48EB6` assigns the originalVIP name by2F3EC. The native20named-person limit still applies: existing names may be replaced, but a new21stname is rejected with strings1005 message6. VIP's active/yellow flag remains independent of successful name assignment. Browser unconditional naming was reported to root for correction.

Tests: markers-native.test.mjs checks actual venue/car destinations, original arrow resource/geometry and quantized expiry. UI wiring, pause/resume and screenshot comparison are owned by root; these pure tests do not establish full visual fidelity.
