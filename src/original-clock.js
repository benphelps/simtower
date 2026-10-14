// Direct translations of IDA 0x3D2A3, 0x3D2B8, 0x3D2ED and 0x3CEF6.
// Clock units are native simulation ticks, not minutes. The wall-clock gate
// uses (GetTickCount >> 4) and six units: nominally 96 ms per native tick.
export const CLOCK_PERIOD = 2600;
export const INITIAL_TICK = 2533;
export const MIDNIGHT_TICK = 2300;
export const QUARTER_TICK = 2533;
export const NORMAL_TICKS_PER_SECOND = 1000 / 96;
export const DAY_COUNTER_PERIOD = 11988;

export function clockTime(tick) {
  tick = Math.floor(((tick % CLOCK_PERIOD) + CLOCK_PERIOD) % CLOCK_PERIOD);
  const phase = Math.floor(tick / 400), local = tick - phase * 400;
  let hours, minutes;
  if (phase === 1 || phase === 2) {
    hours = 12;
    minutes = Math.trunc(local * 60 / 800) + (phase === 2 ? 30 : 0);
  } else {
    const rate = phase === 0 ? 5 : phase === 6 ? 12 : 4;
    const scaled = local * rate;
    hours = Math.trunc(scaled / 400);
    minutes = Math.min(59, Math.trunc((scaled - hours * 400) * 60 / 400));
    hours += [7, 0, 0, 13, 17, 21, 1][phase];
    hours %= 24;
  }
  return { hours, minutes, minuteOfDay: hours * 60 + minutes, phase, daylight: phase < 4 };
}

export function tickAtMinute(minute) {
  minute = ((minute % 1440) + 1440) % 1440;
  const segments = [[420, 720, 0, 400], [720, 750, 400, 800], [750, 780, 800, 1200], [780, 1020, 1200, 1600], [1020, 1260, 1600, 2000], [1260, 1440, 2000, 2300], [0, 60, 2300, 2400], [60, 420, 2400, 2600]];
  const [start, end, first, last] = segments.find(([start, end]) => minute >= start && minute < end);
  return first + (minute - start) * (last - first) / (end - start);
}

export function calendar(dayCounter) {
  return { year: Math.trunc(dayCounter / 12) + 1, quarter: Math.trunc(dayCounter / 3) % 4 + 1, dayOfQuarter: dayCounter % 3 + 1, weekend: dayCounter % 3 === 2 };
}

// 0x3CD97 creates 60 integer hand offsets, using 314/3000 rather than pi/30.
// 0x26872 selects the minute entry and hour*5 + trunc(minutes/12).
export function clockHands(tick) {
  const { hours, minutes } = clockTime(tick);
  const point = (index, radius) => {
    const angle = index * 314 / 3000;
    return [15 + Math.floor(Math.sin(angle) * radius), 15 - Math.floor(Math.cos(angle) * radius)];
  };
  return { minute: point(minutes, 15), hour: point((hours % 12) * 5 + Math.trunc(minutes / 12), 9) };
}

// 0x5F8B: interpolation windows and CLUT resource IDs. No fabricated night tint.
export function paletteTransition(tick, rain = false) {
  tick = Math.floor(tick) % CLOCK_PERIOD;
  const windows = rain?[[0,80,1000,1003],[1500,1600,1003,1000]]:[[2533, 2566, 1002, 1001], [2566, 2600, 1001, 1000], [1600, 1700, 1000, 1001], [1700, 1800, 1001, 1002]];
  for (const [start, end, from, to] of windows) if (tick >= start && tick <= end) return { from, to, progress: tick - start, duration: end - start };
  const id = rain ? 1003 : tick >= 1800 ? 1002 : 1000;
  return { from: id, to: id, progress: 0, duration: 1 };
}

export function skyPalette(data, tick, rain = false) {
  const { from, to, progress, duration } = paletteTransition(tick, rain);
  return data.skyPalettes[from].map((rgb, i) => rgb.map((a, channel) => {
    const b = data.skyPalettes[to][i][channel];
    // The original branches preserve downward rounding on decreasing channels.
    return b > a ? a + Math.trunc((b - a) * progress / duration) : b + Math.trunc((a - b) * (duration - progress) / duration);
  }));
}
