import { z } from "zod";

// Registration form validation schema
export const registrationSchema = z.object({
  name: z.string().min(2, "name_min_length").max(50, "Name must be at most 50 characters"),
  email: z.string().email("email_invalid"),
  password: z.string().min(8, "password_min"),
  confirmPassword: z.string().min(1, "confirm_password_required"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "terms_required"
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "passwords_match",
  path: ["confirmPassword"]
});

// Login form validation schema
export const loginSchema = z.object({
  email: z.string().email("email_invalid"),
  password: z.string().min(1, "password_required")
});

// Password reset form validation schema
export const resetPasswordSchema = z.object({
  email: z.string().email("email_invalid")
});

// Password update form validation schema (for reset completion)
export const updatePasswordSchema = z.object({
  password: z.string().min(8, "password_min"),
  confirmPassword: z.string().min(1, "confirm_password_required")
}).refine(data => data.password === data.confirmPassword, {
  message: "passwords_match",
  path: ["confirmPassword"]
});

// Type exports for form data
export type RegistrationData = z.infer<typeof registrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordData = z.infer<typeof updatePasswordSchema>;

// User profile interface
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user';
  status: 'active' | 'inactive';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Authentication response interface
export interface AuthResponse {
  user: UserProfile | null;
  session: any | null;
  error: string | null;
}

// Authentication error types with enhanced messaging
export enum UserAuthError {
  REGISTRATION_FAILED = 'registration_failed',
  LOGIN_FAILED = 'login_failed',
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_EXISTS = 'email_exists',
  WEAK_PASSWORD = 'weak_password',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  PROFILE_CREATION_FAILED = 'profile_creation_failed',
  EMAIL_CONFIRMATION_REQUIRED = 'email_confirmation_required',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  USER_NOT_FOUND = 'user_not_found'
}

// Enhanced registration error interface
export interface RegistrationError {
  type: 'validation' | 'user_exists' | 'network' | 'rate_limit' | 'signup_failed' | 'profile_failed';
  message: string;
  code: string;
  retryable: boolean;
  suggestedAction?: string;
}

// User existence check result interface
export interface UserExistenceCheck {
  exists: boolean;
  profile?: UserProfile | null;
  authUser?: boolean;
  existenceType?: 'profile_only' | 'auth_only' | 'both' | 'none';
}