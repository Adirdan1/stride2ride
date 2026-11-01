import { Fraunces, Archivo, Heebo } from 'next/font/google';
import './globals.css';
import RegisterSW from './components/RegisterSW';

const display = Fraunces({ subsets: ['latin'], weight: ['700'], variable: '--font-display', display: 'swap' });
const sans = Archivo({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' });
// Fraunces and Archivo carry no Hebrew. Heebo is the Hebrew face, at pinned weights.
const hebrew = Heebo({ subsets: ['hebrew'], weight: ['400', '500', '700'], variable: '--font-hebrew', display: 'swap' });

export const metadata = {
  title: 'stride2ride',
  description: 'יומן שימוש ברכב המשותף',
  appleWebApp: { capable: true, title: 'רכב', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ee' },
    { media: '(prefers-color-scheme: dark)', color: '#141311' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${display.variable} ${sans.variable} ${hebrew.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
