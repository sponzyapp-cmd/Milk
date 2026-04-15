'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Entry, DashboardData, Settings } from '@/lib/types';
import { buildDashboardData } from '@/lib/helpers';
import { useDatabase } from './useDatabase';

/**
 * Custom hook for dashboard data management
 * Fetches entries and builds weekly view
 */
export function useDashboard(referenceDate?: string) {
  const db = useDatabase();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(['07:00', '17:00']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount and when db is initialized
  useEffect(() => {
    if (!db.isInitialized) return;

    let isMounted = true;

    (async () => {
      try {
        setIsLoading(true);
        const [entriesData, settingsData, slotsData] = await Promise.all([
          db.getAllEntries(),
          db.getSettings(),
          db.getTimeSlotsList(),
        ]);

        if (isMounted) {
          setEntries(entriesData);
          setSettings(settingsData || null);
          setTimeSlots(slotsData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
          console.error('[v0] Dashboard load error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [db.isInitialized]);

  // Build dashboard data
  const dashboardData = useMemo<DashboardData | null>(() => {
    if (!db.isInitialized || isLoading) return null;

    return {
      ...buildDashboardData(entries, timeSlots, referenceDate),
      settings,
    };
  }, [entries, timeSlots, settings, db.isInitialized, isLoading, referenceDate]);

  // Add entry callback
  const addEntry = useCallback(
    async (date: string, timeSlot: string, liters: number) => {
      try {
        const id = await db.addEntry({
          date,
          timeSlot,
          liters,
          isEstimated: false,
        });

        // Update local state
        const newEntry: Entry = {
          id,
          date,
          timeSlot,
          liters,
          isEstimated: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setEntries((prev) => [...prev, newEntry]);
        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add entry');
        throw err;
      }
    },
    [db]
  );

  // Update entry callback
  const updateEntryValue = useCallback(
    async (id: number, liters: number, isEstimated: boolean = false) => {
      try {
        await db.updateEntry(id, { liters, isEstimated });

        // Update local state
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === id ? { ...entry, liters, isEstimated } : entry
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update entry');
        throw err;
      }
    },
    [db]
  );

  // Delete entry callback
  const deleteEntryData = useCallback(
    async (id: number) => {
      try {
        await db.deleteEntry(id);

        // Update local state
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete entry');
        throw err;
      }
    },
    [db]
  );

  // Update settings callback
  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      try {
        await db.updateSettings(updates);
        setSettings((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update settings');
        throw err;
      }
    },
    [db]
  );

  // Update time slots callback
  const updateTimeSlots = useCallback(
    async (slots: string[]) => {
      try {
        await db.updateTimeSlots(slots);
        setTimeSlots(slots);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update time slots');
        throw err;
      }
    },
    [db]
  );

  return {
    dashboardData,
    isLoading: db.isLoading || isLoading,
    error: error || db.error,
    isInitialized: db.isInitialized,
    // Mutations
    addEntry,
    updateEntry: updateEntryValue,
    deleteEntry: deleteEntryData,
    updateSettings,
    updateTimeSlots,
  };
}
