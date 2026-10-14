# Native DialogBox tick continuations

Live IDA,2026-10-15. `3CEF6` advances the clock and performs calendar actions first. At240 (`3D090`) commercial opening and theater preparation precede scheduled fire/bomb prompts. `FDCA` subsequently calls construction, promotion, emergency197D0, ordinary/emergency actors, then per-shaft all car motion followed by unloading/boarding. DialogBox calls are synchronous; clock, actors, cars and later calls do not advance while the dialog is open.

Emergency return points recovered directly:

- `1D8B3/1D8CA`: fire3011/3010 announcement returns **before** flag8, start tick, frontiers, helicopter reset and focus are initialized at1D8E8.
- `1990A`: bomb3020 returns before pay/refusal branching. Refusal3021/3022 at1993F returns before mask1/security activation at19969.
- `1D939`: rescue3012 returns before hire/refusal branching. Refusal3014 returns before the security reset with mask8.
- `19A24`: bomb3023/3024 returns before staff reset and the unconditional clock jump1500. Mask1 is cleared before the result prompt.
- `1DA91`: fire clears mask8 before3013; afterward it clears fire frontiers, resets security, and raises the clock to1500 only if earlier.

`original-events.js` retains its synchronous pure helper behavior for simple source tests. Tower supplies `deferDialogs`, recording a serializable `emergencyContinuation` instead of executing work after the dialog early. Saved announcement/briefing/result states cannot load without their matching pending prompt. `tickContinuation` preserves calendar/construction/promotion/emergency/cohort/car phase; acknowledgment resumes the same tick without another clock increment or replay of completed calendar work. Promotion now runs at its source position before emergency/actors/cars.

Actual Tower tests cover demand→briefing blocking both staff and cars, payment resuming ordinary actors at240, rescue→refusal blocking damage/staff, bomb/fire result clock changes after acknowledgment, menu rescue freezing without an unfinished tick, and atomic continuation save validation. Long-running headless tests acknowledge each original prompt explicitly.

## VIP call stacks and interrupted teardown

`48E00` reserves identity before3000, whose caller43883 subsequently releases parking. `48EB6` displays3001 before2F3EC names the actor; caller439EA then starts hotel arrival routing. It does not reset trip/delay history between ordinary stays. `48F15` writes the pass flag before3002/3003, then clears active identity after the prompt. Its caller43871 subsequently tries a new reservation and only then releases parking. `48F7D` likewise clears active identity after3003. Tower saves both the pending VIP effect and its actor caller's exact next action. Actor/person loops retain their next identity, and elevator unloading retains its shaft/car; resuming cannot move the already advanced cars again.

`3BF6D` calls417F8 **before**3C074 population/refund/metadata updates. Its hotel actor loop4191B cancels any trip with41C61 (commits raw travel history without accumulated queue-wait charge), releases parking, then calls48F7D. When3003 interrupts this loop, that actor's queue/car record and car reservation have already gone; the later hotel guest's parking, actor allocation, room record, population and rubble have not. Saved `facilityContinuation` resumes the later actors and subsequent teardown after acknowledgment.

`1DAF6` pauses inside the current fire frontier's3BEE9 damage call, before its seven-tick boundary movement and the next frontier. The bomb rectangle19A8D likewise pauses at the current cell. `199E0` has set bomb explosion flag40 and played the sound, but the security reset, focus and result deadline19A11 occur only after the whole blast completes. `emergencyWorkContinuation` saves that exact frontier/cell; no later building is damaged behind the VIP prompt, and resultTick remains uninitialized during an interrupted blast. Tower tests cover all these before/after fields, pending saves, later-frontier protection and final clock1202→1500 behavior.
