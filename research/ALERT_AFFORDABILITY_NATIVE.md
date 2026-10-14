# Native unaffordable alert continuation

Live IDA D73B→D7DC/DAD1,3D600/3D64E/3D748/3D83D,2026-10-15.
D73B passes a signed LONG to DialogBox. DAD1 stores it as x and formats the
absolute magnitude in the original panel. Command2 accepts a nonnegative
parameter or sufficient cash, including exact equality. For negative x with
cash+x<0, a manual command opens ALRT1004 as a nested MessageBox, then ends
the original dialog with result1 after its acknowledgment. Timer expiry uses
result1 silently in that case; timer handling is under separate UI audit.

ALRT32513/1004 differs from STRL32518/1004. The original ALRT payload has
flags0 and text`Not enough money.` at byte4. All ALRT resources are now decoded
into game-data.json by tools/decode_tables.py.

Tower.answerEmergency retains the original3012/3020 decision, prepends1004
and saves a typed affordabilityContinuation. It resumes result1 only after
1004 is acknowledged. Strict atomic loading validates both the nested error
and its underlying decision/event. The browser keeps the original cost panel
behind a separate modal error pane. User clicks cannot spend unaffordable
funds or bypass the pending nested decision.

Three source-backed tests cover exact-cash acceptance, both costs, refusal
without payment, nested decision clock freeze, save/load and invalid states.
Actual File/Open replay showed the original error at unchanged$299999 and
then the source bomb-search briefing after OK, with no browser errors.
