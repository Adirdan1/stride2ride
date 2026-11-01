import Link from 'next/link';
import Nav from './Nav';
import AutoRefresh from './AutoRefresh';

export default function Shell({ current, aside, children }) {
  return (
    <>
      <header className="bar">
        <span className="brand" dir="ltr">stride2ride<span className="brand__mark">.</span></span>
        <span className="bar__end">
          <Link href="/settings" className="icon-btn" aria-label="הגדרות" aria-current={current === '/settings' ? 'page' : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </Link>
          {aside}
        </span>
      </header>
      <main className="screen">{children}</main>
      <Nav current={current} />
      <AutoRefresh />
    </>
  );
}
