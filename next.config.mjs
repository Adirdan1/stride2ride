/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  // The widget template is read from disk at runtime; without this, production 404s what dev served.
  outputFileTracingIncludes: { '/api/widget-script': ['./scripts/widget.js'] },
  async headers() {
    return [
      {
        // The service worker must never be served stale, or a fix to it
        // would not reach phones that already installed the app.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};
