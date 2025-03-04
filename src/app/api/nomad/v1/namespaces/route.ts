// src/app/api/nomad/v1/namespaces/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const nomadBaseUrl = process.env.NEXT_PUBLIC_NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');

    try {
        const response = await fetch(`${nomadBaseUrl}/v1/namespaces`, {
            headers: {
                'X-Nomad-Token': token || '',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            // If can't fetch namespaces (e.g., enterprise feature or older Nomad),
            // return a default namespace
            if (response.status === 404) {
                return NextResponse.json([{ Name: 'default' }], { status: 200 });
            }

            return NextResponse.json(
                { error: `Failed to fetch namespaces: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Nomad API proxy error:', error);
        // Return default namespace on error for graceful degradation
        return NextResponse.json([{ Name: 'default' }], { status: 200 });
    }
}
