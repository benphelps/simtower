# Original game cursors

The supplied executable loads RT_GROUP_CURSOR resources 1002–1005 at
`37F76`. `tools/decode_cursors.py` packages their original RT_CURSOR DIB
bytes as browser CUR files and emits lossless PNG fallbacks. The embedded
hotspots are preserved: cross (7,7), lens (6,6), finger (6,0), and removal X
(6,6). No replacement artwork is drawn.

`4A670` selects the removal, finger, inspection, or construction cursor from
the running mode. While paused, inspection retains the lens and the other
modes use the system arrow. Elevator extension invokes the system vertical
resize cursor (`37FFB`, IDC_SIZENS 32645); the browser uses `ns-resize` for
that operating-system cursor. Pointer release and cancellation restore the
mode cursor.

`tests/cursors-native.test.mjs` verifies the extracted DIB bytes and hotspots
against the original resources, and checks running, paused, and elevator
extension selection. Browser system cursors remain platform-dependent.
