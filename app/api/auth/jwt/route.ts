 import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, passkeyData } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Create JWT payload
    const payload = {
      walletAddress,
      passkeyData: passkeyData || null,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    // Sign JWT token
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
    });

    console.log('🔑 Generated JWT token for wallet:', walletAddress);

    return NextResponse.json({
      token,
      expiresIn: '24h',
      walletAddress,
    });
  } catch (error) {
    console.error('JWT generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate JWT token' },
      { status: 500 }
    );
  }
}
