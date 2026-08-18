/** @type {import('next').NextConfig} */
const nextConfig = {
  // Real, deliberate choice — outputs a fully static export, which is
  // exactly what Cloudflare Pages (and most free static hosts) expect.
  // Data still loads live at request time via fetch() inside each
  // page/component — this doesn't mean the DATA is static, just that
  // the HTML/JS bundle itself is pre-built rather than server-rendered
  // per request.
  output: 'export',
};

export default nextConfig;
