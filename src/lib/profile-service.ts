/**
 * Centralized Profile Service
 * 
 * This service provides standardized methods for profile operations
 * with proper error handling for PostgREST PGRST116 errors.
 * It replaces direct .single() calls with .maybeSingle() to prevent
 * 406 "Not Acceptable" errors when profiles don't exist.
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ProfileOperationError, 
  ProfileErrorCode, 
  validateProfileData,
  ProfileCache 
} from "./error-handler";
import { SessionValidator, isAuthenticationError, createAuthenticatedClient } from "./session-validation";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if an error is a PostgREST PGRST116 (empty result) error
 */
function isPostgRESTEmptyError(error: any): boolean {
  return error?.code === 'PGRST116' || 
         error?.message?.includes('The result contains 0 rows');
}

/**
 * Handle PostgREST errors by converting PGRST116 to null, re-throwing others
 */
function handlePostgRESTError(error: any): any {
  if (isPostgRESTEmptyError(error)) {
    return null; // Convert empty result error to null
  }
  throw error; // Re-throw other errors
}

/**
 * Profile error types for consistent error handling
 */
export enum ProfileError {
  PROFILE_NOT_FOUND = 'profile_not_found',
  PROFILE_CREATION_FAILED = 'profile_creation_failed',
  PROFILE_UPDATE_FAILED = 'profile_update_failed',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  NETWORK_ERROR = 'network_error'
}

