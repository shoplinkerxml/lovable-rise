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
   * Create or update user profile
   */
  static async upsertProfile(profileData: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Error upserting user profile:', error);
        throw error;
      }
      
      return data as UserProfile | null;
    } catch (error) {
      console.error('Error in upsertProfile:', error);
      throw error;
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
   * Create user profile with retry logic
   */
  static async createProfile(profileData: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
    const maxRetries = 3;
    let retryCount = 0;
    
    try {
      // Validate profile data
      validateProfileData(profileData);
    } catch (error) {
      throw error; // Re-throw validation errors
    }
    
    while (retryCount < maxRetries) {
      try {
        const profile = await this.upsertProfile(profileData);
        if (profile) {
          // Clear cache and update with new profile
          ProfileCache.clearUser(profileData.id);
          ProfileCache.set(`profile_${profileData.id}`, profile);
          
          this.logProfileOperation('createProfile', profileData.id, profile);
          return profile;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      } catch (error) {
        console.error(`Profile creation attempt ${retryCount + 1} failed:`, error);
        if (retryCount === maxRetries - 1) {
          throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, error);
        }
        retryCount++;
      }
    }
    
    throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED);
  }
  
  /**
   * Ensure profile exists, create if missing
   */
  static async ensureProfile(userId: string, userData: { email: string; name: string }): Promise<UserProfile | null> {
    try {
      let profile = await this.getProfile(userId);
      
      if (!profile) {
        console.log('Profile not found, creating...', userId);
        profile = await this.createProfile({
          id: userId,
          email: userData.email,
          name: userData.name,
          role: 'user',
          status: 'active'
        });
      }
      
      return profile;
    } catch (error) {
      if (error instanceof ProfileOperationError && error.code === ProfileErrorCode.PROFILE_NOT_FOUND) {
        // Try to create the profile if it doesn't exist
        try {
          return await this.createProfile({
            id: userId,
            email: userData.email,
            name: userData.name,
            role: 'user',
            status: 'active'
          });
        } catch (createError) {
          throw new ProfileOperationError(ProfileErrorCode.PROFILE_CREATION_FAILED, createError);
        }
      }
      throw error;
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
   * Log profile operations for debugging
   */
  private static logProfileOperation(operation: string, userId: string, result: any): void {
    console.log(`[ProfileService] ${operation}:`, {
      userId,
      timestamp: new Date().toISOString(),
      result: result ? 'success' : 'null/failure'
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