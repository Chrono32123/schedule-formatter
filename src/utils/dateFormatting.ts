/**
 * Date formatting utilities for schedule display
 */

/**
 * Formats start and end date/time strings for display
 * If end date is on the same day as start date, only shows the end time
 * Otherwise shows full end date and time
 * 
 * @param start - Start date/time string (formatted with dateFormat)
 * @param end - End date/time string (formatted with dateFormat), or null
 * @param dateFormat - The date format pattern used (e.g., 'MM-DD-YYYY hh:mm A')
 * @returns Object with formatted start and end strings
 */
export function formatStartEndDates(
  start: string,
  end: string | null | undefined,
  dateFormat: string
): { startDisplay: string; endDisplay: string | null } {
  if (!end) {
    return { startDisplay: start, endDisplay: null };
  }

  // Extract just the date part from the formatted strings
  // Assuming format is like "MM-DD-YYYY hh:mm A"
  const startDatePart = extractDatePart(start, dateFormat);
  const endDatePart = extractDatePart(end, dateFormat);

  // If same day, only show end time
  if (startDatePart === endDatePart) {
    const endTimePart = extractTimePart(end, dateFormat);
    return {
      startDisplay: start,
      endDisplay: endTimePart,
    };
  }

  // Different days, show full end date and time
  return {
    startDisplay: start,
    endDisplay: end,
  };
}

/**
 * Extracts the date part from a formatted date string
 * Handles common formats like MM-DD-YYYY, DD-MM-YYYY, etc.
 */
function extractDatePart(dateString: string, format: string): string {
  // Try to extract the date portion based on common patterns
  // Most formats have date at the beginning before the time
  const dateTimeRegex = /^(.*?)\s+\d{1,2}:\d{2}/;
  const match = dateString.match(dateTimeRegex);
  if (match) {
    return match[1].trim();
  }

  // Fallback: assume date is everything before the last occurrence of time pattern
  const parts = dateString.split(' ');
  // Find where time starts (HH:MM format)
  const timeIndex = parts.findIndex((part) => /^\d{1,2}:\d{2}/.test(part));
  if (timeIndex > 0) {
    return parts.slice(0, timeIndex).join(' ');
  }

  return dateString;
}

/**
 * Extracts the time part from a formatted date string
 * Handles formats with AM/PM suffix
 */
function extractTimePart(dateString: string, format: string): string {
  // Look for time pattern (HH:MM with optional AM/PM)
  const timeRegex = /(\d{1,2}:\d{2}\s*(?:A|P)M)/i;
  const match = dateString.match(timeRegex);
  if (match) {
    return match[1].trim();
  }

  // Fallback: return last two segments (usually time and AM/PM)
  const parts = dateString.split(' ');
  return parts.slice(-2).join(' ');
}
