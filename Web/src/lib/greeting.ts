/**
 * Map an hour-of-day (0–23) to a greeting.
 *
 * Shared by the dashboard's server-side fallback and the client-side <Greeting>
 * so the two can never disagree on the buckets:
 *
 *   5–11 → morning · 12–16 → afternoon · 17–20 → evening · else (21–4) → night
 */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour <= 11) return "Good morning";
  if (hour >= 12 && hour <= 16) return "Good afternoon";
  if (hour >= 17 && hour <= 20) return "Good evening";
  return "Good night";
}
