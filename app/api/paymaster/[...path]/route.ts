import { NextRequest, NextResponse } from 'next/server';

const PAYMASTER_BASE_URL = 'https://kora-9do3.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST');
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'OPTIONS');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const url = new URL(path, PAYMASTER_BASE_URL);
    
    // Extract JWT token from query parameters if present
    let jwtTokenFromQuery = null;
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key === 'token') {
        jwtTokenFromQuery = value;
        console.log('🔑 Found JWT token in query parameters');
      } else {
        url.searchParams.set(key, value);
      }
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Copy relevant headers from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log('🔑 Forwarding JWT token to paymaster service');
    } else if (jwtTokenFromQuery) {
      // Use JWT token from query parameters
      headers['Authorization'] = `Bearer ${jwtTokenFromQuery}`;
      console.log('🔑 Using JWT token from query parameters');
    } else {
      // Try to get JWT token from request headers
      const jwtToken = request.headers.get('x-jwt-token');
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
        console.log('🔑 Using JWT token from x-jwt-token header');
      } else {
        console.warn('⚠️ No authorization header or JWT token found in request');
      }
    }

    let body: string | undefined;
    if (method === 'POST' || method === 'PUT') {
      body = await request.text();
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    const responseText = await response.text();
    
    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Paymaster proxy error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Proxy request failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
