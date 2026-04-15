'use client';

import { useMemo, useState } from 'react';
import { Entry, Settings, PayRecord, PayViewMode } from '@/lib/types';
import {
  generatePayPeriods,
  formatDate,
  parseDate,
  calculateDailyTotal,
  getDayOfWeek,
  getDateRange,
} from '@/lib/calculations';

interface PayViewProps {
  entries: Entry[];
  settings: Settings | null;
  payRecords: PayRecord[];
  onMarkPaid: (periodStart: string, periodEnd: string) => Promise<void>;
}

type RangeMode = 'pay-period' | 'month' | '6month';

const RANGE_LABELS: Record<RangeMode, string> = {
  'pay-period': 'Pay Periods',
  month: 'This Month',
  '6month': '6 Months',
};

function isoDate(d: Date) {
  return formatDate(d);
}

/** Group entries by date into a Map */
function entriesByDate(entries: Entry[]): Map<string, Entry[]> {
  const m = new Map<string, Entry[]>();
  entries.forEach((e) => {
    if (!m.has(e.date)) m.set(e.date, []);
    m.get(e.date)!.push(e);
  });
  return m;
}

/** Sum liters for a range of dates */
function sumRange(entries: Entry[], start: string, end: string): number {
  return entries
    .filter((e) => e.date >= start && e.date <= end)
    .reduce((s, e) => s + e.liters, 0);
}

/** Check if a date string is today */
function isToday(d: string) {
  return d === isoDate(new Date());
}

/** Get colour class for a date given pay days and paid records */
function dayBg(
  date: string,
  payDays: string[],
  paidPeriods: Set<string>
): string {
  const todayStr = isoDate(new Date());
  if (isToday(date)) return 'bg-blue-50 dark:bg-blue-950';
  if (paidPeriods.has(date)) return 'bg-green-100 dark:bg-green-900';
  if (payDays.includes(date)) return 'bg-green-50 dark:bg-green-950';
  return '';
}

