'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDatabase } from '@/hooks/useDatabase';
import { Settings as SettingsType, Entry } from '@/lib/types';
import { generateCSV, generateJSON, downloadCSV, downloadJSON, copyToClipboard } from '@/lib/helpers';
import { formatDate } from '@/lib/calculations';

export default function Settings() {
  const db = useDatabase();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(['07:00', '17:00']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Load settings
  useEffect(() => {
    if (!db.isInitialized) return;

    (async () => {
      try {
        const [settingsData, slotsData] = await Promise.all([
          db.getSettings(),
          db.getTimeSlotsList(),
        ]);

        setSettings(settingsData || null);
        setTimeSlots(slotsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [db.isInitialized]);

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      await db.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTimeSlot = async () => {
    if (!newTimeSlot || timeSlots.includes(newTimeSlot)) return;

    const updated = [...timeSlots, newTimeSlot].sort();
    try {
      await db.updateTimeSlots(updated);
      setTimeSlots(updated);
      setNewTimeSlot('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time slot');
    }
  };

  const handleRemoveTimeSlot = async (slot: string) => {
    const updated = timeSlots.filter((s) => s !== slot);
    if (updated.length < 1) {
      setError('Must have at least one time slot');
      return;
    }

    try {
      await db.updateTimeSlots(updated);
      setTimeSlots(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove time slot');
    }
  };

  const handleExportJSON = async () => {
    try {
      setExportStatus('Exporting...');
      const allEntries = await db.getAllEntries();
      const exportData = {
        exportedAt: formatDate(new Date()),
        dataVersion: '1.0.0',
        entries: allEntries,
        settings,
        timeSlots,
      };

      const jsonString = generateJSON(exportData);
      downloadJSON(jsonString, `milk-sales-${formatDate(new Date())}.json`);
      setExportStatus('JSON exported successfully');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportStatus('Exporting...');
      const allEntries = await db.getAllEntries();
      const csvString = generateCSV(allEntries, timeSlots);
      downloadCSV(csvString, `milk-sales-${formatDate(new Date())}.csv`);
      setExportStatus('CSV exported successfully');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleExportToClipboard = async () => {
    try {
      setExportStatus('Copying...');
      const allEntries = await db.getAllEntries();
      const exportData = {
        exportedAt: formatDate(new Date()),
        dataVersion: '1.0.0',
        entries: allEntries,
        settings,
        timeSlots,
      };

      const jsonString = generateJSON(exportData);
      const success = await copyToClipboard(jsonString);

      if (success) {
        setExportStatus('Data copied to clipboard');
        setTimeout(() => setExportStatus(null), 3000);
      } else {
        setError('Failed to copy to clipboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy failed');
    }
  };

  const handleResetData = async () => {
    try {
      setIsSaving(true);
      const { resetAllData } = await import('@/lib/db');
      await resetAllData();
      setShowResetConfirm(false);
      setSettings(null);
      setTimeSlots(['07:00', '17:00']);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (!db.isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-200">
            ✓ Saved successfully
          </div>
        )}

        {exportStatus && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-200">
            {exportStatus}
          </div>
        )}

        {/* Price per Liter */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Payment Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price per Liter</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={settings?.pricePerLiter ?? ''}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, pricePerLiter: parseFloat(e.target.value) || null } : null
                    )
                  }
                  placeholder="Optional"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
                />
                <span className="flex items-center px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-muted-foreground">
                  KES / L
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pay Frequency</label>
              <div className="flex gap-4">
                <select
                  value={settings?.payFrequencyType ?? 'weekly'}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            payFrequencyType: e.target.value as 'weekly' | 'monthly',
                          }
                        : null
                    )
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={settings?.payFrequencyValue ?? 1}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, payFrequencyValue: parseInt(e.target.value) || 1 } : null
                    )
                  }
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preferred Payout Time</label>
              <input
                type="time"
                value={settings?.preferredCalcTime ?? '17:00'}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, preferredCalcTime: e.target.value } : null
                  )
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Save Settings
            </button>
          </div>
        </section>

        {/* Time Slots */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Time Slots</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="time"
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
                placeholder="HH:MM"
              />
              <button
                onClick={handleAddTimeSlot}
                disabled={!newTimeSlot || timeSlots.includes(newTimeSlot)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div key={slot} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">{slot}</span>
                  <button
                    onClick={() => handleRemoveTimeSlot(slot)}
                    disabled={timeSlots.length <= 1}
                    className="text-xs px-3 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-900 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Export Data</h2>
          <div className="space-y-3">
            <button
              onClick={handleExportJSON}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Export as JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Export as CSV
            </button>
            <button
              onClick={handleExportToClipboard}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
        </section>

        {/* Data Reset */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Danger Zone</h2>

          {showResetConfirm ? (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-4">
                This will permanently delete all data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleResetData}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Yes, Delete All Data
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Reset All Data
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
