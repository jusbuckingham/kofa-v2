/**
 * formatDate
 * Given a date string or Date object, returns a human-readable string.
 * Defaults to "MMM DD, YYYY", e.g. "Jul 29, 2025".
 * Optionally accepts Intl.DateTimeFormatOptions to customize the format.
 */
export default function formatDate(
  dateInput: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  // Fallback for invalid dates
  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", options);
}