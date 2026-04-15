'use client';

import { useCallback, useState } from 'react';
import { Entry, PayoutCalculation, Settings } from '@/lib/types';
import { calculatePayout, formatDate } from '@/lib/calculations';

/**
 * Custom hook for payout calculations
 */
export function usePayout() {
  const [payoutData, setPayoutData] = useState<PayoutCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePayoutData = useCallback(
    (
      entries: Entry[],
      settings: Settings | null,
      endDate: string = formatDate(new Date())
    ) => {
      try {
        if (!settings) {
          throw new Error('Settings not initialized');
        }

        setIsCalculating(true);
        const calculation = calculatePayout(entries, settings, endDate);
        setPayoutData(calculation);
        setError(null);
        return calculation;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to calculate payout';
        setError(errorMsg);
        setPayoutData(null);
        throw err;
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  const resetPayout = useCallback(() => {
    setPayoutData(null);
    setError(null);
  }, []);

  return {
    payoutData,
    isCalculating,
    error,
    calculatePayoutData,
    resetPayout,
  };
}
