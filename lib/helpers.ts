/**
 * Utility helper functions
 */

import { DashboardData, DayData, Entry } from './types';
import {
  formatDate,
  getWeekStart,
  getWeekEnd,
  calculateDailyTotal,
  hasEstimatedEntry,
  getDayOfWeek,
  getShortWeekday,
  sortTimeSlots,
} from './calculations';

/**
 * Build dashboard data for current week
 */
export function buildDashboardData(
  entries: Entry[],
  timeSlots: string[],
  referenceDate: string = formatDate(new Date())
): Omit<DashboardData, 'settings'> {
  const weekStart = getWeekStart(referenceDate);
  const weekEnd = getWeekEnd(referenceDate);

  const days: DayData[] = [];
  const current = new Date(weekStart);
  const end = new Date(weekEnd);

  while (current <= end) {
    const dateStr = formatDate(current);
    const dayEntries = entries.filter((e) => e.date === dateStr);

    // Sort entries by time slot
    dayEntries.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    days.push({
      date: dateStr,
      dayOfWeek: getDayOfWeek(dateStr),
      weekday: getShortWeekday(dateStr),
      entries: dayEntries,
      totalLiters: calculateDailyTotal(dayEntries),
      hasEstimated: hasEstimatedEntry(dayEntries),
    });

    current.setDate(current.getDate() + 1);
  }

  const weekTotalLiters = days.reduce((sum, day) => sum + day.totalLiters, 0);

  return {
    weekData: {
      startDate: weekStart,
      endDate: weekEnd,
      days,
      weekTotalLiters,
    },
    timeSlots: sortTimeSlots(timeSlots),
  };
}

/**
 * Debounce function for input handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Generate CSV from entries
 */
export function generateCSV(entries: Entry[], timeSlots: string[]): string {
  let csv = 'Date,Day,';
  csv += timeSlots.map((slot) => `"${slot}"`).join(',');
  csv += ',Total,Status\n';

  // Group by date
  const entriesByDate = new Map<string, Entry[]>();
  entries.forEach((entry) => {
    if (!entriesByDate.has(entry.date)) {
      entriesByDate.set(entry.date, []);
    }
    entriesByDate.get(entry.date)!.push(entry);
  });

  // Sort dates
  const sortedDates = Array.from(entriesByDate.keys()).sort();

  sortedDates.forEach((date) => {
    const dayEntries = entriesByDate.get(date)!;
    const dayOfWeek = getDayOfWeek(date);
    const totalLiters = calculateDailyTotal(dayEntries);
    const hasEstimated = hasEstimatedEntry(dayEntries);

    csv += `${date},${dayOfWeek},`;

    // Add values for each time slot
    const entriesBySlot = new Map<string, Entry>();
    dayEntries.forEach((entry) => {
      entriesBySlot.set(entry.timeSlot, entry);
    });

    csv += timeSlots
      .map((slot) => {
        const entry = entriesBySlot.get(slot);
        if (!entry) return '';
        const mark = entry.isEstimated ? '*' : '';
        return entry.liters + mark;
      })
      .join(',');

    csv += `,${totalLiters.toFixed(2)},${hasEstimated ? 'Partial' : 'Complete'}\n`;
  });

  csv += '\nNotes:\n';
  csv += '* = Estimated value (filled from average)\n';

  return csv;
}

/**
 * Generate JSON export
 */
export function generateJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Convert entries to CSV string for download
 */
export function downloadCSV(csvContent: string, filename: string = 'milk-sales.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert JSON to blob and download
 */
export function downloadJSON(jsonContent: string, filename: string = 'milk-sales.json') {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('[v0] Clipboard copy failed:', error);
    return false;
  }
}

/**
 * Format number to 2 decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format currency
 */
export function formatCurrency(value: number | null, currency: string = 'USD'): string {
  if (value === null) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'EUR',
  }).format(value);
}

/**
 * Parse numeric input, allowing decimal points
 */
export function parseNumericInput(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate liter input
 */
export function isValidLiterInput(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 1000; // Max 1000 liters per entry
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return formatDate(new Date());
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}

/**
 * Get relative date string (Today, Yesterday, etc.)
 */
export function getRelativeDateString(dateStr: string): string {
  const today = new Date();
  const todayStr = formatDate(today);

  if (dateStr === todayStr) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  if (dateStr === yesterdayStr) return 'Yesterday';

  return dateStr;
}

/**
 * Retry failed async operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Group array by key
 */
export function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  arr.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
  });
  return map;
}

/**
 * Shallow object equality check
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every((key) => obj1[key] === obj2[key]);
}
