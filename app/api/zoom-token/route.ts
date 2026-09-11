import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const { sessionName } = await request.json();

    if (!sessionName || typeof sessionName !== 'string') {
      return NextResponse.json({ error: 'sessionName is required' }, { status: 400 });
    }

    const sdkKey = process.env.ZOOM_VIDEO_SDK_KEY;
    const sdkSecret = process.env.ZOOM_VIDEO_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      return NextResponse.json(
        { error: 'Zoom Video SDK credentials are not configured in Vercel yet.' },
        { status: 500 },
      );
    }

    const iat = Math.floor(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const secret = new TextEncoder().encode(sdkSecret);

    const token = await new SignJWT({
      app_key: sdkKey,
      role_type: 1,
      tpc: sessionName,
      version: 1,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not generate Zoom token.' }, { status: 500 });
  }
}
