/**
 * Resolve an AI-parsed expense/receipt date against today.
 *
 * AI parsers (e.g. Gemini reading a receipt) can emit a wrong year when the
 * image has no clear date anchor — historically defaulting the year to a value
 * from the model's training prior (e.g. 2023). Such rows are saved but become
 * invisible in the dashboard, which filters by `expense_date` within the
 * selected month.
 *
 * Falls back to `today` when the value is missing, malformed, not a real
 * calendar date, or in the future (a logged expense cannot post-date today).
 *
 * @param parsed date string from the AI parser (expected `YYYY-MM-DD`)
 * @param today  today's date as `YYYY-MM-DD`
 */
export function sanitizeExpenseDate(
  parsed: string | undefined,
  today: string,
): string {
  if (!parsed) return today;

  const trimmed = parsed.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return today;

  const [, y, m, d] = match;
  const date = new Date(`${trimmed}T00:00:00Z`);
  // Reject impossible calendar dates (e.g. 2026-02-30 rolls over).
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() + 1 !== Number(m) ||
    date.getUTCDate() !== Number(d)
  ) {
    return today;
  }

  // ISO `YYYY-MM-DD` strings sort lexically the same as chronologically.
  if (trimmed > today) return today;

  return trimmed;
}
