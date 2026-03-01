import { format, parse, isValid } from "date-fns";

/**
 * Standard date format used across the app: "17 Jan 2025"
 */
export const STANDARD_DATE_FORMAT = "d MMM yyyy";

/**
 * Format a date to the standard display format (e.g., "17 Jan 2025")
 * Handles various input types: Date object, ISO string, or already formatted string
 */
export const formatDisplayDate = (date: Date | string | undefined | null): string => {
  if (!date) return "";
  
  // If it's already a Date object
  if (date instanceof Date) {
    return isValid(date) ? format(date, STANDARD_DATE_FORMAT) : "";
  }
  
  // If it's an ISO string or parseable date string
  const parsedDate = new Date(date);
  if (isValid(parsedDate) && !isNaN(parsedDate.getTime())) {
    return format(parsedDate, STANDARD_DATE_FORMAT);
  }
  
  // Try parsing common formats like "Jan 15, 2025"
  try {
    const altParsed = parse(date, "MMM d, yyyy", new Date());
    if (isValid(altParsed)) {
      return format(altParsed, STANDARD_DATE_FORMAT);
    }
  } catch {
    // Fall through
  }
  
  // Return original if we can't parse it
  return date;
};

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export const formatInputDate = (date: Date | string | undefined | null): string => {
  if (!date) return "";
  
  const dateObj = date instanceof Date ? date : new Date(date);
  return isValid(dateObj) ? format(dateObj, "yyyy-MM-dd") : "";
};
