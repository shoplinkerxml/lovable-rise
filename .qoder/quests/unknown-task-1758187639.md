# User Registration 500 Internal Server Error Fix

## Overview

This document addresses a 500 Internal Server Error occurring during user registration in the Supabase-based authentication system. The error is related to improper handling of authentication tokens and session management during the registration flow.

## Problem Analysis

### Error Details
- **URL**: `https://ehznqzaumsnjkrntaiox.supabase.co/auth/v1/signup`
- **Method**: POST
- **Status**: 500 Internal Server Error
- **Error Code**: `unexpected_failure`
- **Headers**: Contains both `apikey` and `Authorization` headers with the same token

### Root Cause
The primary issue is that the system is sending both `apikey` and `Authorization` headers with the same token value in requests to Supabase Edge Functions. According to Supabase documentation and best practices, when making requests to Edge Functions, only the `Authorization` header with a Bearer token should be used.

This is confirmed by the memory knowledge which states: "When making requests to Supabase Edge Functions, only use the 'Authorization' header with a Bearer token. Do not include both 'apikey' and 'Authorization' headers in the same request."

## Architecture

### Current Registration Flow
1. User submits registration form in `UserRegister.tsx`
2. `UserAuthService.register()` is called with user data
3. Supabase `auth.signUp()` is called to create the user
4. Profile is created via `ProfileService.createProfileWithAuth()`
5. Session validation is performed via `SessionValidator`

### Problematic Components
1. **Supabase Client Configuration**: The client is configured with global headers that may be causing conflicts
2. **Session Validation**: The `createAuthenticatedClient` function adds both `apikey` and `Authorization` headers
3. **Profile Creation**: The profile service uses the default client which may have header conflicts

## Solution Design

### 1. Fix Supabase Client Configuration
Modify the Supabase client to avoid header conflicts:

```typescript
// In src/integrations/supabase/client.ts
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  },
  global: {
    // Remove conflicting headers that may cause issues with Edge Functions
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      // Do not include Authorization or apikey here
    }
  },
  db: {
    schema: 'public'
  }
});
```

### 2. Update Authenticated Client Creation
Modify the `createAuthenticatedClient` function to only use the Authorization header:

```typescript
// In src/lib/session-validation.ts
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
```

### 3. Update Profile Creation Service
Modify the profile creation service to handle token conflicts properly:

```typescript
// In src/lib/profile-service.ts
static async createProfileWithAuth(
  profileData: Partial<UserProfile> & { id: string },
  accessToken?: string
): Promise<UserProfile> {
  try {
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
    
    // Use the authenticated client to avoid header conflicts
    const authenticatedClient = await createAuthenticatedClient(accessToken);
    
    // Use upsert instead of insert to handle cases where profile might already exist
    const { data, error } = await authenticatedClient
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
```

## Implementation Steps

### Step 1: Update Supabase Client Configuration
1. Modify `src/integrations/supabase/client.ts` to remove conflicting headers
2. Test that the client still works for regular operations

### Step 2: Update Authenticated Client Creation
1. Modify `src/lib/session-validation.ts` to remove `apikey` header in `createAuthenticatedClient`
2. Ensure only `Authorization` header is used for authenticated requests

### Step 3: Update Profile Service
1. Modify `src/lib/profile-service.ts` to use the authenticated client for profile creation
2. Test profile creation flow with proper token handling

### Step 4: Test Registration Flow
1. Test user registration with email confirmation
2. Verify that profile creation works without header conflicts
3. Confirm that existing functionality is not broken

## Testing Strategy

### Unit Tests
1. Test `createAuthenticatedClient` function with various token scenarios
2. Test profile creation with valid and invalid tokens
3. Test session validation functions

### Integration Tests
1. Test complete registration flow with email confirmation
2. Test login flow after registration
3. Test profile retrieval after creation

### Edge Case Tests
1. Test registration with existing email
2. Test registration with invalid data
3. Test registration with network errors

## Error Handling Improvements

### Enhanced Error Logging
Add more detailed error logging for debugging token issues:

```typescript
// In src/lib/session-validation.ts
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
```

## Security Considerations

1. Ensure that access tokens are properly validated before use
2. Prevent token leakage in logs or error messages
3. Maintain proper session refresh mechanisms
4. Validate all user inputs to prevent injection attacks

## Performance Considerations

1. Cache session validation results to reduce redundant checks
2. Implement proper retry mechanisms for transient errors
3. Optimize profile creation with proper error handling
4. Use connection pooling for database operations

## Rollback Plan

If the fix causes issues:
1. Revert the Supabase client configuration changes
2. Restore the original `createAuthenticatedClient` implementation
3. Monitor error logs for any new issues
4. Communicate with users about any service disruptions