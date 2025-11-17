import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const API_URL = process.env.API_URL || 'https://ssl.winsnip.xyz';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter required' }, { status: 400 });
    }
    const url = new URL(endpoint, API_URL);
    searchParams.delete('endpoint');
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 10 }
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'API request failed', status: response.status },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
