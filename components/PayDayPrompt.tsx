'use client';

import { useEffect, useState } from 'react';
import { PayRecord, Settings } from '@/lib/types';
import { generatePayPeriods, formatDate } from '@/lib/calculations';

const PROMPT_KEY = 'milk-payday-prompt';

interface PromptState {
  shownDate: string;  // YYYY-MM-DD: last calendar day we showed the prompt
  answeredYes: boolean;
}

interface PayDayPromptProps {
  settings: Settings | null;
  payRecords: PayRecord[];
  onMarkPaid: (periodStart: string, periodEnd: string) => Promise<void>;
}

export function PayDayPrompt({ settings, payRecords, onMarkPaid }: PayDayPromptProps) {
  const [pendingPeriod, setPendingPeriod] = useState<{ start: string; end: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings?.payStartDate) return;

    const today = formatDate(new Date());
    const freqType = settings.payFrequencyType || 'weekly';
    const freqVal = settings.payFrequencyValue || 1;

    const allPeriods = generatePayPeriods(settings.payStartDate, freqType, freqVal, 200);
    const paidEnds = new Set(payRecords.map((r) => r.periodEnd));

    // Find the most recent period that ended today or earlier and isn't yet paid
    const due = [...allPeriods]
      .reverse()
      .find((p) => p.end <= today && !paidEnds.has(p.end));

    if (!due) return;

    // Check session storage: have we already shown & the user said "No" today?
    try {
      const raw = sessionStorage.getItem(PROMPT_KEY);
      if (raw) {
        const state: PromptState = JSON.parse(raw);
        // Already answered YES — don't show again
        if (state.answeredYes) return;
        // Already shown today with a "No" — don't show again until next startup
        if (state.shownDate === today) return;
      }
    } catch {
      // ignore
    }

    // Show prompt
    setPendingPeriod(due);
    setVisible(true);

    // Record that we've shown it today
    try {
      sessionStorage.setItem(PROMPT_KEY, JSON.stringify({ shownDate: today, answeredYes: false }));
    } catch { /* ignore */ }
  }, [settings, payRecords]);

  const handleYes = async () => {
    if (!pendingPeriod) return;
    setSaving(true);
    try {
      await onMarkPaid(pendingPeriod.start, pendingPeriod.end);
      try {
        sessionStorage.setItem(PROMPT_KEY, JSON.stringify({ shownDate: formatDate(new Date()), answeredYes: true }));
      } catch { /* ignore */ }
      setVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleNo = () => {
    // Keep the "No" recorded in sessionStorage (already done above), just close
    setVisible(false);
  };

  if (!visible || !pendingPeriod) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-8 sm:pb-0">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Green header */}
        <div className="bg-green-600 px-6 py-5 text-white text-center">
          <div className="text-4xl mb-2">💰</div>
          <h2 className="text-xl font-bold">Pay Day!</h2>
          <p className="text-sm text-green-100 mt-1">
            Period ended: {pendingPeriod.start} → {pendingPeriod.end}
          </p>
        </div>

        <div className="px-6 py-6">
          <p className="text-base font-semibold text-center mb-1">Did you get paid?</p>
          <p className="text-sm text-muted-foreground text-center mb-6">
            If yes, we'll mark this period as paid and highlight it green.
            If not, we'll ask again next time you open the app.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleNo}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Not yet
            </button>
            <button
              onClick={handleYes}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : '✓ Yes, paid!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
