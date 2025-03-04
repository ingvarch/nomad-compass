import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const nomadBaseUrl = process.env.NEXT_PUBLIC_NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');

    console.log('Jobs request details:', {
        nomadBaseUrl,
        tokenPresent: !!token
    });

    try {
        const response = await fetch(`${nomadBaseUrl}/v1/jobs`, {
            headers: {
                'X-Nomad-Token': token || '',
                'Content-Type': 'application/json',
            },
        });

        console.log('Fetch jobs response:', {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });

        const data = await response.json();
        console.log('Jobs data:', data);

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error('Nomad API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch jobs from Nomad API' },
            { status: 500 }
        );
    }
}
