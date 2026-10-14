# Native inspection behavior

The implementation in `src/original-inspection.js` translates the following
live IDA observations and the corresponding exported assembly.

* `0x216BD`: office For Rent/Occupied, condo For Sale/Occupied, hotel
  Occupied/Clean/Dirty state labels come from string block712. Shop uses
  commercial state−1 for For Rent.
* `0x24D9B`: food/retail establishment names select original string blocks
  714/715/716 by style; custom user names take precedence.
* `0x204E8`: an occupied condominium disables the sale-price combo.
* `0x21C10`/`0x21C94`: resident gauges use adjusted mean stress (300 maximum);
  commercial sales gauges use actual visitors, not the prospective
  remaining+visitors used by quarterly shop evaluation.
* `0x3738D`/`0x37472`: a two-pixel inset stress gauge fills
  `floor(width*(300-stress)/300)`, clamped full/empty outside0..300. Vertical
  markers use the current rating's good/bad stress thresholds. `0x3750D`
  sales gauges instead fill `floor(width*visitors/maximum)` with no markers.
  Native nearest-palette RGB requests are pure blue, yellow and red; all
  three exist exactly in the original palette. `0x21D94` draws the integer
  sales count at inset(2,4).
* `0x24FD6`: access complaints score horizontal distance from the room's
  left edge:80 far,125 very far. Express service suppresses that complaint.
* `0x254D2`: rainy-day commercial demand diagnostics use the all-day rain
  latch, not only the currently rendered sky rain. Weekend and lobby-band
  hints are recovered in `0x25493`/`0x2544E`.
* `0x255C6`: hotel state56/64 reports that the room is too dirty.
* `0x25877`: noise diagnostics name the specific adjacent noisy facility
  using original strings. Diagnostic display is capped at three lines.
* `0x22561`: office/condo tenant grids show state<=16 only. Hotels likewise
  require state<=16 and skip reserved child0. Housekeeping requires state0/1
  at the employee's home floor. Security shows all six allocated employees.
* `0x22923`/`0x40592`: commercial grids enumerate admitted patrons, including
  visitors from other facilities. Allocating48 patron actors does not imply
  displaying48 portraits in an empty establishment.
* `0x217B6`: elevator passenger grids enumerate the actual car passengers.
* `0x16BBE`: queue inspection searches upstairs passengers left of the shaft
  and downstairs passengers right, packed by their original one/two-cell
  portrait width. Find Tenant follows the current elevator car floor.

Diagnostic ordering remains partially adapted to the browser route graph.
Original wording, recovered thresholds, portrait visibility and role sprites
are source driven; no replacement artwork or invented flavor text is added.
