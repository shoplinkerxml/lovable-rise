/**
 * User Existence Check Service
 * 
 * This service provides comprehensive user existence validation to prevent
 * unnecessary signup attempts and improve registration flow efficiency.
 * It addresses the issue where the system makes redundant API calls to
 * Supabase Auth even when users already exist.
 */

import { supabase } from "@/integrations/supabase/client";
import { ProfileService, UserProfile } from "./profile-service";
import { ProfileCache } from "./error-handler";

/**
 * User existence check result interface
 */
export interface UserExistenceCheck {
  exists: boolean;
  profile?: UserProfile | null;
  authUser?: boolean;
  existenceType?: 'profile_only' | 'auth_only' | 'both' | 'none';
}

/**
 * Registration error types with specific user existence scenarios
 */
export interface RegistrationError {
  type: 'validation' | 'user_exists' | 'network' | 'rate_limit' | 'signup_failed' | 'profile_failed';
  message: string;
  code: string;
  retryable: boolean;
  suggestedAction?: string;
}

/**
 * User existence validation service
 */
export class UserExistenceService {
  private static readonly CACHE_PREFIX = 'user_existence_';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Primary method for checking if a user exists
   * Checks both profiles table and auth users
   */
  static async checkUserExists(email: string): Promise<UserExistenceCheck> {
    try {
      if (!this.validateEmailFormat(email)) {
        throw new Error('Invalid email format');
      }

      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${email.toLowerCase()}`;
      const cached = ProfileCache.get(cacheKey);
      if (cached) {
        this.logCheck(email, cached.exists, 'cached');
        return cached;
      }

      // Check profile existence first (most common case)
      const profile = await ProfileService.getProfileByEmail(email);
      
      if (profile) {
        const result: UserExistenceCheck = {
          exists: true,
          profile,
          authUser: true, // If profile exists, auth user likely exists too
          existenceType: 'both'
        };
        
        // Cache the result
        ProfileCache.set(cacheKey, result);
        this.logCheck(email, true, 'profile_found');
        return result;
      }

      // If no profile, check if auth user exists without profile
      const authUserExists = await this.checkAuthUserExists(email);
      
      const result: UserExistenceCheck = {
        exists: authUserExists,
        profile: null,
        authUser: authUserExists,
        existenceType: authUserExists ? 'auth_only' : 'none'
      };

      // Cache the result
      ProfileCache.set(cacheKey, result);
      this.logCheck(email, authUserExists, authUserExists ? 'auth_only' : 'not_found');
      
      return result;
    } catch (error) {
      console.error('Error checking user existence:', error);
      this.logCheck(email, false, 'error');
      
      // Return safe default - assume user doesn't exist on error
      return {
        exists: false,
        profile: null,
        authUser: false,
        existenceType: 'none'
      };
    }
  }

  /**
   * Check if user exists by ID
   */
  static async checkUserExistsById(id: string): Promise<boolean> {
    try {
      const profile = await ProfileService.getProfile(id);
      return !!profile;
    } catch (error) {
      console.error('Error checking user existence by ID:', error);
      return false;
    }
  }

  /**
   * Check if auth user exists without profile
   * This uses admin API functionality if available
   */
  static async checkAuthUserExists(email: string): Promise<boolean> {
    try {
      // Use auth.admin to check if user exists in auth
      // Note: This requires service role key in server environment
      // For client-side, we'll use a different approach
      
      // Attempt to get user by email using auth admin
      // This is a simplified check - in production, you might want to
      // implement this as an edge function for security
      
      // For now, we'll use the sign in attempt with a dummy password
      // and check the error type to determine if user exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy_password_for_existence_check_12345'
      });
      
      if (error) {
        // If error is about invalid credentials, user exists
        // If error is about user not found, user doesn't exist
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('invalid login credentials') || 
            errorMessage.includes('invalid credentials')) {
          return true; // User exists but wrong password
        }
        
        if (errorMessage.includes('user not found') || 
            errorMessage.includes('email not found')) {
          return false; // User doesn't exist
        }
        
        // For other errors (like too many requests), assume user might exist
        return true;
      }
      
      // If no error, user exists and password was correct (unlikely with dummy password)
      return true;
    } catch (error) {
      console.error('Error checking auth user existence:', error);
      // On error, assume user might exist to be safe
      return true;
    }
  }

  /**
   * Comprehensive existence check across both auth and profiles
   * Provides detailed information about user state
   */
  static async comprehensiveUserCheck(email: string): Promise<UserExistenceCheck> {
    try {
      const result = await this.checkUserExists(email);
      
      // Additional validation and detailed state detection
      if (result.exists && result.profile) {
        // User has both auth and profile - fully registered
        return {
          ...result,
          existenceType: 'both'
        };
      }
      
      if (result.exists && !result.profile) {
        // User has auth but no profile - incomplete registration
        return {
          ...result,
          existenceType: 'auth_only'
        };
      }
      
      // User doesn't exist
      return {
        ...result,
        existenceType: 'none'
      };
    } catch (error) {
      console.error('Error in comprehensive user check:', error);
      return {
        exists: false,
        profile: null,
        authUser: false,
        existenceType: 'none'
      };
    }
  }

  /**
   * Batch existence check for multiple emails
   * Useful for admin operations or bulk validation
   */
  static async checkMultipleUsersExist(emails: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Process emails in batches to avoid overwhelming the database
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (email) => {
        const check = await this.checkUserExists(email);
        return [email, check.exists] as [string, boolean];
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(([email, exists]) => {
        results.set(email, exists);
      });
    }
    
    return results;
  }

  /**
   * Clear existence cache for a specific email
   */
  static clearExistenceCache(email: string): void {
    const cacheKey = `${this.CACHE_PREFIX}${email.toLowerCase()}`;
    ProfileCache.clearUser(cacheKey);
  }

  /**
   * Clear all existence cache
   */
  static clearAllExistenceCache(): void {
    ProfileCache.clear();
  }

  /**
   * Validate email format
   */
  static validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get registration error with specific messaging
   */
  static getRegistrationError(type: RegistrationError['type'], originalError?: any): RegistrationError {
    const errorMap: Record<RegistrationError['type'], Omit<RegistrationError, 'type'>> = {
      validation: {
        message: 'Please check your input and try again.',
        code: 'VALIDATION_ERROR',
        retryable: true,
        suggestedAction: 'Correct the highlighted fields and resubmit.'
      },
      user_exists: {
        message: 'An account with this email already exists. Please sign in instead.',
        code: 'USER_EXISTS',
        retryable: false,
        suggestedAction: 'Use the sign in form or reset your password if needed.'
      },
      network: {
        message: 'Network connection issue. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        retryable: true,
        suggestedAction: 'Check your internet connection and retry.'
      },
      rate_limit: {
        message: 'Too many registration attempts. Please try again in a few minutes.',
        code: 'RATE_LIMIT',
        retryable: true,
        suggestedAction: 'Wait a few minutes before attempting registration again.'
      },
      signup_failed: {
        message: 'Registration failed. Please try again.',
        code: 'SIGNUP_FAILED',
        retryable: true,
        suggestedAction: 'Try again or contact support if the problem persists.'
      },
      profile_failed: {
        message: 'Account created but profile setup failed. Please contact support.',
        code: 'PROFILE_FAILED',
        retryable: false,
        suggestedAction: 'Contact support to complete your account setup.'
      }
    };

    return {
      type,
      ...errorMap[type]
    };
  }

  /**
   * Log user existence check for monitoring and debugging
   */
  private static logCheck(email: string, exists: boolean, source: string): void {
    const maskedEmail = email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    console.log(`[UserExistenceService] Check for ${maskedEmail}: ${exists ? 'EXISTS' : 'NOT_FOUND'} (${source})`, {
      timestamp: new Date().toISOString(),
      source,
      exists
    });
  }
}