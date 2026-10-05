import 'server-only';
import { rolesRepository } from '../data/roles.repository';

export const listRoles = () => rolesRepository.list();
