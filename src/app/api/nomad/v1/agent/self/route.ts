import { NextRequest, NextResponse } from 'next/server';
import { NOMAD_BASE_URL } from '@/constants/env';

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Nomad-Token');

    // console.log('Jobs request details:', {
    //     nomadBaseUrl: NOMAD_BASE_URL,
    //     tokenPresent: !!token
    // });

    try {
        const response = await fetch(`${NOMAD_BASE_URL}/v1/jobs`, {
            headers: {
                'X-Nomad-Token': token || '',
                'Content-Type': 'application/json',
            },
        });

        // console.log('Fetch jobs response:', {
        //     status: response.status,
        //     headers: Object.fromEntries(response.headers.entries())
        // });

        const data = await response.json();
        // console.log('Jobs data:', data);

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
