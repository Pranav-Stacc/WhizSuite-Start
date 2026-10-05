import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/session';

const TEMPORARY_REDIRECT = 307;

/** Relative Location: behind Amplify's compute layer the request URL carries the internal host. */
export function GET() {
  const response = new NextResponse(null, { status: TEMPORARY_REDIRECT, headers: { location: '/login?expired=1' } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
