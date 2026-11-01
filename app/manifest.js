export default function manifest() {
  return {
    name: 'stride2ride',
    short_name: 'רכב',
    description: 'יומן שימוש ברכב המשותף',
    lang: 'he',
    dir: 'rtl',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f4ee',
    theme_color: '#f7f4ee',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
