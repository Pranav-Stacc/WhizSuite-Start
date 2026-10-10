import { z } from 'zod';
import { DESIGNATION_NAME_MAX_LENGTH } from '../auth/access.js';

export const DEPARTMENT_NAME_MIN_LENGTH = 2;
export const DEPARTMENT_NAME_MAX_LENGTH = 80;
export const DESIGNATION_NAME_MIN_LENGTH = 1;
/** Separator between ancestor names in a department's materialised `path`. */
export const DEPARTMENT_PATH_SEPARATOR = '/';

/** Rename and/or move a department; `parentId: null` moves it to the top level. */
export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(DEPARTMENT_NAME_MIN_LENGTH).max(DEPARTMENT_NAME_MAX_LENGTH).optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

/** A position inside a department (e.g. "Senior Designer"). */
export const designationInputSchema = z.object({
  name: z.string().trim().min(DESIGNATION_NAME_MIN_LENGTH).max(DESIGNATION_NAME_MAX_LENGTH),
  isHead: z.boolean().optional(),
});
export type DesignationInput = z.infer<typeof designationInputSchema>;

export const updateDesignationSchema = designationInputSchema.partial();
export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;

/** Response of designation create/update. */
export interface DesignationSummary {
  id: string;
  departmentId: string;
  name: string;
  isHead: boolean;
  /** Members currently holding this position. */
  memberCount: number;
}

/** Designation joined with its department name, used to describe member placements. */
export interface DesignationRef {
  id: string;
  name: string;
  isHead: boolean;
  departmentId: string;
  departmentName: string;
}
