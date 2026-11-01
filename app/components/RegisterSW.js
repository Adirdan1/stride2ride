'use client';
import { useEffect } from 'react';

// Registers /sw.js on every page so that, by the time someone taps
// "הפעל התראות", serviceWorker.ready resolves straight away.
export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
