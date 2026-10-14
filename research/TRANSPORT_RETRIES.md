# Elevator queue retry recovery

Directly inspected in IDA from the supplied Win16 executable during the parallel manual pass.

- `0x3E2A0` scores/selects access, then checks the selected directional ring at `0x3E440`. A full 40-person ring returns **0**, writes actor access byte `FF`, and adds PART offset2 stress (5). It does not return the no-route value -1.
- `0x42811` maps results0/1/2 to in-transit office states (e.g. arrival96), preserving the trip and accepting the tenancy. `0x42513` branches access bytes below64 back to the transport-choice wrapper; `0x41544` updates one actor cohort modulo16 each tick. The browser now preserves full-ring applicants and chooses access again on that cohort, allowing an alternative lift if available.
- PART offset6 gives no-route stress300. `0x3E572` applies initial lateral stress to non-express elevator access only; express is exempt. Browser retries do not repeat initial lateral stress.
- Tests cover full-ring preservation, next-cohort alternative selection, browser save migration, and route disappearance without leaked riders.

Still partial: the browser route graph adapts native geometry instead of using compressed component masks. Retry walking positions and actor updates are not an original replay match. `0x41D80` checks a **signed, unwrapped** clock difference against PART offset0 (300) for registered waiters. `0x3FC21` removes the FIFO prefix through the timed-out actor, and `0x4204C` records delay/trips then applies purpose-specific recovery: office outings/lunch/clinic fall back to state5; arrivals/departures/returns fail into38; condo failures return to4; hotel purpose branches differ. That group evacuation and its packed accounting have not been ported. There is no basis to claim unlimited native queue waiting.
