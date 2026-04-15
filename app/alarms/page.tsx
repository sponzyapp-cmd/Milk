'use client';

import Link from 'next/link';
import { AlarmManager } from '@/components/AlarmManager';

export default function AlarmsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-8">
      <header className="sticky top-0 z-30 bg-background border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">⏰ Alarms</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AlarmManager />
      </div>
    </main>
  );
}
