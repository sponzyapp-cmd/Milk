'use client';

import { useEffect, useState, useCallback } from 'react';
import { db, initializeDatabase, getTimeSlots, saveTimeSlots } from '@/lib/db';
import { Entry, Settings } from '@/lib/types';
import { retryOperation } from '@/lib/helpers';

/**
 * Custom hook for database operations
 * Provides CRUD operations for entries and settings
 */
export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize database on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await retryOperation(() => initializeDatabase());
        if (isMounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize database');
          console.error('[v0] Database init failed:', err);
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
  }, []);

  // CRUD Operations
  const addEntry = useCallback(
    async (entry: Omit<Entry, 'id' | 'createdAt'>) => {
      try {
        const id = await db.entries.add({
          ...entry,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add entry');
        throw err;
      }
    },
    []
  );

  const updateEntry = useCallback(async (id: number, updates: Partial<Entry>) => {
    try {
      await db.entries.update(id, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      throw err;
    }
  }, []);

  const deleteEntry = useCallback(async (id: number) => {
    try {
      await db.entries.delete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      throw err;
    }
  }, []);

  const getEntry = useCallback(async (id: number) => {
    try {
      return await db.entries.get(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get entry');
      throw err;
    }
  }, []);

  const getEntriesByDate = useCallback(async (date: string) => {
    try {
      return await db.entries.where('date').equals(date).toArray();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get entries');
      throw err;
    }
  }, []);

  const getEntriesByDateRange = useCallback(async (startDate: string, endDate: string) => {
    try {
      return await db.entries
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get entries');
      throw err;
    }
  }, []);

  const getAllEntries = useCallback(async () => {
    try {
      return await db.entries.toArray();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get entries');
      throw err;
    }
  }, []);

  const getSettings = useCallback(async () => {
    try {
      return await db.settings.get(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get settings');
      throw err;
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    try {
      const current = await db.settings.get(1);
      if (!current) {
        await db.settings.add({
          id: 1,
          pricePerLiter: null,
          payFrequencyType: 'weekly',
          payFrequencyValue: 1,
          lastPayoutDate: null,
          preferredCalcTime: '17:00',
          payStartDate: null,
          payStartTime: null,
          ...updates,
        });
      } else {
        await db.settings.update(1, updates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    }
  }, []);

  const getTimeSlotsList = useCallback(async () => {
    try {
      return await getTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get time slots');
      throw err;
    }
  }, []);

  const updateTimeSlots = useCallback(async (slots: string[]) => {
    try {
      await saveTimeSlots(slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time slots');
      throw err;
    }
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    // Entry operations
    addEntry,
    updateEntry,
    deleteEntry,
    getEntry,
    getEntriesByDate,
    getEntriesByDateRange,
    getAllEntries,
    // Settings operations
    getSettings,
    updateSettings,
    // Time slots
    getTimeSlotsList,
    updateTimeSlots,
  };
}
