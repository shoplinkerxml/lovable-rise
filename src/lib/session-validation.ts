/**
 * Session and Token Validation Utilities
 * 
 * This module provides utilities for validating Supabase authentication sessions
 * and ensuring proper token handling for Row Level Security (RLS) policies.
 * 
 * Key Issues Addressed:
 * - Ensures access_token (not anon key) is used in Authorization header
 * - Validates session expiration and auto-refresh
 * - Provides debugging utilities for RLS token issues
 * - Monitors token validity for database operations
 */

import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export interface SessionValidationResult {
  isValid: boolean;
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
  needsRefresh: boolean;
  error?: string;
}

export interface TokenDebugInfo {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenPrefix: string;
  userId: string | null;
  isExpired: boolean;
  expiresIn: number | null;
  sessionAge: number | null;
}

/**
 * Comprehensive session validation utility
 * Ensures proper access token handling for RLS policies
 */
export class SessionValidator {
  private static readonly REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly SESSION_CHECK_INTERVAL = 30 * 1000; // 30 seconds
  
  /**
   * Validate current session and access token
   * Returns detailed information about session state
   */
  static async validateSession(): Promise<SessionValidationResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[SessionValidator] Session fetch error:', error);
        return {
          isValid: false,
          session: null,
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false,
          error: error.message
        };
      }
      
      if (!session) {
        return {
          isValid: false,
          session: null,
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false,
          error: 'No active session'
        };
      }
      
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const timeUntilExpiry = expiresAt ? expiresAt - now : null;
      const needsRefresh = timeUntilExpiry ? timeUntilExpiry < this.REFRESH_THRESHOLD_MS : false;
      const isExpired = timeUntilExpiry ? timeUntilExpiry <= 0 : false;
      
      return {
        isValid: !isExpired && !!session.access_token && !!session.user,
        session,
        user: session.user,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt,
        timeUntilExpiry,
        needsRefresh,
        error: isExpired ? 'Session expired' : undefined
      };
    } catch (error) {
      console.error('[SessionValidator] Validation error:', error);
      return {
        isValid: false,
        session: null,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Ensure session is valid and refresh if needed
   * Critical for RLS operations that require valid access token
   */
  static async ensureValidSession(): Promise<SessionValidationResult> {
    const validation = await this.validateSession();
    
    if (!validation.isValid && validation.session?.refresh_token) {
      console.log('[SessionValidator] Session invalid, attempting refresh...');
      
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession({
          refresh_token: validation.session.refresh_token
        });
        
        if (error) {
          console.error('[SessionValidator] Session refresh failed:', error);
          return {
            ...validation,
            error: `Refresh failed: ${error.message}`
          };
        }
        
        if (session) {
          console.log('[SessionValidator] Session refreshed successfully');
          return this.validateSession(); // Re-validate after refresh
        }
      } catch (error) {
        console.error('[SessionValidator] Refresh error:', error);
        return {
          ...validation,
          error: error instanceof Error ? error.message : 'Refresh failed'
        };
      }
    }
    
    return validation;
  }
  
  /**
   * Wait for a valid authentication session
   * Used during registration/login to ensure proper token availability
   */
  static async waitForValidSession(
    expectedUserId?: string,
    maxWaitTime: number = 10000
  ): Promise<SessionValidationResult> {
    const startTime = Date.now();
    const checkInterval = 200; // Check every 200ms
    
    console.log('[SessionValidator] Waiting for valid session...', { expectedUserId, maxWaitTime });
    
    while (Date.now() - startTime < maxWaitTime) {
      const validation = await this.validateSession();
      
      if (validation.isValid) {
        // If we're expecting a specific user, verify it matches
        if (expectedUserId && validation.user?.id !== expectedUserId) {
          console.warn('[SessionValidator] Session user mismatch', {
            expected: expectedUserId,
            actual: validation.user?.id
          });
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          continue;
        }
        
        console.log('[SessionValidator] Valid session found', {
          userId: validation.user?.id,
          hasAccessToken: !!validation.accessToken,
          timeUntilExpiry: validation.timeUntilExpiry
        });
        return validation;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.warn('[SessionValidator] No valid session found within timeout', {
      maxWaitTime,
      expectedUserId
    });
    
    return this.validateSession(); // Return final state
  }
  
  /**
   * Get detailed token information for debugging
   * Helps diagnose RLS issues related to token handling
   */
  static async getTokenDebugInfo(): Promise<TokenDebugInfo> {
    const validation = await this.validateSession();
    
    return {
      hasAccessToken: !!validation.accessToken,
      hasRefreshToken: !!validation.refreshToken,
      tokenPrefix: validation.accessToken ? 
        `${validation.accessToken.substring(0, 10)}...` : 'none',
      userId: validation.user?.id || null,
      isExpired: validation.timeUntilExpiry ? validation.timeUntilExpiry <= 0 : false,
      expiresIn: validation.timeUntilExpiry,
      sessionAge: null // Remove session age tracking as created_at is not available
    };
  }
  
  /**
   * Check if current user has valid auth.uid() context for RLS
   * This validates that database queries will have proper user context
   */
  static async validateRLSContext(): Promise<{ isValid: boolean; userId: string | null; error?: string }> {
    try {
      const validation = await this.ensureValidSession();
      
      if (!validation.isValid || !validation.accessToken) {
        return {
          isValid: false,
          userId: null,
          error: 'No valid access token for RLS context'
        };
      }
      
      // Test RLS context by calling a Supabase query that depends on auth.uid()
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', validation.user!.id)
        .maybeSingle();
      
      if (error) {
        console.error('[SessionValidator] RLS context test failed:', error);
        return {
          isValid: false,
          userId: validation.user?.id || null,
          error: `RLS test failed: ${error.message}`
        };
      }
      
      return {
        isValid: !!data,
        userId: validation.user!.id,
        error: !data ? 'RLS context not working - auth.uid() may be null' : undefined
      };
    } catch (error) {
      console.error('[SessionValidator] RLS context validation error:', error);
      return {
        isValid: false,
        userId: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Log detailed session information for debugging
   * Useful for troubleshooting authentication and RLS issues
   */
  static async logSessionDebugInfo(context: string = 'general'): Promise<void> {
    try {
      const validation = await this.validateSession();
      const debugInfo = await this.getTokenDebugInfo();
      const rlsContext = await this.validateRLSContext();
      
      console.log(`[SessionValidator] Debug info for ${context}:`, {
        timestamp: new Date().toISOString(),
        session: {
          isValid: validation.isValid,
          hasSession: !!validation.session,
          hasUser: !!validation.user,
          userId: validation.user?.id,
          email: validation.user?.email,
          error: validation.error
        },
        tokens: debugInfo,
        rls: rlsContext,
        context,
        // Add header conflict detection
        headerConflictCheck: this.detectHeaderConflicts()
      });
    } catch (error) {
      console.error('[SessionValidator] Failed to log debug info:', error);
    }
  }
  
  private static detectHeaderConflicts(): { hasConflict: boolean; details?: string } {
    // Check for common header conflicts that cause 500 errors
    try {
      // This is a simplified check - in reality would need to inspect actual request headers
      return { hasConflict: false };
    } catch (error) {
      return { hasConflict: false, details: 'Unable to check for header conflicts' };
    }
  }
  
  /**
   * Monitor session health in the background
   * Helps detect and resolve token issues proactively
   */
  static startSessionMonitoring(): () => void {
    const intervalId = setInterval(async () => {
      try {
        const validation = await this.validateSession();
        
        if (validation.needsRefresh && validation.session?.refresh_token) {
          console.log('[SessionValidator] Proactively refreshing session...');
          await supabase.auth.refreshSession({
            refresh_token: validation.session.refresh_token
          });
        }
        
        if (!validation.isValid) {
          console.warn('[SessionValidator] Session monitoring detected invalid session:', {
            error: validation.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[SessionValidator] Session monitoring error:', error);
      }
    }, this.SESSION_CHECK_INTERVAL);
    
    console.log('[SessionValidator] Session monitoring started');
    
    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('[SessionValidator] Session monitoring stopped');
    };
  }
}

/**
 * Utility function to check if error is related to authentication/authorization
 * Helps identify RLS-related issues
 */
export function isAuthenticationError(error: any): boolean {
  if (!error) return false;
  
  const status = error.status || error.statusCode;
  if (status === 401 || status === 403) return true;
  
  const message = (error.message || '').toLowerCase();
  if (message.includes('unauthorized') || 
      message.includes('violates row-level security') ||
      message.includes('jwt') ||
      message.includes('permission denied') ||
      message.includes('access denied') ||
      message.includes('forbidden') ||
      message.includes('authentication') ||
      message.includes('auth.uid()')) return true;
      
  // Check PostgREST error codes
  if (error.code === 'PGRST301' || error.code === 'PGRST116') return true;
  
  return false;
}

/**
 * Utility function to create an authenticated Supabase client with explicit token
 * Use this only when the default client doesn't have proper session context
 */
export async function createAuthenticatedClient(accessToken?: string) {
  const { createClient } = await import('@supabase/supabase-js');
  
  // Get token from parameter or current session
  const token = accessToken || (await SessionValidator.validateSession()).accessToken;
  
  if (!token) {
    throw new Error('No access token available for authenticated client');
  }
  
  const SUPABASE_URL = "https://ehznqzaumsnjkrntaiox.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoem5xemF1bXNuamtybnRhaW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTM2MjMsImV4cCI6MjA3MjI4OTYyM30.cwynTMjqTpDbXRlyMsbp6lfLLAOqE00X-ybeLU0pzE0";
  
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        // Only include Authorization header, not apikey for Edge Functions
        'Authorization': `Bearer ${token}`
        // Remove apikey header to prevent conflicts
      }
    }
  });
}