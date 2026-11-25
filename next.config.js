/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CORS is handled per-route in lib/cors.ts (origin allowlist). Do not add a
  // global `Access-Control-Allow-Origin: *` here: it conflicts with credentials.

  // The theme sections (wholesale-register / wholesale-login / wholesale-account)
  // call {api_base_url}/register, /login, /account and /logout without the /api
  // prefix (that's how the old Cloudflare Worker was laid out). Map them here.
  async rewrites() {
    return [
      { source: '/register', destination: '/api/register' },
      { source: '/login', destination: '/api/login' },
      { source: '/account', destination: '/api/account' },
      { source: '/logout', destination: '/api/logout' },
    ];
  },
};

module.exports = nextConfig;
