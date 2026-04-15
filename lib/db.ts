/**
 * Dexie database setup for IndexedDB
 * Handles all local persistence for the Milk Sales Tracking App
 */

import Dexie, { Table } from 'dexie';
import { Entry, Settings, Meta } from './types';

export class MilkTrackerDB extends Dexie {
  entries!: Table<Entry>;
  settings!: Table<Settings>;
  meta!: Table<Meta>;

  constructor() {
    super('milkTrackerDB');
    this.version(1).stores({
      entries: '++id, date, timeSlot, isEstimated, createdAt',
      settings: 'id',
      meta: 'key',
    });

    // Add hooks for data validation
    this.entries.hook('creating', (primKey, obj) => {
      obj.createdAt = Date.now();
      obj.updatedAt = Date.now();
    });

    this.entries.hook('updating', (mods) => {
      mods.updatedAt = Date.now();
    });
  }
}

// Export singleton instance
export const db = new MilkTrackerDB();

/**
 * Initialize database with default settings if first run
 */
export async function initializeDatabase() {
  try {
    // Check if settings exist
    const existingSettings = await db.settings.toArray();

    if (existingSettings.length === 0) {
      // First run - create default settings
      await db.settings.add({
        id: 1,
        pricePerLiter: null,
        payFrequencyType: 'weekly',
        payFrequencyValue: 1,
        lastPayoutDate: null,
        preferredCalcTime: '17:00', // 5 PM default
      });
    }

    // Check if time slots exist in meta
    const timeSlotsMeta = await db.meta.get('timeSlots');
    if (!timeSlotsMeta) {
      await db.meta.add({
        key: 'timeSlots',
        value: ['07:00', '17:00'], // Default morning and evening
      });
    }

    // Clean up old data (older than 6 months)
    await cleanupOldData();

    console.log('[v0] Database initialized successfully');
  } catch (error) {
    console.error('[v0] Database initialization error:', error);
    throw error;
  }
}

/**
 * Delete entries older than 6 months
 */
export async function cleanupOldData() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffDate = sixMonthsAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    const deleted = await db.entries
      .where('date')
      .below(cutoffDate)
      .delete();

    if (deleted > 0) {
      console.log(`[v0] Cleaned up ${deleted} old entries`);
    }
  } catch (error) {
    console.error('[v0] Cleanup error:', error);
  }
}

/**
 * Export all data from database
 */
export async function exportAllData() {
  try {
    const entries = await db.entries.toArray();
    const settings = await db.settings.get(1);
    const timeSlotsMeta = await db.meta.get('timeSlots');

    return {
      exportedAt: new Date().toISOString(),
      dataVersion: '1.0.0',
      entries,
      settings: settings || null,
      timeSlots: timeSlotsMeta?.value || ['07:00', '17:00'],
    };
  } catch (error) {
    console.error('[v0] Export error:', error);
    throw error;
  }
}

/**
 * Import data into database (for restore operations)
 */
export async function importData(data: any) {
  try {
    await db.transaction('rw', db.entries, db.settings, db.meta, async () => {
      // Clear existing data
      await db.entries.clear();
      await db.settings.clear();

      // Import entries
      if (data.entries && Array.isArray(data.entries)) {
        await db.entries.bulkAdd(data.entries);
      }

      // Import settings
      if (data.settings) {
        await db.settings.put(data.settings);
      }

      // Import time slots
      if (data.timeSlots && Array.isArray(data.timeSlots)) {
        await db.meta.put({
          key: 'timeSlots',
          value: data.timeSlots,
        });
      }
    });

    console.log('[v0] Data imported successfully');
  } catch (error) {
    console.error('[v0] Import error:', error);
    throw error;
  }
}

/**
 * Reset all data (with confirmation)
 */
export async function resetAllData() {
  try {
    await db.transaction('rw', db.entries, db.settings, db.meta, async () => {
      await db.entries.clear();
      await db.settings.clear();
      await db.meta.clear();
    });

    // Re-initialize with defaults
    await initializeDatabase();

    console.log('[v0] Data reset complete');
  } catch (error) {
    console.error('[v0] Reset error:', error);
    throw error;
  }
}

/**
 * Get time slots from meta table
 */
export async function getTimeSlots(): Promise<string[]> {
  try {
    const meta = await db.meta.get('timeSlots');
    return meta?.value || ['07:00', '17:00'];
  } catch (error) {
    console.error('[v0] Error getting time slots:', error);
    return ['07:00', '17:00'];
  }
}

/**
 * Save time slots to meta table
 */
export async function saveTimeSlots(slots: string[]): Promise<void> {
  try {
    // Sort slots to ensure consistency
    const sortedSlots = slots.slice().sort();
    await db.meta.put({
      key: 'timeSlots',
      value: sortedSlots,
    });
  } catch (error) {
    console.error('[v0] Error saving time slots:', error);
    throw error;
  }
}
