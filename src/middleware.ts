// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/api/nomad/')) {
        const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646';
        const nomadPath = pathname.replace('/api/nomad', '');
        const nomadUrl = `${nomadAddr}${nomadPath}${request.nextUrl.search}`;

        return NextResponse.rewrite(nomadUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/nomad/:path*',
};
