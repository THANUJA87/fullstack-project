import { z } from 'zod';

const requiredText = (label) => z.string().trim().min(1, `${label} is required`);

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registrationSchema = z.object({
  name: requiredText('Name'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const projectSchema = z.object({
  name: requiredText('Project name'),
  address: requiredText('Address'),
  useCase: requiredText('Use case'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']),
  tenantId: z.string().uuid().optional(),
});

export const userSchema = z.object({
  name: requiredText('Name'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().uuid().optional(),
  permissions: z.array(z.string()).default([]),
});

export const permissionSchema = z.object({
  key: z.string().trim().min(1, 'Permission key is required'),
  label: requiredText('Permission label'),
});

export function validationMessage(result) {
  return result.success ? '' : result.error.issues[0]?.message || 'Please check the form';
}
