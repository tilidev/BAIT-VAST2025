/** @type {import('next').NextConfig} */

module.exports = {
    devIndicators: false,

    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination:  process.env.BACKEND_URL + '/:path*' // proxy to backend
        }
      ];
    }
  };