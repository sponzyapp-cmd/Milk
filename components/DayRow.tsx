'use client';

import { DayData, Entry } from '@/lib/types';
import { EditableCell } from './EditableCell';
import { useState } from 'react';

interface DayRowProps {
  day: DayData;
  timeSlots: string[];
  onUpdateEntry: (entryId: number, liters: number) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
  onAddEntry: (timeSlot: string, liters: number) => Promise<void>;
  isScrollToday?: boolean;
}

export function DayRow({
  day,
  timeSlots,
  onUpdateEntry,
  onDeleteEntry,
  onAddEntry,
  isScrollToday = false,
}: DayRowProps) {
  const [isAddingSlot, setIsAddingSlot] = useState<string | null>(null);
  const [newSlotValue, setNewSlotValue] = useState('');

  const entriesBySlot = new Map<string, Entry>();
  day.entries.forEach((entry) => {
    entriesBySlot.set(entry.timeSlot, entry);
  });

  const handleAddSlot = async (timeSlot: string) => {
    if (!newSlotValue || parseFloat(newSlotValue) < 0) return;
    try {
      await onAddEntry(timeSlot, parseFloat(newSlotValue));
      setNewSlotValue('');
      setIsAddingSlot(null);
    } catch (error) {
      console.error('[v0] Add entry error:', error);
    }
  };

  const dateObj = new Date(day.date);
  const isToday = day.date === new Date().toISOString().split('T')[0];

  return (
    <tr
      ref={(el) => {
        if (isScrollToday && isToday && el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }}
      className={`border-b border-gray-200 dark:border-gray-800 transition-colors ${
        isToday ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
    >
      {/* Date Column — compact on mobile */}
      <td className="px-2 py-2 sm:px-4 sm:py-3 sticky left-0 bg-inherit z-10 w-[72px] sm:w-[140px] min-w-[72px]">
        <div className="flex flex-col">
          <span className="text-[11px] sm:text-sm font-semibold text-foreground leading-tight">
            {/* Short weekday on mobile, full on desktop */}
            <span className="sm:hidden">{day.weekday.slice(0, 3)}</span>
            <span className="hidden sm:inline">{day.weekday}</span>
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {isToday && (
            <span className="text-[9px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 leading-tight">
              Today
            </span>
          )}
        </div>
      </td>

      {/* Time Slot Columns */}
      {timeSlots.map((timeSlot) => {
        const entry = entriesBySlot.get(timeSlot);

        return (
          <td key={timeSlot} className="px-1 py-2 sm:px-3 sm:py-3 text-center">
            {entry ? (
              <div className="flex gap-1 items-center justify-center">
                <EditableCell
                  value={entry.liters}
                  isEstimated={entry.isEstimated}
                  onSave={(value) => onUpdateEntry(entry.id!, value)}
                />
                <button
                  onClick={() => onDeleteEntry(entry.id!)}
                  className="text-[10px] text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950 leading-none"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsAddingSlot(timeSlot);
                  setNewSlotValue('');
                }}
                className="w-full py-1 px-1 rounded text-xs border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                +
              </button>
            )}

            {isAddingSlot === timeSlot && !entry && (
              <div className="absolute z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-lg p-3 w-40 left-1/2 -translate-x-1/2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={newSlotValue}
                  onChange={(e) => setNewSlotValue(e.target.value)}
                  placeholder="Litres"
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded mb-2 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSlot(timeSlot);
                    if (e.key === 'Escape') setIsAddingSlot(null);
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAddSlot(timeSlot)}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setIsAddingSlot(null)}
                    className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-xs font-medium"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </td>
        );
      })}

      {/* Daily Total — compact on mobile */}
      <td className="px-2 py-2 sm:px-4 sm:py-3 sticky right-0 bg-inherit z-10 text-right w-[60px] sm:w-[120px] min-w-[60px]">
        <div className="flex flex-col items-end">
          <span className="text-xs sm:text-lg font-bold text-foreground tabular-nums">
            {day.totalLiters.toFixed(1)}L
          </span>
          {day.hasEstimated && (
            <span className="text-[9px] sm:text-xs text-red-600 dark:text-red-400">Est.*</span>
          )}
        </div>
      </td>
    </tr>
  );
}
