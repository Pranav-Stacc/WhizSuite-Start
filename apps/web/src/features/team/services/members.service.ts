import 'server-only';
import { membersRepository, type Member } from '../data/members.repository';

export const listMembers = () => membersRepository.list();

export async function membersById(): Promise<Map<string, Member>> {
  return new Map((await listMembers()).map((m) => [m.id, m]));
}

export async function memberName(id: string | undefined): Promise<string | undefined> {
  return id ? (await membersById()).get(id)?.name : undefined;
}
