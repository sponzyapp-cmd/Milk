/**
 * Core type definitions for the Milk Sales Tracking App
 */

export interface Entry {
  id?: number;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM format
  liters: number;
  isEstimated: boolean;
  createdAt: number; // timestamp
  updatedAt?: number; // timestamp
}

export interface Settings {
  id?: number;
  pricePerLiter: number | null;
  payFrequencyType: 'weekly' | 'monthly';
  payFrequencyValue: number; // default: 1
  lastPayoutDate: string | null; // YYYY-MM-DD
  preferredCalcTime: string; // HH:MM format
  payStartDate: string | null; // YYYY-MM-DD — when pay frequency counting starts
  payStartTime: string | null; // HH:MM — time of day pay period starts
}

export interface Meta {
  key: string;
  value: any;
}

/**
 * Time slot management
 */
export interface TimeSlots {
  slots: string[]; // Array of HH:MM strings
}

/**
 * Payout calculation result
 */
export interface PayoutCalculation {
  startDate: string;
  endDate: string;
  totalLiters: number;
  realLiters: number;
  estimatedLiters: number;
  estimatedCount: number;
  earnings: number | null;
  dailyBreakdown: {
    date: string;
    dayOfWeek: string;
    totalLiters: number;
    isPartiallyEstimated: boolean;
    entries: Array<{
      timeSlot: string;
      liters: number;
      isEstimated: boolean;
    }>;
  }[];
}

/**
 * Dashboard data for UI
 */
export interface DashboardData {
  weekData: {
    startDate: string;
    endDate: string;
    days: {
      date: string;
      dayOfWeek: string;
      weekday: string;
      entries: Entry[];
      totalLiters: number;
      hasEstimated: boolean;
    }[];
    weekTotalLiters: number;
  };
  timeSlots: string[];
  settings: Settings | null;
}

export interface DayData {
  date: string;
  dayOfWeek: string;
  weekday: string;
  entries: Entry[];
  totalLiters: number;
  hasEstimated: boolean;
}

/**
 * Pay period view modes
 */
export type PayViewMode = 'pay-period' | 'month' | '6month';

/**
 * A recorded payment
 */
export interface PayRecord {
  id?: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  paidAt: number;      // timestamp
  totalLiters: number;
  earnings: number | null;
}

/**
 * Export formats
 */
export interface ExportData {
  exportedAt: string;
  dataVersion: string;
  entries: Entry[];
  settings: Settings | null;
  timeSlots: string[];
}
