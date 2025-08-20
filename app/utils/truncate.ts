/**
 * Truncate a string to a maximum length, adding an ellipsis if truncated.
 * @param text - The input string to truncate.
 * @param maxLength - The maximum length of the output string, including the ellipsis.
 * @param ellipsis - The string to append if truncation occurs. Defaults to '…'.
 * @returns The truncated string, with the ellipsis appended if truncation occurred.
 */
export default function truncate(
  text: string | null | undefined,
  maxLength: number,
  ellipsis: string = '…'
): string {
  if (!text) return '';
  if (text.length <= maxLength) {
    return text;
  }
  // Ensure we don't cut off mid-ellipsis
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}