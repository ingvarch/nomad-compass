import { NextResponse } from 'next/server';

export async function GET() {
    // Provide configuration to the client
    return NextResponse.json({
        nomadAddr: process.env.NOMAD_ADDR || 'http://localhost:4646',
    });
}
