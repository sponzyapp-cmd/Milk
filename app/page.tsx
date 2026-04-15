'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DayRow } from '@/components/DayRow';
import { DayData } from '@/lib/types';

type ViewMode = 'week' | 'day';

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

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Default to today's index when data loads
  useEffect(() => {
    if (dashboardData) {
      const todayStr = new Date().toISOString().split('T')[0];
      const idx = dashboardData.weekData.days.findIndex((d) => d.date === todayStr);
      setSelectedDayIndex(idx >= 0 ? idx : 0);
    }
  }, [dashboardData]);

  const handleAddEntry = async (date: string, timeSlot: string, liters: number) => {
    try { await addEntry(date, timeSlot, liters); } catch (e) { console.error(e); }
  };
  const handleUpdateEntry = async (entryId: number, liters: number) => {
    try { await updateEntry(entryId, liters); } catch (e) { console.error(e); }
  };
  const handleDeleteEntry = async (entryId: number) => {
    try { await deleteEntry(entryId); } catch (e) { console.error(e); }
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

  const days = dashboardData.weekData.days;
  const selectedDay: DayData = days[selectedDayIndex] ?? days[0];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader weekData={dashboardData.weekData} />

      {/* View Toggle */}
      <div className="sticky top-[73px] z-25 bg-background border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => setViewMode('week')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('day')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'day'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Day
        </button>
      </div>

      {viewMode === 'week' ? (
        <>
          {/* Week Table */}
          <div className="overflow-x-auto">
            <div className="max-w-full inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead className="sticky top-[113px] z-20 bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-2 sm:px-4 sm:py-3 sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 text-left text-[11px] sm:text-sm font-semibold text-muted-foreground w-[72px] sm:w-[140px] min-w-[72px]">
                      Date
                    </th>
                    {dashboardData.timeSlots.map((slot) => (
                      <th key={slot} className="px-1 py-2 sm:px-3 sm:py-3 text-center text-[11px] sm:text-sm font-semibold text-muted-foreground">
                        {slot}
                      </th>
                    ))}
                    <th className="px-2 py-2 sm:px-4 sm:py-3 sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 text-right text-[11px] sm:text-sm font-semibold text-muted-foreground w-[60px] sm:w-[120px] min-w-[60px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
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
                  <p className="text-2xl font-bold">{days.filter((d) => d.entries.length > 0).length}/7</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg per Day</p>
                  <p className="text-2xl font-bold tabular-nums">{(dashboardData.weekData.weekTotalLiters / 7).toFixed(1)}L</p>
                </div>
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* Day View */
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {days.map((day, idx) => {
              const isToday = day.date === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-colors ${
                    selectedDayIndex === idx
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isToday
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase">{day.weekday.slice(0, 3)}</span>
                  <span className="text-lg font-bold leading-none mt-0.5">
                    {new Date(day.date).getDate()}
                  </span>
                  {isToday && <span className="text-[10px] mt-0.5 font-medium">Today</span>}
                </button>
              );
            })}
          </div>

          {/* Selected Day Detail */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Day Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedDay.weekday}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedDay.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {selectedDay.totalLiters.toFixed(1)}L
                </p>
                {selectedDay.hasEstimated && <p className="text-xs text-red-500">includes estimated</p>}
              </div>
            </div>

            {/* Time Slot Entries */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {dashboardData.timeSlots.map((slot) => {
                const entry = selectedDay.entries.find((e) => e.timeSlot === slot);
                return (
                  <div key={slot} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{slot}</p>
                      {entry?.isEstimated && <p className="text-xs text-red-500">estimated</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {entry ? (
                        <>
                          <span className={`text-lg font-bold tabular-nums ${entry.isEstimated ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                            {entry.liters.toFixed(1)}L
                          </span>
                          <button
                            onClick={() => handleDeleteEntry(entry.id!)}
                            className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <DayViewAddEntry
                          onAdd={(liters) => handleAddEntry(selectedDay.date, slot, liters)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Nav Arrows */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setSelectedDayIndex((i) => Math.max(0, i - 1))}
              disabled={selectedDayIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setSelectedDayIndex((i) => Math.min(days.length - 1, i + 1))}
              disabled={selectedDayIndex === days.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// Small inline add-entry for day view
function DayViewAddEntry({ onAdd }: { onAdd: (liters: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Liters"
        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-950"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onAdd(parseFloat(val)); setEditing(false); setVal(''); }
          if (e.key === 'Escape') { setEditing(false); setVal(''); }
        }}
      />
      <button
        onClick={() => { onAdd(parseFloat(val)); setEditing(false); setVal(''); }}
        className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      >✓</button>
      <button
        onClick={() => { setEditing(false); setVal(''); }}
        className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-700"
      >✕</button>
    </div>
  );
}
