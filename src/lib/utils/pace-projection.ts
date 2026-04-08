export function projectPace(currentTotal: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth === 0) return 0;
  return Math.round(((currentTotal / dayOfMonth) * daysInMonth) * 100) / 100;
}
