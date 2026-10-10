import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/shared/auth/session-codec';

const TEMPORARY_REDIRECT = 307;

/** Relative Location: behind Amplify's compute layer the request URL carries the internal host. */
export function GET() {
  const response = new NextResponse(null, { status: TEMPORARY_REDIRECT, headers: { location: '/login?expired=1' } });
  clearSessionCookie(response.cookies);
  return response;
}
