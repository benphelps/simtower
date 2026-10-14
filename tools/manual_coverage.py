"""Regenerate the manual feature checklist from its reviewed requirement inventory."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'research/manual/coverage.json'
data=json.loads(PATH.read_text())
status={'covered':'C','partial':'P','missing':'M','deferred':'D'}
counts={k:0 for k in status}
lines=['# Manual-based SimTower coverage and implementation queue','',
'Baseline and updated status are based on the supplied 68-page OCR manual, the current JavaScript source/tests and directly inspected Win16 executable routines. Printed manual page numbers are used below; add 5 for the PDF page number. The manual index (printed 61-62) was cross-checked against this inventory. OS-specific window behavior and disputed numeric examples are recorded separately.','',
'## How coverage is counted','',
'Each feature is split into explicit behavioral checks. **C** = implemented for the stated behavior with source/test evidence; **P** = usable but approximate or incomplete; **M** = missing; **D** = intentionally deferred. The fraction is fully covered checks / all checks, not a guess at percentage of code ported. Partial checks receive no invented half-credit. A covered check does not establish pixel-identical output or identical random call order.','',
'Priority: **P0** foundational transport, occupancy, economy and progression; **P1** ordinary gameplay and management UI; **P2** rare events, victory and audiovisual fidelity; **P3** application integration/help and deferred saves. Dependencies break ties. Work proceeds in the table order.','',
'## Feature list in priority order','',
'| Order / ID | Feature | Manual pages | Priority | Fully covered | Partial / missing / deferred | Source evidence |',
'| --- | --- | --- | --- | --- | --- | --- |']
for row in data['features']:
 c={k:sum(x['status']==k for x in row['checks']) for k in status}
 for k in status:counts[k]+=c[k]
 lines.append(f"| {row['id']} | {row['feature']} | {row['manualPages']} | {row['priority']} | {c['covered']}/{len(row['checks'])} | {c['partial']} P / {c['missing']} M / {c['deferred']} D | {row['evidence']} |")
lines+=['',f"**Total:** {len(data['features'])} feature groups, {sum(counts.values())} behavioral checks: {counts['covered']} covered, {counts['partial']} partial, {counts['missing']} missing, {counts['deferred']} deferred. These totals are checklist counts, not an overall fidelity percentage.",'','## Behavioral checklist','']
for row in data['features']:
 lines += [f"### {row['id']} - {row['feature']} ({row['priority']})",'',f"Manual: printed {row['manualPages']}; evidence: {row['evidence']}.",'']
 for x in row['checks']:lines.append(f"- **{status[x['status']]}** {x['behavior']}"+(f" - {x['note']}" if x.get('note') else ''))
 lines.append('')
lines+=['## Manual/executable discrepancies','']
for x in data['discrepancies']:lines.append(f"- **{x['topic']}** (manual {x['manualPages']}): {x['note']}")
lines+=['','## Work log','']
for x in data['workLog']:lines.append(f"- {x}")
lines+=['','## Next work','']
for x in data['nextWork']:lines.append(f'- {x}')
(ROOT/'research/MANUAL_COVERAGE.md').write_text('\n'.join(lines)+'\n')
print(f"{len(data['features'])} groups / {sum(counts.values())} checks: {counts}")
