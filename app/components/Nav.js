import Link from 'next/link';

const ITEMS = [
  { href: '/', label: 'בית' },
  { href: '/usage', label: 'שימוש' },
  { href: '/savings', label: 'חיסכון' },
];

export default function Nav({ current }) {
  return (
    <nav className="nav" aria-label="ניווט">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className="nav__item" aria-current={current === it.href ? 'page' : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
