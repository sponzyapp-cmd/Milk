'use client';

import { useEffect } from 'react';

/**
 * Register service worker for PWA functionality
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator)) {
      console.warn('[v0] Service Workers not supported');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        console.log('[v0] Service Worker registered successfully:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update().catch((error) => {
            console.warn('[v0] Failed to check for SW updates:', error);
          });
        }, 60000); // Check every minute

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[v0] Service Worker controller changed');
        });

        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[v0] Message from SW:', event.data);
        });
      } catch (error) {
        console.error('[v0] Failed to register Service Worker:', error);
      }
    };

    // Wait a bit before registering to avoid blocking initial load
    const timeout = setTimeout(registerServiceWorker, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
