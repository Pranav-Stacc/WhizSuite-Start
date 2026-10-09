import { NextResponse, type NextRequest } from 'next/server';
import { UserRoles } from '@agency-os/contracts';
import { getPermissions } from '@/shared/auth/permissions';
import { getSession } from '@/shared/auth/session';
import { searchWorkspace } from '@/features/search/services/search.service';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role === UserRoles.CLIENT) return NextResponse.json({ groups: [] }, { status: 401 });
  const groups = await searchWorkspace(request.nextUrl.searchParams.get('q') ?? '', await getPermissions());
  return NextResponse.json({ groups }, { headers: { 'cache-control': 'private, no-store' } });
}
