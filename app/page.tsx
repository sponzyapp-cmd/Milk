'use client';

import { useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DayRow } from '@/components/DayRow';

export default function Dashboard() {
  const {
    dashboardData,
    isLoading,
    error,
    isInitialized,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useDashboard();

  // Handle adding new entry
  const handleAddEntry = async (date: string, timeSlot: string, liters: number) => {
    try {
      await addEntry(date, timeSlot, liters);
    } catch (error) {
      console.error('[v0] Failed to add entry:', error);
    }
  };

  // Handle updating entry
  const handleUpdateEntry = async (entryId: number, liters: number) => {
    try {
      await updateEntry(entryId, liters);
    } catch (error) {
      console.error('[v0] Failed to update entry:', error);
    }
  };

  // Handle deleting entry
  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteEntry(entryId);
    } catch (error) {
      console.error('[v0] Failed to delete entry:', error);
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">Error Loading Dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader weekData={dashboardData.weekData} />

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-w-full inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead className="sticky top-[73px] z-20 bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 text-left text-sm font-semibold text-muted-foreground min-w-[140px]">
                  Date
                </th>
                {dashboardData.timeSlots.map((slot) => (
                  <th
                    key={slot}
                    className="px-3 py-3 text-center text-sm font-semibold text-muted-foreground min-w-[100px]"
                  >
                    {slot}
                  </th>
                ))}
                <th className="px-4 py-3 sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 text-right text-sm font-semibold text-muted-foreground min-w-[120px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.weekData.days.map((day) => (
                <DayRow
                  key={day.date}
                  day={day}
                  timeSlots={dashboardData.timeSlots}
                  onUpdateEntry={handleUpdateEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onAddEntry={(timeSlot, liters) => handleAddEntry(day.date, timeSlot, liters)}
                  isScrollToday={true}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Week Total</p>
              <p className="text-2xl font-bold tabular-nums">{dashboardData.weekData.weekTotalLiters.toFixed(1)}L</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Days Logged</p>
              <p className="text-2xl font-bold">
                {dashboardData.weekData.days.filter((d) => d.entries.length > 0).length}/7
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg per Day</p>
              <p className="text-2xl font-bold tabular-nums">
                {dashboardData.weekData.days.length > 0
                  ? (dashboardData.weekData.weekTotalLiters / 7).toFixed(1)
                  : '0'}
                L
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
