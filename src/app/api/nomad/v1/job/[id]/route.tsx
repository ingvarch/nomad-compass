import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const nomadBaseUrl = process.env.NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');

    // Forward any querystring parameters
    const url = new URL(request.url);
    const queryString = url.search;

    try {
        const response = await fetch(`${nomadBaseUrl}/v1/jobs${queryString}`, {
            headers: {
                'X-Nomad-Token': token || '',
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

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

export async function POST(request: NextRequest) {
    const nomadBaseUrl = process.env.NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');

    try {
        const body = await request.json();

        const response = await fetch(`${nomadBaseUrl}/v1/jobs`, {
            method: 'POST',
            headers: {
                'X-Nomad-Token': token || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error('Nomad API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to create job in Nomad API' },
            { status: 500 }
        );
    }
}
