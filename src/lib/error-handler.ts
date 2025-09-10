/**
 * Centralized Error Handling for Profile Operations
 * 
 * This module provides standardized error handling patterns and user feedback
 * for profile-related operations across the application.
 */

import { toast } from "sonner";

/**
 * Profile operation error types
 */
export enum ProfileErrorCode {
  PROFILE_NOT_FOUND = 'profile_not_found',
  PROFILE_CREATION_FAILED = 'profile_creation_failed',
  PROFILE_UPDATE_FAILED = 'profile_update_failed',
  AVATAR_UPLOAD_FAILED = 'avatar_upload_failed',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_DENIED = 'permission_denied',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<ProfileErrorCode, string> = {
  [ProfileErrorCode.PROFILE_NOT_FOUND]: 'User profile not found. Please refresh and try again.',
  [ProfileErrorCode.PROFILE_CREATION_FAILED]: 'Failed to create user profile. Please try again.',
  [ProfileErrorCode.PROFILE_UPDATE_FAILED]: 'Failed to update profile. Please try again.',
  [ProfileErrorCode.AVATAR_UPLOAD_FAILED]: 'Failed to upload avatar. Please try again.',
  [ProfileErrorCode.VALIDATION_ERROR]: 'Invalid data provided. Please check your input.',
  [ProfileErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action.',
  [ProfileErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ProfileErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

/**
 * Success messages for profile operations
 */
export const SUCCESS_MESSAGES = {
  PROFILE_CREATED: 'Profile created successfully',
  PROFILE_UPDATED: 'Profile updated successfully', 
  AVATAR_UPDATED: 'Avatar updated successfully',
  PROFILE_LOADED: 'Profile loaded successfully'
} as const;

/**
 * Enhanced error class for profile operations
 */
export class ProfileOperationError extends Error {
  constructor(
    public code: ProfileErrorCode,
    public originalError?: Error | unknown,
    message?: string
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'ProfileOperationError';
  }
}

/**
 * Handle profile operation errors with user feedback
 */
export function handleProfileError(error: unknown, operation: string = 'operation'): void {
  console.error(`Profile ${operation} error:`, error);
  
  if (error instanceof ProfileOperationError) {
    toast.error(error.message);
    return;
  }

  // Handle common Supabase errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = (error as any).message;
    
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      toast.error(ERROR_MESSAGES[ProfileErrorCode.PERMISSION_DENIED]);
      return;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      toast.error(ERROR_MESSAGES[ProfileErrorCode.NETWORK_ERROR]);
      return;
    }
    
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      toast.error(ERROR_MESSAGES[ProfileErrorCode.VALIDATION_ERROR]);
      return;
    }
  }
  
  // Fallback to generic error
  toast.error(ERROR_MESSAGES[ProfileErrorCode.UNKNOWN_ERROR]);
}

/**
 * Show success message for profile operations
 */
export function showProfileSuccess(message: string): void {
  toast.success(message);
}

/**
 * Wrapper for profile operations with standardized error handling
 */
export async function withProfileErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  successMessage?: string
): Promise<T | null> {
  try {
    const result = await operation();
    
    if (successMessage) {
      showProfileSuccess(successMessage);
    }
    
    return result;
  } catch (error) {
    handleProfileError(error, operationName);
    return null;
  }
}

/**
 * Validate profile data before operations
 */
export function validateProfileData(data: { email?: string; name?: string; id?: string }): void {
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new ProfileOperationError(
      ProfileErrorCode.VALIDATION_ERROR,
      undefined,
      'Invalid email format'
    );
  }
  
  if (data.name && data.name.trim().length < 1) {
    throw new ProfileOperationError(
      ProfileErrorCode.VALIDATION_ERROR,
      undefined,
      'Name is required'
    );
  }
  
  if (data.id && !data.id.trim()) {
    throw new ProfileOperationError(
      ProfileErrorCode.VALIDATION_ERROR,
      undefined,
      'User ID is required'
    );
  }
}

/**
 * Cache for profile operations to reduce repeated requests
 */
class ProfileCache {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  static set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  static clear(): void {
    this.cache.clear();
  }
  
  static clearUser(userId: string): void {
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }
}

export { ProfileCache };