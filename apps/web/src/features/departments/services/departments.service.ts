import 'server-only';
import { departmentsRepository, type Department } from '../data/departments.repository';

export const listDepartments = () => departmentsRepository.list();

export async function getDepartment(id: string): Promise<Department | undefined> {
  const rows = await listDepartments();
  return rows.find((dept) => dept.id === id);
}
