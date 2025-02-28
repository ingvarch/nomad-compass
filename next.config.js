/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure environment variables
    env: {
        // The Nomad address can be provided as an environment variable
        NEXT_PUBLIC_NOMAD_ADDR: process.env.NOMAD_ADDR || '',
    },

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
