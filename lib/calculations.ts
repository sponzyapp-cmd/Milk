/**
 * Calculation engine for payout and daily/weekly totals
 */

import { Entry, PayoutCalculation, Settings } from './types';

/**
 * Get all dates in a range
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the day of week name
 */
export function getDayOfWeek(dateStr: string): string {
  const date = parseDate(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Get short weekday name
 */
export function getShortWeekday(dateStr: string): string {
  const date = parseDate(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Get week start date (Monday) for a given date
 */
export function getWeekStart(dateStr: string): string {
  const date = parseDate(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const weekStart = new Date(date.setDate(diff));
  return formatDate(weekStart);
}

/**
 * Get week end date (Sunday) for a given date
 */
export function getWeekEnd(dateStr: string): string {
  const weekStart = getWeekStart(dateStr);
  const end = parseDate(weekStart);
  end.setDate(end.getDate() + 6);
  return formatDate(end);
}

/**
 * Calculate total liters for a specific date
 */
export function calculateDailyTotal(entries: Entry[]): number {
  return entries.reduce((sum, entry) => sum + entry.liters, 0);
}

/**
 * Check if any entry for a date is estimated
 */
export function hasEstimatedEntry(entries: Entry[]): boolean {
  return entries.some((entry) => entry.isEstimated);
}

/**
 * Calculate average liters per entry for available data
 */
export function calculateAverageLiters(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const total = calculateDailyTotal(entries);
  const uniqueDates = new Set(entries.map((e) => e.date));
  if (uniqueDates.size === 0) return 0;
  return total / uniqueDates.size;
}

/**
 * Main payout calculation logic
 */
export function calculatePayout(
  entries: Entry[],
  settings: Settings | null,
  calculationEndDate: string = formatDate(new Date())
): PayoutCalculation {
  if (!settings) {
    throw new Error('Settings not initialized');
  }

  // Determine the start date based on last payout date
  let payoutStartDate: string;

  if (settings.lastPayoutDate) {
    const lastPayout = parseDate(settings.lastPayoutDate);
    const startDate = new Date(lastPayout);

    if (settings.payFrequencyType === 'weekly') {
      startDate.setDate(startDate.getDate() + 1); // Start from day after last payout
    } else if (settings.payFrequencyType === 'monthly') {
      startDate.setDate(startDate.getDate() + 1);
    }

    payoutStartDate = formatDate(startDate);
  } else {
    // No previous payout - use a reasonable default (first entry or 1 month ago)
    if (entries.length > 0) {
      const firstEntry = entries.sort((a, b) => a.date.localeCompare(b.date))[0];
      payoutStartDate = firstEntry.date;
    } else {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      payoutStartDate = formatDate(oneMonthAgo);
    }
  }

  // Get all dates in the range
  const dateRange = getDateRange(payoutStartDate, calculationEndDate);

  // Group entries by date
  const entriesByDate = new Map<string, Entry[]>();
  entries.forEach((entry) => {
    if (entry.date >= payoutStartDate && entry.date <= calculationEndDate) {
      if (!entriesByDate.has(entry.date)) {
        entriesByDate.set(entry.date, []);
      }
      entriesByDate.get(entry.date)!.push(entry);
    }
  });

  // Calculate average for missing days
  const averageLiters = calculateAverageLiters(Array.from(entriesByDate.values()).flat());

  // Build daily breakdown with estimated values for missing days
  const dailyBreakdown = dateRange.map((date) => {
    const dateEntries = entriesByDate.get(date) || [];
    const totalLiters = calculateDailyTotal(dateEntries);
    const hasEstimated = hasEstimatedEntry(dateEntries);

    let finalTotal = totalLiters;
    let isPartiallyEstimated = hasEstimated;

    // If no entries for this day, use average
    if (dateEntries.length === 0 && averageLiters > 0) {
      finalTotal = averageLiters;
      isPartiallyEstimated = true;
    }

    return {
      date,
      dayOfWeek: getDayOfWeek(date),
      totalLiters: finalTotal,
      isPartiallyEstimated,
      entries: dateEntries.length > 0 ? dateEntries : [],
    };
  });

  // Calculate totals
  const totalLiters = dailyBreakdown.reduce((sum, day) => sum + day.totalLiters, 0);
  const realLitersEntries = entries.filter(
    (e) =>
      !e.isEstimated &&
      e.date >= payoutStartDate &&
      e.date <= calculationEndDate
  );
  const realLiters = calculateDailyTotal(realLitersEntries);
  const estimatedLiters = totalLiters - realLiters;
  const estimatedCount = dailyBreakdown.filter((d) => d.isPartiallyEstimated).length;

  // Calculate earnings
  let earnings: number | null = null;
  if (settings.pricePerLiter !== null && settings.pricePerLiter > 0) {
    earnings = totalLiters * settings.pricePerLiter;
  }

  return {
    startDate: payoutStartDate,
    endDate: calculationEndDate,
    totalLiters,
    realLiters,
    estimatedLiters,
    estimatedCount,
    earnings,
    dailyBreakdown,
  };
}

/**
 * Get payout date range label based on frequency
 */
export function getPayoutRangeLabel(
  frequencyType: 'weekly' | 'monthly',
  startDate: string,
  endDate: string
): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (frequencyType === 'weekly') {
    return `Week of ${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    return `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
}

/**
 * Sort time slots chronologically
 */
export function sortTimeSlots(slots: string[]): string[] {
  return slots.slice().sort((a, b) => {
    const [aHour, aMin] = a.split(':').map(Number);
    const [bHour, bMin] = b.split(':').map(Number);
    const aTime = aHour * 60 + aMin;
    const bTime = bHour * 60 + bMin;
    return aTime - bTime;
  });
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Convert 24-hour format to 12-hour format with AM/PM
 */
export function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}
