/**
 * Comprehensive unit tests for profile creation authentication flow fix
 * Tests the enhanced session management and authentication-aware profile creation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserAuthService } from './lib/user-auth-service';
import { ProfileService } from './lib/profile-service';
import { UserAuthError, SessionContext } from './lib/user-auth-schemas';
import { supabase } from './integrations/supabase/client';

// Mock Supabase client
jest.mock('./integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    }))
  }
}));

describe('Session Context Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should extract valid session context', () => {
    const authData = {
      user: { id: 'user-123' },
      session: { 
        access_token: 'token-456', 
        refresh_token: 'refresh-789',
        expires_at: 1234567890 
      }
    };
    
    // Use reflection to access private method for testing
    const extractSessionContext = (UserAuthService as any).extractSessionContext;
    const context: SessionContext = extractSessionContext(authData);
    
    expect(context.accessToken).toBe('token-456');
    expect(context.refreshToken).toBe('refresh-789');
    expect(context.userId).toBe('user-123');
    expect(context.isReady).toBe(true);
    expect(context.expiresAt).toBe(1234567890000); // Convert to milliseconds
  });
  
  test('should handle missing session gracefully', () => {
    const authData = { 
      user: { id: 'user-123' }, 
      session: null 
    };
    
    const extractSessionContext = (UserAuthService as any).extractSessionContext;
    const context: SessionContext = extractSessionContext(authData);
    
    expect(context.isReady).toBe(false);
    expect(context.accessToken).toBe(null);
    expect(context.refreshToken).toBe(null);
    expect(context.userId).toBe('user-123');
    expect(context.expiresAt).toBe(null);
  });

  test('should handle missing user gracefully', () => {
    const authData = { 
      user: null, 
      session: { access_token: 'token-123' }
    };
    
    const extractSessionContext = (UserAuthService as any).extractSessionContext;
    const context: SessionContext = extractSessionContext(authData);
    
    expect(context.isReady).toBe(false);
    expect(context.accessToken).toBe('token-123');
    expect(context.userId).toBe('');
  });
});

describe('Profile Creation with Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create profile with valid access token', async () => {
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockSupabaseResponse = {
      data: mockProfile,
      error: null
    };

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(mockSupabaseResponse)
    });

    const profileData = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as const,
      status: 'active' as const
    };
    
    const profile = await ProfileService.createProfileWithAuth(profileData, 'valid-token');
    
    expect(profile.id).toBe('user-123');
    expect(profile.email).toBe('test@example.com');
    expect(profile.name).toBe('Test User');
    expect(profile.role).toBe('user');
  });
  
  test('should throw error when no access token available', async () => {
    const profileData = { 
      id: 'user-123', 
      email: 'test@example.com', 
      name: 'Test' 
    };
    
    // Mock getSession to return no session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });
    
    await expect(ProfileService.createProfileWithAuth(profileData))
      .rejects.toThrow('No access token available for profile creation');
  });

  test('should handle authorization errors gracefully', async () => {
    const profileData = { 
      id: 'user-123', 
      email: 'test@example.com', 
      name: 'Test',
      role: 'user' as const,
      status: 'active' as const
    };

    const mockAuthError = {
      message: 'JWT expired',
      status: 401,
      code: 'PGRST301'
    };

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(mockAuthError)
    });
    
    await expect(ProfileService.createProfileWithAuth(profileData, 'expired-token'))
      .rejects.toThrow();
  });

  test('should validate required profile fields', async () => {
    const incompleteProfileData = { 
      id: 'user-123'
      // Missing email and name
    };
    
    await expect(ProfileService.createProfileWithAuth(incompleteProfileData as any, 'valid-token'))
      .rejects.toThrow('Missing required profile fields');
  });
});

describe('Authorization Error Detection', () => {
  test('should detect HTTP 401 errors', () => {
    const error = { status: 401, message: 'Unauthorized' };
    const isAuthError = (ProfileService as any).isAuthorizationError(error);
    expect(isAuthError).toBe(true);
  });

  test('should detect HTTP 403 errors', () => {
    const error = { statusCode: 403, message: 'Forbidden' };
    const isAuthError = (ProfileService as any).isAuthorizationError(error);
    expect(isAuthError).toBe(true);
  });

  test('should detect RLS violation messages', () => {
    const error = { 
      message: 'violates row-level security policy',
      status: 400 
    };
    const isAuthError = (ProfileService as any).isAuthorizationError(error);
    expect(isAuthError).toBe(true);
  });

  test('should detect JWT errors', () => {
    const error = { 
      message: 'JWT token expired',
      status: 500 
    };
    const isAuthError = (ProfileService as any).isAuthorizationError(error);
    expect(isAuthError).toBe(true);
  });

  test('should detect PostgREST 301 errors', () => {
    const error = { 
      code: 'PGRST301',
      message: 'JWT malformed'
    };
    const isAuthError = (ProfileService as any).isAuthorizationError(error);
    expect(isAuthError).toBe(true);
  });

  test('should not detect non-authorization errors', () => {
    const error = { 
      status: 500,
      message: 'Internal server error'
    };
    const isAuthError = (ProfileService as any).isAuthorizationError(error);
    expect(isAuthError).toBe(false);
  });
});

describe('Registration Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle successful registration with session context', async () => {
    const registrationData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword',
      confirmPassword: 'securepassword',
      acceptTerms: true
    };

    const mockAuthData = {
      user: { id: 'user-123' },
      session: {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
    };

    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Mock ProfileService.getProfileByEmail to return null (user doesn't exist)
    jest.spyOn(ProfileService, 'getProfileByEmail').mockResolvedValue(null);
    
    // Mock Supabase auth signup
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: mockAuthData,
      error: null
    });
    
    // Mock ProfileService.createProfileWithAuth
    jest.spyOn(ProfileService, 'createProfileWithAuth').mockResolvedValue(mockProfile);
    
    // Mock UserExistenceService.clearExistenceCache
    const mockClearCache = jest.fn();
    jest.doMock('./lib/user-existence-service', () => ({
      UserExistenceService: {
        clearExistenceCache: mockClearCache
      }
    }));

    const result = await UserAuthService.register(registrationData);
    
    expect(result.user).toEqual(mockProfile);
    expect(result.session).toEqual(mockAuthData.session);
    expect(result.error).toBe(null);
  });

  test('should handle existing user error', async () => {
    const registrationData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword',
      confirmPassword: 'securepassword',
      acceptTerms: true
    };

    const existingProfile = {
      id: 'existing-user',
      email: 'test@example.com',
      name: 'Existing User',
      role: 'user' as const,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    jest.spyOn(ProfileService, 'getProfileByEmail').mockResolvedValue(existingProfile);

    const result = await UserAuthService.register(registrationData);
    
    expect(result.user).toBe(null);
    expect(result.session).toBe(null);
    expect(result.error).toBe(UserAuthError.EMAIL_EXISTS);
  });

  test('should handle auth signup errors', async () => {
    const registrationData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'weak',
      confirmPassword: 'weak',
      acceptTerms: true
    };

    jest.spyOn(ProfileService, 'getProfileByEmail').mockResolvedValue(null);
    
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Password should be at least 8 characters' }
    });

    const result = await UserAuthService.register(registrationData);
    
    expect(result.user).toBe(null);
    expect(result.session).toBe(null);
    expect(result.error).toBe(UserAuthError.WEAK_PASSWORD);
  });
});

describe('Database Trigger Fallback Strategy', () => {
  test('should wait for trigger-created profile', async () => {
    const userId = 'user-123';
    
    // Mock profile to be found after some delay
    let callCount = 0;
    jest.spyOn(ProfileService, 'getProfile').mockImplementation(() => {
      callCount++;
      if (callCount >= 3) {
        return Promise.resolve({
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      return Promise.resolve(null);
    });

    const waitForTriggerProfile = (UserAuthService as any).waitForTriggerProfile;
    const result = await waitForTriggerProfile(userId, 1000);
    
    expect(result).toBe(true);
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  test('should timeout when trigger profile not found', async () => {
    const userId = 'user-123';
    
    jest.spyOn(ProfileService, 'getProfile').mockResolvedValue(null);

    const waitForTriggerProfile = (UserAuthService as any).waitForTriggerProfile;
    const result = await waitForTriggerProfile(userId, 500); // Short timeout
    
    expect(result).toBe(false);
  });
});

describe('Current Access Token Retrieval', () => {
  test('should get access token from valid session', async () => {
    const mockSession = {
      access_token: 'valid-access-token',
      refresh_token: 'refresh-token'
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    const getCurrentAccessToken = (ProfileService as any).getCurrentAccessToken;
    const token = await getCurrentAccessToken();
    
    expect(token).toBe('valid-access-token');
  });

  test('should return null when no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });

    const getCurrentAccessToken = (ProfileService as any).getCurrentAccessToken;
    const token = await getCurrentAccessToken();
    
    expect(token).toBe(null);
  });

  test('should return null on session error', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { message: 'Session expired' }
    });

    const getCurrentAccessToken = (ProfileService as any).getCurrentAccessToken;
    const token = await getCurrentAccessToken();
    
    expect(token).toBe(null);
  });
});

console.log('Profile creation authentication flow tests ready for execution');