export class ProfileService {
  /**
   * Get user profile by email address
   * Returns null if profile doesn't exist instead of throwing PGRST116 error
   */
  static async getProfileByEmail(email: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      const cached = ProfileCache.get(`profile_email_${email.toLowerCase()}`);
      if (cached) {
        this.logProfileOperation('getProfileByEmail (cached)', email, cached);
        return cached;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile by email:', error);
        const result = handlePostgRESTError(error);
        if (result === null) {
          throw new ProfileOperationError(ProfileErrorCode.PROFILE_NOT_FOUND, error);
        }
        throw new ProfileOperationError(ProfileErrorCode.NETWORK_ERROR, error);
      }
      
      // Cache the result if it exists
      if (data) {
        ProfileCache.set(`profile_email_${email.toLowerCase()}`, data);
        ProfileCache.set(`profile_${data.id}`, data); // Also cache by ID
      }
      
      this.logProfileOperation('getProfileByEmail', email, data);
      return data as UserProfile | null;
    } catch (error) {
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      console.error('Error in getProfileByEmail:', error);
      throw new ProfileOperationError(ProfileErrorCode.NETWORK_ERROR, error);
    }
  }

  /**
   * Get user profile by ID
   * Returns null if profile doesn't exist instead of throwing PGRST116 error
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      const cached = ProfileCache.get(`profile_${userId}`);
      if (cached) {
        this.logProfileOperation('getProfile (cached)', userId, cached);
        return cached;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        const result = handlePostgRESTError(error);
        if (result === null) {
          throw new ProfileOperationError(ProfileErrorCode.PROFILE_NOT_FOUND, error);
        }
        throw new ProfileOperationError(ProfileErrorCode.NETWORK_ERROR, error);
      }
      
      // Cache the result if it exists
      if (data) {
        ProfileCache.set(`profile_${userId}`, data);
      }
      
      this.logProfileOperation('getProfile', userId, data);
      return data as UserProfile | null;
    } catch (error) {
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      console.error('Error in getProfile:', error);
      throw new ProfileOperationError(ProfileErrorCode.NETWORK_ERROR, error);
    }
  }
  
  /**
   * Get user profile by ID, throwing error if not found
   * Use this when profile existence is required
   */
  static async requireProfile(userId: string): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile;
  }

  /**
   * Check if multiple users exist by email addresses
   * Returns a map of email -> exists boolean
   */
  static async checkMultipleUsersExist(emails: string[]): Promise<Map<string, boolean>> {
    try {
      const results = new Map<string, boolean>();
      
      // Process emails in batches to avoid overwhelming the database
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < emails.length; i += batchSize) {
        batches.push(emails.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .in('email', batch.map(email => email.toLowerCase()));
        
        if (error) {
          console.error('Error checking multiple users existence:', error);
          // Mark all as potentially existing on error to be safe
          batch.forEach(email => results.set(email, true));
          continue;
        }
        
        const existingEmails = new Set((data || []).map(profile => profile.email));
        batch.forEach(email => {
          results.set(email, existingEmails.has(email.toLowerCase()));
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error in checkMultipleUsersExist:', error);
      // Return map with all emails marked as potentially existing
      const results = new Map<string, boolean>();
      emails.forEach(email => results.set(email, true));
      return results;
    }
  }

  /**
   * Get user profile with specific fields only
   */
  static async getProfileFields(userId: string, fields: string[]): Promise<Partial<UserProfile> | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(fields.join(','))
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile fields:', error);
        return handlePostgRESTError(error);
      }
      
      return data;
    } catch (error) {
      console.error('Error in getProfileFields:', error);
      return handlePostgRESTError(error);
    }
  }

  /**
   * Create or update user profile with UPSERT and verification
   * This method ensures reliable profile creation with conflict resolution
   */
  static async upsertProfile(profileData: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
    try {
      // Validate profile data
      if (!profileData.email || !profileData.name || !profileData.id) {
        throw new Error('Missing required profile fields');
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single(); // Use single() since we're upserting one record
      
      if (error) {
        console.error('Error upserting user profile:', error);
        throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
      }
      
      // Update cache with new profile data
      if (data) {
        ProfileCache.set(`profile_${data.id}`, data);
        if (data.email) {
          ProfileCache.set(`profile_email_${data.email.toLowerCase()}`, data);
        }
      }
      
      return data as UserProfile | null;
    } catch (error) {
      console.error('Error in upsertProfile:', error);
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
    }
  }

  /**
   * Update user profile fields
   */
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      // Validate update data
      validateProfileData({ ...updates, id: userId });
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Error updating user profile:', error);
        throw new ProfileOperationError(ProfileErrorCode.PROFILE_UPDATE_FAILED, error);
      }
      
      if (data) {
        // Update cache
        ProfileCache.set(`profile_${userId}`, data);
        this.logProfileOperation('updateProfile', userId, data);
      }
      
      return data as UserProfile | null;
    } catch (error) {
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      console.error('Error in updateProfile:', error);
      throw new ProfileOperationError(ProfileErrorCode.PROFILE_UPDATE_FAILED, error);
    }
  }

  /**
   * Check if user has admin role
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfileFields(userId, ['role']);
      return profile?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if user has admin or manager role
   */
  static async hasAdminAccess(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfileFields(userId, ['role']);
      return profile?.role === 'admin' || profile?.role === 'manager';
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }

  /**
   * Get user role
   */
  static async getUserRole(userId: string): Promise<string | null> {
    try {
      const profile = await this.getProfileFields(userId, ['role']);
      return profile?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Ensure profile exists - get or create profile with given data
   * This method provides a convenient way to ensure a profile exists
   */
  static async ensureProfile(
    userId: string, 
    profileData: { email: string; name: string }
  ): Promise<UserProfile | null> {
    try {
      // First try to get existing profile
      let profile = await this.getProfile(userId);
      
      if (profile) {
        return profile;
      }
      
      // If no profile exists, create one using upsert
      profile = await this.upsertProfile({
        id: userId,
        email: profileData.email,
        name: profileData.name,
        role: 'admin', // Default role for admin authentication
        status: 'active'
      });
      
      return profile;
    } catch (error) {
      console.error('Error ensuring profile:', error);
      return null;
    }
  }

  /**
   * Create profile with authentication context awareness
   * This method waits for proper authentication before attempting profile creation
   */
  static async createProfileWithAuthContext(
    profileData: Partial<UserProfile> & { id: string },
    options: { waitForAuth?: boolean; maxWaitTime?: number } = {}
  ): Promise<UserProfile> {
    const { waitForAuth = true, maxWaitTime = 5000 } = options;
    
    try {
      // If waiting for auth is enabled, check for valid session first
      if (waitForAuth) {
        await this.waitForValidSession(profileData.id, maxWaitTime);
      }
      
      // Proceed with profile creation
      return await this.createProfileWithVerification(profileData);
    } catch (error) {
      console.error('Error in createProfileWithAuthContext:', error);
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
    }
  }

  /**
   * Wait for a valid authentication session to be available
   * Enhanced with proper session validation
   */
  private static async waitForValidSession(userId: string, maxWaitTime: number): Promise<boolean> {
    console.log(`[ProfileService] Waiting for valid session for user ${userId}...`);
    
    const validation = await SessionValidator.waitForValidSession(userId, maxWaitTime);
    
    if (validation.isValid) {
      console.log('[ProfileService] Valid session found for profile operations');
      return true;
    }
    
    console.warn(`[ProfileService] No valid session found within ${maxWaitTime}ms for user ${userId}`, {
      error: validation.error,
      hasSession: !!validation.session
    });
    
    return false;
  }

  /**
   * Create profile with enhanced retry logic for authorization issues
   */
  static async createProfileWithAuthRetry(
    profileData: Partial<UserProfile> & { id: string },
    maxRetries: number = 3
  ): Promise<UserProfile> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Profile creation attempt ${attempt}/${maxRetries} for user ${profileData.id}`);
        
        // Add progressive delay between attempts
        if (attempt > 1) {
          const delay = 500 * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Check for valid session before each attempt
        const sessionValid = await this.waitForValidSession(profileData.id, 2000);
        
        if (!sessionValid) {
          console.warn(`Session not valid for attempt ${attempt}, proceeding anyway`);
        }
        
        // Attempt profile creation
        const profile = await this.createProfileWithVerification(profileData);
        console.log(`Profile creation succeeded on attempt ${attempt}`);
        return profile;
        
      } catch (error) {
        lastError = error;
        console.error(`Profile creation attempt ${attempt} failed:`, error);
        
        // Check if this is an authorization-related error
        if (this.isAuthorizationError(error)) {
          console.error('Authorization error detected in profile creation');
          
          // If we still have retries left, continue
          if (attempt < maxRetries) {
            console.log('Retrying due to authorization error...');
            continue;
          }
        }
        
        // For non-auth errors or final attempt, break
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    console.error(`Profile creation failed after ${maxRetries} attempts`);
    throw lastError || new Error(`Profile creation failed after ${maxRetries} attempts`);
  }

  /**
   * Enhanced authorization error detection with session validation context
   */
  private static isAuthorizationError(error: any): boolean {
    return isAuthenticationError(error);
  }

  /**
   * Create user profile with verification and retry logic
   * Ensures profile is actually created and can be retrieved
   */
  static async createProfileWithVerification(
    profileData: Partial<UserProfile> & { id: string }
  ): Promise<UserProfile> {
    try {
      // Validate profile data
      if (!profileData.email || !profileData.name || !profileData.id) {
        throw new Error('Missing required profile fields');
      }

      // Step 1: UPSERT operation
      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Profile upsert failed:', upsertError);
        throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, upsertError);
      }

      // Step 2: Verification with delay for triggers
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: verifiedProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileData.id)
        .single();

      if (verifyError || !verifiedProfile) {
        console.error('Profile verification failed:', verifyError);
        throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, verifyError);
      }

      // Step 3: Update cache
      ProfileCache.set(`profile_${profileData.id}`, verifiedProfile);
      if (verifiedProfile.email) {
        ProfileCache.set(`profile_email_${verifiedProfile.email.toLowerCase()}`, verifiedProfile);
      }

      return verifiedProfile as UserProfile;
    } catch (error) {
      console.error('Error in createProfileWithVerification:', error);
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
    }
  }
  
  /**
   * Create user profile with retry logic (kept for backward compatibility)
   */
  static async createProfile(profileData: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
    try {
      // Use the new verification method
      return await this.createProfileWithVerification(profileData);
    } catch (error) {
      console.error('Error in createProfile:', error);
      return null;
    }
  }

  /**
   * Find profiles by email pattern (for admin search functionality)
   */
  static async findProfilesByEmailPattern(pattern: string, limit: number = 10): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${pattern}%`)
        .limit(limit);
      
      if (error) {
        console.error('Error finding profiles by email pattern:', error);
        return [];
      }
      
      return (data || []) as UserProfile[];
    } catch (error) {
      console.error('Error in findProfilesByEmailPattern:', error);
      return [];
    }
  }

  /**
   * Get profile existence status by email without fetching full profile
   * Optimized for existence checks only
   */
  static async profileExistsByEmail(email: string): Promise<boolean> {
    try {
      // Check cache first
      const cached = ProfileCache.get(`exists_${email.toLowerCase()}`);
      if (cached !== null) {
        return cached;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (error) {
        const result = handlePostgRESTError(error);
        if (result === null) {
          ProfileCache.set(`exists_${email.toLowerCase()}`, false);
          return false;
        }
        throw error;
      }
      
      const exists = !!data;
      ProfileCache.set(`exists_${email.toLowerCase()}`, exists);
      return exists;
    } catch (error) {
      console.error('Error checking profile existence by email:', error);
      // Return true on error to be safe and avoid duplicate registrations
      return true;
    }
  }

  /**
   * Create profile with authentication context (Bearer token)
   * Enhanced with proper session validation and standard Supabase client usage
   */
  static async createProfileWithAuth(
    profileData: Partial<UserProfile> & { id: string },
    accessToken?: string
  ): Promise<UserProfile> {
    try {
      // Validate that name is present
      if (!profileData.name || profileData.name.trim() === '') {
        console.warn('[ProfileService] Profile name is missing, using fallback');
        profileData.name = profileData.email?.split('@')[0] || 'User';
      }
      
      // Log profile data for debugging
      console.log('[ProfileService] Creating profile with data:', {
        id: profileData.id,
        email: profileData.email,
        name: profileData.name
      });
      
      // Validate session first
      const sessionValidation = await SessionValidator.ensureValidSession();
      
      if (!sessionValidation.isValid) {
        throw new ProfileOperationError(
          ProfileErrorCode.INSUFFICIENT_PERMISSIONS, 
          `No valid session for profile creation: ${sessionValidation.error}`
        );
      }
      
      // Validate profile data
      if (!profileData.email || !profileData.name || !profileData.id) {
        throw new ProfileOperationError(
          ProfileErrorCode.PROFILE_CREATION_FAILED,
          'Missing required profile fields'
        );
      }
      
      // Log session context for debugging
      await SessionValidator.logSessionDebugInfo('profile-creation');
      
      // Use upsert instead of insert to handle cases where profile might already exist
      // This is more robust for registration flows
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();
        
      if (error) {
        console.error('[ProfileService] Profile creation failed:', error);
        
        // Enhanced error handling for authentication issues
        if (this.isAuthorizationError(error)) {
          // Validate RLS context for debugging
          const rlsValidation = await SessionValidator.validateRLSContext();
          console.error('[ProfileService] RLS context validation:', rlsValidation);
          
          throw new ProfileOperationError(
            ProfileErrorCode.INSUFFICIENT_PERMISSIONS, 
            `Authentication error during profile creation: ${error.message}`
          );
        }
        
        throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
      }
      
      // Update cache
      if (data) {
        ProfileCache.set(`profile_${data.id}`, data);
        if (data.email) {
          ProfileCache.set(`profile_email_${data.email.toLowerCase()}`, data);
        }
      }
      
      this.logProfileOperation('createProfileWithAuth', profileData.id, data);
      return data as UserProfile;
    } catch (error) {
      if (error instanceof ProfileOperationError) {
        throw error;
      }
      console.error('[ProfileService] Error in createProfileWithAuth:', error);
      throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
    }
  }

  /**
   * Get current access token from Supabase session
   * Enhanced with session validation
   */
  private static async getCurrentAccessToken(): Promise<string | null> {
    try {
      const validation = await SessionValidator.validateSession();
      
      if (!validation.isValid || !validation.accessToken) {
        console.warn('[ProfileService] No valid access token available');
        return null;
      }
      
      return validation.accessToken;
    } catch (error) {
      console.error('[ProfileService] Error getting current session:', error);
      return null;
    }
  }

  /**
   * Validate profile data before operations
   */
  private static validateProfileData(data: Partial<UserProfile>): void {
    if (!data.email || !data.name || !data.id) {
      throw new Error('Missing required profile fields');
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Log profile operations for debugging with enhanced token context
   */
  private static logProfileOperation(operation: string, userId: string, result: any): void {
    console.log(`[ProfileService] ${operation}:`, {
      userId,
      timestamp: new Date().toISOString(),
      result: result ? 'success' : 'null/failure',
      context: 'RLS-aware operation'
    });
  }
}

/**
 * Error response creator for consistent API responses
 */
export function createErrorResponse(message: string, code?: string, status = 500): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
    'Content-Type': 'application/json'
  };

  return new Response(
    JSON.stringify({ 
      error: message, 
      code,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: corsHeaders 
    }
  );
}

/**
 * API Service for handling responses with PostgREST error handling
 */
export class APIService {
  static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 406) {
        // Handle PostgREST 406 errors specifically
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'PGRST116') {
          return null as T; // Convert to null for empty results
        }
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }
}