export function PayView({ entries, settings, payRecords, onMarkPaid }: PayViewProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>('pay-period');
  const today = isoDate(new Date());

  // Derive pay periods
  const startDate = settings?.payStartDate || (entries.length > 0
    ? [...entries].sort((a, b) => a.date.localeCompare(b.date))[0].date
    : isoDate(new Date(new Date().setMonth(new Date().getMonth() - 3))));
  const freqType = settings?.payFrequencyType || 'weekly';
  const freqVal = settings?.payFrequencyValue || 1;
  const pricePerL = settings?.pricePerLiter ?? null;

  const allPeriods = useMemo(
    () => generatePayPeriods(startDate, freqType, freqVal, 200),
    [startDate, freqType, freqVal]
  );

  // Pay days = last day of each period
  const payDaySet = useMemo(
    () => new Set(allPeriods.map((p) => p.end)),
    [allPeriods]
  );

  // Paid period ends (green column)
  const paidEnds = useMemo(
    () => new Set(payRecords.map((r) => r.periodEnd)),
    [payRecords]
  );

  // Determine which periods to show based on rangeMode
  const visiblePeriods = useMemo(() => {
    if (rangeMode === 'pay-period') {
      // Last 4 periods + any in progress
      return allPeriods.slice(-4);
    }
    if (rangeMode === 'month') {
      const now = new Date();
      const ms = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const me = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return allPeriods.filter((p) => p.start <= me && p.end >= ms);
    }
    // 6 months
    const sixAgo = new Date();
    sixAgo.setMonth(sixAgo.getMonth() - 6);
    const cutoff = isoDate(sixAgo);
    return allPeriods.filter((p) => p.end >= cutoff);
  }, [rangeMode, allPeriods]);

  // All dates to show (flat union of all visible periods)
  const allDates = useMemo(() => {
    if (visiblePeriods.length === 0) return [];
    const first = visiblePeriods[0].start;
    const last = visiblePeriods[visiblePeriods.length - 1].end;
    return getDateRange(first, last > today ? today : last);
  }, [visiblePeriods, today]);

  // Time slots
  const slots = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => s.add(e.timeSlot));
    return [...s].sort();
  }, [entries]);

  const eByDate = useMemo(() => entriesByDate(entries), [entries]);

  if (!settings?.payStartDate && entries.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg mb-2">No pay period data yet.</p>
        <p className="text-sm">Set a Pay Period Start Date in Settings to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Range selector */}
      <div className="sticky top-[117px] z-20 bg-background border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex gap-2 overflow-x-auto" style={{top:'117px'}}>
        {(Object.keys(RANGE_LABELS) as RangeMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setRangeMode(mode)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              rangeMode === mode
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {RANGE_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Period summary cards */}
      <div className="px-4 py-4 flex gap-3 overflow-x-auto pb-2">
        {visiblePeriods.map((period) => {
          const total = sumRange(entries, period.start, period.end);
          const earnings = pricePerL !== null ? total * pricePerL : null;
          const isPaid = paidEnds.has(period.end);
          const periodComplete = period.end <= today; // end date has passed or is today
          const isActivePayDay = period.end === today && !isPaid; // today IS the pay day

          // Format dates nicely
          const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const freqLabel = freqType === 'weekly'
            ? `${freqVal} ${freqVal === 1 ? 'week' : 'weeks'}`
            : `${freqVal} ${freqVal === 1 ? 'month' : 'months'}`;

          return (
            <div
              key={period.start}
              className={`flex-shrink-0 rounded-xl border p-4 min-w-[175px] max-w-[200px] ${
                isPaid
                  ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
                  : isActivePayDay
                  ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-400'
                  : periodComplete
                  ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Period label */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {freqLabel} period
              </p>
              <p className="text-xs font-bold text-foreground">
                {fmtDate(period.start)} → {fmtDate(period.end)}
              </p>

              {/* Stats */}
              <div className="mt-3 mb-1">
                <p className="text-2xl font-bold tabular-nums">{total.toFixed(1)}<span className="text-sm font-normal ml-0.5">L</span></p>
                {earnings !== null ? (
                  <p className="text-base font-bold text-green-700 dark:text-green-300">
                    KES {earnings.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Set price/L in Settings</p>
                )}
              </div>

              {/* Status / action */}
              {isPaid ? (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                  ✓ Paid
                </span>
              ) : isActivePayDay ? (
                <button
                  onClick={() => onMarkPaid(period.start, period.end)}
                  className="mt-2 w-full text-xs font-bold px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  💰 Mark as Paid
                </button>
              ) : periodComplete ? (
                <div className="mt-2 space-y-1">
                  <span className="block text-[10px] text-orange-600 dark:text-orange-400 font-semibold">⚠ Not marked paid</span>
                  <button
                    onClick={() => onMarkPaid(period.start, period.end)}
                    className="w-full text-xs font-bold px-2 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Mark Paid
                  </button>
                </div>
              ) : (
                <span className="inline-block mt-2 text-xs text-muted-foreground">⏳ In progress</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-[157px] z-10 bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700">
            <tr>
              <th className="px-2 py-2 sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 text-left text-[11px] sm:text-sm font-semibold text-muted-foreground w-[80px] min-w-[80px]">
                Date
              </th>
              {slots.map((s) => (
                <th key={s} className="px-2 py-2 text-center text-[11px] sm:text-sm font-semibold text-muted-foreground min-w-[70px]">
                  {s}
                </th>
              ))}
              <th className="px-2 py-2 sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 text-right text-[11px] sm:text-sm font-semibold text-muted-foreground w-[70px] min-w-[70px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {allDates.map((date) => {
              const dayEntries = eByDate.get(date) || [];
              const total = calculateDailyTotal(dayEntries);
              const isPayDay = payDaySet.has(date);
              const isPaid = paidEnds.has(date);
              const isCurrentDay = isToday(date);

              // Period separator: first day of a new period
              const isPeriodStart = visiblePeriods.some((p) => p.start === date);

              return (
                <>
                  {isPeriodStart && (
                    <tr key={`sep-${date}`}>
                      <td
                        colSpan={slots.length + 2}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {visiblePeriods.find((p) => p.start === date)
                          ? `Period: ${date} → ${visiblePeriods.find((p) => p.start === date)!.end}`
                          : ''}
                      </td>
                    </tr>
                  )}
                  <tr
                    key={date}
                    className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
                      isPaid
                        ? 'bg-green-100 dark:bg-green-900'
                        : isPayDay
                        ? 'bg-green-50 dark:bg-green-950 border-l-2 border-l-green-500'
                        : isCurrentDay
                        ? 'bg-blue-50 dark:bg-blue-950'
                        : ''
                    }`}
                  >
                    <td className="px-2 py-2 sticky left-0 bg-inherit z-10 min-w-[80px]">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold leading-tight">
                          {getDayOfWeek(date).slice(0, 3)}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {isPayDay && (
                          <span className={`text-[9px] font-bold leading-tight ${isPaid ? 'text-green-700 dark:text-green-300' : 'text-green-600 dark:text-green-400'}`}>
                            {isPaid ? '✓ Paid' : '💰 Pay Day'}
                          </span>
                        )}
                        {isCurrentDay && !isPayDay && (
                          <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">Today</span>
                        )}
                      </div>
                    </td>
                    {slots.map((slot) => {
                      const entry = dayEntries.find((e) => e.timeSlot === slot);
                      return (
                        <td key={slot} className="px-2 py-2 text-center text-xs tabular-nums">
                          {entry ? (
                            <span className={entry.isEstimated ? 'text-red-500' : 'text-foreground'}>
                              {entry.liters.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-700">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 sticky right-0 bg-inherit z-10 text-right">
                      <span className={`text-xs font-bold tabular-nums ${isPaid ? 'text-green-700 dark:text-green-300' : ''}`}>
                        {total > 0 ? `${total.toFixed(1)}L` : '—'}
                      </span>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
