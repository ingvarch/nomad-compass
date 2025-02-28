import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const nomadBaseUrl = process.env.NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');
    const jobId = params.id;

    try {
        const response = await fetch(`${nomadBaseUrl}/v1/job/${jobId}/allocations`, {
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
            { error: `Failed to fetch allocations for job ${jobId}` },
            { status: 500 }
        );
    }
}
