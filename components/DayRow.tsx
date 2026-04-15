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
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
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

  const handleToggleSlot = (timeSlot: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(timeSlot)) {
        next.delete(timeSlot);
      } else {
        next.add(timeSlot);
      }
      return next;
    });
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
      {/* Date Column */}
      <td className="px-4 py-3 sticky left-0 bg-inherit z-10 min-w-[140px]">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{day.weekday}</span>
          <span className="text-xs text-muted-foreground">
            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {isToday && <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Today</span>}
        </div>
      </td>

      {/* Time Slot Columns */}
      {timeSlots.map((timeSlot) => {
        const entry = entriesBySlot.get(timeSlot);

        return (
          <td key={timeSlot} className="px-3 py-3 text-center min-w-[100px]">
            {entry ? (
              <div className="flex gap-2 items-center justify-center">
                <EditableCell
                  value={entry.liters}
                  isEstimated={entry.isEstimated}
                  onSave={(value) => onUpdateEntry(entry.id!, value)}
                />
                <button
                  onClick={() => onDeleteEntry(entry.id!)}
                  className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950"
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
                className="w-full py-1 px-2 rounded text-sm border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                +
              </button>
            )}

            {isAddingSlot === timeSlot && !entry && (
              <div className="absolute z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-lg p-3 w-48">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={newSlotValue}
                  onChange={(e) => setNewSlotValue(e.target.value)}
                  placeholder="Liters"
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded mb-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSlot(timeSlot);
                    if (e.key === 'Escape') setIsAddingSlot(null);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddSlot(timeSlot)}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setIsAddingSlot(null)}
                    className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </td>
        );
      })}

      {/* Daily Total */}
      <td className="px-4 py-3 sticky right-0 bg-inherit z-10 min-w-[120px] text-right">
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold text-foreground tabular-nums">{day.totalLiters.toFixed(1)}L</span>
          {day.hasEstimated && <span className="text-xs text-red-600 dark:text-red-400">Est.*</span>}
        </div>
      </td>
    </tr>
  );
}
