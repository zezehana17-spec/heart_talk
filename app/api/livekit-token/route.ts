import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const room = req.nextUrl.searchParams.get('room') || 'hearttalk-test';
    const username = req.nextUrl.searchParams.get('username') || `guest-${Date.now()}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json(
        { error: 'LiveKit credentials are not configured in Vercel yet.' },
        { status: 500 },
      );
    }

    const token = new AccessToken(apiKey, apiSecret, { identity: username });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({ token: await token.toJwt(), serverUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not generate LiveKit token.' }, { status: 500 });
  }
}
