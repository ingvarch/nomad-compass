import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    context: any
) {
    const nomadBaseUrl = process.env.NEXT_PUBLIC_NOMAD_ADDR || 'http://localhost:4646';
    const token = request.headers.get('X-Nomad-Token');
    const allocId = context.params.id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const task = searchParams.get('task');
    const type = searchParams.get('type') || 'stdout';
    const plain = searchParams.get('plain') === 'true';

    if (!task) {
        return NextResponse.json(
            { error: 'Task parameter is required' },
            { status: 400 }
        );
    }

    try {
        const url = new URL(`${nomadBaseUrl}/v1/client/fs/logs/${allocId}`);
        url.searchParams.append('task', task);
        url.searchParams.append('type', type);
        if (plain) {
            url.searchParams.append('plain', 'true');
        }

        const response = await fetch(url.toString(), {
            headers: {
                'X-Nomad-Token': token || '',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }

        const data = await response.text();

        return new NextResponse(data, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error) {
        console.error('Nomad API proxy error:', error);
        return NextResponse.json(
            { error: `Failed to fetch logs for allocation ${allocId}` },
            { status: 500 }
        );
    }
}
