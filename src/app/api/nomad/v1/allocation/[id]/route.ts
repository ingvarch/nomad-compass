import { NextRequest, NextResponse } from 'next/server';
import { nomadAddr } from '@/constants/env';

export async function GET(
    request: NextRequest,
    context: any
) {
    const token = request.headers.get('X-Nomad-Token');
    const allocId = context.params.id;
    // const nomadAddr = process.env.NOMAD_ADDR || 'http://localhost:4646';

    try {
        const response = await fetch(`${nomadAddr}/v1/allocation/${allocId}`, {
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
            { error: `Failed to fetch allocation ${allocId}` },
            { status: 500 }
        );
    }
}
