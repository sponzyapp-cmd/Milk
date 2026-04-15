'use client';

import { DashboardData } from '@/lib/types';
import { formatDate, getDayOfWeek } from '@/lib/calculations';
import Link from 'next/link';

interface DashboardHeaderProps {
  weekData: DashboardData['weekData'];
}

export function DashboardHeader({ weekData }: DashboardHeaderProps) {
  const weekStartDate = new Date(weekData.startDate);
  const weekEndDate = new Date(weekData.endDate);

  const startFormatted = weekStartDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endFormatted = weekEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Milk Sales</h1>
          <p className="text-sm text-muted-foreground">
            Week of {startFormatted} – {endFormatted}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Weekly Total</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {weekData.weekTotalLiters.toFixed(1)}L
            </p>
          </div>

          <Link
            href="/payout"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            title="Calculate Payout"
          >
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M2 12h20" />
              <path d="M12 6v12M6 12h12" />
            </svg>
          </Link>

          <Link
            href="/alarms"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-950 transition-colors"
            title="Alarms"
          >
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24M19.78 19.78l-4.24-4.24m-3.08-3.08l-4.24-4.24" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
