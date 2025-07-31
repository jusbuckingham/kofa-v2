

/**
 * formatDate
 * Given a date string or Date object, returns a human-readable string
 * formatted as "MMM DD, YYYY", e.g. "Jul 29, 2025".
 */
export default function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  // Fallback for invalid dates
  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}