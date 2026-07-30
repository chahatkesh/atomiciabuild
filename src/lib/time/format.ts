export interface ShiftWindow {
  startTime: string;
  endTime: string;
}

/** Clinic-local day offset carried by the stored "+1" marker. */
function dayOffset(time: string): number {
  return time.endsWith("+1") ? 1 : 0;
}

function base(time: string): string {
  return time.replace("+1", "");
}

/**
 * True when the shift ends on a later clinic-local day than it starts.
 *
 * Derived from the stored time strings, never from `startAt`/`endAt`: those are
 * instants, and comparing them in the browser's timezone reports a false
 * crossing whenever the viewer is not sitting in the clinic's timezone. A
 * 14:00–22:00 Toronto shift is not an overnight shift just because someone in
 * Mumbai is looking at it.
 */
export function crossesMidnight(shift: ShiftWindow): boolean {
  const offsetDelta = dayOffset(shift.endTime) - dayOffset(shift.startTime);
  if (offsetDelta > 0) {
    return true;
  }
  // Same marker on both ends: the window was rolled forward because the end
  // time is at or before the start time (22:00 → 06:00, or 16:00 → 00:00).
  return offsetDelta === 0 && base(shift.endTime) <= base(shift.startTime);
}

/**
 * "22:00 – 06:00 (+1)". The stored times may carry the "+1" overnight marker,
 * which reads as noise to a user, so it is stripped and replaced with a single
 * suffix on the end of the range.
 */
export function formatShiftWindow(shift: ShiftWindow, separator = " – "): string {
  const suffix = crossesMidnight(shift) ? " (+1)" : "";
  return `${base(shift.startTime)}${separator}${base(shift.endTime)}${suffix}`;
}
