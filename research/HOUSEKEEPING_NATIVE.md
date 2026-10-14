# Native housekeeping transitions

Live IDA `0x46719` restricts **idle state0** staff to starting work before
tick1500, unless fire/bomb event bits `word_5A68A&9` are set. Existing travel,
return and cleaning states continue after that deadline.

`0x2A410` scans from the staff's current native floor upward, then below it
downward. Each of six workers owns the residue `(browserFloor+10)%6` matching
its child index. Each floor scans its room table left to right. Only native
hotel states40/48 qualify. A candidate is not reserved during travel; multiple
centers can initially choose the same dirty hotel.

In `0x4680B`, completed arrival before1500 calls `0x2A6F2` immediately. This
changes hotel40/48 to clean24/32 and sets reserved hotel child0 tostate3,
which draws the cleaning silhouette. The worker becomesstate2 with counter3.
Arrival after the deadline resets the worker toidle without cleaning.

State2 `0x46B52` checks its counter before decrement: three cohort passes
change3→2→1→0; the **fourth** calls `0x2A8F2`, which changes reserved child0
to36 (hidden), then resets the worker toidle0. Idle staff remain at that hotel
floor and may select their next job from there. They do not automatically
return to their home center after every cleaned room.

`0x78EF` randomly positions visible reserved hotel child0 inside the room
over `widthCells-1` cells and chooses original type8 poses96..98. Exact
interior overlay renderer packing remains shared renderer integration work.
# Housekeeping transport histories

Live follow-up recovery: `0x46ACC..0x46B00` passes zero for both leading
flags of `0x3E2A0`, plus zero for the final no-route warning flag. `arg_0`
gates stairs/full-ring/no-route stress additions and the same-floor completed
history commit; `arg_2` gates lateral access stress. Therefore housekeeping
service trips do not change the packed history BYTE+9 or WORD+0E, even for
same-floor success or failed transport. Their queues, current floor/access and
timestamp still update. Staff inspector764 also omits the stress controls.

The browser policy `nativeJourneyStressEnabled` disables only housekeeping.
Ordinary actors retain their recovered stress rules; security uses its separate
emergency dispatcher and should not be inferred from the housekeeping flags.
Tower service-travel regression preserves an existing42/2 history across
cleaning and the return journey, using a distant lift to expose accidental
shared lateral/boarding charges.

The native main loop `0xFDF4` replaces ordinary cohort dispatch with emergency
security while event mask9 is set. Elevator advance/unload/boarding at
`0xFE70..0xFED4` still executes afterward. Thus routine actors freeze during
fire/bomb search, while elevator motion continues. Bomb demand does not set
the search flag yet. The browser root integration now follows this ordering.

`0x46ACC..0x46B14` also distinguishes returning staff from idle staff:
native states1/4 continue routing to their home housekeeping floor without
the state0 work deadline. A no-route return sets4; successful home arrival
sets0 (`0x46BA0`). Browser failed clean-return now keeps4 and retries home
on subsequent cohorts even after1500. A Tower test strands a worker before
the cutoff, restores service transport after1600, and verifies home arrival
without changing its packed history. Initial no-route cleaning jobs still
return to idle0, matching the separate job-arrival failure branch.
