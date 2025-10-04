/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/paymaster/:path*',
        destination: 'https://kora-9do3.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;