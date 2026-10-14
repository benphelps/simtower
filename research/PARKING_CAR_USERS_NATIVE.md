# Native car users and admission

Live IDA `0x305F7` returnsfalse belowthree stars. Atthree or more stars,
suite type5 requires parking for every **nonzero** guest child index; the
reserved child0 is not a car user. Both real guest children1/2 therefore need
parking. For office type7, the condition is native floor index plus its
per-floor tenant-pool slot modulo4 equals1, and worker child index equals2.
It uses the `+12` allocation slot, not the horizontal room number.

`0x3022A` calls this selector. False jumps to `0x302CA`, returns0 and does not
allocate parking. Nonselected workers, ordinary hotel guests, condo residents
and commercial patrons do not opportunistically consume spare spaces. True
chooses an available parking slot, checks connectivity and category quota,
registers the persistent actor identity and samples one of13 original car
variants2..14. Original native notices are emitted when the selected car
user cannot obtain a space.

The callers interpret that return differently. Office `0x42811` ignores the
return and proceeds with route selection using `0x30560`, which returns the
parking floor or ground lobby when the actor owns no space. Suite `0x4358E`
explicitly checks `0x305B6` after booking and rejects a suite guest without
parking into state38. Thus an office parking failure does not itself block
commuting; absence of suite parking does block checkin.

Earlier browser behavior allocated cars to every category and inverted the
suite child selector. These observations replace those prototypes, and are
separate from the parking-network and persistent car-rendering translations.
