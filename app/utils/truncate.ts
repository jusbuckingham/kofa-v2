

/**
 * Truncate a string to a maximum length, adding an ellipsis if truncated.
 * @param text - The input string to truncate.
 * @param maxLength - The maximum length of the output string, including the ellipsis.
 * @returns The truncated string, with '…' appended if truncation occurred.
 */
export default function truncate(text: string, maxLength: number): string {
  const ellipsis = '…';
  if (text.length <= maxLength) {
    return text;
  }
  // Ensure we don't cut off mid-ellipsis
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}