import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    context: any
) {
    const nomadBaseUrl = process.env.NEXT_PUBLIC_NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');
    const jobId = context.params.id;
    const namespace = request.nextUrl.searchParams.get('namespace') || 'default';

    try {
        const response = await fetch(`${nomadBaseUrl}/v1/job/${jobId}?namespace=${namespace}`, {
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
            { error: `Failed to fetch job ${jobId}` },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: any
) {
    const nomadBaseUrl = process.env.NEXT_PUBLIC_NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');
    const jobId = context.params.id;
    const url = new URL(request.url);
    const purge = url.searchParams.get('purge') === 'true';

    let apiUrl = `${nomadBaseUrl}/v1/job/${jobId}`;
    if (purge) {
        apiUrl += '?purge=true';
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
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
            { error: `Failed to ${purge ? 'delete' : 'stop'} job ${jobId}` },
            { status: 500 }
        );
    }
}
