# Native traveller geometry and absence of horizontal walking delay

Live IDA `0x3E2A0` calls `0x34BA2` before route selection. That helper resolves
the actor's **home** floor (`0x46FFD`, actorbyte0) and tenant allocation slot
(`0x47034`, actorbyte1), uses the reverse map at `floor+0xA92+slot*2`, and
returns room-record **+6 left edge**. It never reads the actor's visual
interior cell or the center of the room. This home left edge is passed into
`0x34C04` and later lateral-distance penalties, including trips whose current
floor is ground, parking or a visited establishment.

The actor's two overloaded bytes+7/+8 are not persistent horizontal X.
`0x6F4F`/`0x7613`/`0x78EF` write interior cell/pose for rendering. In travel,
`0x3E2A0` overwrites them with current floor/access identifiers. Updating
interior poses therefore must not change route-scoring X.

For elevator access, `0x3E440` selects a shaft stop, checks the40-person
directional ring, and calls `0x3F2A2` immediately. That function appends the
actor pointer to the FIFO, creates the first hall call when necessary, and
updates its count. `0x3E5BD` records the current tick and returns the waiting
code. A full ring returns0 with retry access255 and applies its full-ring
stress. There is no distance-based intermediate walking timer or position.

For stairs/escalators, `0x3E352` immediately registers link usage, charges its
PART stress (and applicable80/125-cell lateral penalty), changes actor floor
by the link span, records its link access, and returns1. The next actor cohort
releases that usage via `0x3F264` and invokes route selection again. Same-floor
arrival `0x3E2D4` calls `0x36B20` and returns3 immediately. No horizontal
walking state appears in these route-attempt or completion branches.

The persistent actor dispatcher `0x41544` advances every16th identity per
native tick. Its office/condo/hotel/commercial handlers interpret route codes
0/1/2/3 and inspect elevator queue/car access. The only transport timers in
these inspected branches are native hall wait, elevator dispatch/motion, link
cohort usage and venue admission/treatment. The browser's `dt*0.8` horizontal
cell walk before registration and after arrival is an invented delay.

Integration: score routes/lateral access from `room.x`; register queue/link or
complete immediately when an actor starts/retries a route; omit the physical
horizontal walk before/after transport. Keep original decorative interior
poses and queue silhouettes. The remaining compressed native component-mask
selection versus browser route graph remains a separate fidelity gap.

Live follow-up `FDF4..FED4` confirms emergency traffic ordering: fire/bomb
switches the ordinary cohort to security staff, but car advance/unload/board
still runs. The port now keeps elevator movement running during the actor
freeze and updates ordinary cohorts before car processing, as the source loop
orders them. An emergency movement regression covers this distinction.
