/** @type {import('next').NextConfig} */
const nextConfig = {
    // CORS proxy
    async rewrites() {
        return [
            {
                source: '/api/nomad/:path*',
                destination: `${process.env.NOMAD_ADDR || 'http://localhost:4646'}/:path*`,
                basePath: false,
            },
        ];
    },
};

module.exports = nextConfig;
