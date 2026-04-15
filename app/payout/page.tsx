'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDatabase } from '@/hooks/useDatabase';
import { usePayout } from '@/hooks/usePayout';
import { Entry, Settings } from '@/lib/types';
import { formatDate, formatCurrency, formatNumber } from '@/lib/helpers';

export default function PayoutPage() {
  const db = useDatabase();
  const { payoutData, isCalculating, error, calculatePayoutData, resetPayout } = usePayout();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    if (!db.isInitialized) return;

    (async () => {
      try {
        const [entriesData, settingsData] = await Promise.all([
          db.getAllEntries(),
          db.getSettings(),
        ]);

        setEntries(entriesData);
        setSettings(settingsData);
      } catch (error) {
        console.error('[v0] Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [db.isInitialized]);

  const handleCalculatePayout = () => {
    if (!settings) return;
    calculatePayoutData(entries, settings);
  };

  const handleMarkAsPaid = async () => {
    if (!payoutData || !settings) return;

    try {
      await db.updateSettings({
        ...settings,
        lastPayoutDate: payoutData.endDate,
      });
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              lastPayoutDate: payoutData.endDate,
            }
          : null
      );
      resetPayout();
    } catch (error) {
      console.error('[v0] Failed to update payout date:', error);
    }
  };

  if (!db.isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
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
          <h1 className="text-2xl font-bold">Payout Calculation</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Settings Info */}
        <section className="mb-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price per Liter:</span>
              <span className="font-medium">
                {settings?.pricePerLiter ? `KES ${settings.pricePerLiter.toFixed(2)}` : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pay Frequency:</span>
              <span className="font-medium">
                {settings?.payFrequencyType === 'weekly' ? 'Weekly' : 'Monthly'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Payout Date:</span>
              <span className="font-medium">{settings?.lastPayoutDate || 'Never'}</span>
            </div>
          </div>
        </section>

        {/* Calculate Button */}
        <section className="mb-8">
          <button
            onClick={handleCalculatePayout}
            disabled={isCalculating || !settings || !settings.pricePerLiter}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Payout'}
          </button>
          {!settings?.pricePerLiter && (
            <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
              Set price per liter in settings to calculate earnings
            </p>
          )}
        </section>

        {/* Payout Summary */}
        {payoutData && (
          <section className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Liters</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                  {payoutData.totalLiters.toFixed(1)}L
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">Earnings</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {payoutData.earnings ? `KES ${payoutData.earnings.toFixed(2)}` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold mb-4">Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Real Data:</span>
                  <span className="font-medium tabular-nums">{payoutData.realLiters.toFixed(1)}L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Data:</span>
                  <span className="font-medium tabular-nums text-red-600 dark:text-red-400">
                    {payoutData.estimatedLiters.toFixed(1)}L ({payoutData.estimatedCount} days)
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-semibold">
                  <span>Period</span>
                  <span>
                    {payoutData.startDate} to {payoutData.endDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Details */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold mb-4">Daily Details</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payoutData.dailyBreakdown.map((day) => (
                  <div key={day.date} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{day.date}</p>
                      <p className="text-xs text-muted-foreground">{day.dayOfWeek}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium tabular-nums ${day.isPartiallyEstimated ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {day.totalLiters.toFixed(1)}L
                      </p>
                      {day.isPartiallyEstimated && <p className="text-xs text-red-600 dark:text-red-400">Est.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mark as Paid */}
            <button
              onClick={handleMarkAsPaid}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Mark as Paid
            </button>
          </section>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
