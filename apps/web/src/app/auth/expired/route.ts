import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/session';

export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '?expired=1';
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
