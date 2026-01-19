import { z } from 'zod';

export const UserRole = z.enum(['BUYER', 'SELLER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: UserRole.default('BUYER'),
  companyName: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const TokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type Tokens = z.infer<typeof TokensSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
  companyName: z.string().nullable(),
  isVerified: z.boolean(),
  createdAt: z.string().or(z.date()),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  tokens: TokensSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
