'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Somebody else's trip should reach this screen without a pull: re-run the
// server components every 30 seconds while visible, and on coming back to the app.
export default function AutoRefresh({ every = 30_000 }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && router.refresh();
    const id = setInterval(tick, every);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, every]);
  return null;
}
