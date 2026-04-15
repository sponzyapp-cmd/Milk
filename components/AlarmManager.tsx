'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { Settings } from '@/lib/types';

interface Alarm {
  id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
  days: number[]; // 0=Sun..6=Sat, empty = every day
}

// Persistent beeping: plays a short beep, returns a stop function
function startRinging(ctx: AudioContext): () => void {
  let stopped = false;

  function beep() {
    if (stopped) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
    if (!stopped) setTimeout(beep, 1200);
  }

  beep();
  return () => { stopped = true; };
}

const STORAGE_KEY = 'milk-tracker-alarms';

function loadAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlarms(alarms: Alarm[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SNOOZE_MINUTES = 5;

// Google Calendar RRULE day codes
const GCAL_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Build a Google Calendar "Add Event" URL for an alarm.
 * If settings provided, uses pay frequency + start date/time to define the recurrence.
 */
function buildGCalUrl(alarm: Alarm, settings?: Settings | null): string {
  const now = new Date();
  const [hh, mm] = alarm.time.split(':').map(Number);

  // Determine start date: use payStartDate if set, else today/tomorrow
  let startBase: Date;
  if (settings?.payStartDate) {
    const [yr, mo, dy] = settings.payStartDate.split('-').map(Number);
    startBase = new Date(yr, mo - 1, dy, hh, mm, 0);
    // If that date is in the past, use today at alarm time
    if (startBase < now) {
      startBase = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
      if (startBase <= now) startBase.setDate(startBase.getDate() + 1);
    }
  } else {
    startBase = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    if (startBase <= now) startBase.setDate(startBase.getDate() + 1);
  }

  const end = new Date(startBase.getTime() + 15 * 60 * 1000); // 15 min event

  const fmt = (d: Date) =>
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    'T' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    '00';

  // Build description with pay frequency info
  let details = 'Set by Milkie. Remember to add a notification reminder!';
  if (settings) {
    const freq = settings.payFrequencyType === 'weekly'
      ? `Every ${settings.payFrequencyValue} week(s)`
      : `Every ${settings.payFrequencyValue} month(s)`;
    const startInfo = settings.payStartDate
      ? ` starting ${settings.payStartDate}${settings.payStartTime ? ' at ' + settings.payStartTime : ''}`
      : '';
    details += `\nPay frequency: ${freq}${startInfo}.`;
    if (settings.pricePerLiter) details += `\nRate: KES ${settings.pricePerLiter}/L`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: alarm.label || 'Milk Collection',
    dates: `${fmt(startBase)}/${fmt(end)}`,
    details,
    sf: 'true',
    output: 'xml',
  });

  // Recurrence: respect pay frequency if no specific days set
  if (alarm.days.length > 0) {
    // Specific weekdays chosen
    const byday = alarm.days.map((d) => GCAL_DAYS[d]).join(',');
    params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${byday}`);
  } else if (settings?.payFrequencyType === 'monthly') {
    params.set('recur', `RRULE:FREQ=MONTHLY;INTERVAL=${settings.payFrequencyValue}`);
  } else if (settings?.payFrequencyType === 'weekly') {
    params.set('recur', `RRULE:FREQ=WEEKLY;INTERVAL=${settings.payFrequencyValue}`);
  } else {
    params.set('recur', 'RRULE:FREQ=DAILY');
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function AlarmManager() {
  const db = useDatabase();
  const [appSettings, setAppSettings] = useState<Settings | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [newTime, setNewTime] = useState('07:00');
  const [newLabel, setNewLabel] = useState('');
  const [newDays, setNewDays] = useState<number[]>([]);
  const [firing, setFiring] = useState<Alarm | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [snoozeInfo, setSnoozeInfo] = useState<string | null>(null); // "HH:MM" when snoozed

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRingRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which alarm IDs have already fired this minute to avoid double-firing
  const firedThisMinuteRef = useRef<Set<string>>(new Set());
  const lastMinuteRef = useRef<string>('');

  // Load from storage + DB on mount
  useEffect(() => {
    setAlarms(loadAlarms());
    if ('Notification' in window && Notification.permission === 'granted') {
      setPermissionGranted(true);
    }
  }, []);

  // Load app settings from DB
  useEffect(() => {
    if (!db.isInitialized) return;
    db.getSettings().then((s) => setAppSettings(s ?? null)).catch(() => {});
  }, [db.isInitialized]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermissionGranted(result === 'granted');
    }
  };

  const stopRinging = useCallback(() => {
    if (stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const startAlarmRinging = useCallback((alarm: Alarm) => {
    // Stop any existing ring first
    stopRinging();

    setFiring(alarm);
    setSnoozeInfo(null);

    // Audio
    try {
      audioCtxRef.current = new AudioContext();
      stopRingRef.current = startRinging(audioCtxRef.current);
    } catch (e) {
      console.warn('Audio failed:', e);
    }

    // Notification
    if (permissionGranted) {
      new Notification(`🥛 ${alarm.label || 'Milk Collection Time'}`, {
        body: `Time: ${alarm.time} — tap to dismiss`,
        icon: '/icon-192x192.png',
        tag: alarm.id,
        requireInteraction: true,
      });
    }
  }, [permissionGranted, stopRinging]);

  // Tick every 15s, check alarms
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dow = now.getDay();

      // Reset fired set each new minute
      if (hhmm !== lastMinuteRef.current) {
        lastMinuteRef.current = hhmm;
        firedThisMinuteRef.current = new Set();
      }

      const current = loadAlarms();
      for (const alarm of current) {
        if (!alarm.enabled) continue;
        if (alarm.time !== hhmm) continue;
        if (alarm.days.length > 0 && !alarm.days.includes(dow)) continue;
        if (firedThisMinuteRef.current.has(alarm.id)) continue;
        firedThisMinuteRef.current.add(alarm.id);
        startAlarmRinging(alarm);
      }
    }, 15000);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [startAlarmRinging]);

  const dismissAlarm = useCallback(() => {
    stopRinging();
    setFiring(null);
    setSnoozeInfo(null);
  }, [stopRinging]);

  const snoozeAlarm = useCallback(() => {
    if (!firing) return;
    stopRinging();

    // Calculate snooze time
    const now = new Date();
    now.setMinutes(now.getMinutes() + SNOOZE_MINUTES);
    const snoozeHH = String(now.getHours()).padStart(2, '0');
    const snoozeMM = String(now.getMinutes()).padStart(2, '0');
    const snoozeTime = `${snoozeHH}:${snoozeMM}`;

    const snoozedAlarm = { ...firing, time: snoozeTime, id: `snooze-${firing.id}-${Date.now()}`, enabled: true };
    setSnoozeInfo(snoozeTime);
    setFiring(null);

    // Add temporary snooze alarm to state + storage
    const current = loadAlarms();
    const updated = [...current, snoozedAlarm].sort((a, b) => a.time.localeCompare(b.time));
    saveAlarms(updated);
    setAlarms(updated);
  }, [firing, stopRinging]);

  const [lastAdded, setLastAdded] = useState<Alarm | null>(null);

  const addAlarm = () => {
    const alarm: Alarm = {
      id: Date.now().toString(),
      time: newTime,
      label: newLabel || 'Milk Collection',
      enabled: true,
      days: newDays,
    };
    const updated = [...alarms, alarm].sort((a, b) => a.time.localeCompare(b.time));
    setAlarms(updated);
    saveAlarms(updated);
    setLastAdded(alarm);
    setNewLabel('');
    setNewDays([]);
  };

  const toggleAlarm = (id: string) => {
    const updated = alarms.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAlarms(updated);
    saveAlarms(updated);
  };

  const deleteAlarm = (id: string) => {
    const updated = alarms.filter((a) => a.id !== id);
    setAlarms(updated);
    saveAlarms(updated);
  };

  const toggleDay = (day: number) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const testSound = () => {
    try {
      const ctx = new AudioContext();
      startRinging(ctx);
      setTimeout(() => ctx.close(), 3000);
    } catch (e) {
      console.warn('Audio test failed:', e);
    }
  };

  // Visible alarms = non-snooze ones
  const visibleAlarms = alarms.filter((a) => !a.id.startsWith('snooze-'));

  return (
    <div className="space-y-6">
      {/* Firing overlay */}
      {firing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-3 animate-bounce">⏰</div>
            <h2 className="text-2xl font-bold mb-1">{firing.label}</h2>
            <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2 tabular-nums">{firing.time}</p>
            <p className="text-sm text-muted-foreground mb-6">Ringing until dismissed…</p>
            <div className="flex gap-3">
              <button
                onClick={snoozeAlarm}
                className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-xl font-bold text-base hover:bg-yellow-600 transition-colors"
              >
                💤 Snooze {SNOOZE_MINUTES}m
              </button>
              <button
                onClick={dismissAlarm}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-base hover:bg-red-700 transition-colors"
              >
                ✓ Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snooze banner */}
      {snoozeInfo && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-center justify-between">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💤 Snoozed — will ring again at <strong>{snoozeInfo}</strong>
          </p>
          <button
            onClick={() => {
              // Cancel snooze: remove snooze alarms
              const updated = alarms.filter((a) => !a.id.startsWith('snooze-'));
              setAlarms(updated);
              saveAlarms(updated);
              setSnoozeInfo(null);
            }}
            className="text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 rounded font-medium hover:bg-yellow-300 dark:hover:bg-yellow-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Permission banner */}
      {!permissionGranted && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-between gap-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Enable notifications to get alerts when app is in background.
          </p>
          <button
            onClick={requestPermission}
            className="flex-shrink-0 px-3 py-1.5 bg-yellow-600 text-white rounded text-sm font-medium hover:bg-yellow-700"
          >
            Enable
          </button>
        </div>
      )}

      {/* Add Alarm */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h3 className="font-semibold text-base">New Alarm</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-lg font-semibold"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Morning Collection)"
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Repeat (leave empty = every day)</p>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  newDays.includes(idx)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-blue-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={addAlarm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Alarm
          </button>
          <button
            onClick={testSound}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            title="Test alarm sound"
          >
            🔊 Test
          </button>
        </div>

        {/* Google Calendar prompt shown right after adding */}
        {lastAdded && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">
              ✅ Alarm added! Add it to Google Calendar for reliable phone notifications even when the app is closed:
            </p>
            <div className="flex gap-2">
              <a
                href={buildGCalUrl(lastAdded, appSettings)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-lg text-sm font-semibold text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z"/>
                </svg>
                Add to Google Calendar
              </a>
              <button
                onClick={() => setLastAdded(null)}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alarm List */}
      {visibleAlarms.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No alarms set. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAlarms.map((alarm) => (
            <div
              key={alarm.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                alarm.enabled
                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 opacity-60'
              }`}
            >
              <div className="flex-1">
                <p className="text-2xl font-bold tabular-nums">{alarm.time}</p>
                <p className="text-sm text-muted-foreground">{alarm.label}</p>
                {alarm.days.length > 0 ? (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    {alarm.days.map((d) => DAY_LABELS[d]).join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Every day</p>
                )}
                <a
                  href={buildGCalUrl(alarm, appSettings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-green-700 dark:text-green-400 hover:underline"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z"/>
                  </svg>
                  Add to Google Calendar
                </a>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAlarm(alarm.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    alarm.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      alarm.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <button
                  onClick={() => deleteAlarm(alarm.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center px-2">
        Alarms ring continuously until dismissed or snoozed ({SNOOZE_MINUTES} min). Keep app open for reliable ringing. Enable notifications for background alerts.
      </p>
    </div>
  );
}
