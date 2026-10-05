import 'server-only';
import { departmentsRepository } from '../data/departments.repository';

export const listDepartments = () => departmentsRepository.list();
