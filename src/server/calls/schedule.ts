/**
 * Milliseconds until calling is allowed given an optional working-hours window
 * (local server time). Returns 0 when inside the window or when no window is
 * configured. Supports overnight windows (start > end), e.g. 20→6.
 */
export function msUntilWorkingHours(
  startHour: number | null,
  endHour: number | null,
  now: Date = new Date(),
): number {
  if (startHour == null || endHour == null) return 0;
  const h = now.getHours() + now.getMinutes() / 60;
  const within =
    startHour < endHour ? h >= startHour && h < endHour : h >= startHour || h < endHour;
  if (within) return 0;

  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(startHour);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
